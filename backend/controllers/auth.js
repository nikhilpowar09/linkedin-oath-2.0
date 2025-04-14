// controllers/auth.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.getLinkedInToken = async (req, res) => {
  try {
    const { code, state } = req.body;
    
    // Validate required parameters
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authorization code is required' 
      });
    }

    // Optional: Verify state on backend if you stored it server-side
    // if (!state || !verifyServerSideState(state)) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Invalid state parameter'
    //   });
    // }

    // Prepare token request parameters
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI);
    params.append('client_id', process.env.LINKEDIN_CLIENT_ID);
    params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);

    console.log('🔁 Exchanging LinkedIn authorization code for access token...');

    // Request access token from LinkedIn
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    const { access_token: accessToken, expires_in: expiresIn } = tokenResponse.data;
    if (!accessToken) {
      throw new Error('No access token received from LinkedIn');
    }

    console.log('✅ Successfully obtained LinkedIn access token');
    console.log('🔍 Fetching LinkedIn user profile...');

    // Get user info from LinkedIn
    const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 seconds timeout
    });

    const { 
      sub: linkedInId, 
      name, 
      email, 
      picture: profilePicture 
    } = userInfoResponse.data;

    // Find or create user in database
    let user = await User.findOne({ linkedInId });

    if (!user) {
      user = new User({ 
        linkedInId, 
        name, 
        email, 
        accessToken, 
        expiresIn, 
        profilePicture,
        lastLogin: new Date()
      });
      await user.save();
      console.log('🆕 Created new user record');
    } else {
      user.accessToken = accessToken;
      user.expiresIn = expiresIn;
      user.lastLogin = new Date();
      if (profilePicture) user.profilePicture = profilePicture;
      await user.save();
      console.log('🔄 Updated existing user record');
    }

    // Verify JWT secret is configured
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT secret not configured in environment variables');
    }

    // Create JWT token
    const tokenPayload = {
      id: user._id,
      linkedInId: user.linkedInId,
      name: user.name,
      email: user.email,
      picture: user.profilePicture
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Prepare user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.profilePicture,
      linkedInId: user.linkedInId
    };

    console.log(`🔑 Generated JWT for user ${user.email}`);

    // Successful response
    return res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('❌ LinkedIn authentication error:', error);
    
    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = 'Authentication failed';

    if (error.response) {
      // LinkedIn API error response
      statusCode = error.response.status || 500;
      
      if (statusCode === 400) {
        errorMessage = 'Invalid authorization code or expired token';
      } else if (statusCode === 401 || statusCode === 403) {
        errorMessage = 'LinkedIn authentication denied';
      } else if (statusCode === 429) {
        errorMessage = 'Too many requests to LinkedIn API';
      }
    } else if (error.request) {
      // No response received
      errorMessage = 'No response received from LinkedIn API';
      statusCode = 504; // Gateway timeout
    } else if (error.message.includes('JWT secret')) {
      // Configuration error
      errorMessage = 'Server configuration error';
      statusCode = 500;
    }

    // Return error response
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};