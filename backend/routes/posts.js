//routes/posts.js

const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Schedule new post with image upload
router.post('/schedule', 
    auth, 
    upload.single('image'), 
    postsController.schedulePost
);

// Get user's posts
router.get('/', auth, postsController.getUserPosts);

// Delete post
router.delete('/:id', auth, postsController.deletePost);

module.exports = router;