
// controllers/posts.js

const Post = require('../models/Post');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Helper to validate dates
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

// @desc    Schedule a new post
// @route   POST /api/posts/schedule
// @access  Private
exports.schedulePost = async (req, res) => {
  try {
    const { content, scheduledTime } = req.body;

    // Validate inputs
    if (!content || !scheduledTime) {
      return res.status(400).json({ 
        error: 'Content and scheduled time are required',
        received: { content, scheduledTime }
      });
    }

    // Parse and validate the UTC date
    const utcScheduledTime = new Date(scheduledTime);
    if (!isValidDate(utcScheduledTime)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)',
        example: new Date().toISOString()
      });
    }

    // Check if time is in the future (UTC comparison)
    const nowUTC = new Date();
    if (utcScheduledTime <= nowUTC) {
      return res.status(400).json({
        error: 'Scheduled time must be in the future',
        details: {
          currentServerTimeUTC: nowUTC.toISOString(),
          receivedTimeUTC: utcScheduledTime.toISOString(),
          timeDifferenceMs: nowUTC - utcScheduledTime
        }
      });
    }

    // Handle image upload
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      
      // Validate image file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(path.join(__dirname, '../public', imageUrl));
        return res.status(400).json({ 
          error: 'Invalid file type. Only JPG, PNG, and GIF are allowed'
        });
      }
    }

    // Create post
    const post = new Post({
      user: req.user._id,
      content,
      scheduledTime: utcScheduledTime,
      status: 'SCHEDULED',
      imageUrl
    });

    await post.save();

    // Populate user data before sending response
    const populatedPost = await Post.findById(post._id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    // Format response with both UTC and local times
    const response = {
      ...populatedPost.toObject(),
      timeInfo: {
        utc: populatedPost.scheduledTime.toISOString(),
        local: DateTime.fromJSDate(populatedPost.scheduledTime)
          .setZone('Asia/Kolkata') // Or use req.user.timezone if available
          .toFormat('dd MMM yyyy, hh:mm a')
      }
    };

    res.status(201).json(response);

  } catch (err) {
    console.error('Error scheduling post:', err);
    
    // Clean up uploaded file if error occurred
    if (req.file) {
      try {
        fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
      } catch (cleanupErr) {
        console.error('Failed to cleanup uploaded file:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      error: 'Server error while scheduling post',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get all posts for the logged-in user
// @route   GET /api/posts
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture')
      .sort({ scheduledTime: -1 });

    // Format posts with local time information
    const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      localScheduledTime: DateTime.fromJSDate(post.scheduledTime)
        .setZone('Asia/Kolkata') // Or use req.user.timezone if available
        .toFormat('dd MMM yyyy, hh:mm a'),
      localCreatedAt: DateTime.fromJSDate(post.createdAt)
        .setZone('Asia/Kolkata')
        .toFormat('dd MMM yyyy, hh:mm a')
    }));

    res.json(formattedPosts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ 
      error: 'Error fetching posts',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Validate post exists
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check user ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    // Remove associated image if exists
    if (post.imageUrl) {
      const imagePath = path.join(__dirname, '../public', post.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Post.deleteOne({ _id: req.params.id });
    
    res.json({ 
      message: 'Post deleted successfully',
      deletedPostId: req.params.id
    });

  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ 
      error: 'Error deleting post',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } }, // Prevent duplicates
      { new: true }
    )
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ 
      error: 'Error liking post',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date() // Stored in UTC
    };

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: comment } },
      { new: true }
    )
    .populate('user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Format the last comment (newly added) with local time
    const lastComment = post.comments[post.comments.length - 1];
    const formattedComment = {
      ...lastComment.toObject(),
      localCreatedAt: DateTime.fromJSDate(lastComment.createdAt)
        .setZone('Asia/Kolkata')
        .toFormat('dd MMM yyyy, hh:mm a')
    };

    res.json({
      ...post.toObject(),
      comments: [
        ...post.comments.slice(0, -1),
        formattedComment
      ]
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ 
      error: 'Error adding comment',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Get scheduled posts that are ready to publish
// @route   GET /api/posts/publish-ready
// @access  Private (typically called by a scheduled job)
exports.getPostsReadyToPublish = async (req, res) => {
  try {
    const now = new Date();
    const readyPosts = await Post.find({
      status: 'SCHEDULED',
      scheduledTime: { $lte: now }
    });

    res.json(readyPosts);
  } catch (err) {
    console.error('Error fetching ready posts:', err);
    res.status(500).json({ 
      error: 'Error fetching ready posts',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Update post status (used by publishing job)
// @route   PATCH /api/posts/:id/status
// @access  Private
exports.updatePostStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['SCHEDULED', 'PUBLISHED', 'FAILED'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        allowedStatuses
      });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error updating post status:', err);
    res.status(500).json({ 
      error: 'Error updating post status',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};