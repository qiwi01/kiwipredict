const MODEL_VERSION = 'kiwi-stats-ai-v2.0';
const MIN_CONFIDENCE = Number(process.env.AI_MIN_CONFIDENCE || 60);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let index = 2; index <= n; index += 1) result *= index;
  return result;
};

const poisson = (lambda, goals) => (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial(goals);
const percentage = (probability) => Math.round(clamp(probability, 0, 1) * 100);
const fairOdds = (probability) => probability > 0 ? Number((1 / probability).toFixed(2)) : null;
const avg = (values, fallback) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
const normalizeTeam = (team = '') => String(team).trim().toLowerCase();
const isCompleted = (match) => Number.isFinite(match?.homeGoals) && Number.isFinite(match?.awayGoals);

const calculateGoalMatrix = (homeExpectedGoals, awayExpectedGoals, maxGoals = 8) => {
  const matrix = [];
  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
      matrix.push({ homeGoals, awayGoals, probability: poisson(homeExpectedGoals, homeGoals) * poisson(awayExpectedGoals, awayGoals) });
    }
  }
  return matrix;
};

const getTeamMatches = (history, teamName) => {
  const team = normalizeTeam(teamName);
  return history
    .filter(match => isCompleted(match) && [normalizeTeam(match.homeTeam), normalizeTeam(match.awayTeam)].includes(team))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const buildTeamStats = (history, teamName, side) => {
  const team = normalizeTeam(teamName);
  const matches = getTeamMatches(history, teamName);
  const sideMatches = matches.filter(match => side === 'home' ? normalizeTeam(match.homeTeam) === team : normalizeTeam(match.awayTeam) === team);
  const recent = matches.slice(0, 10);
  const form = recent.slice(0, 5).map(match => {
    const isHome = normalizeTeam(match.homeTeam) === team;
    const gf = isHome ? match.homeGoals : match.awayGoals;
    const ga = isHome ? match.awayGoals : match.homeGoals;
    return gf > ga ? 3 : gf === ga ? 1 : 0;
  });

  return {
    matches: matches.length,
    recentMatches: recent.length,
    sideMatches: sideMatches.length,
    formPointsPerGame: avg(form, 1.35),
    goalsFor: avg(matches.map(match => normalizeTeam(match.homeTeam) === team ? match.homeGoals : match.awayGoals), 1.25),
    goalsAgainst: avg(matches.map(match => normalizeTeam(match.homeTeam) === team ? match.awayGoals : match.homeGoals), 1.25),
    sideGoalsFor: avg(sideMatches.map(match => side === 'home' ? match.homeGoals : match.awayGoals), 1.25),
    sideGoalsAgainst: avg(sideMatches.map(match => side === 'home' ? match.awayGoals : match.homeGoals), 1.25)
  };
};

const buildLeagueStats = (history, league) => {
  const leagueKey = String(league || '').trim().toLowerCase();
  const leagueMatches = history.filter(match => isCompleted(match) && String(match.league || '').trim().toLowerCase() === leagueKey);
  const matches = leagueMatches.length ? leagueMatches : history.filter(isCompleted);
  const totalGoals = matches.map(match => match.homeGoals + match.awayGoals);
  return {
    matches: matches.length,
    avgGoals: avg(totalGoals, 2.55),
    avgHomeGoals: avg(matches.map(match => match.homeGoals), 1.4),
    avgAwayGoals: avg(matches.map(match => match.awayGoals), 1.15)
  };
};

const buildHeadToHead = (history, homeTeam, awayTeam) => {
  const home = normalizeTeam(homeTeam);
  const away = normalizeTeam(awayTeam);
  const matches = history
    .filter(match => isCompleted(match))
    .filter(match => [normalizeTeam(match.homeTeam), normalizeTeam(match.awayTeam)].includes(home) && [normalizeTeam(match.homeTeam), normalizeTeam(match.awayTeam)].includes(away))
    .slice(0, 8);
  return {
    matches: matches.length,
    homeGoals: avg(matches.map(match => normalizeTeam(match.homeTeam) === home ? match.homeGoals : match.awayGoals), null),
    awayGoals: avg(matches.map(match => normalizeTeam(match.homeTeam) === away ? match.homeGoals : match.awayGoals), null)
  };
};

const bookmakerProbabilities = (odds = {}) => {
  const home = Number(odds.home);
  const draw = Number(odds.draw);
  const away = Number(odds.away);
  if (![home, draw, away].every(value => value > 1)) return null;
  const raw = { homeWin: 1 / home, draw: 1 / draw, awayWin: 1 / away };
  const total = raw.homeWin + raw.draw + raw.awayWin;
  return { homeWin: raw.homeWin / total, draw: raw.draw / total, awayWin: raw.awayWin / total };
};

const blendBookmaker = (model, odds) => {
  const implied = bookmakerProbabilities(odds);
  if (!implied) return model;
  return {
    ...model,
    homeWin: (model.homeWin * 0.72) + (implied.homeWin * 0.28),
    draw: (model.draw * 0.72) + (implied.draw * 0.28),
    awayWin: (model.awayWin * 0.72) + (implied.awayWin * 0.28)
  };
};

const pickWinPrediction = ({ homeWin, draw, awayWin }) => [
  { type: 'win', prediction: 'home', probability: homeWin },
  { type: 'win', prediction: 'draw', probability: draw },
  { type: 'win', prediction: 'away', probability: awayWin }
].sort((a, b) => b.probability - a.probability)[0];

const generatePredictionsForFixture = (fixture, context = {}) => {
  const homeTeam = fixture.homeTeam || fixture.homeTeam?.name || 'Home Team';
  const awayTeam = fixture.awayTeam || fixture.awayTeam?.name || 'Away Team';
  const competition = fixture.competition || fixture.league || fixture.competitionCode || 'Unknown League';
  const history = Array.isArray(context.history) ? context.history : [];
  const leagueStats = buildLeagueStats(history, competition);
  const homeStats = buildTeamStats(history, homeTeam, 'home');
  const awayStats = buildTeamStats(history, awayTeam, 'away');
  const h2h = buildHeadToHead(history, homeTeam, awayTeam);

  const homeAttack = clamp(((homeStats.goalsFor / leagueStats.avgGoals) + (homeStats.sideGoalsFor / leagueStats.avgHomeGoals)) / 2, 0.55, 1.85);
  const awayAttack = clamp(((awayStats.goalsFor / leagueStats.avgGoals) + (awayStats.sideGoalsFor / leagueStats.avgAwayGoals)) / 2, 0.55, 1.85);
  const homeDefenseWeakness = clamp(((homeStats.goalsAgainst / leagueStats.avgGoals) + (homeStats.sideGoalsAgainst / leagueStats.avgAwayGoals)) / 2, 0.55, 1.85);
  const awayDefenseWeakness = clamp(((awayStats.goalsAgainst / leagueStats.avgGoals) + (awayStats.sideGoalsAgainst / leagueStats.avgHomeGoals)) / 2, 0.55, 1.85);
  const homeFormBoost = clamp(0.85 + ((homeStats.formPointsPerGame - 1.35) / 6), 0.82, 1.18);
  const awayFormBoost = clamp(0.85 + ((awayStats.formPointsPerGame - 1.35) / 6), 0.82, 1.18);

  let homeExpectedGoals = leagueStats.avgHomeGoals * homeAttack * awayDefenseWeakness * homeFormBoost;
  let awayExpectedGoals = leagueStats.avgAwayGoals * awayAttack * homeDefenseWeakness * awayFormBoost;
  if (h2h.matches >= 3 && h2h.homeGoals !== null && h2h.awayGoals !== null) {
    homeExpectedGoals = (homeExpectedGoals * 0.85) + (h2h.homeGoals * 0.15);
    awayExpectedGoals = (awayExpectedGoals * 0.85) + (h2h.awayGoals * 0.15);
  }
  homeExpectedGoals = clamp(homeExpectedGoals, 0.25, 3.8);
  awayExpectedGoals = clamp(awayExpectedGoals, 0.2, 3.5);

  const matrix = calculateGoalMatrix(homeExpectedGoals, awayExpectedGoals);
  let probabilities = matrix.reduce((acc, score) => {
    if (score.homeGoals > score.awayGoals) acc.homeWin += score.probability;
    if (score.homeGoals === score.awayGoals) acc.draw += score.probability;
    if (score.homeGoals < score.awayGoals) acc.awayWin += score.probability;
    if (score.homeGoals + score.awayGoals > 1.5) acc.over15 += score.probability;
    if (score.homeGoals + score.awayGoals > 2.5) acc.over25 += score.probability;
    if (score.homeGoals + score.awayGoals > 3.5) acc.over35 += score.probability;
    if (score.homeGoals > 0 && score.awayGoals > 0) acc.bttsYes += score.probability;
    return acc;
  }, { homeWin: 0, draw: 0, awayWin: 0, over15: 0, over25: 0, over35: 0, bttsYes: 0 });
  probabilities = blendBookmaker(probabilities, fixture.bookmakerOdds || fixture.odds);
  probabilities.under15 = 1 - probabilities.over15;
  probabilities.under25 = 1 - probabilities.over25;
  probabilities.under35 = 1 - probabilities.over35;
  probabilities.bttsNo = 1 - probabilities.bttsYes;

  const candidateMarkets = [
    pickWinPrediction(probabilities),
    probabilities.over15 >= probabilities.under15 ? { type: 'over15', prediction: 'Over 1.5', probability: probabilities.over15 } : { type: 'over15', prediction: 'Under 1.5', probability: probabilities.under15 },
    probabilities.over25 >= probabilities.under25 ? { type: 'over25', prediction: 'Over 2.5', probability: probabilities.over25 } : { type: 'over25', prediction: 'Under 2.5', probability: probabilities.under25 },
    probabilities.over35 >= probabilities.under35 ? { type: 'over35', prediction: 'Over 3.5', probability: probabilities.over35 } : { type: 'over35', prediction: 'Under 3.5', probability: probabilities.under35 },
    probabilities.bttsYes >= probabilities.bttsNo ? { type: 'ggng', prediction: 'GG', probability: probabilities.bttsYes } : { type: 'ggng', prediction: 'NG', probability: probabilities.bttsNo }
  ].sort((a, b) => b.probability - a.probability);

  const generatedAt = new Date();
  const strongestMarket = candidateMarkets[0];
  const explanation = `Stats model uses recent 5-10 match form, home/away goals scored and conceded, league averages, attack/defence strengths, head-to-head and bookmaker implied probability when odds exist. ${homeTeam} xG projection ${homeExpectedGoals.toFixed(2)}, ${awayTeam} ${awayExpectedGoals.toFixed(2)}. Injuries/suspensions, odds movement and external xG stay neutral unless supplied by data provider. Strongest market: ${strongestMarket.prediction} at ${percentage(strongestMarket.probability)}%.`;

  const predictions = candidateMarkets
    .filter(market => percentage(market.probability) >= MIN_CONFIDENCE)
    .map((market, index) => ({
      type: market.type,
      prediction: market.prediction,
      confidence: percentage(market.probability),
      probability: Number(market.probability.toFixed(4)),
      fairOdds: fairOdds(market.probability),
      valueBet: market.probability >= 0.62,
      odds: fixture.odds || fixture.bookmakerOdds || {},
      visibility: index >= 2 ? 'vip' : 'all',
      modelVersion: MODEL_VERSION,
      generatedBy: 'semi-ai-weekly-job',
      generatedAt,
      explanation
    }));

  return {
    modelVersion: MODEL_VERSION,
    generatedAt,
    homeExpectedGoals: Number(homeExpectedGoals.toFixed(2)),
    awayExpectedGoals: Number(awayExpectedGoals.toFixed(2)),
    probabilities: Object.fromEntries(Object.entries(probabilities).map(([key, value]) => [key, Number(value.toFixed(4))])),
    predictions,
    explanation,
    stats: { leagueStats, homeStats, awayStats, h2h }
  };
};

module.exports = { MODEL_VERSION, MIN_CONFIDENCE, generatePredictionsForFixture };