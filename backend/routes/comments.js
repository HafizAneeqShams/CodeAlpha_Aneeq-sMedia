const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// ✅ Get all comments for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate('user', 'username name profilePicture')
      .populate('replies.user', 'username name profilePicture');
    res.json(comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ✅ Add comment
router.post('/:postId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const comment = new Comment({
      post: req.params.postId,
      user: req.user.id,
      text: text.trim()
    });

    await comment.save();
    await comment.populate('user', 'username name profilePicture');

    post.comments.push({
      user: req.user.id,
      text: text.trim()
    });
    await post.save();

    res.json(comment);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).send('Server error');
  }
});

// ✅ Like comment
router.put('/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(req.user.id);
    }

    await comment.save();
    res.json(comment.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ✅ ADD REPLY
router.post('/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const commentId = req.params.commentId;
    
    console.log('📡 Reply request for comment:', commentId);
    console.log('📝 Reply text:', text);

    if (!text || text.trim() === '') {
      return res.status(400).json({ msg: 'Reply text is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      console.log('❌ Comment not found:', commentId);
      return res.status(404).json({ msg: 'Comment not found' });
    }

    console.log('✅ Comment found, adding reply...');

    comment.replies.push({
      user: req.user.id,
      text: text.trim()
    });

    await comment.save();
    await comment.populate('replies.user', 'username name profilePicture');

    console.log('✅ Reply added successfully');
    res.json(comment.replies);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// ✅ Like reply
router.put('/reply/:replyId/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({ 'replies._id': req.params.replyId });
    if (!comment) {
      return res.status(404).json({ msg: 'Reply not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ msg: 'Reply not found' });
    }

    const likeIndex = reply.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      reply.likes.splice(likeIndex, 1);
    } else {
      reply.likes.push(req.user.id);
    }

    await comment.save();
    res.json(reply.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;