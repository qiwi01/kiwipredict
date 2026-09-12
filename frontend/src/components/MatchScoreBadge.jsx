import { isLive, getMatchScore } from './matchUtils';
import '../css/MatchScoreBadge.css';

// Small scoreboard pill shown on match cards. Renders nothing for matches that
// have neither a live score nor a final result (i.e. plain upcoming fixtures).
const MatchScoreBadge = ({ match }) => {
  const live = isLive(match?.status);
  const score = getMatchScore(match);

  if (!live && !score) return null;

  return (
    <div className={`match-score-badge ${live ? 'match-score-live' : 'match-score-final'}`}>
      {live && <span className="match-score-pulse" />}
      <span className="match-score-value">{score ? `${score.home} - ${score.away}` : 'vs'}</span>
      {live && <span className="match-score-minute">{match.minute ? `${match.minute}'` : 'LIVE'}</span>}
    </div>
  );
};

export default MatchScoreBadge;