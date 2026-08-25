const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  homeGoals: {
    type: Number,
    default: null
  },
  awayGoals: {
    type: Number,
    default: null
  },
  externalFixtureId: {
    type: Number,
    index: true
  },
  competitionCode: String,
  apiSource: {
    type: String,
    default: 'manual'
  },
  predictionBatchId: String,
  predictionsGeneratedAt: Date,
  predictionsGeneratedBy: String,
  predictionStatus: {
    type: String,
    enum: ['manual', 'pending_review', 'approved', 'unpublished'],
    default: 'manual',
    index: true
  },
  predictionsApprovedAt: Date,
  predictionsApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: true
  },
  league: {
    type: String,
    required: true
  },
  odds: {
    home: Number,
    draw: Number,
    away: Number
  },
  bookmakerOdds: {
    home: Number,
    draw: Number,
    away: Number,
    bookmaker: String
  },
  predictions: [{
    type: {
      type: String,
      enum: ['win', 'over15', 'over25', 'over35', 'corners', 'ggng', 'others', 'player'],
      required: true
    },
    prediction: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    valueBet: {
      type: Boolean,
      default: false
    },
    probability: Number,
    fairOdds: Number,
    modelVersion: String,
    generatedBy: String,
    generatedAt: Date,
    explanation: String,
    odds: {
      home: Number,
      draw: Number,
      away: Number,
      over: Number,
      under: Number
    },
    visibility: {
      type: String,
      enum: ['all', 'vip', 'vvip', 'both'],
      default: 'all'
    }
  }],
  homeStrength: {
    type: Number,
    min: 0,
    max: 100
  },
  awayStrength: {
    type: Number,
    min: 0,
    max: 100
  },
  gameTier: {
    type: String,
    enum: ['none', 'vip', 'vvip'],
    default: 'none'
  },
  outcomes: [{
    predictionType: {
      type: String,
      enum: ['win', 'over15', 'over25', 'over35', 'corners', 'ggng', 'others', 'player'],
      required: true
    },
    prediction: {
      type: String,
      required: true
    },
    actualResult: {
      type: String,
      enum: ['win', 'loss', 'pending'],
      default: 'pending'
    },
    outcomeSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    outcomeSetAt: {
      type: Date
    }
  }]
});

// Index for better query performance
MatchSchema.index({ date: 1 });
MatchSchema.index({ league: 1 });

module.exports = mongoose.model('Match', MatchSchema);
