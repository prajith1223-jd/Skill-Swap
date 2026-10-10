const Session = require('../models/Session');
const ExchangeRequest = require('../models/ExchangeRequest');

// ── Helper: build Google Calendar "Add Event" link ─────────────────────────
function buildCalendarLink({ title, description, startDate, durationMinutes, meetLink }) {
  const pad = n => String(n).padStart(2, '0');
  const fmt = (d) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const start = new Date(startDate);
  const end   = new Date(start.getTime() + durationMinutes * 60000);
  const params = new URLSearchParams({
    action:   'TEMPLATE',
    text:     title,
    dates:    `${fmt(start)}/${fmt(end)}`,
    details:  `${description}\n\nJoin Google Meet: ${meetLink}`,
    location: meetLink,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// GET /api/sessions
exports.listSessions = async (req, res) => {
  const uid = req.user.id;

  // Find requests involving this user
  const requests = await ExchangeRequest.find({ $or: [{ requester_id: uid }, { provider_id: uid }] })
    .populate('skill_id', 'title')
    .populate('requester_id', 'name avatar_url')
    .populate('provider_id', 'name avatar_url');

  const requestIds = requests.map(r => r._id);
  const sessions = await Session.find({ request_id: { $in: requestIds } })
    .sort({ scheduled_at: -1 })
    .lean();

  const requestMap = {};
  requests.forEach(r => { requestMap[r._id.toString()] = r; });

  const result = sessions.map(s => {
    const r = requestMap[s.request_id.toString()];
    return {
      ...s,
      skill_id: r?.skill_id?._id,
      skill_title: r?.skill_id?.title,
      requester_id: r?.requester_id?._id,
      skill_id:       r?.skill_id?._id,
      skill_title:    r?.skill_id?.title,
      requester_id:   r?.requester_id?._id,
      requester_name: r?.requester_id?.name,
      requester_avatar: r?.requester_id?.avatar_url,
      provider_id: r?.provider_id?._id,
      provider_name: r?.provider_id?.name,
      provider_id:    r?.provider_id?._id,
      provider_name:  r?.provider_id?.name,
      provider_avatar: r?.provider_id?.avatar_url,
    };
  });

  res.json(result);
};

// PUT /api/sessions/:id  { scheduled_at, duration_minutes, status, notes }
// PUT /api/sessions/:id  { scheduled_at, duration_minutes, status, notes, meet_link }
exports.updateSession = async (req, res) => {
  const { scheduled_at, duration_minutes, status, notes, meet_link } = req.body;

  const session = await Session.findById(req.params.id).populate('request_id');
  if (!session) return res.status(404).json({ message: 'Session not found' });

  const r = session.request_id;
  const uid = req.user.id.toString();
  if (r.requester_id.toString() !== uid && r.provider_id.toString() !== uid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (scheduled_at !== undefined) session.scheduled_at = scheduled_at;
  if (duration_minutes !== undefined) session.duration_minutes = duration_minutes;
  if (notes !== undefined) session.notes = notes;
  if (meet_link !== undefined) session.meet_link = meet_link;

  if (status !== undefined && status !== session.status) {
    const oldStatus = session.status;
    session.status = status;
    
    // Reward coins on actual completion
    if (status === 'completed' && r.offered_coin) {
      const User = require('../models/User');
      const provider = await User.findById(r.provider_id);
      if (provider) {
        provider.coins += 2;
        await provider.save();
      }
    }

    // Send notification to learner when teacher marks as pending_completion
    if (status === 'pending_completion') {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const provider = await User.findById(r.provider_id);
      await Notification.create({
        user_id: r.requester_id,
        type: 'session_confirm',
        content: `${provider ? provider.name : 'Your teacher'} marked the session as complete. Is this process really complete?`,
        link: '/sessions.html'
      });
    }
    
    // Undo completion
    if (oldStatus === 'completed' && status !== 'completed' && r.offered_coin) {
      const User = require('../models/User');
      const provider = await User.findById(r.provider_id);
      if (provider) {
        provider.coins -= 2;
        await provider.save();
      }
    }
  }

  await session.save();
  res.json({ message: 'Session updated', session });
};
// POST /api/sessions/:id/generate-meet
// Regenerates/assigns a new Google Meet room for this session
exports.generateMeet = async (req, res) => {
  const session = await Session.findById(req.params.id).populate('request_id');
  if (!session) return res.status(404).json({ message: 'Session not found' });

  const r = session.request_id;
  const uid = req.user.id.toString();
  if (r.requester_id.toString() !== uid && r.provider_id.toString() !== uid && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Generate fresh meet code
  const chars = 'abcdefghijkmnopqrstuvwxyz';
  const seg = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  session.meet_code = `skillswap-${seg(3)}-${seg(4)}-${seg(3)}`;
  session.meet_link = `https://meet.jit.si/${session.meet_code}`;

  // Build Google Calendar link
  const skillTitle = r.skill_id?.title || 'Skill Exchange';
  session.calendar_link = buildCalendarLink({
    title:           `SkillSwap: ${skillTitle}`,
    description:     `Skill exchange session via SkillSwap.\n${session.notes || ''}`,
    startDate:       session.scheduled_at,
    durationMinutes: session.duration_minutes,
    meetLink:        session.meet_link,
  });

  await session.save();

  // Email Notification for Session Start / Link Generated
  const User = require('../models/User');
  const { sendEmail } = require('../utils/email');
  const reqUser = await User.findById(r.requester_id);
  const provUser = await User.findById(r.provider_id);
  
  if (reqUser && provUser) {
     const emailSubject = `SkillSwap Session Link Generated: ${skillTitle}`;
     const emailText = `Hello,\n\nThe Google Meet link for your upcoming session "${skillTitle}" is now available!\n\nJoin here: ${session.meet_link}\n\nAdd to calendar: ${session.calendar_link}\n\nHave a great session!\n\nSkillSwap Team`;
     if (reqUser.email || reqUser.gmail) await sendEmail(reqUser.email || reqUser.gmail, emailSubject, emailText);
     if (provUser.email || provUser.gmail) await sendEmail(provUser.email || provUser.gmail, emailSubject, emailText);
  }

  res.json({
    meet_link:     session.meet_link,
    meet_code:     session.meet_code,
    calendar_link: session.calendar_link,
  });
};
