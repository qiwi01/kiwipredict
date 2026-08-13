const mongoose = require('mongoose');

const announcementItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const SiteSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  announcements: {
    enabled: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: 'Latest Update'
    },
    rotationSpeed: {
      type: Number,
      default: 3500,
      min: 1500,
      max: 15000
    },
    items: {
      type: [announcementItemSchema],
      default: [
        { text: 'New Premier League season is here.', isActive: true },
        { text: 'Check today\'s top picks and VIP selections.', isActive: true }
      ]
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);