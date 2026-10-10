// Run with: npm run seed
// Creates demo categories, badges, and accounts (password: 1234)
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']); // fix ISP DNS blocking MongoDB SRV
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User     = require('./models/User');
const Category = require('./models/Category');
const Skill    = require('./models/Skill');
const { Badge } = require('./models/Badge');

const categories = [
  'Programming', 'Design', 'Music', 'Language', 'Marketing',
  'Data Science', 'Photography', 'Writing', 'Business', 'Fitness'
];

const badges = [
  { name: '5-Star Mentor',  description: 'Received a 5-star review', icon: '⭐' },
  { name: 'First Exchange', description: 'Completed first skill exchange', icon: '🤝' },
  { name: 'Top Teacher',    description: 'Taught 10+ sessions', icon: '🎓' },
];

const demoUsers = [
  { name: 'Alex Chen',   email: 'admin@gmail.com',           role: 'admin', avatar: 'https://i.pravatar.cc/150?img=12', bio: 'Platform administrator.' },
  { name: 'Demo User',   email: 'demo@gmail.com',            role: 'user',  avatar: 'https://i.pravatar.cc/150?img=13', bio: 'Full-stack learner exploring new skills.' },
  { name: 'Sara Patel',  email: 'sara.patel@example.com',    role: 'user',  avatar: 'https://i.pravatar.cc/150?img=5',  bio: 'Product designer, 6 yrs experience.' },
  { name: 'Marcus Wu',   email: 'marcus.wu@example.com',     role: 'user',  avatar: 'https://i.pravatar.cc/150?img=15', bio: 'Data scientist who loves teaching Python.' },
  { name: 'Elena Ruiz',  email: 'elena.ruiz@example.com',    role: 'user',  avatar: 'https://i.pravatar.cc/150?img=9',  bio: 'Native Spanish speaker & tutor.' },
  { name: 'James Park',  email: 'james.park@example.com',    role: 'user',  avatar: 'https://i.pravatar.cc/150?img=33', bio: 'Guitarist and music theory nerd.' },
  { name: 'Priya Singh', email: 'priya.singh@example.com',   role: 'user',  avatar: 'https://i.pravatar.cc/150?img=25', bio: 'Digital marketing strategist.' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // --- Categories ---
  console.log('\n📂 Seeding categories...');
  for (const name of categories) {
    await Category.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    console.log(`  ✔ ${name}`);
  }

  // --- Badges ---
  console.log('\n🏅 Seeding badges...');
  for (const b of badges) {
    await Badge.findOneAndUpdate({ name: b.name }, b, { upsert: true, new: true });
    console.log(`  ✔ ${b.name}`);
  }

  // --- Users ---
  console.log('\n👥 Seeding users (password: 1234)...');
  const hash = await bcrypt.hash('1234', 10);
  const createdUsers = [];
  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  - ${u.email} already exists, skipping`);
      createdUsers.push(existing);
      continue;
    }
    const user = await User.create({
      name: u.name, email: u.email, password_hash: hash,
      role: u.role, avatar_url: u.avatar, bio: u.bio,
    });
    console.log(`  ✔ created ${u.email} (${u.role})`);
    createdUsers.push(user);
  }

  // --- Sample Skills ---
  console.log('\n🛠  Seeding sample skills...');
  const progCat  = await Category.findOne({ name: 'Programming' });
  const designCat = await Category.findOne({ name: 'Design' });
  const musicCat = await Category.findOne({ name: 'Music' });
  const langCat  = await Category.findOne({ name: 'Language' });
  const dataCat  = await Category.findOne({ name: 'Data Science' });

  const sara   = createdUsers.find(u => u.email === 'sara.patel@example.com');
  const marcus = createdUsers.find(u => u.email === 'marcus.wu@example.com');
  const elena  = createdUsers.find(u => u.email === 'elena.ruiz@example.com');
  const james  = createdUsers.find(u => u.email === 'james.park@example.com');

  const sampleSkills = [
    { user_id: sara._id,   category_id: designCat._id, title: 'UI/UX Design Fundamentals', description: 'Learn Figma, wireframing, and user research.', level: 'Intermediate', tags: ['figma', 'ui', 'ux'] },
    { user_id: marcus._id, category_id: progCat._id,   title: 'Python for Data Science',   description: 'Pandas, NumPy, and intro to ML.',               level: 'Beginner',     tags: ['python', 'pandas', 'ml'] },
    { user_id: marcus._id, category_id: dataCat._id,   title: 'Machine Learning Basics',    description: 'Scikit-learn and model evaluation.',             level: 'Intermediate', tags: ['sklearn', 'ml'] },
    { user_id: elena._id,  category_id: langCat._id,   title: 'Conversational Spanish',    description: 'Practice spoken Spanish for travel & work.',    level: 'All Levels',   tags: ['spanish', 'language'] },
    { user_id: james._id,  category_id: musicCat._id,  title: 'Guitar for Beginners',      description: 'Chords, strumming patterns, and first songs.',  level: 'Beginner',     tags: ['guitar', 'music'] },
  ];

  for (const s of sampleSkills) {
    const exists = await Skill.findOne({ user_id: s.user_id, title: s.title });
    if (!exists) {
      await Skill.create(s);
      console.log(`  ✔ "${s.title}"`);
    } else {
      console.log(`  - "${s.title}" already exists, skipping`);
    }
  }

  console.log('\n🎉 Seeding complete!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
