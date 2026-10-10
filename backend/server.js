require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const express   = require('express');
const connectDB = require('./config/db');
connectDB();
const http    = require('http');
const cors    = require('cors');
const session = require('express-session');
const passport = require('./config/passport');   // configured passport with strategies
const { Server } = require('socket.io');
const { verifyToken } = require('./utils/token');

const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const skillRoutes        = require('./routes/skillRoutes');
const categoryRoutes     = require('./routes/categoryRoutes');
const requestRoutes      = require('./routes/requestRoutes');
const sessionRoutes      = require('./routes/sessionRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes       = require('./routes/reviewRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const chatbotRoutes      = require('./routes/chatbotRoutes');

const app    = express();
const server = http.createServer(app);

const corsOptions = {
  origin: (origin, callback) => {
    const isLocal = !origin || /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocal) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'skillswap_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 10 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('io', io);

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    socket.user = verifyToken(token);
    next();
  } catch { next(new Error('Auth failed')); }
});
io.on('connection', (socket) => {
  socket.join(`user_${socket.user.id}`);
  
  socket.on('typing', (data) => {
    // data should contain { receiver_id, is_typing }
    if (data && data.receiver_id) {
      io.to(`user_${data.receiver_id}`).emit('typing', {
        sender_id: socket.user.id,
        is_typing: data.is_typing
      });
    }
  });

  socket.on('disconnect', () => {});
});

// ── REST routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/skills',        skillRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/sessions',      sessionRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/chatbot',       chatbotRoutes);

// 404
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err.message);
  if (err.name === 'CastError')       return res.status(400).json({ message: 'Invalid ID format' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  res.status(500).json({ message: 'Server error', error: err.message });
});

process.on('unhandledRejection', (err) => console.error('[UnhandledRejection]', err?.message));
process.on('uncaughtException',  (err) => console.error('[UncaughtException]',  err?.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ SkillSwap API running on http://localhost:${PORT}`));
