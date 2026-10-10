const { GoogleGenerativeAI } = require('@google/generative-ai');
const Skill = require('../models/Skill');
const User = require('../models/User');

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Fetch context data
    const skills = await Skill.find().populate('user_id', 'name avg_rating').limit(100);
    const users = await User.find().select('name bio avg_rating skills').limit(100);

    const query = message.toLowerCase();
    
    // Greeting
    if (query.match(/^(hi|hello|hey|greetings)/)) {
      return res.json({ reply: "Hello! I am the SkillSwap AI assistant. I can help you find courses, specific skills, or top-rated teachers. Just ask me what you're looking for!" });
    }

    // Top teachers
    if (query.includes('top') || query.includes('best') || query.includes('rated')) {
      const topUsers = users.filter(u => u.avg_rating >= 4.0).sort((a,b) => b.avg_rating - a.avg_rating).slice(0, 3);
      if (topUsers.length === 0) return res.json({ reply: "I couldn't find any highly-rated teachers at the moment." });
      const list = topUsers.map(u => `⭐ **${u.name}** (Rating: ${u.avg_rating})`).join('<br>');
      return res.json({ reply: `Here are some of our top-rated teachers:<br>${list}<br>You can search for their names to see their courses!` });
    }

    // Find specific skill
    const foundSkills = skills.filter(s => 
      s.title.toLowerCase().includes(query) || 
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.category && s.category.toLowerCase().includes(query))
    );

    if (foundSkills.length > 0) {
      const list = foundSkills.slice(0, 4).map(s => 
        `📘 **${s.title}** (${s.level})<br>taught by ${s.user_id ? s.user_id.name : 'Unknown'}`
      ).join('<br><br>');
      
      let reply = `I found ${foundSkills.length} course(s) that might match what you're looking for:<br><br>${list}`;
      if (foundSkills.length > 4) reply += `<br><br>...and more! Try searching in the "Browse Skills" page for full results.`;
      
      return res.json({ reply });
    }

    // Catch-all
    res.json({ reply: "I'm sorry, I couldn't find any specific courses or profiles matching that. Try asking for a specific topic like 'Python', 'Web Development', or ask for 'top teachers'!" });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ reply: 'Sorry, I encountered an error while trying to think. Please try again later.' });
  }
};
