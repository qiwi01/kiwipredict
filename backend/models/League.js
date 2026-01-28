const mongoose = require('mongoose');

const LeagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  teams: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    founded: {
      type: Number
    },
    stadium: {
      type: String,
      trim: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Temporarily disable pre-save middleware for testing
// LeagueSchema.pre('save', function(next) {
//   this.updatedAt = new Date();
//   next();
// });

// Index for better query performance
LeagueSchema.index({ country: 1 });

module.exports = mongoose.model('League', LeagueSchema);
