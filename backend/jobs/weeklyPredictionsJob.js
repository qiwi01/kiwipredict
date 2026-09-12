const cron = require('node-cron');
const Match = require('../models/Match');
const {
  fetchMatchesByDateRange,
  fetchStandings,
  fetchTeamRecent
} = require('../services/footballApi');
const { generatePredictionsForFixture } = require('../services/predictionEngine');
const { computeLeagueAverage, indicesForTeam } = require('../services/teamFormService');
const { seedRatingsFromStandings } = require('../services/eloService');

const formatDate = (date) => date.toISOString().split('T')[0];

const DEFAULT_DAYS = Number(process.env.PREDICTION_DAYS || 3);
const ALLOWED_COMPETITIONS = (process.env.FOOTBALL_COMPETITIONS || '')
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

const getWeekRange = (startDate = new Date(), days = DEFAULT_DAYS) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return { from: formatDate(start), to: formatDate(end) };
};

// Competition toggle: empty = all competitions; set FOOTBALL_COMPETITIONS to a
// comma-separated list of league codes (e.g. PL,PD,SA,BL1,FL1,CL) to restrict.
const includeFixture = (fixture) => {
  if (!ALLOWED_COMPETITIONS.length) return true;
  return ALLOWED_COMPETITIONS.includes((fixture.competitionCode || '').toUpperCase());
};

const normalizeFixture = (fixture) => ({
  id: fixture.id,
  externalFixtureId: fixture.id,
  homeTeam: fixture.homeTeam?.name || fixture.homeTeam,
  awayTeam: fixture.awayTeam?.name || fixture.awayTeam,
  homeTeamId: fixture.homeTeamId ?? null,
  awayTeamId: fixture.awayTeamId ?? null,
  league: fixture.competition?.name || fixture.competition || 'Unknown League',
  competitionCode: fixture.competition?.code || fixture.competitionCode || '',
  date: new Date(fixture.utcDate),
  status: fixture.status || 'SCHEDULED',
  odds: fixture.odds || null
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

const state = {
  running: false,
  startedAt: null,
  finishedAt: null,
  error: null,
  summary: null,
  progress: null
};

const generateWeeklyPredictions = async ({ from, to, days, overwrite = false } = {}) => {
  const range = from && to ? { from, to } : getWeekRange(new Date(), days || DEFAULT_DAYS);
  const batchId = `predictions-${range.from}-${range.to}-${Date.now()}`;

  const allFixtures = await fetchMatchesByDateRange(range.from, range.to);
  const fixtures = allFixtures.filter(includeFixture);

  const summary = {
    batchId,
    from: range.from,
    to: range.to,
    fixturesFound: allFixtures.length,
    includedFixtures: fixtures.length,
    created: 0,
    updated: 0,
    skipped: 0,
    predictionsGenerated: 0,
    errors: 0,
    details: []
  };

  // Batch enrichment: standings once per competition, recent form once per team.
  const codes = [...new Set(fixtures.map((f) => f.competitionCode).filter(Boolean))];
  const standingsByCode = new Map();
  const ratingsByTeam = new Map();
  for (const code of codes) {
    const raw = await fetchStandings(code);
    standingsByCode.set(code, raw);
    for (const [teamId, rating] of seedRatingsFromStandings(raw)) ratingsByTeam.set(teamId, rating);
  }

  const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter(Boolean))];
  const recentByTeam = new Map();
  for (const teamId of teamIds) {
    const raw = await fetchTeamRecent(teamId, 8);
    recentByTeam.set(teamId, raw?.matches || []);
  }

  state.progress = { processed: 0, total: fixtures.length };

  for (const rawFixture of fixtures) {
    try {
      state.progress.processed += 1;
      const fixture = normalizeFixture(rawFixture);
      if (!fixture.homeTeam || !fixture.awayTeam || Number.isNaN(fixture.date.getTime())) {
        summary.skipped += 1;
        summary.details.push({ fixture: `${fixture.homeTeam || 'Unknown'} vs ${fixture.awayTeam || 'Unknown'}`, status: 'skipped', reason: 'Invalid fixture data' });
        continue;
      }

      const league = computeLeagueAverage(standingsByCode.get(fixture.competitionCode));
      const home = indicesForTeam(recentByTeam.get(fixture.homeTeamId) || [], fixture.homeTeamId, league.avgTeamGoals);
      const away = indicesForTeam(recentByTeam.get(fixture.awayTeamId) || [], fixture.awayTeamId, league.avgTeamGoals);
      home.rating = ratingsByTeam.get(fixture.homeTeamId) ?? null;
      away.rating = ratingsByTeam.get(fixture.awayTeamId) ?? null;

      const generated = generatePredictionsForFixture({ ...fixture, competition: fixture.league }, {
        home,
        away,
        leagueAvgTeamGoals: league.avgTeamGoals
      });

      if (!generated.predictions.length) {
        summary.skipped += 1;
        summary.details.push({ fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`, status: 'skipped', reason: 'No generated prediction reached the required confidence threshold' });
        continue;
      }

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
          predictionStatus: 'approved'
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
      match.predictionStatus = 'approved';
      match.predictionsApprovedAt = null;
      match.predictionsApprovedBy = null;
      match.homeStrength = Math.round(generated.homeExpectedGoals * 30);
      match.awayStrength = Math.round(generated.awayExpectedGoals * 30);
      match.expectedGoals = { home: generated.homeExpectedGoals, away: generated.awayExpectedGoals };
      match.probabilities = generated.probabilities;
      match.modelAgreement = generated.modelAgreement;
      match.confidenceGrade = generated.confidenceGrade;
      match.topScorelines = generated.topScorelines;

      await match.save();
      summary.predictionsGenerated += generated.predictions.length;
      summary.details.push({ fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`, status: match.isNew ? 'created' : 'saved', predictions: generated.predictions.length });
    } catch (error) {
      summary.errors += 1;
      summary.details.push({ fixture: rawFixture?.homeTeam ? `${rawFixture.homeTeam} vs ${rawFixture.awayTeam}` : 'Unknown fixture', status: 'error', error: error.message });
    }
  }

  state.progress = null;
  console.log(`[Predictions] Batch ${batchId}: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.predictionsGenerated} predictions`);
  return summary;
};

const startBackgroundGeneration = (options = {}) => {
  if (state.running) return { started: false, alreadyRunning: true };

  state.running = true;
  state.startedAt = new Date();
  state.finishedAt = null;
  state.error = null;
  state.summary = null;
  state.progress = null;

  generateWeeklyPredictions(options)
    .then((summary) => {
      state.running = false;
      state.finishedAt = new Date();
      state.summary = summary;
    })
    .catch((error) => {
      state.running = false;
      state.finishedAt = new Date();
      state.error = error.message;
    });

  return { started: true, alreadyRunning: false };
};

const getGenerationStatus = () => state;

const startWeeklyPredictionCron = () => {
  if (process.env.ENABLE_WEEKLY_PREDICTION_CRON === 'false') {
    console.log('[Predictions] Cron disabled by ENABLE_WEEKLY_PREDICTION_CRON=false');
    return null;
  }

  const schedule = process.env.WEEKLY_PREDICTION_CRON || '0 5 * * *';
  const timezone = process.env.WEEKLY_PREDICTION_TIMEZONE || 'Africa/Lagos';

  const task = cron.schedule(schedule, async () => {
    if (state.running) {
      console.log('[Predictions] Skipping scheduled run — generation already in progress');
      return;
    }
    try {
      console.log('[Predictions] Running scheduled prediction generation...');
      await generateWeeklyPredictions();
    } catch (error) {
      console.error('[Predictions] Scheduled generation failed:', error);
    }
  }, { timezone });

  console.log(`[Predictions] Cron scheduled (${schedule}, ${timezone})`);
  return task;
};

module.exports = {
  getWeekRange,
  generateWeeklyPredictions,
  startBackgroundGeneration,
  getGenerationStatus,
  startWeeklyPredictionCron
};