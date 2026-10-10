const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  // Mock setup for development if credentials are missing
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows'
  });
}

async function sendEmail(to, subject, text) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn(`[Mock Email] Set EMAIL_USER and EMAIL_PASS in .env to send real emails to ${to}.`);
    }
    const info = await transporter.sendMail({
      from: '"SkillSwap" <' + (process.env.EMAIL_USER || 'noreply@skillswap.local') + '>',
      to,
      subject,
      text
    });
    console.log(`[Email sent to ${to}] Subject: ${subject}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

module.exports = { sendEmail };
