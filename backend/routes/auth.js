// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// LinkedIn OAuth route
router.post('/linkedin', (req, res, next) => {
  console.log('📩 /auth/linkedin route hit');
  next();
}, authController.getLinkedInToken);

// Add user profile route
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-accessToken -refreshToken -__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

module.exports = router;