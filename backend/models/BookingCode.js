const mongoose = require('mongoose');

const BookingCodeSchema = new mongoose.Schema({
  bookmaker: {
    type: String,
    enum: ['sportybet', 'bet9ja', 'footballcom'],
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  odds: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    default: 'VIP Booking Code'
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('BookingCode', BookingCodeSchema);
