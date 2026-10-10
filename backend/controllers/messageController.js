const Message = require('../models/Message');
const User = require('../models/User');
const { pushNotification } = require('./notificationController');
const mongoose = require('mongoose');

// GET /api/messages/conversations  -> list of people you've chatted with + last message
exports.listConversations = async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);

  const conversations = await Message.aggregate([
    { $match: { $or: [{ sender_id: uid }, { receiver_id: uid }] } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$sender_id', uid] }, '$receiver_id', '$sender_id']
        },
        lastMessage: { $last: '$$ROOT' }
      }
    },
    { $sort: { 'lastMessage.created_at': -1 } },
    {
      $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' }
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'messages',
        let: { partnerId: '$_id', myId: uid },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$sender_id', '$$partnerId'] }, { $eq: ['$receiver_id', '$$myId'] }, { $eq: ['$is_read', false] }] } } },
          { $count: 'unread' }
        ],
        as: 'unreadData'
      }
    },
    {
      $project: {
        user_id: '$_id',
        name: '$user.name',
        avatar_url: '$user.avatar_url',
        last_message: '$lastMessage.content',
        last_at: '$lastMessage.created_at',
        last_sender_id: '$lastMessage.sender_id',
        unread: { $ifNull: [{ $arrayElemAt: ['$unreadData.unread', 0] }, 0] }
      }
    }
  ]);

  res.json(conversations);
};

// GET /api/messages/:userId  -> full thread with a specific user
exports.getThread = async (req, res) => {
  const uid = req.user.id;
  const otherId = req.params.userId;
  const messages = await Message.find({
    $or: [
      { sender_id: uid, receiver_id: otherId },
      { sender_id: otherId, receiver_id: uid }
    ]
  }).sort({ created_at: 1 });

  // Mark received messages as read
  await Message.updateMany(
    { sender_id: otherId, receiver_id: uid, is_read: false },
    { is_read: true }
  );

  res.json(messages);
};

// POST /api/messages  { receiver_id, content }
exports.sendMessage = async (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content || !content.trim()) {
    return res.status(400).json({ message: 'receiver_id and content are required' });
  }

  const msg = await Message.create({
    sender_id: req.user.id,
    receiver_id,
    content: content.trim(),
  });

  const payload = {
    id: msg._id,
    sender_id: req.user.id,
    receiver_id,
    content: msg.content,
    created_at: msg.created_at,
    is_read: false,
  };

  const io = req.app.get('io');
  if (io) io.to(`user_${receiver_id}`).emit('new_message', payload);

  await pushNotification(io, receiver_id, 'message', `New message from ${req.user.name}`, '/frontend/messages.html');

  res.status(201).json(payload);
};
