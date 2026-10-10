const ExchangeRequest = require('../models/ExchangeRequest');
const Session = require('../models/Session');
const Skill = require('../models/Skill');
const { pushNotification } = require('./notificationController');

const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { sendWhatsApp } = require('../utils/whatsapp');

// POST /api/requests  (Request Exchange)
exports.createRequest = async (req, res) => {
  const { skill_id, message, offered_coin, offered_skill_id } = req.body;
  if (!skill_id) return res.status(400).json({ message: 'skill_id is required' });

  const skill = await Skill.findById(skill_id);
  if (!skill) return res.status(404).json({ message: 'Skill not found' });

  if (skill.user_id.toString() === req.user.id.toString()) {
    return res.status(400).json({ message: "You can't request your own skill" });
  }

  const requester = await User.findById(req.user.id);
  if (offered_coin) {
    if (requester.coins < 1) return res.status(400).json({ message: "Not enough Skill Coins" });
    requester.coins -= 1;
    await requester.save();
  }

  const request = await ExchangeRequest.create({
    requester_id: req.user.id,
    provider_id: skill.user_id,
    skill_id,
    offered_skill_id: offered_skill_id || null,
    message: message || '',
    offered_coin: offered_coin === true
  });

  await pushNotification(req.app.get('io'), skill.user_id, 'request',
    `${req.user.name} requested to exchange "${skill.title}"`, '/frontend/requests.html');

  // Email Notification for New Request
  const provider = await User.findById(skill.user_id);
  if (provider && (provider.email || provider.gmail)) {
    const emailSubject = 'New Skill Exchange Request on SkillSwap!';
    const emailText = `Hi ${provider.name},\n\n${req.user.name} has requested a skill exchange for "${skill.title}".\n\nLog in to SkillSwap to review and respond to the request.\n\nBest,\nSkillSwap Team`;
    await sendEmail(provider.email || provider.gmail, emailSubject, emailText);
  }

  res.status(201).json({ message: 'Exchange request sent', requestId: request._id });
};

// GET /api/requests?type=incoming|outgoing
exports.listRequests = async (req, res) => {
  const uid = req.user.id;
  const { type, status } = req.query;
  const filter = {};

  if (type === 'incoming') filter.provider_id = uid;
  else if (type === 'outgoing') filter.requester_id = uid;
  else filter.$or = [{ requester_id: uid }, { provider_id: uid }];

  if (status) filter.status = status;

  const rows = await ExchangeRequest.find(filter)
    .sort({ created_at: -1 })
    .populate('skill_id', 'title level')
    .populate('offered_skill_id', 'title level')
    .populate('requester_id', 'name avatar_url')
    .populate('provider_id', 'name avatar_url')
    .lean();

  const Skill = require('../models/Skill');
  const enrichedRows = await Promise.all(rows.map(async r => {
    let requester_skills = [];
    if (type === 'incoming' && r.status === 'pending' && !r.offered_coin) {
      const skills = await Skill.find({ user_id: r.requester_id._id }).lean();
      requester_skills = skills.map(s => ({ id: s._id, title: s.title, level: s.level }));
    }
    return {
      ...r,
      id: r._id,
      skill_title: r.skill_id?.title,
      level: r.skill_id?.level,
      offered_skill_title: r.offered_skill_id?.title,
      offered_skill_level: r.offered_skill_id?.level,
      requester_name: r.requester_id?.name,
      requester_avatar: r.requester_id?.avatar_url,
      provider_name: r.provider_id?.name,
      provider_avatar: r.provider_id?.avatar_url,
      requester_skills
    };
  }));

  res.json(enrichedRows);
};

exports.updateStatus = async (req, res) => {
  const { status, scheduled_at, duration_minutes } = req.body;
  const allowed = ['accepted', 'rejected', 'completed', 'cancelled', 'pending'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  // Guard against undefined / malformed ObjectId
  if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
    return res.status(400).json({ message: 'Invalid request ID' });
  }

  const reqRow = await ExchangeRequest.findById(req.params.id);
  if (!reqRow) return res.status(404).json({ message: 'Request not found' });


  const isProvider = reqRow.provider_id.toString() === req.user.id.toString();
  const isRequester = reqRow.requester_id.toString() === req.user.id.toString();
  if (!isProvider && !isRequester && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  if ((status === 'accepted' || status === 'rejected' || status === 'pending') && !isProvider && req.user.role !== 'admin' && status !== 'pending' && status !== 'cancelled') {
    return res.status(403).json({ message: 'Only the provider can accept/reject' });
  }

  // Enforce provider-only completion for coin exchanges
  if (status === 'completed' && !isProvider && req.user.role !== 'admin') {
    if (reqRow.offered_coin) {
      return res.status(403).json({ message: 'Only the provider can complete a coin exchange' });
    }
  }

  const oldStatus = reqRow.status;
  reqRow.status = status;
  
  // If accepting a trade, allow setting the offered_skill_id
  if (status === 'accepted' && !reqRow.offered_coin && req.body.offered_skill_id) {
    reqRow.offered_skill_id = req.body.offered_skill_id;
  }
  
  await reqRow.save();

  if (status === 'rejected' && reqRow.offered_coin) {
    const requester = await User.findById(reqRow.requester_id);
    if (requester) {
      requester.coins += 1;
      await requester.save();
    }
  }

  if (status === 'completed') {
    const provider = await User.findById(reqRow.provider_id);
    if (provider) {
      provider.coins += 2;
      await provider.save();
    }
  }

  // Handle Undo (Reverting completed -> accepted)
  if (status === 'accepted' && oldStatus === 'completed') {
    const provider = await User.findById(reqRow.provider_id);
    if (provider) {
      provider.coins -= 2;
      await provider.save();
    }
  }

  // Handle Undo (Reverting rejected -> pending)
  if (status === 'pending' && oldStatus === 'rejected' && reqRow.offered_coin) {
    const requester = await User.findById(reqRow.requester_id);
    if (requester) {
      requester.coins -= 1;
      await requester.save();
    }
  }

  // Handle Undo (Reverting accepted -> pending)
  if (status === 'pending' && oldStatus === 'accepted') {
    await Session.deleteMany({ request_id: reqRow._id });
  }

  const notifyUserId = isProvider ? reqRow.requester_id : reqRow.provider_id;
  await pushNotification(req.app.get('io'), notifyUserId, 'request_update',

    `Your exchange request was ${status}`, '/frontend/requests.html');

  // Auto-create an upcoming session when accepted
  if (status === 'accepted') {
    const scheduled = scheduled_at ? new Date(scheduled_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const duration = duration_minutes || 60;
    await Session.create({ request_id: reqRow._id, scheduled_at: scheduled, duration_minutes: duration, status: 'upcoming' });

    // --- Email and WhatsApp Integration ---
    const requesterUser = await User.findById(reqRow.requester_id);
    const providerUser = await User.findById(reqRow.provider_id);
    
    if (requesterUser && providerUser) {
      const emailSubject = 'Exchange Request Accepted on SkillSwap!';
      const emailText = `Hi ${requesterUser.name},\n\nGood news! Your exchange request with ${providerUser.name} has been accepted. A session has been automatically scheduled for ${scheduled.toLocaleString()}.\n\nLog in to SkillSwap to message your partner and coordinate further!\n\nBest,\nSkillSwap Team`;
      
      const whatsappText = `Hi ${requesterUser.name}, your exchange request with ${providerUser.name} on SkillSwap was accepted! Session starts: ${scheduled.toLocaleString()}.`;

      if (requesterUser.email || requesterUser.gmail) {
        await sendEmail(requesterUser.email || requesterUser.gmail, emailSubject, emailText);
      }
      if (requesterUser.phone_number) {
        await sendWhatsApp(requesterUser.phone_number, whatsappText);
      }
    }
  }

  res.json({ message: `Request ${status}` });
};
