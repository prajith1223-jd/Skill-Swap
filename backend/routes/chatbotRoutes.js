const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, chatbotController.chat);

module.exports = router;
