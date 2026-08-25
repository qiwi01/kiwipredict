const cron = require('node-cron');
const Match = require('../models/Match');
const { fetchMatchesByDateRange } = require('../services/footballApi');
const { generatePredictionsForFixture } = require('../services/predictionEngine');

const formatDate = (date) => date.toISOString().split('T')[0];

const getWeekRange = (startDate = new Date()) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: formatDate(start), to: formatDate(end) };
};

const normalizeFixture = (fixture) => ({
  externalFixtureId: fixture.id,
  homeTeam: fixture.homeTeam?.name || fixture.homeTeam,
  awayTeam: fixture.awayTeam?.name || fixture.awayTeam,
  league: fixture.competition?.name || fixture.competition || 'Unknown League',
  competitionCode: fixture.competition?.code || fixture.competitionCode || '',
  date: new Date(fixture.utcDate),
  status: fixture.status || 'SCHEDULED'
});

const findExistingMatch = async (fixture) => {
  if (fixture.externalFixtureId) {
    const byExternalId = await Match.findOne({ externalFixtureId: fixture.externalFixtureId });
    if (byExternalId) return byExternalId;
  }

  const startOfDay = new Date(fixture.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(fixture.date);
  endOfDay.setHours(23, 59, 59, 999);

  return Match.findOne({
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    league: fixture.league,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
};

const generateWeeklyPredictions = async ({ from, to, overwrite = false } = {}) => {
  const range = from && to ? { from, to } : getWeekRange();
  const batchId = `weekly-${range.from}-${range.to}-${Date.now()}`;
  const fixtures = await fetchMatchesByDateRange(range.from, range.to);

  const summary = {
    batchId,
    from: range.from,
    to: range.to,
    fixturesFound: fixtures.length,
    created: 0,
    updated: 0,
    skipped: 0,
    predictionsGenerated: 0,
    errors: 0,
    details: []
  };

  for (const rawFixture of fixtures) {
    try {
      const fixture = normalizeFixture(rawFixture);
      if (!fixture.homeTeam || !fixture.awayTeam || Number.isNaN(fixture.date.getTime())) {
        summary.skipped += 1;
        summary.details.push({ fixture: `${fixture.homeTeam || 'Unknown'} vs ${fixture.awayTeam || 'Unknown'}`, status: 'skipped', reason: 'Invalid fixture data' });
        continue;
      }

      const generated = generatePredictionsForFixture({
        ...fixture,
        competition: fixture.league
      });
      let match = await findExistingMatch(fixture);

      if (match && match.predictions?.length && !overwrite) {
        summary.skipped += 1;
        summary.details.push({ fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`, status: 'skipped', reason: 'Predictions already exist' });
        continue;
      }

      if (!match) {
        match = new Match({
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          date: fixture.date,
          league: fixture.league,
          externalFixtureId: fixture.externalFixtureId,
          competitionCode: fixture.competitionCode,
          apiSource: 'football-data.org',
          gameTier: 'none',
          predictionStatus: 'pending_review'
        });
        summary.created += 1;
      } else {
        match.externalFixtureId = match.externalFixtureId || fixture.externalFixtureId;
        match.competitionCode = match.competitionCode || fixture.competitionCode;
        match.apiSource = match.apiSource || 'football-data.org';
        summary.updated += 1;
      }

      match.predictions = generated.predictions;
      match.predictionBatchId = batchId;
      match.predictionsGeneratedAt = generated.generatedAt;
      match.predictionsGeneratedBy = generated.modelVersion;
      match.predictionStatus = 'pending_review';
      match.predictionsApprovedAt = null;
      match.predictionsApprovedBy = null;
      match.homeStrength = Math.round(generated.homeExpectedGoals * 30);
      match.awayStrength = Math.round(generated.awayExpectedGoals * 30);

      await match.save();
      summary.predictionsGenerated += generated.predictions.length;
      summary.details.push({ fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`, status: match.isNew ? 'created' : 'saved', predictions: generated.predictions.length });
    } catch (error) {
      summary.errors += 1;
      summary.details.push({ fixture: rawFixture?.homeTeam ? `${rawFixture.homeTeam} vs ${rawFixture.awayTeam}` : 'Unknown fixture', status: 'error', error: error.message });
    }
  }

  console.log(`[WeeklyPredictions] Batch ${batchId}: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.predictionsGenerated} predictions`);
  return summary;
};

const startWeeklyPredictionCron = () => {
  if (process.env.ENABLE_WEEKLY_PREDICTION_CRON === 'false') {
    console.log('[WeeklyPredictions] Cron disabled by ENABLE_WEEKLY_PREDICTION_CRON=false');
    return null;
  }

  const schedule = process.env.WEEKLY_PREDICTION_CRON || '0 6 * * 1';
  const timezone = process.env.WEEKLY_PREDICTION_TIMEZONE || 'Africa/Lagos';

  const task = cron.schedule(schedule, async () => {
    try {
      console.log('[WeeklyPredictions] Running scheduled weekly prediction generation...');
      await generateWeeklyPredictions();
    } catch (error) {
      console.error('[WeeklyPredictions] Scheduled generation failed:', error);
    }
  }, { timezone });

  console.log(`[WeeklyPredictions] Cron scheduled (${schedule}, ${timezone})`);
  return task;
};

module.exports = {
  getWeekRange,
  generateWeeklyPredictions,
  startWeeklyPredictionCron
};