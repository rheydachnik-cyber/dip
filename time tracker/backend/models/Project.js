const mongoose = require('mongoose');
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#007bff' },
  description: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Project', projectSchema);
