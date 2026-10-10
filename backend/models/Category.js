const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, maxlength: 60 },
});

module.exports = mongoose.model('Category', categorySchema);
