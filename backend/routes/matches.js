const express = require('express');
const axios = require('axios');
const { generatePrediction, generateMockOdds, isValueBet, calculateMatchProbabilities } = require('../utils/predictions');
const Match = require('../models/Match');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Mock data for development
const mockFixtures = [
  {
    id: 1001,
    utcDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    homeTeam: { id: 33, name: "Manchester United" },
    awayTeam: { id: 34, name: "Liverpool" },
    competition: { id: 8, name: "Premier League" }
  },
  {
    id: 1002,
    utcDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    homeTeam: { id: 35, name: "Chelsea" },
    awayTeam: { id: 36, name: "Arsenal" },
    competition: { id: 8, name: "Premier League" }
  },
  {
    id: 1003,
    utcDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    homeTeam: { id: 37, name: "Manchester City" },
    awayTeam: { id: 38, name: "Tottenham" },
    competition: { id: 8, name: "Premier League" }
  },
  {
    id: 1004,
    utcDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    homeTeam: { id: 39, name: "Newcastle" },
    awayTeam: { id: 40, name: "Brighton" },
    competition: { id: 8, name: "Premier League" }
  }
];

// Fetch admin-created matches only (filter VIP/VVIP games for non-VIP users and only matches with predictions)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userTier = user ? user.vipTier : 'none';

    // Build query - exclude VIP/VVIP games based on user tier AND only include matches with predictions
    const query = {
      predictions: { $exists: true, $ne: [], $not: { $size: 0 } } // Only matches with predictions
    };

    // Filter games based on user tier
    if (userTier === 'none') {
      // Normal users can only see 'none' tier games
      query.gameTier = 'none';
    } else if (userTier === 'vip') {
      // VIP users can see 'none' and 'vip' tier games, but not 'vvip'
      query.gameTier = { $in: ['none', 'vip'] };
    }
    // VVIP users can see all games (no additional filter needed)

    const matches = await Match.find(query)
      .sort({ date: 1 })
      .select('homeTeam awayTeam date league predictions bookmakerOdds gameTier');

    // Filter predictions based on visibility settings
    const formattedMatches = matches.map(match => {
      let visiblePredictions = match.predictions || [];

      // Filter predictions based on user tier and visibility
      visiblePredictions = visiblePredictions.filter(pred => {
        const visibility = pred.visibility || 'all';

        if (visibility === 'all') {
          return true;
        } else if (visibility === 'vip') {
          return userTier === 'vip' || userTier === 'vvip';
        } else if (visibility === 'vvip') {
          return userTier === 'vvip';
        } else if (visibility === 'both') {
          return userTier === 'vip' || userTier === 'vvip';
        }

        return false;
      });

      return {
        id: match._id,
        utcDate: match.date.toISOString(),
        homeTeam: {
          name: match.homeTeam
        },
        awayTeam: {
          name: match.awayTeam
        },
        competition: {
          name: match.league
        },
        predictions: visiblePredictions,
        bookmakerOdds: match.bookmakerOdds,
        gameTier: match.gameTier
      };
    });

    // Only return matches that still have visible predictions after filtering
    const matchesWithVisiblePredictions = formattedMatches.filter(match => match.predictions.length > 0);

    res.json(matchesWithVisiblePredictions);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new match (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { homeTeam, awayTeam, league, date, time, predictions, odds, gameTier } = req.body;

    // Validation
    if (!homeTeam || !awayTeam || !league || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return res.status(400).json({ error: 'At least one prediction is required' });
    }

    // Combine date and time
    const matchDate = new Date(`${date}T${time}`);
    if (isNaN(matchDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    // Process predictions array
    let processedPredictions = [];
    if (predictions && predictions.length > 0) {
      for (const pred of predictions) {
        // Validate prediction
        if (!pred.type || !['win', 'over15', 'over25', 'over35', 'corners', 'ggng', 'others', 'player'].includes(pred.type)) {
          return res.status(400).json({ error: `Invalid prediction type: ${pred.type}` });
        }
        if (!pred.prediction || typeof pred.prediction !== 'string') {
          return res.status(400).json({ error: 'Prediction text is required' });
        }
        if (typeof pred.confidence !== 'number' || pred.confidence < 0 || pred.confidence > 100) {
          return res.status(400).json({ error: 'Confidence must be a number between 0 and 100' });
        }

        // Generate probabilities for value bet calculation if needed
        let probabilities = null;
        if (pred.type === 'win' && !pred.probabilities) {
          const homeStrength = Math.random() * 40 + 30;
          const awayStrength = Math.random() * 40 + 30;
          probabilities = calculateMatchProbabilities(homeStrength, awayStrength);
        }

        // Determine if it's a value bet
        let valueBetFlag = pred.valueBet || false;
        if (!pred.valueBet && probabilities && pred.type === 'win') {
          const bookmakerOdds = generateMockOdds();
          valueBetFlag = isValueBet(pred.prediction, bookmakerOdds, probabilities);
        }

        processedPredictions.push({
          type: pred.type,
          prediction: pred.prediction,
          confidence: pred.confidence,
          valueBet: valueBetFlag,
          odds: pred.odds || {},
          visibility: pred.visibility || 'all'
        });
      }
    }

    const bookmakerOdds = generateMockOdds();

    const newMatch = new Match({
      homeTeam,
      awayTeam,
      date: matchDate,
      league,
      odds: odds || { home: 2.0, draw: 3.0, away: 2.0 },
      bookmakerOdds,
      predictions: processedPredictions,
      homeStrength: Math.round(Math.random() * 40 + 30),
      awayStrength: Math.round(Math.random() * 40 + 30),
      gameTier: gameTier || 'none'
    });

    await newMatch.save();

    res.status(201).json({
      message: 'Match added successfully',
      match: {
        id: newMatch._id,
        homeTeam: newMatch.homeTeam,
        awayTeam: newMatch.awayTeam,
        date: newMatch.date,
        league: newMatch.league,
        predictions: newMatch.predictions,
        bookmakerOdds: newMatch.bookmakerOdds
      }
    });
  } catch (err) {
    console.error('Error adding match:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get admin-created matches (for recent games display)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const matches = await Match.find({})
      .sort({ date: -1 })
      .select('homeTeam awayTeam date league predictions bookmakerOdds gameTier homeGoals awayGoals outcomes')
      .populate('outcomes.outcomeSetBy', 'username');

    res.json(matches.map(match => ({
      id: match._id,
      homeTeam: { name: match.homeTeam },
      awayTeam: { name: match.awayTeam },
      utcDate: match.date.toISOString(),
      competition: { name: match.league },
      predictions: match.predictions || [],
      bookmakerOdds: match.bookmakerOdds,
      gameTier: match.gameTier,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      outcomes: match.outcomes || []
    })));
  } catch (err) {
    console.error('Error fetching admin matches:', err);
    res.status(500).json({ error: err.message });
  }
});

// Edit match (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { homeTeam, awayTeam, league, date, time, predictions, odds, gameTier } = req.body;

    // Validation
    if (!homeTeam || !awayTeam || !league || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Combine date and time
    const matchDate = new Date(`${date}T${time}`);
    if (isNaN(matchDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const updateData = {
      homeTeam,
      awayTeam,
      league,
      date: matchDate,
      gameTier: gameTier || 'none'
    };

    // Update predictions if provided
    if (predictions && Array.isArray(predictions)) {
      // Ensure visibility field is included in predictions
      const processedPredictions = predictions.map(pred => ({
        ...pred,
        visibility: pred.visibility || 'all'
      }));
      updateData.predictions = processedPredictions;
    }

    // Update odds if provided
    if (odds) {
      updateData.odds = odds;
      updateData.bookmakerOdds = generateMockOdds();
    }

    const match = await Match.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      message: 'Match updated successfully',
      match: {
        id: match._id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date,
        league: match.league,
        predictions: match.predictions,
        bookmakerOdds: match.bookmakerOdds,
        gameTier: match.gameTier
      }
    });
  } catch (err) {
    console.error('Error updating match:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete match (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      message: 'Match deleted successfully',
      match: {
        id: match._id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      }
    });
  } catch (err) {
    console.error('Error deleting match:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add prediction to existing match (admin only)
router.post('/:id/prediction', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, prediction, confidence, visibility } = req.body;

    // Validation
    if (!type || !['win', 'over15', 'over25', 'over35', 'corners', 'ggng', 'others', 'player'].includes(type)) {
      return res.status(400).json({ error: `Invalid prediction type: ${type}` });
    }
    if (!prediction || typeof prediction !== 'string') {
      return res.status(400).json({ error: 'Prediction text is required' });
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      return res.status(400).json({ error: 'Confidence must be a number between 0 and 100' });
    }

    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Add the new prediction
    const newPrediction = {
      type,
      prediction,
      confidence,
      visibility: visibility || 'all'
    };

    match.predictions.push(newPrediction);
    await match.save();

    res.json({
      success: true,
      message: 'Prediction added successfully',
      prediction: newPrediction
    });
  } catch (error) {
    console.error('Error adding prediction:', error);
    res.status(500).json({ error: 'Failed to add prediction' });
  }
});

module.exports = router;
