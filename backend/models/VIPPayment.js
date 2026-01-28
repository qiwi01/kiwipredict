const mongoose = require('mongoose');

const VIPPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 20000 // 20k Naira
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paystackReference: {
    type: String,
    required: true
  },
  tier: {
    type: String,
    enum: ['vip', 'vvip'],
    default: 'vip'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  confirmedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('VIPPayment', VIPPaymentSchema);
