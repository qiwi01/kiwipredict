const express = require('express');
const Match = require('../models/Match');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get outcomes with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, days, date } = req.query;
    const user = await require('../models/User').findById(req.user.id);

    let query = {};

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (days) {
      const daysAgo = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      query.date = { $gte: startDate };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    // VIP/VVIP games are shown for everyone in outcomes, but marked with their tier

    const matches = await Match.find(query)
      .populate('outcomes.outcomeSetBy', 'username')
      .sort({ date: -1 })
      .select('homeTeam awayTeam date league predictions outcomes gameTier homeGoals awayGoals');

    // Filter to only show matches that have at least one completed outcome (not pending)
    let filteredMatches = matches.filter(match =>
      match.outcomes && match.outcomes.some(outcome => outcome.actualResult !== 'pending')
    );

    // Filter by prediction type if specified
    if (type && type !== 'all') {
      filteredMatches = filteredMatches.filter(match =>
        match.outcomes && match.outcomes.some(outcome => outcome.predictionType === type && outcome.actualResult !== 'pending')
      );
    }

    // Group by prediction type for the frontend
    const outcomesByType = {
      todays: [],
      topPicks: [],
      vip: [],
      vvip: [],
      all: []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredMatches.forEach(match => {
      const matchData = {
        id: match._id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        date: match.date,
        league: match.league,
        gameTier: match.gameTier,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        outcomes: match.outcomes || []
      };

      // Today's predictions
      if (match.date >= today) {
        outcomesByType.todays.push(matchData);
      }

      // Top picks (value bets)
      if (match.predictions.some(p => p.valueBet)) {
        outcomesByType.topPicks.push(matchData);
      }

      // VIP predictions
      if (match.gameTier === 'vip') {
        outcomesByType.vip.push(matchData);
      }

      // VVIP predictions
      if (match.gameTier === 'vvip') {
        outcomesByType.vvip.push(matchData);
      }

      // All predictions
      outcomesByType.all.push(matchData);
    });

    res.json(outcomesByType);
  } catch (error) {
    console.error('Error fetching outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch outcomes' });
  }
});

// Admin: Set prediction outcome
router.put('/:matchId/outcome', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { predictionType, prediction, actualResult } = req.body;

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Find or create outcome entry
    let outcomeIndex = match.outcomes.findIndex(
      o => o.predictionType === predictionType && o.prediction === prediction
    );

    if (outcomeIndex === -1) {
      // Create new outcome entry
      match.outcomes.push({
        predictionType,
        prediction,
        actualResult,
        outcomeSetBy: req.user.id,
        outcomeSetAt: new Date()
      });
    } else {
      // Update existing outcome
      match.outcomes[outcomeIndex].actualResult = actualResult;
      match.outcomes[outcomeIndex].outcomeSetBy = req.user.id;
      match.outcomes[outcomeIndex].outcomeSetAt = new Date();
    }

    await match.save();

    res.json({
      success: true,
      message: 'Outcome updated successfully',
      outcome: match.outcomes.find(o => o.predictionType === predictionType && o.prediction === prediction)
    });
  } catch (error) {
    console.error('Error updating outcome:', error);
    res.status(500).json({ error: 'Failed to update outcome' });
  }
});

// Admin: Bulk set outcomes for a match
router.put('/:matchId/outcomes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { outcomes } = req.body;

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Update outcomes
    outcomes.forEach(outcomeData => {
      const { predictionType, prediction, actualResult } = outcomeData;

      let outcomeIndex = match.outcomes.findIndex(
        o => o.predictionType === predictionType && o.prediction === prediction
      );

      if (outcomeIndex === -1) {
        match.outcomes.push({
          predictionType,
          prediction,
          actualResult,
          outcomeSetBy: req.user.id,
          outcomeSetAt: new Date()
        });
      } else {
        match.outcomes[outcomeIndex].actualResult = actualResult;
        match.outcomes[outcomeIndex].outcomeSetBy = req.user.id;
        match.outcomes[outcomeIndex].outcomeSetAt = new Date();
      }
    });

    await match.save();

    res.json({
      success: true,
      message: 'Outcomes updated successfully',
      outcomes: match.outcomes
    });
  } catch (error) {
    console.error('Error updating outcomes:', error);
    res.status(500).json({ error: 'Failed to update outcomes' });
  }
});

// Get available dates for navigation
router.get('/dates', authenticateToken, async (req, res) => {
  try {
    // Only include dates for matches that have completed outcomes
    const matches = await Match.find({
      outcomes: {
        $exists: true,
        $ne: [],
        $elemMatch: { actualResult: { $ne: 'pending' } }
      }
    })
    .select('date')
    .sort({ date: -1 })
    .limit(100); // Get more matches to ensure we have enough unique dates

    // Extract unique dates
    const dateSet = new Set();
    matches.forEach(match => {
      const dateStr = match.date.toISOString().split('T')[0];
      dateSet.add(dateStr);
    });

    // Convert to array and sort
    const uniqueDates = Array.from(dateSet).sort().reverse().slice(0, 30);

    res.json(uniqueDates);
  } catch (error) {
    console.error('Error fetching dates:', error);
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

// Delete outcome (admin only)
router.delete('/:matchId/outcome/:outcomeIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, outcomeIndex } = req.params;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.outcomes || !match.outcomes[outcomeIndex]) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    const deletedOutcome = match.outcomes[outcomeIndex];
    match.outcomes.splice(outcomeIndex, 1);

    await match.save();

    res.json({
      success: true,
      message: 'Outcome deleted successfully',
      deletedOutcome
    });
  } catch (error) {
    console.error('Error deleting outcome:', error);
    res.status(500).json({ error: 'Failed to delete outcome' });
  }
});

// Update outcome (admin only)
router.put('/:matchId/outcome/:outcomeIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, outcomeIndex } = req.params;
    const { predictionType, prediction, actualResult } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.outcomes || !match.outcomes[outcomeIndex]) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    // Update the outcome
    match.outcomes[outcomeIndex].predictionType = predictionType || match.outcomes[outcomeIndex].predictionType;
    match.outcomes[outcomeIndex].prediction = prediction || match.outcomes[outcomeIndex].prediction;
    match.outcomes[outcomeIndex].actualResult = actualResult || match.outcomes[outcomeIndex].actualResult;
    match.outcomes[outcomeIndex].outcomeSetBy = req.user.id;
    match.outcomes[outcomeIndex].outcomeSetAt = new Date();

    await match.save();

    res.json({
      success: true,
      message: 'Outcome updated successfully',
      outcome: match.outcomes[outcomeIndex]
    });
  } catch (error) {
    console.error('Error updating outcome:', error);
    res.status(500).json({ error: 'Failed to update outcome' });
  }
});

// Delete prediction from match (admin only)
router.delete('/:matchId/prediction/:predictionIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, predictionIndex } = req.params;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const predIndex = parseInt(predictionIndex);
    if (isNaN(predIndex) || predIndex < 0 || predIndex >= match.predictions.length) {
      return res.status(400).json({ error: 'Invalid prediction index' });
    }

    const deletedPrediction = match.predictions[predIndex];
    match.predictions.splice(predIndex, 1);

    await match.save();

    res.json({
      success: true,
      message: 'Prediction deleted successfully',
      deletedPrediction
    });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

// Update prediction in match (admin only)
router.put('/:matchId/prediction/:predictionIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchId, predictionIndex } = req.params;
    const { type, prediction, confidence, valueBet, odds } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const predIndex = parseInt(predictionIndex);
    if (isNaN(predIndex) || predIndex < 0 || predIndex >= match.predictions.length) {
      return res.status(400).json({ error: 'Invalid prediction index' });
    }

    // Update the prediction
    if (type !== undefined) match.predictions[predIndex].type = type;
    if (prediction !== undefined) match.predictions[predIndex].prediction = prediction;
    if (confidence !== undefined) match.predictions[predIndex].confidence = confidence;
    if (valueBet !== undefined) match.predictions[predIndex].valueBet = valueBet;
    if (odds !== undefined) match.predictions[predIndex].odds = odds;

    await match.save();

    res.json({
      success: true,
      message: 'Prediction updated successfully',
      prediction: match.predictions[predIndex]
    });
  } catch (error) {
    console.error('Error updating prediction:', error);
    res.status(500).json({ error: 'Failed to update prediction' });
  }
});

module.exports = router;
