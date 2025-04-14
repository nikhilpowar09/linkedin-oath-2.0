// controllers/interactions.js
const axios = require('axios');
const User = require('../models/User');

exports.interactWithPost = async (req, res) => {
  try {
    const { postId, action, comment } = req.body;
    const user = await User.findById(req.user.id);

    if (action === 'like') {
      const response = await axios.post(
        `https://api.linkedin.com/v2/socialActions/${postId}/likes`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      return res.json(response.data);
    } else if (action === 'comment' && comment) {
      const response = await axios.post(
        'https://api.linkedin.com/v2/comments',
        {
          actor: `urn:li:person:${user.linkedInId}`,
          object: postId,
          message: { text: comment }
        },
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );
      return res.json(response.data);
    } else {
      return res.status(400).json({ msg: 'Invalid action or missing comment' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};