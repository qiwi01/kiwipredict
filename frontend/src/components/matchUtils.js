export const LIVE_STATUSES = ['LIVE', 'IN_PLAY', 'PAUSED'];

export const isLive = (status) => LIVE_STATUSES.includes(status);

// Route for a match card: live matches open the live detail page, everything
// else (scheduled/finished) opens the history/pre-match research page.
// Returns null when the match has no usable football-data fixture id (e.g.
// manually-created DB matches), so cards without API backing stay non-clickable.
export const getMatchLink = (match) => {
  const id = match?.fixtureId ?? match?.id;
  if (id === null || id === undefined || id === '') return null;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  return isLive(match.status) ? `/match/${numericId}` : `/match/${numericId}/history`;
};

export const getMatchScore = (match) => {
  const fullTime = match?.score?.fullTime;
  if (
    fullTime &&
    fullTime.home !== null && fullTime.home !== undefined &&
    fullTime.away !== null && fullTime.away !== undefined
  ) {
    return { home: fullTime.home, away: fullTime.away };
  }

  if (
    match?.homeGoals !== null && match?.homeGoals !== undefined &&
    match?.awayGoals !== null && match?.awayGoals !== undefined
  ) {
    return { home: match.homeGoals, away: match.awayGoals };
  }

  return null;
};