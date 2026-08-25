const MODEL_VERSION = 'kiwi-semi-ai-v1.0';

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

const calculateGoalMatrix = (homeExpectedGoals, awayExpectedGoals, maxGoals = 7) => {
  const matrix = [];
  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
      matrix.push({
        homeGoals,
        awayGoals,
        probability: poisson(homeExpectedGoals, homeGoals) * poisson(awayExpectedGoals, awayGoals)
      });
    }
  }
  return matrix;
};

const percentage = (probability) => Math.round(clamp(probability, 0, 1) * 100);
const fairOdds = (probability) => probability > 0 ? Number((1 / probability).toFixed(2)) : null;

const pickWinPrediction = ({ homeWin, draw, awayWin }) => {
  const options = [
    { prediction: '1', probability: homeWin },
    { prediction: 'X', probability: draw },
    { prediction: '2', probability: awayWin }
  ];
  return options.sort((a, b) => b.probability - a.probability)[0];
};

const generateExplanation = ({ homeTeam, awayTeam, homeExpectedGoals, awayExpectedGoals, strongestMarket }) => (
  `Semi-AI model projects ${homeTeam} around ${homeExpectedGoals.toFixed(2)} expected goals and ${awayTeam} around ${awayExpectedGoals.toFixed(2)}. ` +
  `The strongest generated market is ${strongestMarket.prediction} at ${percentage(strongestMarket.probability)}%.`
);

const generatePredictionsForFixture = (fixture) => {
  const homeTeam = fixture.homeTeam || fixture.homeTeam?.name || 'Home Team';
  const awayTeam = fixture.awayTeam || fixture.awayTeam?.name || 'Away Team';
  const competition = fixture.competition || fixture.competitionCode || 'Unknown League';
  const homeStats = estimateTeamStrength(homeTeam, competition);
  const awayStats = estimateTeamStrength(awayTeam, competition);

  const leagueGoalBase = 1.35;
  const homeAdvantage = 1.12;
  const homeExpectedGoals = clamp(leagueGoalBase * homeStats.attack * awayStats.defense * homeStats.form * homeAdvantage, 0.35, 3.4);
  const awayExpectedGoals = clamp(leagueGoalBase * awayStats.attack * homeStats.defense * awayStats.form, 0.25, 3.1);
  const matrix = calculateGoalMatrix(homeExpectedGoals, awayExpectedGoals);

  const probabilities = matrix.reduce((acc, score) => {
    if (score.homeGoals > score.awayGoals) acc.homeWin += score.probability;
    if (score.homeGoals === score.awayGoals) acc.draw += score.probability;
    if (score.homeGoals < score.awayGoals) acc.awayWin += score.probability;
    if (score.homeGoals + score.awayGoals > 1.5) acc.over15 += score.probability;
    if (score.homeGoals + score.awayGoals > 2.5) acc.over25 += score.probability;
    if (score.homeGoals + score.awayGoals > 3.5) acc.over35 += score.probability;
    if (score.homeGoals > 0 && score.awayGoals > 0) acc.bttsYes += score.probability;
    return acc;
  }, { homeWin: 0, draw: 0, awayWin: 0, over15: 0, over25: 0, over35: 0, bttsYes: 0 });

  probabilities.under15 = 1 - probabilities.over15;
  probabilities.under25 = 1 - probabilities.over25;
  probabilities.under35 = 1 - probabilities.over35;
  probabilities.bttsNo = 1 - probabilities.bttsYes;

  const winPick = pickWinPrediction(probabilities);
  const goalsPick = probabilities.over25 >= probabilities.under25
    ? { type: 'over25', prediction: 'Over 2.5', probability: probabilities.over25 }
    : { type: 'over25', prediction: 'Under 2.5', probability: probabilities.under25 };
  const over15Pick = probabilities.over15 >= 0.62
    ? { type: 'over15', prediction: 'Over 1.5', probability: probabilities.over15 }
    : { type: 'over15', prediction: 'Under 1.5', probability: probabilities.under15 };
  const over35Pick = probabilities.over35 >= 0.44
    ? { type: 'over35', prediction: 'Over 3.5', probability: probabilities.over35 }
    : { type: 'over35', prediction: 'Under 3.5', probability: probabilities.under35 };
  const bttsPick = probabilities.bttsYes >= probabilities.bttsNo
    ? { type: 'ggng', prediction: 'GG', probability: probabilities.bttsYes }
    : { type: 'ggng', prediction: 'NG', probability: probabilities.bttsNo };

  const candidateMarkets = [
    { type: 'win', ...winPick },
    over15Pick,
    goalsPick,
    over35Pick,
    bttsPick
  ].sort((a, b) => b.probability - a.probability);

  const generatedAt = new Date();
  const strongestMarket = candidateMarkets[0];
  const explanation = generateExplanation({ homeTeam, awayTeam, homeExpectedGoals, awayExpectedGoals, strongestMarket });

  const predictions = candidateMarkets.map((market, index) => ({
    type: market.type,
    prediction: market.prediction,
    confidence: percentage(market.probability),
    probability: Number(market.probability.toFixed(4)),
    fairOdds: fairOdds(market.probability),
    valueBet: market.probability >= 0.62,
    odds: {},
    visibility: index >= 3 ? 'vip' : 'all',
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
    explanation
  };
};

module.exports = {
  MODEL_VERSION,
  generatePredictionsForFixture
};