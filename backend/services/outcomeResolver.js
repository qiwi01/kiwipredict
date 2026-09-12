// Pure helpers that turn a final score into a win/loss verdict for each
// supported prediction type. Used by the result-sync job so the outcomes page
// is driven by real API results instead of manual admin input.

const normalizeGoals = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const resolveLine = (line, raw, total) => {
  if (raw.includes('over')) return total > line ? 'win' : 'loss';
  if (raw.includes('under')) return total < line ? 'win' : 'loss';
  return null;
};

/**
 * Compute a prediction result ('win' | 'loss' | null) from a final score.
 * Returns null when the prediction type can't be resolved from goals alone
 * (e.g. corners, player, others).
 *
 * @param {string} type        prediction type (win, over15, over25, over35, ggng, ...)
 * @param {string} prediction  the predicted value (e.g. 'home', 'Over 2.5', 'GG')
 * @param {number} homeGoals   final home goals
 * @param {number} awayGoals   final away goals
 */
function computeResultForPrediction(type, prediction, homeGoals, awayGoals) {
  const home = normalizeGoals(homeGoals);
  const away = normalizeGoals(awayGoals);
  if (home === null || away === null) return null;

  const total = home + away;
  const raw = String(prediction || '').toLowerCase().trim();

  switch (type) {
    case 'win': {
      if (raw === 'home' || raw === '1' || raw === 'home win' || raw === 'home_win') {
        return home > away ? 'win' : 'loss';
      }
      if (raw === 'away' || raw === '2' || raw === 'away win' || raw === 'away_win') {
        return away > home ? 'win' : 'loss';
      }
      if (raw === 'draw' || raw === 'x') {
        return home === away ? 'win' : 'loss';
      }
      return null;
    }
    case 'over15':
      return resolveLine(1.5, raw, total);
    case 'over25':
      return resolveLine(2.5, raw, total);
    case 'over35':
      return resolveLine(3.5, raw, total);
    case 'ggng': {
      const bothScore = home > 0 && away > 0;
      const isGg = raw === 'gg' || raw === 'btts' || raw === 'btts yes' || raw === 'yes';
      const isNg = raw === 'ng' || raw === 'btts no' || raw === 'no';
      if (isGg) return bothScore ? 'win' : 'loss';
      if (isNg) return bothScore ? 'loss' : 'win';
      return null;
    }
    default:
      return null;
  }
}

module.exports = {
  computeResultForPrediction
};