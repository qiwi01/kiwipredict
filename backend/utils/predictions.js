// Poisson distribution helper functions
function poissonProbability(lambda, k) {
  if (k < 0) return 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Calculate match probabilities using Poisson distribution
function calculateMatchProbabilities(homeStrength, awayStrength, homeAdvantage = 1.2) {
  const homeLambda = (homeStrength / 100) * 2.5 * homeAdvantage; // Expected goals
  const awayLambda = (awayStrength / 100) * 2.5;

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  // Calculate probabilities for scores 0-5 (covers most matches)
  for (let homeGoals = 0; homeGoals <= 5; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= 5; awayGoals++) {
      const prob = poissonProbability(homeLambda, homeGoals) * poissonProbability(awayLambda, awayGoals);
      if (homeGoals > awayGoals) homeWinProb += prob;
      else if (homeGoals === awayGoals) drawProb += prob;
      else awayWinProb += prob;
    }
  }

  return { homeWinProb, drawProb, awayWinProb };
}

// Generate AI prediction for a match
function generatePrediction(homeStrength, awayStrength) {
  const probs = calculateMatchProbabilities(homeStrength, awayStrength);

  // Determine prediction based on highest probability
  let prediction = '1';
  let confidence = Math.round(probs.homeWinProb * 100);

  if (probs.awayWinProb > probs.homeWinProb && probs.awayWinProb > probs.drawProb) {
    prediction = '2';
    confidence = Math.round(probs.awayWinProb * 100);
  } else if (probs.drawProb > probs.homeWinProb && probs.drawProb > probs.awayWinProb) {
    prediction = 'X';
    confidence = Math.round(probs.drawProb * 100);
  }

  return {
    prediction,
    confidence,
    probabilities: probs
  };
}

// Check if a prediction is a value bet
function isValueBet(prediction, bookmakerOdds, probabilities) {
  if (!bookmakerOdds) return false;

  const { homeWinProb, drawProb, awayWinProb } = probabilities;

  switch (prediction) {
    case '1':
      return parseFloat(bookmakerOdds.home) > (1 / homeWinProb);
    case 'X':
      return parseFloat(bookmakerOdds.draw) > (1 / drawProb);
    case '2':
      return parseFloat(bookmakerOdds.away) > (1 / awayWinProb);
    default:
      return false;
  }
}

// Generate mock bookmaker odds
function generateMockOdds() {
  return {
    home: parseFloat((1.5 + Math.random() * 2).toFixed(2)), // 1.5-3.5
    draw: parseFloat((2.5 + Math.random() * 2).toFixed(2)), // 2.5-4.5
    away: parseFloat((1.5 + Math.random() * 2).toFixed(2)), // 1.5-3.5
    bookmaker: 'MockBookmaker'
  };
}

module.exports = {
  calculateMatchProbabilities,
  generatePrediction,
  isValueBet,
  generateMockOdds,
  poissonProbability,
  factorial
};
