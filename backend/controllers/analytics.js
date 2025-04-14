// controllers/analytics.js
const axios = require('axios');
const User = require('../models/User');

exports.getPostAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { postId } = req.params;

    const response = await axios.get(
      `https://api.linkedin.com/v2/socialActions/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};