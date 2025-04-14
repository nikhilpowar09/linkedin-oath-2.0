// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  linkedInId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  expiresIn: {
    type: Number
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  profilePicture: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);