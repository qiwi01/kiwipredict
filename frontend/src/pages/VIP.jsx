import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Crown,
  Lock,
  ReceiptText,
  Trophy,
  ShieldCheck,
  Zap,
  TrendingUp
} from 'lucide-react';
import api from '../utils/api';
import '../css/VIP.css';

const bookmakers = [
  { id: 'sportybet', name: 'SportyBet' },
  { id: 'bet9ja', name: 'Bet9ja' },
  { id: 'footballcom', name: 'Football.com' }
];

const predictionTypeLabels = {
  win: 'Match Winner',
  over15: 'Over/Under 1.5',
  over25: 'Over/Under 2.5',
  over35: 'Over/Under 3.5',
  corners: 'Corners',
  ggng: 'GG/NG',
  others: 'Others',
  player: 'Player'
};

const VIP = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('booking');
  const [selectedBookmaker, setSelectedBookmaker] = useState('sportybet');
  const [vipStatus, setVipStatus] = useState(null);
  const [bookingCodes, setBookingCodes] = useState([]);
  const [vipGames, setVipGames] = useState([]);
  const [vipOutcomes, setVipOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const isVIP = vipStatus?.isVIP || user?.vipTier === 'vip' || user?.vipTier === 'vvip';

  useEffect(() => {
    const loadVIPPage = async () => {
      try {
        setLoading(true);
        const [statusRes, codesRes, gamesRes, outcomesRes] = await Promise.all([
          api.get('/api/vip/status'),
          api.get('/api/vip/booking-codes'),
          api.get('/api/vip/games'),
          api.get('/api/vip/outcomes')
        ]);
        setVipStatus(statusRes.data);
        setBookingCodes(codesRes.data.data || []);
        setVipGames(gamesRes.data.data || []);
        setVipOutcomes(outcomesRes.data.data || []);
      } catch (error) {
        toast.error('Failed to load VIP page');
      } finally {
        setLoading(false);
      }
    };

    loadVIPPage();
  }, []);

  const selectedCodes = useMemo(
    () => bookingCodes.filter(code => code.bookmaker === selectedBookmaker),
    [bookingCodes, selectedBookmaker]
  );

  const requireVIP = () => {
    toast.error('Upgrade to VIP to generate and use booking codes.');
    setTimeout(() => navigate('/upgrade-vip'), 900);
  };

  const getPredictionTypeLabel = (type) => predictionTypeLabels[type] || 'Prediction';

  const renderBookingCodes = () => (
    <div className="vip-panel">
      <div className="vip-panel-head">
        <div>
          <h2 className="vip-panel-title"><ReceiptText size={20} /> Booking Codes</h2>
          <p className="vip-panel-sub">Exclusive codes with odds for your favourite bookmaker.</p>
        </div>
      </div>

      <div className="vip-bookmaker-tabs">
        {bookmakers.map(bookmaker => (
          <button
            key={bookmaker.id}
            type="button"
            className={`vip-bookmaker-tab ${selectedBookmaker === bookmaker.id ? 'active' : ''}`}
            onClick={() => setSelectedBookmaker(bookmaker.id)}
          >
            {bookmaker.name}
          </button>
        ))}
      </div>

      {!isVIP && (
        <div className="vip-inline-upgrade">
          <Lock size={18} />
          <span>Non-VIP users can preview bookmakers, but generating codes requires VIP access.</span>
          <button type="button" onClick={() => navigate('/upgrade-vip')}>Upgrade</button>
        </div>
      )}

      <div className="vip-code-grid">
        {selectedCodes.length ? selectedCodes.map(code => (
          <div key={code._id} className="vip-code-card">
            <div className="vip-code-top">
              <span className="vip-code-bookmaker">{code.bookmakerName || code.bookmaker}</span>
              <span className="vip-code-odds">Odds {Number(code.odds).toFixed(2)}</span>
            </div>
            <h3>{code.title || 'VIP Booking Code'}</h3>
            <p>{code.description || 'High confidence VIP booking selection.'}</p>
            {isVIP ? (
              <div className="vip-code-value">{code.code}</div>
            ) : (
              <button type="button" className="vip-generate-btn" onClick={requireVIP}>
                <Lock size={16} /> Generate Code
              </button>
            )}
          </div>
        )) : (
          <div className="vip-empty-state">No booking codes for this bookmaker yet.</div>
        )}
      </div>
    </div>
  );

  const renderPredictions = () => (
    <div className="vip-panel">
      <div className="vip-panel-head">
        <div>
          <h2 className="vip-panel-title"><Trophy size={20} /> VIP Predictions</h2>
          <p className="vip-panel-sub">Today&apos;s exclusive VIP selections.</p>
        </div>
      </div>

      <div className="vip-card-grid">
        {vipGames.length ? vipGames.map(match => (
          <div key={match._id} className="vip-game-card">
            <div className="vip-game-header">
              <span>{match.league}</span>
              <strong>{new Date(match.date).toLocaleString()}</strong>
            </div>
            <h3>{match.homeTeam} vs {match.awayTeam}</h3>
            <div className="vip-selection-list">
              {(match.predictions || []).map((prediction, index) => (
                <div key={index} className="vip-selection-row">
                  <span>{prediction.locked ? 'Selection' : getPredictionTypeLabel(prediction.type)}</span>
                  <strong className={prediction.locked ? 'vip-hashed' : ''}>{prediction.prediction}</strong>
                  {prediction.confidence && <em>{prediction.confidence}%</em>}
                </div>
              ))}
            </div>
            {!isVIP && (
              <button type="button" className="vip-card-upgrade" onClick={() => navigate('/upgrade-vip')}>
                <Lock size={16} /> Upgrade to reveal selections
              </button>
            )}
          </div>
        )) : (
          <div className="vip-empty-state">No VIP games available yet.</div>
        )}
      </div>
    </div>
  );

  const renderOutcomes = () => (
    <div className="vip-panel">
      <div className="vip-panel-head">
        <div>
          <h2 className="vip-panel-title"><TrendingUp size={20} /> VIP Outcomes</h2>
          <p className="vip-panel-sub">Results from previous VIP games.</p>
        </div>
      </div>

      <div className="vip-card-grid">
        {vipOutcomes.length ? vipOutcomes.map(match => (
          <div key={match._id} className="vip-game-card">
            <div className="vip-game-header">
              <span>{match.league}</span>
              <strong>{new Date(match.date).toLocaleDateString()}</strong>
            </div>
            <h3>{match.homeTeam} {match.homeGoals ?? '-'} - {match.awayGoals ?? '-'} {match.awayTeam}</h3>
            <div className="vip-selection-list">
              {(match.outcomes || []).map((outcome, index) => (
                <div key={index} className="vip-selection-row">
                  <span>{getPredictionTypeLabel(outcome.predictionType)}</span>
                  <strong>{outcome.prediction}</strong>
                  <em className={outcome.actualResult === 'win' ? 'vip-win' : 'vip-loss'}>{outcome.actualResult}</em>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="vip-empty-state">No VIP outcomes available yet.</div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="vip-container vip-games-page">
        <div className="vip-empty-state">Loading VIP - 99% Sure Games...</div>
      </div>
    );
  }

  return (
    <div className="vip-container vip-games-page">
      <div className="vip-hero-card">
        <span className="vip-hero-icon"><Crown size={30} /></span>
        <div>
          <h1 className="vip-title">VIP - 99% Sure Games</h1>
          <p className="vip-subtitle">
            Booking codes, VIP predictions and previous VIP outcomes in one clean place.
          </p>
          {isVIP ? (
            <span className="vip-active-pill"><ShieldCheck size={14} /> Active {user?.vipTier === 'vvip' ? 'VVIP' : 'VIP'} member</span>
          ) : (
            <button type="button" className="vip-hero-upgrade" onClick={() => navigate('/upgrade-vip')}>
              <Zap size={16} /> Upgrade to VIP
            </button>
          )}
        </div>
      </div>

      <div className="vip-section-tabs">
        <button
          type="button"
          className={activeSection === 'booking' ? 'active' : ''}
          onClick={() => setActiveSection('booking')}
        >
          <ReceiptText size={18} /> Booking Codes
        </button>
        <button
          type="button"
          className={activeSection === 'predictions' ? 'active' : ''}
          onClick={() => setActiveSection('predictions')}
        >
          <Trophy size={18} /> Predictions
        </button>
        <button
          type="button"
          className={activeSection === 'outcomes' ? 'active' : ''}
          onClick={() => setActiveSection('outcomes')}
        >
          <CheckCircle size={18} /> Outcomes
        </button>
      </div>

      {activeSection === 'booking' && renderBookingCodes()}
      {activeSection === 'predictions' && renderPredictions()}
      {activeSection === 'outcomes' && renderOutcomes()}
    </div>
  );
};

export default VIP;
