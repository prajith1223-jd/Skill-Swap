// Run with: node enrich.js
// Adds rich data: bios, exchange requests, sessions, messages, reviews, notifications
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User            = require('./models/User');
const Skill           = require('./models/Skill');
const ExchangeRequest = require('./models/ExchangeRequest');
const Session         = require('./models/Session');
const Message         = require('./models/Message');
const Notification    = require('./models/Notification');
const Review          = require('./models/Review');
const { Badge, UserBadge } = require('./models/Badge');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── Fetch all users ────────────────────────────────────────────────────────
  const users = await User.find().lean();
  const byEmail = {};
  users.forEach(u => byEmail[u.email] = u);

  const admin  = byEmail['admin@gmail.com'];
  const demo   = byEmail['demo@gmail.com'];
  const sara   = byEmail['sara.patel@example.com'];
  const marcus = byEmail['marcus.wu@example.com'];
  const elena  = byEmail['elena.ruiz@example.com'];
  const james  = byEmail['james.park@example.com'];
  const priya  = byEmail['priya.singh@example.com'];
  const tom    = byEmail['tom.baker@example.com'];
  const aisha  = byEmail['aisha.noor@example.com'];
  const liam   = byEmail['liam.johnson@example.com'];

  // ── Update rich bios ───────────────────────────────────────────────────────
  console.log('👤 Updating user profiles...');
  const bioUpdates = [
    { email: 'admin@gmail.com',           bio: '🛡️ Platform administrator & full-stack developer with 8+ years of experience. Passionate about building communities that help people grow together.',                                           avatar: 'https://i.pravatar.cc/150?img=12' },
    { email: 'demo@gmail.com',            bio: '🎓 Computer Science student exploring full-stack development. Currently learning React and Node.js. Love sharing what I know about algorithms and problem-solving!',                             avatar: 'https://i.pravatar.cc/150?img=13' },
    { email: 'sara.patel@example.com',    bio: '🎨 Senior UI/UX Designer at a fintech startup with 6 years experience. Figma enthusiast, design systems advocate. Looking to learn machine learning to blend design with data.',               avatar: 'https://i.pravatar.cc/150?img=5'  },
    { email: 'marcus.wu@example.com',     bio: '📊 Data Scientist at Google with expertise in Python, TensorFlow, and BigQuery. Taught 200+ students online. Keen to improve my communication and presentation skills.',                        avatar: 'https://i.pravatar.cc/150?img=15' },
    { email: 'elena.ruiz@example.com',    bio: '🌍 Native Spanish speaker from Madrid, certified DELE instructor. Also fluent in French and Portuguese. Looking to learn programming basics and web development.',                              avatar: 'https://i.pravatar.cc/150?img=9'  },
    { email: 'james.park@example.com',    bio: '🎸 Professional guitarist with 12 years of experience. Music theory nerd, session musician. Teaching guitar and music theory online since 2019. Want to learn digital marketing for my studio.',  avatar: 'https://i.pravatar.cc/150?img=33' },
    { email: 'priya.singh@example.com',   bio: '📣 Digital Marketing Manager with 5 years at top agencies. Expert in SEO, Google Ads, and content strategy. Looking to learn data science to make my campaigns smarter.',                       avatar: 'https://i.pravatar.cc/150?img=25' },
    { email: 'tom.baker@example.com',     bio: '☁️ AWS Certified Solutions Architect and DevOps Engineer. Built infrastructure for 3 unicorn startups. Teaching cloud fundamentals and Docker. Want to learn mobile development.',                avatar: 'https://i.pravatar.cc/150?img=53' },
    { email: 'aisha.noor@example.com',    bio: '🔐 Cybersecurity Analyst with CEH and CISSP certifications. Passionate about ethical hacking, CTF competitions, and making the internet safer. Looking to learn data analysis.',                avatar: 'https://i.pravatar.cc/150?img=44' },
    { email: 'liam.johnson@example.com',  bio: '📱 Mobile Developer specialising in React Native and Flutter. Shipped 12+ apps to the App Store. Want to learn backend development and cloud services to go full-stack.',                       avatar: 'https://i.pravatar.cc/150?img=60' },
  ];

  for (const u of bioUpdates) {
    await User.updateOne({ email: u.email }, { bio: u.bio, avatar_url: u.avatar });
    console.log(`  ✔ Updated bio: ${u.email}`);
  }

  // ── Fetch all skills ───────────────────────────────────────────────────────
  const skills = await Skill.find().lean();
  const byTitle = {};
  skills.forEach(s => byTitle[s.title] = s);

  // ── Helper: create exchange request ────────────────────────────────────────
  async function makeRequest(requester, provider, skillTitle, message, status = 'pending') {
    const skill = byTitle[skillTitle];
    if (!skill) { console.log(`  ⚠ Skill not found: ${skillTitle}`); return null; }
    const existing = await ExchangeRequest.findOne({ requester_id: requester._id, skill_id: skill._id });
    if (existing) return existing;
    const req = await ExchangeRequest.create({
      requester_id: requester._id,
      provider_id:  provider._id,
      skill_id:     skill._id,
      message,
      status,
    });
    return req;
  }

  // ── Exchange Requests ──────────────────────────────────────────────────────
  console.log('\n🔄 Creating skill exchange requests...');

  // demo wants to learn Python from marcus
  const r1 = await makeRequest(demo, marcus, 'Python for Data Science',
    "Hi Marcus! I'm a CS student and would love to learn data science with Python. I can help you with algorithms and competitive programming in return!", 'accepted');

  // demo wants to learn guitar from james
  const r2 = await makeRequest(demo, james, 'Guitar for Beginners',
    "Hey James! I've always wanted to learn guitar. I can teach you basic programming concepts as a swap!", 'accepted');

  // liam wants UI/UX from sara
  const r3 = await makeRequest(liam, sara, 'UI/UX Design Fundamentals',
    "Hi Sara! I'm a mobile dev and my designs always look terrible 😅 Would love to learn Figma from you. I can teach you React Native in return!", 'accepted');

  // sara wants ML from marcus
  const r4 = await makeRequest(sara, marcus, 'Machine Learning Basics',
    "Hi Marcus! I'm a designer who wants to add ML skills to blend data with design. Can I swap UI/UX design tips with you?", 'accepted');

  // elena wants web dev from liam
  const r5 = await makeRequest(elena, liam, 'Full-Stack Web Development',
    "Hola Liam! I want to build a website for my language tutoring business. I can teach you Spanish conversational skills in return!", 'accepted');

  // james wants marketing from priya
  const r6 = await makeRequest(james, priya, 'Digital Marketing Strategy',
    "Hey Priya! I'm a musician trying to grow my online presence. I can give you guitar lessons in return for marketing advice!", 'accepted');

  // priya wants data science from marcus
  const r7 = await makeRequest(priya, marcus, 'Python for Data Science',
    "Hi Marcus! I need to level up my analytics skills for smarter campaigns. Happy to swap with SEO and content writing lessons!", 'pending');

  // aisha wants mobile from liam
  const r8 = await makeRequest(aisha, liam, 'React Native for Beginners',
    "Hi Liam! I want to build a security app for Android. Can swap ethical hacking lessons with you!", 'pending');

  // tom wants mobile from liam
  const r9 = await makeRequest(tom, liam, 'Flutter App Development',
    "Hey Liam! I'm a cloud guy wanting to go mobile. Can teach you AWS and Docker in return!", 'accepted');

  // demo wants Spanish from elena
  const r10 = await makeRequest(demo, elena, 'Conversational Spanish',
    "Hola Elena! I'm planning to travel to Spain next year. Would love Spanish lessons! I can help with programming basics in exchange.", 'completed');

  // admin wants guitar from james
  const r11 = await makeRequest(admin, james, 'Guitar for Beginners',
    "Hey James! Admin life is stressful — I want to learn guitar to relax 🎸 Happy to help with any platform tech issues!", 'completed');

  // aisha wants Python from marcus
  const r12 = await makeRequest(aisha, marcus, 'Python Crash Course',
    "Hi Marcus! Python would really help my cybersecurity scripts. Can exchange network security lessons!", 'rejected');

  console.log('  ✔ Created 12 exchange requests');

  // ── Sessions ───────────────────────────────────────────────────────────────
  console.log('\n📅 Creating sessions...');

  async function makeSession(request, scheduledDaysFromNow, status = 'upcoming', notes = '') {
    if (!request) return null;
    const existing = await Session.findOne({ request_id: request._id });
    if (existing) return existing;
    const scheduled = new Date(Date.now() + scheduledDaysFromNow * 24 * 60 * 60 * 1000);
    return await Session.create({ request_id: request._id, scheduled_at: scheduled, duration_minutes: 60, status, notes });
  }

  await makeSession(r1, 2,   'upcoming',  'Starting with Pandas basics — demo to share GitHub profile beforehand.');
  await makeSession(r2, 5,   'upcoming',  'First session: tune guitar, basic chords Em, Am, G, D.');
  await makeSession(r3, -3,  'completed', 'Covered Figma components and auto-layout. Great session!');
  await makeSession(r4, 3,   'upcoming',  'Intro to scikit-learn and linear regression.');
  await makeSession(r5, 7,   'upcoming',  'HTML/CSS basics and React intro for Elena.');
  await makeSession(r6, -7,  'completed', 'Reviewed James\'s social media presence. Identified top 3 growth opportunities.');
  await makeSession(r9, 4,   'upcoming',  'Flutter basics: widgets, state management, navigation.');
  await makeSession(r10, -14,'completed', 'Great session! Demo learned greetings, numbers, and travel phrases.');
  await makeSession(r11, -10,'completed', 'Admin nailed the G, C, D chord progression! Very motivated student.');

  console.log('  ✔ Created 9 sessions');

  // ── Reviews ────────────────────────────────────────────────────────────────
  console.log('\n⭐ Creating reviews...');

  async function makeReview(reviewer, reviewee, rating, comment) {
    const existing = await Review.findOne({ reviewer_id: reviewer._id, reviewee_id: reviewee._id });
    if (existing) return existing;
    return await Review.create({ reviewer_id: reviewer._id, reviewee_id: reviewee._id, rating, comment });
  }

  await makeReview(demo,   elena,  5, "Elena is an amazing tutor! So patient and encouraging. I learned more Spanish in 1 hour than in weeks of app usage. Highly recommend! 🌟");
  await makeReview(elena,  demo,   4, "Demo is a quick learner and very enthusiastic. Made the session really fun. Looking forward to teaching more!");
  await makeReview(admin,  james,  5, "James is incredibly talented and a fantastic teacher. The way he breaks down complex chords is genius. 5 stars without hesitation!");
  await makeReview(james,  admin,  4, "Great session with the admin! Very dedicated student. Came prepared with questions. Would swap again.");
  await makeReview(liam,   sara,   5, "Sara completely transformed how I think about UI design. Her Figma tips alone saved me hours on every project. Absolute legend!");
  await makeReview(sara,   liam,   5, "Liam is an excellent React Native teacher. Code examples were clean and well explained. Super helpful!");
  await makeReview(james,  priya,  5, "Priya's marketing strategy session was eye-opening. She analysed my whole online presence and gave me a clear action plan. Worth every minute!");
  await makeReview(priya,  james,  4, "James is a fun and engaging teacher. Already seeing growth on my Instagram with his tips. Would definitely recommend!");
  await makeReview(demo,   marcus, 5, "Marcus made data science so accessible! His real-world examples using actual datasets made everything click. Can't wait for the next session!");

  console.log('  ✔ Created 9 reviews');

  // ── Auto-award badges for 5-star reviews ──────────────────────────────────
  console.log('\n🏅 Awarding badges...');
  const starBadge = await Badge.findOne({ name: '5-Star Mentor' });
  const firstBadge = await Badge.findOne({ name: 'First Exchange' });
  const earlyBadge = await Badge.findOne({ name: 'Early Adopter' });

  const fiveStarReceivers = [elena, james, sara, liam, priya, marcus];
  const exchangers = [demo, sara, marcus, elena, james, priya, tom, aisha, liam, admin];

  for (const u of fiveStarReceivers) {
    if (starBadge && !await UserBadge.findOne({ user_id: u._id, badge_id: starBadge._id })) {
      await UserBadge.create({ user_id: u._id, badge_id: starBadge._id });
      console.log(`  ✔ 5-Star Mentor → ${u.name}`);
    }
  }
  for (const u of exchangers) {
    if (firstBadge && !await UserBadge.findOne({ user_id: u._id, badge_id: firstBadge._id })) {
      await UserBadge.create({ user_id: u._id, badge_id: firstBadge._id });
      console.log(`  ✔ First Exchange → ${u.name}`);
    }
    if (earlyBadge && !await UserBadge.findOne({ user_id: u._id, badge_id: earlyBadge._id })) {
      await UserBadge.create({ user_id: u._id, badge_id: earlyBadge._id });
      console.log(`  ✔ Early Adopter → ${u.name}`);
    }
  }

  // ── Messages ───────────────────────────────────────────────────────────────
  console.log('\n💬 Creating messages...');

  async function chat(u1, u2, messages) {
    for (const [sender, text, minsAgo] of messages) {
      const t = new Date(Date.now() - minsAgo * 60000);
      await Message.create({ sender_id: sender._id, receiver_id: (sender === u1 ? u2 : u1)._id, content: text, created_at: t, is_read: true });
    }
  }

  await chat(demo, marcus, [
    [marcus, "Hey! I saw you signed up for the Python data science session. Looking forward to it!", 2880],
    [demo,   "Hi Marcus! Yes, super excited! Should I install anything beforehand?", 2870],
    [marcus, "Just install Anaconda and VS Code. I'll share a Jupyter notebook link before we start 👍", 2860],
    [demo,   "Perfect, done! Also — I pushed a sorting algorithm repo to GitHub if you want to check it out.", 2850],
    [marcus, "Nice! I'll take a look. See you at the session tomorrow!", 2840],
  ]);

  await chat(demo, james, [
    [james,  "Hey! Ready for your first guitar lesson? 🎸 Do you have a guitar already?", 1440],
    [demo,   "Yes! I bought a cheap acoustic. Hope that's okay for starters?", 1430],
    [james,  "Perfect for beginners! We'll start with open chords. Tune it with the GuitarTuna app first.", 1420],
    [demo,   "Amazing, done! My fingers already hurt just pressing the strings 😅", 1415],
    [james,  "Haha that's normal! Calluses build up within 2 weeks. You'll be fine! See you soon 🤘", 1410],
  ]);

  await chat(sara, liam, [
    [liam,   "Sara! That Figma session yesterday was incredible. Already redesigned my app's onboarding flow!", 720],
    [sara,   "That's amazing Liam! 🎉 Send me the before/after — I'd love to see it!", 710],
    [liam,   "Here's the link: [figma.com/file/...] What do you think?", 700],
    [sara,   "HUGE improvement! The spacing and typography are so much better. Just align that CTA button.", 690],
    [liam,   "Fixed! Now — shall we schedule the React Native session for next week?", 680],
    [sara,   "Yes! Thursday 3pm works for me. Let's do 2 hours this time 😊", 675],
  ]);

  await chat(james, priya, [
    [james,  "Priya that marketing session blew my mind. I had no idea Instagram Reels could drive that much traffic!", 4320],
    [priya,  "Right?! Short-form video is everything right now. Post 3 Reels a week showing your guitar skills!", 4310],
    [james,  "On it! I posted one last night and got 200 views already 🎉", 1440],
    [priya,  "That's amazing for a first post! Make sure to use trending audio. Want me to share a list?", 1430],
    [james,  "Yes please! And I've scheduled your next guitar lesson for Saturday — see you then!", 1420],
    [priya,  "Can't wait! I've been practicing the G chord every day 😄", 1410],
  ]);

  await chat(elena, demo, [
    [elena,  "¡Hola! Great session today! Your Spanish accent is already better than most beginners!", 360],
    [demo,   "Gracias Elena! 🙏 The trick with rolling the R is so fun. When's our next session?", 350],
    [elena,  "How about next Tuesday? We'll cover past tense and travel vocabulary.", 340],
    [demo,   "Perfect! I'm going to Barcelona in December so travel Spanish is exactly what I need.", 330],
    [elena,  "¡Perfecto! You'll be ordering tapas like a local 😄 Hasta pronto!", 320],
  ]);

  await chat(tom, liam, [
    [tom,    "Liam! Excited about the Flutter session. Should I install Flutter SDK beforehand?", 2160],
    [liam,   "Yes! Install Flutter and Android Studio. Run `flutter doctor` and share any errors.", 2150],
    [tom,    "Done. 3 warnings about Android licenses. Is that normal?", 2145],
    [liam,   "Run `flutter doctor --android-licenses` and accept all. Then you're golden!", 2140],
    [tom,    "Perfect, all clear now! In return I'll walk you through setting up AWS EC2 + S3.", 2130],
    [liam,   "Deal! That's exactly what I need for my app backend. Can't wait! 🚀", 2120],
  ]);

  console.log('  ✔ Created conversations between 6 pairs of users');

  // ── Notifications ──────────────────────────────────────────────────────────
  console.log('\n🔔 Creating notifications...');

  const notifs = [
    { user: demo,   type: 'request',        content: 'Marcus Wu accepted your Python for Data Science exchange request!',    link: '/frontend/requests.html' },
    { user: demo,   type: 'request',        content: 'James Park accepted your Guitar for Beginners exchange request!',      link: '/frontend/requests.html' },
    { user: demo,   type: 'review',         content: 'Elena Ruiz left you a 4-star review ⭐⭐⭐⭐',                          link: '/frontend/reviews.html'  },
    { user: demo,   type: 'message',        content: 'New message from Marcus Wu',                                           link: '/frontend/messages.html' },
    { user: marcus, type: 'request',        content: 'Priya Singh wants to exchange — Python for Data Science',              link: '/frontend/requests.html' },
    { user: marcus, type: 'review',         content: 'Demo User left you a 5-star review ⭐⭐⭐⭐⭐',                         link: '/frontend/reviews.html'  },
    { user: sara,   type: 'review',         content: 'Liam Johnson left you a 5-star review ⭐⭐⭐⭐⭐',                       link: '/frontend/reviews.html'  },
    { user: sara,   type: 'session',        content: 'Upcoming session with Liam Johnson in 3 days',                         link: '/frontend/sessions.html' },
    { user: james,  type: 'review',         content: 'Admin Alex left you a 5-star review ⭐⭐⭐⭐⭐',                         link: '/frontend/reviews.html'  },
    { user: james,  type: 'message',        content: 'New message from Priya Singh',                                         link: '/frontend/messages.html' },
    { user: liam,   type: 'request',        content: 'Aisha Noor wants to exchange — React Native for Beginners',            link: '/frontend/requests.html' },
    { user: liam,   type: 'review',         content: 'Sara Patel left you a 5-star review ⭐⭐⭐⭐⭐',                         link: '/frontend/reviews.html'  },
    { user: priya,  type: 'review',         content: 'James Park left you a 5-star review ⭐⭐⭐⭐⭐',                         link: '/frontend/reviews.html'  },
    { user: elena,  type: 'review',         content: 'Demo User left you a 5-star review ⭐⭐⭐⭐⭐',                          link: '/frontend/reviews.html'  },
    { user: tom,    type: 'session',        content: 'Upcoming Flutter session with Liam Johnson in 4 days',                 link: '/frontend/sessions.html' },
    { user: aisha,  type: 'request_update', content: 'Your Python Crash Course request was rejected',                        link: '/frontend/requests.html' },
    { user: admin,  type: 'review',         content: 'You received a 4-star review from James Park',                         link: '/frontend/reviews.html'  },
  ];

  for (const n of notifs) {
    const exists = await Notification.findOne({ user_id: n.user._id, content: n.content });
    if (!exists) {
      await Notification.create({ user_id: n.user._id, type: n.type, content: n.content, link: n.link, is_read: false });
    }
  }
  console.log(`  ✔ Created ${notifs.length} notifications`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n🎉 Enrichment complete!');
  console.log('   📝 10 user bios updated');
  console.log('   🔄 12 exchange requests created');
  console.log('   📅 9  sessions scheduled');
  console.log('   ⭐ 9  reviews written');
  console.log('   💬 6  message conversations');
  console.log('   🔔 17 notifications sent');
  console.log('   🏅 Badges awarded to active users');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Enrichment failed:', err.message);
  process.exit(1);
});
