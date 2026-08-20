// module.exports = router;


const express = require('express');
const router = express.Router();  // ✅ ROUTER DEFINE KARO
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

// Multer config
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  }
});

// GET ALL USERS
router.get('/', auth, async (req, res) => {
  try {
    console.log('📡 Fetching all users except:', req.user.id);
    
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('username profilePicture name bio followers following')
      .limit(50);
    
    console.log('✅ Users found:', users.length);
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
    res.status(500).send('Server error');
  }
});

// GET USER BY ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('📡 Fetching user:', req.params.id);
    
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profilePicture name')
      .populate('following', 'username profilePicture name');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    console.log('✅ User found:', user.username);
    res.json(user);
  } catch (err) {
    console.error('❌ Error fetching user:', err.message);
    res.status(500).send('Server error');
  }
});

// ✅ FOLLOW/UNFOLLOW WITH NOTIFICATION
router.put('/follow/:id', auth, async (req, res) => {
  try {
    console.log('📡 Follow request from:', req.user.id, 'to:', req.params.id);
    
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: 'Cannot follow yourself' });
    }

    // Follow/Unfollow route
router.put('/follow/:id', auth, async (req, res) => {
  try {
    console.log('📡 Follow request from:', req.user.id, 'to:', req.params.id);
    
    if (req.params.id === req.user.id) {
      return res.status(400).json({ msg: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already following
    const isFollowing = currentUser.following.includes(req.params.id);
    console.log('Is currently following:', isFollowing);
    
    let newStatus;
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id);
      newStatus = false;
    } else {
      // Follow
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.user.id);
      newStatus = true;
    }

    await currentUser.save();
    await userToFollow.save();

    console.log('✅ New status:', newStatus);

    // ✅ Return isFollowing status clearly
    res.json({ 
      following: currentUser.following, 
      followers: userToFollow.followers,
      isFollowing: newStatus
    });
  } catch (err) {
    console.error('❌ Follow error:', err.message);
    res.status(500).send('Server error');
  }
});

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already following
    const isFollowing = currentUser.following.includes(req.params.id);
    
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id);
      
      // ✅ Remove follow notification
      await Notification.findOneAndDelete({
        user: userToFollow._id,
        from: req.user.id,
        type: 'follow'
      });
      console.log('✅ Follow notification removed');
    } else {
      // Follow
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.user.id);
      
      // ✅ Create follow notification
      const notification = new Notification({
        user: userToFollow._id,
        from: req.user.id,
        type: 'follow'
      });
      await notification.save();
      console.log('✅ Follow notification sent to:', userToFollow._id);
    }

    await currentUser.save();
    await userToFollow.save();

    console.log('✅ Follow updated. Following:', currentUser.following.length, 'Followers:', userToFollow.followers.length);

    res.json({ 
      following: currentUser.following, 
      followers: userToFollow.followers,
      isFollowing: !isFollowing
    });
  } catch (err) {
    console.error('❌ Follow error:', err.message);
    res.status(500).send('Server error');
  }
});

// ✅ UPDATE PROFILE (NAME + BIO)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    
    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ✅ PROFILE PICTURE UPLOAD
router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('📸 Upload request received');
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    console.log('✅ File uploaded:', req.file.filename);

    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ msg: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(user.profilePicture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('✅ Old profile picture deleted');
      }
    }

    // Save new profile picture
    const imageUrl = `/uploads/${req.file.filename}`;
    user.profilePicture = imageUrl;
    await user.save();

    console.log('✅ Profile picture saved:', imageUrl);

    // Return updated user data
    const updatedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name || '',
      bio: user.bio || '',
      profilePicture: user.profilePicture,
      followers: user.followers || [],
      following: user.following || []
    };

    console.log('📤 Sending user data:', updatedUser);
    res.json(updatedUser);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;  // ✅ EXPORT ROUTER