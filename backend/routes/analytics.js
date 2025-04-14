// routes/analytics.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analytics');

// @route    GET api/analytics/:postId
// @desc     Get post analytics
// @access   Private
router.get('/:postId', auth, analyticsController.getPostAnalytics);

module.exports = router;