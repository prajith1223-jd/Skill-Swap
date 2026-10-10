const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

// Helper used by other controllers to create + emit a notification
async function pushNotification(io, userId, type, content, link) {
  const notif = await Notification.create({
    user_id: userId,
    type,
    content,
    link: link || null,
  });
  const payload = {
    id: notif._id,
    user_id: userId,
    type,
    content,
    link,
    is_read: false,
    created_at: notif.created_at,
  };
  if (io) io.to(`user_${userId}`).emit('new_notification', payload);
  
  // Send Email Notification
  try {
    const user = await User.findById(userId);
    if (user && user.email) {
      await sendEmail(user.email, `New Notification: ${type}`, content);
    }
  } catch (err) {
    console.error('Error fetching user for email notification:', err);
  }
  
  return payload;
}

// GET /api/notifications
exports.listNotifications = async (req, res) => {
  const notifs = await Notification.find({ user_id: req.user.id })
    .sort({ created_at: -1 })
    .limit(50);
  res.json(notifs);
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user.id },
    { is_read: true }
  );
  res.json({ message: 'Marked as read' });
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user_id: req.user.id }, { is_read: true });
  res.json({ message: 'All notifications marked as read' });
};

exports.pushNotification = pushNotification;
