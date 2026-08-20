const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Send message with notification
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ msg: 'Message content is required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim()
    });

    await message.save();
    await message.populate('sender', 'username name profilePicture');
    await message.populate('receiver', 'username name profilePicture');

    // Create message notification for receiver
    if (receiverId.toString() !== req.user.id) {
      const notification = new Notification({
        user: receiverId,
        from: req.user.id,
        type: 'message',
        messagePreview: content.trim().substring(0, 50)
      });
      await notification.save();
    }

    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get messages between two users
router.get('/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username name profilePicture')
    .populate('receiver', 'username name profilePicture');

    // Mark messages as read
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark messages as read
router.put('/read/:userId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { read: true }
    );
    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false
    });
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all conversations
router.get('/conversations/all', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'username name profilePicture')
    .populate('receiver', 'username name profilePicture');

    const usersMap = new Map();
    messages.forEach(msg => {
      const otherUser = msg.sender._id.toString() === req.user.id ? msg.receiver : msg.sender;
      if (!usersMap.has(otherUser._id.toString())) {
        usersMap.set(otherUser._id.toString(), {
          user: otherUser,
          lastMessage: msg,
          unread: !msg.read && msg.receiver._id.toString() === req.user.id
        });
      }
    });

    res.json(Array.from(usersMap.values()));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;