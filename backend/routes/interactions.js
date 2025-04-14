// routes/interactions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const interactionsController = require('../controllers/interactions');

// @route    POST api/interactions
// @desc     Like or comment on a post
// @access   Private
router.post('/', auth, interactionsController.interactWithPost);

module.exports = router;