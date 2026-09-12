// Gathers real, data-driven team metrics (recent form, league baseline and
// head-to-head) for one fixture. All upstream calls are cached + throttled by
// footballApi.js, so repeated fixtures across a weekly batch stay cheap.

const {
  fetchTeamRecent,
  fetchStandings,
  fetchHeadToHead
} = require('./footballApi');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeLeagueAverage = (standingsRaw) => {
  const groups = standingsRaw?.standings || [];
  let totalPlayed = 0;
  let totalGoals = 0;

  for (const group of groups) {
    for (const row of group.table || []) {
      totalPlayed += row.playedGames || 0;
      totalGoals += row.goalsFor || 0;
    }
  }

  if (!totalPlayed) return { avgMatchGoals: 2.5, avgTeamGoals: 1.25 };

  const matchCount = totalPlayed / 2;
  return {
    avgMatchGoals: matchCount ? totalGoals / matchCount : 2.5,
    avgTeamGoals: totalPlayed ? totalGoals / totalPlayed : 1.25
  };
};

const summarizeRecent = (matches, teamId) => {
  let gf = 0;
  let ga = 0;
  let pts = 0;
  let played = 0;

  for (const match of matches || []) {
    const fullTime = match.score?.fullTime;
    if (!fullTime || fullTime.home == null || fullTime.away == null) continue;

    const isHome = match.homeTeam?.id === teamId;
    const teamGoals = isHome ? fullTime.home : fullTime.away;
    const oppGoals = isHome ? fullTime.away : fullTime.home;

    gf += teamGoals;
    ga += oppGoals;
    if (teamGoals > oppGoals) pts += 3;
    else if (teamGoals === oppGoals) pts += 1;
    played += 1;
  }

  return { gf, ga, pts, played };
};

// Convert recent results into attack/defence/form indices relative to the
// league's average team goals. >1 attack means above-average scoring; >1
// defence means above-average concession.
const indicesForTeam = (matches, teamId, leagueAvgTeamGoals) => {
  const summary = summarizeRecent(matches, teamId);

  if (!summary.played) {
    return { attack: 1, defense: 1, form: 1, avgFor: null, avgAgainst: null, played: 0 };
  }

  const avgFor = summary.gf / summary.played;
  const avgAgainst = summary.ga / summary.played;
  const ppg = summary.pts / (summary.played * 3); // 0..1
  const base = leagueAvgTeamGoals || 1.25;

  return {
    attack: clamp(avgFor / base, 0.4, 2.4),
    defense: clamp(avgAgainst / base, 0.4, 2.4),
    form: 0.7 + 0.6 * ppg,
    avgFor: Number(avgFor.toFixed(2)),
    avgAgainst: Number(avgAgainst.toFixed(2)),
    played: summary.played
  };
};

const h2hStats = (matches, homeTeamId, awayTeamId) => {
  let homeGoals = 0;
  let awayGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let played = 0;

  for (const match of matches || []) {
    const fullTime = match.score?.fullTime;
    if (!fullTime || fullTime.home == null || fullTime.away == null) continue;

    let hg;
    let ag;
    if (match.homeTeam?.id === homeTeamId && match.awayTeam?.id === awayTeamId) {
      hg = fullTime.home;
      ag = fullTime.away;
    } else if (match.homeTeam?.id === awayTeamId && match.awayTeam?.id === homeTeamId) {
      hg = fullTime.away;
      ag = fullTime.home;
    } else {
      continue;
    }

    homeGoals += hg;
    awayGoals += ag;
    played += 1;
    if (hg > ag) homeWins += 1;
    else if (hg === ag) draws += 1;
    else awayWins += 1;
  }

  return {
    played,
    homeGoalsAvg: played ? Number((homeGoals / played).toFixed(2)) : null,
    awayGoalsAvg: played ? Number((awayGoals / played).toFixed(2)) : null,
    homeWins,
    draws,
    awayWins
  };
};

/**
 * @param {object} fixture  Normalized fixture with id, homeTeamId, awayTeamId,
 *                          competitionCode (all optional; missing ids degrade
 *                          gracefully to neutral indices).
 */
const gatherTeamStats = async (fixture) => {
  const homeTeamId = fixture.homeTeamId ?? null;
  const awayTeamId = fixture.awayTeamId ?? null;
  const competitionCode = fixture.competitionCode || null;
  const fixtureId = fixture.id ?? fixture.externalFixtureId ?? null;

  const [homeRaw, awayRaw, standingsRaw, h2hRaw] = await Promise.all([
    homeTeamId ? fetchTeamRecent(homeTeamId, 8) : Promise.resolve({ matches: [] }),
    awayTeamId ? fetchTeamRecent(awayTeamId, 8) : Promise.resolve({ matches: [] }),
    competitionCode ? fetchStandings(competitionCode) : Promise.resolve(null),
    fixtureId ? fetchHeadToHead(fixtureId, 10) : Promise.resolve({ matches: [] })
  ]);

  const league = computeLeagueAverage(standingsRaw);

  return {
    home: indicesForTeam(homeRaw?.matches || [], homeTeamId, league.avgTeamGoals),
    away: indicesForTeam(awayRaw?.matches || [], awayTeamId, league.avgTeamGoals),
    leagueAvgTeamGoals: league.avgTeamGoals,
    headToHead: h2hStats(h2hRaw?.matches || [], homeTeamId, awayTeamId)
  };
};

module.exports = {
  gatherTeamStats,
  computeLeagueAverage,
  indicesForTeam,
  h2hStats,
  summarizeRecent
};