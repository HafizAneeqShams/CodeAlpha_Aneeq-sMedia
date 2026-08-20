// module.exports = router;

const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification'); // ✅ ADD THIS

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for post media
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos allowed'), false);
    }
  }
});

// Create a post with media
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { content } = req.body;
    
    let mediaUrl = '';
    let mediaType = 'none';

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      console.log('✅ Media saved:', mediaUrl);
    }

    if (!content && !req.file) {
      return res.status(400).json({ msg: 'Post content or media is required' });
    }

    const newPost = new Post({
      user: req.user.id,
      content: content || '',
      media: mediaUrl,
      mediaType: mediaType
    });

    const post = await newPost.save();
    await post.populate('user', 'username profilePicture name');
    
    console.log('✅ Post created:', post);
    res.json(post);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get feed posts
// Get feed posts - SIRF FOLLOWED USERS KI POSTS
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // ✅ Followed users + current user
    const following = user.following || [];
    following.push(req.user.id); // Apni bhi posts dikhao

    console.log('📡 Feed for user:', req.user.id);
    console.log('📡 Following:', following);

    const posts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture name')
      .populate('comments.user', 'username profilePicture name');
    
    console.log('✅ Posts found:', posts.length);
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get posts by user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture name')
      .populate('comments.user', 'username profilePicture name');
    
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ✅ LIKE/UNLIKE POST WITH NOTIFICATION
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'id');
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      // Unlike - remove like
      post.likes.splice(likeIndex, 1);
      
      // ✅ Remove notification if unliked
      await Notification.findOneAndDelete({
        user: post.user._id,
        from: req.user.id,
        type: 'like',
        post: post._id
      });
    } else {
      // Like - add like
      post.likes.push(req.user.id);
      
      // ✅ Create notification only if not own post
      if (post.user._id.toString() !== req.user.id) {
        const notification = new Notification({
          user: post.user._id,
          from: req.user.id,
          type: 'like',
          post: post._id
        });
        await notification.save();
        console.log('✅ Like notification sent to:', post.user._id);
      }
    }

    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ✅ COMMENT ON POST WITH NOTIFICATION
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'id');
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text
    };

    post.comments.unshift(newComment);
    await post.save();
    
    // ✅ Create notification only if not own post
    if (post.user._id.toString() !== req.user.id) {
      const notification = new Notification({
        user: post.user._id,
        from: req.user.id,
        type: 'comment',
        post: post._id
      });
      await notification.save();
      console.log('✅ Comment notification sent to:', post.user._id);
    }
    
    await post.populate('comments.user', 'username profilePicture name');
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Delete media file if exists
    if (post.media) {
      const filePath = path.join(__dirname, '../uploads', path.basename(post.media));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // ✅ Delete related notifications
    await Notification.deleteMany({ post: post._id });

    await post.deleteOne();
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;