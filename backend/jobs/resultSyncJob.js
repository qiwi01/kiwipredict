const cron = require('node-cron');
const Match = require('../models/Match');
const { fetchMatchById } = require('../services/footballApi');
const { computeResultForPrediction } = require('../services/outcomeResolver');

const normalizeGoals = (value) => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

/**
 * Find recently kicked-off API-sourced matches and hydrate them with the real
 * final score from football-data.org, then compute each prediction's outcome.
 * Persist the result so the outcomes page reflects live truth automatically.
 */
const syncFinishedResults = async ({ overwrite = false, limit = 100 } = {}) => {
  const now = new Date();

  const candidates = await Match.find({
    externalFixtureId: { $exists: true, $ne: null },
    predictions: { $exists: true, $ne: [] },
    date: { $lt: now },
    $or: [
      { status: { $ne: 'FINISHED' } },
      { homeGoals: null },
      { awayGoals: null },
      { outcomes: { $exists: false } },
      { outcomes: { $size: 0 } },
      { 'outcomes.actualResult': 'pending' }
    ]
  })
    .sort({ date: -1 })
    .limit(limit);

  const summary = { total: candidates.length, synced: 0, noResult: 0, errors: 0 };

  for (const match of candidates) {
    try {
      const detail = await fetchMatchById(match.externalFixtureId);
      if (!detail) {
        summary.noResult += 1;
        continue;
      }

      const fullTime = detail.score?.fullTime || {};
      const homeGoals = normalizeGoals(fullTime.home);
      const awayGoals = normalizeGoals(fullTime.away);

      match.status = detail.status || match.status;
      if (detail.minute != null) match.minute = detail.minute;
      if (detail.venue) match.venue = detail.venue;
      if (detail.homeTeam?.id != null) match.homeTeamId = detail.homeTeam.id;
      if (detail.awayTeam?.id != null) match.awayTeamId = detail.awayTeam.id;
      if (detail.homeTeam?.crest) match.homeCrest = detail.homeTeam.crest;
      if (detail.awayTeam?.crest) match.awayCrest = detail.awayTeam.crest;

      if (homeGoals === null || awayGoals === null) {
        summary.noResult += 1;
        continue;
      }

      match.homeGoals = homeGoals;
      match.awayGoals = awayGoals;

      const halfTime = detail.score?.halfTime || {};
      if (normalizeGoals(halfTime.home) !== null) match.halfTimeHome = normalizeGoals(halfTime.home);
      if (normalizeGoals(halfTime.away) !== null) match.halfTimeAway = normalizeGoals(halfTime.away);

      for (const pred of match.predictions || []) {
        const result = computeResultForPrediction(pred.type, pred.prediction, homeGoals, awayGoals);
        if (!result) continue;

        const existingIndex = (match.outcomes || []).findIndex(
          o => o.predictionType === pred.type && o.prediction === pred.prediction
        );

        if (existingIndex >= 0) {
          const existing = match.outcomes[existingIndex];
          if (existing.actualResult === 'pending' || overwrite) {
            existing.actualResult = result;
            if (!existing.outcomeSetBy) existing.outcomeSetAt = new Date();
          }
        } else {
          match.outcomes.push({
            predictionType: pred.type,
            prediction: pred.prediction,
            actualResult: result,
            outcomeSetBy: null,
            outcomeSetAt: new Date()
          });
        }
      }

      await match.save();
      summary.synced += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(`[ResultSync] Error syncing match ${match._id}:`, error.message);
    }
  }

  console.log(`[ResultSync] ${summary.synced} synced, ${summary.noResult} without result, ${summary.errors} errors (${summary.total} checked)`);
  return summary;
};

const startResultSyncCron = () => {
  if (process.env.ENABLE_RESULT_SYNC_CRON === 'false') {
    console.log('[ResultSync] Cron disabled by ENABLE_RESULT_SYNC_CRON=false');
    return null;
  }

  const schedule = process.env.RESULT_SYNC_CRON || '*/10 * * * *';
  const timezone = process.env.WEEKLY_PREDICTION_TIMEZONE || 'Africa/Lagos';

  const task = cron.schedule(schedule, async () => {
    try {
      console.log('[ResultSync] Running scheduled result sync...');
      await syncFinishedResults();
    } catch (error) {
      console.error('[ResultSync] Scheduled sync failed:', error);
    }
  }, { timezone });

  console.log(`[ResultSync] Cron scheduled (${schedule}, ${timezone})`);
  return task;
};

module.exports = {
  syncFinishedResults,
  startResultSyncCron
};