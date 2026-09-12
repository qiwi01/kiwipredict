const { probabilitiesFromRatings, formToRating } = require('./eloService');

const MODEL_VERSION = 'kiwi-ai-v3.0';
const MIN_CONFIDENCE = Number(process.env.AI_MIN_CONFIDENCE || 50);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let index = 2; index <= n; index += 1) result *= index;
  return result;
};

const poisson = (lambda, goals) => (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial(goals);

const hashString = (value = '') => String(value).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const estimateTeamStrength = (teamName = '', competition = '') => {
  const seed = hashString(`${teamName}-${competition}`);
  return {
    attack: 0.85 + ((seed % 45) / 100),
    defense: 0.85 + (((seed * 7) % 45) / 100),
    form: 0.9 + (((seed * 13) % 30) / 100)
  };
};

const tauCorrection = (x, y, lambda, mu, rho) => {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
};

const scoreMatrix = (homeLambda, awayLambda, rho = -0.06, maxGoals = 8) => {
  const cells = [];
  let total = 0;
  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      const p = poisson(homeLambda, h) * poisson(awayLambda, a) * tauCorrection(h, a, homeLambda, awayLambda, rho);
      cells.push({ homeGoals: h, awayGoals: a, probability: p });
      total += p;
    }
  }
  return cells.map((cell) => ({ ...cell, probability: cell.probability / total }));
};

const reduceMatrix = (cells) => {
  const acc = { homeWin: 0, draw: 0, awayWin: 0, over15: 0, over25: 0, over35: 0, bttsYes: 0 };
  for (const cell of cells) {
    if (cell.homeGoals > cell.awayGoals) acc.homeWin += cell.probability;
    else if (cell.homeGoals === cell.awayGoals) acc.draw += cell.probability;
    else acc.awayWin += cell.probability;

    const totalGoals = cell.homeGoals + cell.awayGoals;
    if (totalGoals > 1.5) acc.over15 += cell.probability;
    if (totalGoals > 2.5) acc.over25 += cell.probability;
    if (totalGoals > 3.5) acc.over35 += cell.probability;
    if (cell.homeGoals > 0 && cell.awayGoals > 0) acc.bttsYes += cell.probability;
  }
  acc.under15 = 1 - acc.over15;
  acc.under25 = 1 - acc.over25;
  acc.under35 = 1 - acc.over35;
  acc.bttsNo = 1 - acc.bttsYes;
  return acc;
};

const normalizeTrio = ({ home, draw, away }) => {
  const total = home + draw + away || 1;
  return { home: home / total, draw: draw / total, away: away / total };
};

const percentage = (probability) => Math.round(clamp(probability, 0, 1) * 100);
const fairOdds = (probability) => probability > 0 ? Number((1 / probability).toFixed(2)) : null;

const pickWin = ({ home, draw, away }) => {
  const options = [
    { prediction: 'home', probability: home },
    { prediction: 'draw', probability: draw },
    { prediction: 'away', probability: away }
  ];
  return options.sort((a, b) => b.probability - a.probability)[0];
};

const winnerOf = (trio) => pickWin(trio).prediction;

const confidenceGrade = (p) => {
  if (p >= 0.60) return 'Very Strong';
  if (p >= 0.50) return 'Strong';
  if (p >= 0.42) return 'Moderate';
  if (p >= 0.36) return 'Lean';
  return 'Uncertain';
};

const generateExplanation = ({ homeTeam, awayTeam, homeExpectedGoals, awayExpectedGoals, strongestMarket, source = 'AI' }) => (
  `${source} model projects ${homeTeam} around ${homeExpectedGoals.toFixed(2)} expected goals and ${awayTeam} around ${awayExpectedGoals.toFixed(2)}. ` +
  `The strongest generated market is ${strongestMarket.prediction} at ${percentage(strongestMarket.probability)}%.`
);

const resolveBookmakerOdds = (market, odds) => {
  if (!odds || market.type !== 'win') return null;
  if (market.prediction === 'home' && odds.homeWin) return Number(odds.homeWin);
  if (market.prediction === 'draw' && odds.draw) return Number(odds.draw);
  if (market.prediction === 'away' && odds.awayWin) return Number(odds.awayWin);
  return null;
};

const generatePredictionsForFixture = (fixture, stats = null) => {
  const homeTeam = fixture.homeTeam?.name || fixture.homeTeam || 'Home Team';
  const awayTeam = fixture.awayTeam?.name || fixture.awayTeam || 'Away Team';
  const competition = fixture.competition?.name || fixture.competition || fixture.competitionCode || 'Unknown League';

  let home;
  let away;
  let leagueBase = 1.2;
  let source = 'kiwi-ai-v3 (fallback heuristic)';

  if (stats && stats.home && stats.away) {
    home = stats.home;
    away = stats.away;
    leagueBase = stats.leagueAvgTeamGoals || 1.2;
    source = 'kiwi-ai-v3 (Dixon-Coles + Elo + form ensemble)';
  } else {
    home = estimateTeamStrength(homeTeam, competition);
    away = estimateTeamStrength(awayTeam, competition);
  }

  const HOME_ADVANTAGE = 1.12;

  let homeXg = leagueBase * (home.attack || 1) * (away.defense || 1) * (home.form || 1) * HOME_ADVANTAGE;
  let awayXg = leagueBase * (away.attack || 1) * (home.defense || 1) * (away.form || 1);
  homeXg = clamp(homeXg, 0.2, 4.5);
  awayXg = clamp(awayXg, 0.15, 4.0);

  const matrix = scoreMatrix(homeXg, awayXg);
  const dc = reduceMatrix(matrix);

  const homeRating = Number(home.rating) > 0 ? Number(home.rating) : formToRating(home.form || 1);
  const awayRating = Number(away.rating) > 0 ? Number(away.rating) : formToRating(away.form || 1);
  const elo = probabilitiesFromRatings(homeRating, awayRating);
  const form = probabilitiesFromRatings(formToRating(home.form || 1), formToRating(away.form || 1), 40);

  const W_DC = 0.45;
  const W_ELO = 0.30;
  const W_FORM = 0.25;
  const blended = normalizeTrio({
    home: W_DC * dc.homeWin + W_ELO * elo.home + W_FORM * form.home,
    draw: W_DC * dc.draw + W_ELO * elo.draw + W_FORM * form.draw,
    away: W_DC * dc.awayWin + W_ELO * elo.away + W_FORM * form.away
  });

  const picks = [winnerOf(dc), winnerOf(elo), winnerOf(form)];
  const agreeCount = picks.filter((p) => p === picks[0]).length;
  const modelAgreement = Math.round((agreeCount / picks.length) * 100);

  const winPick = pickWin(blended);

  const markets = [
    { type: 'win', prediction: winPick.prediction, probability: blended[winPick.prediction] },
    { type: 'over15', prediction: dc.over15 >= 0.62 ? 'Over 1.5' : 'Under 1.5', probability: dc.over15 >= 0.62 ? dc.over15 : dc.under15 },
    { type: 'over25', prediction: dc.over25 >= dc.under25 ? 'Over 2.5' : 'Under 2.5', probability: dc.over25 >= dc.under25 ? dc.over25 : dc.under25 },
    { type: 'over35', prediction: dc.over35 >= 0.44 ? 'Over 3.5' : 'Under 3.5', probability: dc.over35 >= 0.44 ? dc.over35 : dc.under35 },
    { type: 'ggng', prediction: dc.bttsYes >= dc.bttsNo ? 'GG' : 'NG', probability: dc.bttsYes >= dc.bttsNo ? dc.bttsYes : dc.bttsNo }
  ].sort((a, b) => b.probability - a.probability);

  const generatedAt = new Date();
  const strongestMarket = markets[0];
  const explanation = generateExplanation({ homeTeam, awayTeam, homeExpectedGoals: homeXg, awayExpectedGoals: awayXg, strongestMarket, source });

  const predictions = markets
    .filter((market) => percentage(market.probability) >= MIN_CONFIDENCE)
    .map((market, index) => {
      const bookmakerOdds = resolveBookmakerOdds(market, fixture.odds);
      return {
        type: market.type,
        prediction: market.prediction,
        confidence: percentage(market.probability),
        probability: Number(market.probability.toFixed(4)),
        fairOdds: fairOdds(market.probability),
        valueBet: market.probability >= 0.62 || (bookmakerOdds ? market.probability * bookmakerOdds > 1 : false),
        odds: {},
        visibility: index >= 3 ? 'vip' : 'all',
        modelVersion: MODEL_VERSION,
        generatedBy: 'ai-v3',
        generatedAt,
        explanation
      };
    });

  const topScorelines = [...matrix]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map((cell) => ({ home: cell.homeGoals, away: cell.awayGoals, probability: Number(cell.probability.toFixed(4)) }));

  return {
    modelVersion: MODEL_VERSION,
    generatedAt,
    source,
    homeExpectedGoals: Number(homeXg.toFixed(2)),
    awayExpectedGoals: Number(awayXg.toFixed(2)),
    homeRating,
    awayRating,
    probabilities: {
      homeWin: Number(blended.home.toFixed(4)),
      draw: Number(blended.draw.toFixed(4)),
      awayWin: Number(blended.away.toFixed(4)),
      over15: Number(dc.over15.toFixed(4)),
      under15: Number(dc.under15.toFixed(4)),
      over25: Number(dc.over25.toFixed(4)),
      under25: Number(dc.under25.toFixed(4)),
      over35: Number(dc.over35.toFixed(4)),
      under35: Number(dc.under35.toFixed(4)),
      bttsYes: Number(dc.bttsYes.toFixed(4)),
      bttsNo: Number(dc.bttsNo.toFixed(4))
    },
    modelAgreement,
    confidenceGrade: confidenceGrade(Math.max(blended.home, blended.draw, blended.away)),
    topScorelines,
    predictions,
    explanation
  };
};

module.exports = {
  MODEL_VERSION,
  MIN_CONFIDENCE,
  generatePredictionsForFixture
};