// Node-only Elo-style rating + 1X2 probability helpers.
//
// Ratings are derived from league standings (points + goal difference) and
// converted to match probabilities with a logistic/Elo curve. In this first
// Node pass we don't persist ratings; the prediction job seeds them per batch
// from standings. (Persistent Elo + result-driven updates is a later phase.)

const BASE_RATING = 1500;
const HOME_ADVANTAGE_RATING = 65;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ratingFromStandingsRow = (row) => {
  const played = row.playedGames || 0;
  const points = row.points || 0;
  const goalsFor = row.goalsFor ?? 0;
  const goalsAgainst = row.goalsAgainst ?? 0;
  const gd = row.goalDifference ?? (goalsFor - goalsAgainst);
  const ppg = played ? points / played : 0; // 0..3
  const gdAdj = Math.sign(gd) * Math.min(Math.abs(gd), 40) * 3;
  return Math.round(BASE_RATING + (ppg - 1.25) * 110 + gdAdj);
};

// Map teamId -> rating from a football-data standings response.
const seedRatingsFromStandings = (standingsRaw) => {
  const ratings = new Map();
  for (const group of standingsRaw?.standings || []) {
    for (const row of group.table || []) {
      if (row.team?.id != null) ratings.set(row.team.id, ratingFromStandingsRow(row));
    }
  }
  return ratings;
};

// Convert a rating difference into home/draw/away probabilities.
const probabilitiesFromRatings = (homeRating, awayRating, homeAdv = HOME_ADVANTAGE_RATING) => {
  const diff = (homeRating + homeAdv) - awayRating;
  const expectedHome = 1 / (1 + Math.pow(10, -diff / 400));
  const closeness = 0.24 * Math.exp(-(diff * diff) / (2 * 200 * 200));
  const draw = clamp(closeness, 0.05, 0.34);
  const home = expectedHome * (1 - draw);
  const away = (1 - expectedHome) * (1 - draw);
  const total = home + draw + away || 1;
  return { home: home / total, draw: draw / total, away: away / total };
};

// Map a form index (~0.7..1.3) onto the same rating scale.
const formToRating = (form) => Math.round(BASE_RATING + ((form || 1) - 1) * 250);

module.exports = {
  BASE_RATING,
  HOME_ADVANTAGE_RATING,
  ratingFromStandingsRow,
  seedRatingsFromStandings,
  probabilitiesFromRatings,
  formToRating
};