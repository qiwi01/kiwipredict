import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { Crown, CheckCircle, CreditCard, Lock, TrendingUp, Trophy, Calendar } from 'lucide-react';
import api from '../utils/api';
import '../css/VIP.css';
import '../css/Predictions.css';

const VIP = () => {
  const { user } = useAuth();
  const [vipStatus, setVipStatus] = useState(null);
  const [selectedTier, setSelectedTier] = useState('vip');
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [vipMatches, setVipMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkVIPStatus();
    }
  }, [user]);

  useEffect(() => {
    if (vipStatus !== null) {
      fetchVIPPredictions();
    }
  }, [vipStatus]);

  const checkVIPStatus = async () => {
    try {
      const response = await api.get('/api/vip/status');
      setVipStatus(response.data);
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchVIPPredictions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/matches');
      const allMatches = response.data || [];

      // Filter to show any matches that contain VIP/VVIP prediction cards.
      // For non-VIP users the backend returns these predictions as locked.
      const vipMatches = allMatches.filter(match =>
        match.gameTier === 'vip' ||
        match.gameTier === 'vvip' ||
        match.predictions && match.predictions.some(pred =>
          pred.visibility === 'vip' || pred.visibility === 'vvip' || pred.visibility === 'both'
        )
      );

      setVipMatches(vipMatches);
    } catch (error) {
      toast.error('Failed to load VIP predictions');
    } finally {
      setLoading(false);
    }
  };

  const getPredictionTypeLabel = (pred) => {
    if (pred.locked) return '████████';
    if (pred.type === 'win') return 'Match Winner';
    if (pred.type === 'over15') return 'Over/Under 1.5';
    if (pred.type === 'over25') return 'Over/Under 2.5';
    if (pred.type === 'over35') return 'Over/Under 3.5';
    if (pred.type === 'corners') return 'Corners';
    if (pred.type === 'ggng') return 'GG/NG';
    if (pred.type === 'others') return 'Others';
    return 'Player Prediction';
  };

  const renderVIPPredictionCards = ({ isVVIP = false, lockedPreview = false } = {}) => {
    if (loading) {
      return (
        <div className="predictions-loading">
          <div className="predictions-loading-spinner"></div>
          <div className="predictions-loading-text">
            <div className="predictions-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            Loading {isVVIP ? 'VVIP' : 'VIP'} predictions...
          </div>
        </div>
      );
    }

    return vipMatches.length === 0 ? (
      <div className="predictions-empty">
        <div className="predictions-empty-icon">{isVVIP ? '👑' : '⭐'}</div>
        <h3 className="predictions-empty-title">No {isVVIP ? 'VVIP' : 'VIP'} predictions available</h3>
        <p className="predictions-empty-description">{isVVIP ? 'VVIP' : 'VIP'} predictions will be available soon. Check back later!</p>
      </div>
    ) : (
      <div className="predictions-grid">
        {vipMatches.map((match, index) => (
          <div key={match.id || index} className="predictions-match-card">
            <div className="predictions-match-header">
              <div className="predictions-match-meta">
                <div className="predictions-match-meta-item">
                  <Calendar className="predictions-match-icon" />
                  <span>{new Date(match.utcDate).toLocaleDateString()}</span>
                </div>
                <div className="predictions-match-meta-item">
                  <span>{match.competition?.name || 'Premier League'}</span>
                </div>
              </div>

              <div className={`predictions-value-badge ${match.predictions?.some(pred => pred.visibility === 'vvip') || match.gameTier === 'vvip' ? 'vvip' : 'vip'}`}>
                <Crown className="predictions-value-icon" />
                <span>{match.predictions?.some(pred => pred.visibility === 'vvip') || match.gameTier === 'vvip' ? 'VVIP' : 'VIP'}</span>
              </div>
            </div>

            <div className="predictions-match-teams">
              <h3 className="predictions-match-teams-title">
                {match.homeTeam.name} vs {match.awayTeam.name}
              </h3>
            </div>

            <div className="predictions-outcomes-list">
              {match.predictions && match.predictions.map((pred, predIndex) => (
                <div key={predIndex} className={`predictions-outcome-item ${pred.locked || lockedPreview ? 'locked' : ''}`}>
                  <div className="predictions-outcome-header">
                    <span className="predictions-outcome-type">{getPredictionTypeLabel(pred)}</span>

                    <div className={`predictions-outcome-badge ${pred.visibility === 'vvip' ? 'vvip' : 'vip'}`}>
                      <Crown className="predictions-outcome-icon" />
                      <span>{pred.visibility === 'vvip' ? 'VVIP' : 'VIP'}</span>
                    </div>
                  </div>

                  <div className="predictions-outcome-details">
                    <div className="predictions-outcome-prediction">
                      <span className="predictions-outcome-label">Predicted:</span>
                      <span className="predictions-prediction-value">{pred.locked || lockedPreview ? '████████' : pred.prediction}</span>
                    </div>
                    <div className="predictions-outcome-confidence">
                      {pred.locked || lockedPreview ? 'VIP members only' : `${pred.confidence}% confidence`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await api.post('/api/vip/initialize-payment', {
        tier: selectedTier,
        plan: selectedPlan
      });

      // Redirect to Paystack payment page
      window.location.href = response.data.data.authorization_url;
    } catch (error) {
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // If user is already VIP, show VIP/VVIP predictions
  if (vipStatus?.isVIP) {
    const isVVIP = vipStatus.vipTier === 'vvip';

    if (loading) {
      return (
        <div className="predictions-container">
          <div className="predictions-loading">
            <div className="predictions-loading-spinner"></div>
            <div className="predictions-loading-text">
              <div className="predictions-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              Loading {isVVIP ? 'VVIP' : 'VIP'} predictions...
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="predictions-container">
        {/* Header */}
        <div className="predictions-header">
          <div className="predictions-title-section">
            <h1 className="predictions-title">
              {isVVIP ? <Trophy className="predictions-title-icon" /> : <Crown className="predictions-title-icon" />}
              {isVVIP ? 'VVIP' : 'VIP'} Predictions
            </h1>
            <p className="predictions-subtitle">
              Exclusive {isVVIP ? 'VVIP' : 'VIP'} predictions with advanced algorithms and higher accuracy
            </p>
          </div>
        </div>

        {/* VIP Status Banner */}
        <div className="vip-status-banner">
          <div className="vip-status-content">
            <div className="vip-status-info">
              {isVVIP ? <Trophy className="vip-status-icon" /> : <Crown className="vip-status-icon" />}
              <div>
                <h3 className="vip-status-title">{isVVIP ? 'VVIP Elite Member' : 'VIP Member'}</h3>
                {vipStatus.vipExpiry && (
                  <p className="vip-status-expiry">
                    Expires: {new Date(vipStatus.vipExpiry).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="vip-status-actions">
              <a href="/vip/converter" className="vip-status-btn">
                <TrendingUp className="vip-status-btn-icon" />
                Bet Converter
              </a>
            </div>
          </div>
        </div>

        {/* Predictions Grid */}
        {renderVIPPredictionCards({ isVVIP })}
      </div>
    );
  }

  // Non-VIP user sees locked VIP/VVIP prediction cards and subscription page
  return (
    <>
    <div className="predictions-container">
      <div className="predictions-header">
        <div className="predictions-title-section">
          <h1 className="predictions-title">
            <Crown className="predictions-title-icon" />
            VIP Predictions
          </h1>
          <p className="predictions-subtitle">
            VIP/VVIP match cards are visible to everyone. Subscribe to reveal the prediction details.
          </p>
        </div>
      </div>
      {renderVIPPredictionCards({ lockedPreview: true })}
    </div>

    <div className="vip-container">
      <div className="vip-header">
        <div className="vip-header-content">
          <Crown className="vip-header-icon" />
          <div>
            <h1 className="vip-title">Unlock VIP Access</h1>
            <p className="vip-subtitle">
              Unlock premium semi-AI football predictions built from data signals, market context, and expert review
            </p>
          </div>
        </div>
      </div>

      {/* Tier Selection */}
      <div className="vip-tier-selection">
        <h2 className="vip-tier-title">🎯 Choose Your Membership Tier</h2>
        <div className="vip-tier-options">
          <button
            onClick={() => setSelectedTier('vip')}
            className={`vip-tier-btn ${selectedTier === 'vip' ? 'selected' : ''}`}
            data-tier="vip"
          >
            <Crown className="vip-tier-icon" />
            <div className="vip-tier-info">
              <h3>VIP Membership</h3>
              <p>Advanced predictions, bet converter, premium analytics & priority support</p>
              <div style={{ fontSize: '0.875rem', color: 'var(--warning-600)', fontWeight: '600', marginTop: '0.5rem' }}>
                Most Popular Choice
              </div>
            </div>
          </button>
          <button
            onClick={() => setSelectedTier('vvip')}
            className={`vip-tier-btn ${selectedTier === 'vvip' ? 'selected' : ''}`}
            data-tier="vvip"
          >
            <Trophy className="vip-tier-icon" />
            <div className="vip-tier-info">
              <h3>VVIP Elite</h3>
              <p>Everything VIP + exclusive badge, public profile, tweet system, follow/follower network & early access</p>
              <div style={{ fontSize: '0.875rem', color: 'var(--primary-600)', fontWeight: '600', marginTop: '0.5rem' }}>
                Ultimate Experience
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="vip-pricing">
        <div className="vip-pricing-plans">
          {/* Monthly Plan */}
          <div className={`vip-pricing-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}>
            <div className="vip-pricing-header">
              {selectedTier === 'vvip' ? <Trophy className="vip-pricing-icon" /> : <Crown className="vip-pricing-icon" />}
              <h2 className="vip-pricing-title">Monthly {selectedTier.toUpperCase()}</h2>
              <div className="vip-pricing-price">
                <span className="vip-price-amount">
                  ₦{selectedTier === 'vvip' ? '50,000' : '10,000'}
                </span>
                <span className="vip-price-period">/ month</span>
              </div>
            </div>

            <div className="vip-pricing-features">
              {selectedTier === 'vip' ? (
                <>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Access to VIP-only predictions</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Advanced bet code converter</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Premium analytics dashboard</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Priority customer support</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>All VIP features included</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Exclusive VVIP badge</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Public profile with tweet functionality</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Follow/follower system</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Early access to new features</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`vip-plan-select-btn ${selectedPlan === 'monthly' ? 'active' : ''}`}
            >
              {selectedPlan === 'monthly' ? 'Selected' : 'Select Monthly'}
            </button>
          </div>

          {/* Yearly Plan */}
          <div className={`vip-pricing-card ${selectedPlan === 'yearly' ? 'selected' : ''}`}>
            <div className="vip-pricing-header">
              {selectedTier === 'vvip' ? <Trophy className="vip-pricing-icon" /> : <Crown className="vip-pricing-icon" />}
              <h2 className="vip-pricing-title">Yearly {selectedTier.toUpperCase()}</h2>
              <div className="vip-pricing-price">
                <span className="vip-price-amount">
                  ₦{selectedTier === 'vvip' ? '500,000' : '100,000'}
                </span>
                <span className="vip-price-period">/ year</span>
                <span className="vip-price-save">
                  Save ₦{selectedTier === 'vvip' ? '100,000' : '20,000'}
                </span>
              </div>
            </div>

            <div className="vip-pricing-features">
              {selectedTier === 'vip' ? (
                <>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>All Monthly VIP features</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Early access to new features</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>1-year membership validity</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Best value option</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>All Monthly VVIP features</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>1-year VVIP membership</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Maximum savings</span>
                  </div>
                  <div className="vip-feature-item">
                    <CheckCircle className="vip-feature-check" />
                    <span>Elite status recognition</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`vip-plan-select-btn ${selectedPlan === 'yearly' ? 'active' : ''}`}
            >
              {selectedPlan === 'yearly' ? 'Selected' : 'Select Yearly'}
            </button>
          </div>
        </div>

        <div className="vip-pricing-benefits">
          <h3 className="vip-benefits-title">{selectedTier.toUpperCase()} Benefits</h3>
          <div className="vip-benefits-grid">
            <div className="vip-benefit">
              <div className="vip-benefit-stat">{selectedTier === 'vvip' ? '99%' : '95%'}</div>
              <div className="vip-benefit-label">Prediction Accuracy</div>
            </div>
            <div className="vip-benefit">
              <div className="vip-benefit-stat">24/7</div>
              <div className="vip-benefit-label">Expert Support</div>
            </div>
            <div className="vip-benefit">
              <div className="vip-benefit-stat">1000+</div>
              <div className="vip-benefit-label">Monthly Predictions</div>
            </div>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={paymentLoading}
          className="vip-subscribe-btn"
        >
          {paymentLoading ? (
            <>
              <div className="vip-loading-spinner"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="vip-subscribe-icon" />
              Subscribe to {selectedTier.toUpperCase()} - ₦{
                selectedTier === 'vvip'
                  ? (selectedPlan === 'monthly' ? '50,000' : '500,000')
                  : (selectedPlan === 'monthly' ? '10,000' : '100,000')
              }
            </>
          )}
        </button>

        <div className="vip-security-note">
          <Lock className="vip-security-icon" />
          <span>Secure payment powered by Paystack</span>
        </div>
      </div>

      <div className="vip-testimonials">
        <h2 className="vip-testimonials-title">What Our VIP Members Say</h2>
        <div className="vip-testimonials-grid">
          <div className="vip-testimonial">
            <div className="vip-testimonial-content">
              "The VIP predictions have completely changed my betting game. I'm now consistently profitable!"
            </div>
            <div className="vip-testimonial-author">
              <span className="vip-author-name">Adebayo Johnson</span>
              <span className="vip-author-badge">VIP Member</span>
            </div>
          </div>

          <div className="vip-testimonial">
            <div className="vip-testimonial-content">
              "The bet code converter saves me so much time. Worth every penny!"
            </div>
            <div className="vip-testimonial-author">
              <span className="vip-author-name">Ngozi Okoro</span>
              <span className="vip-author-badge">VIP Member</span>
            </div>
          </div>

          <div className="vip-testimonial">
            <div className="vip-testimonial-content">
              "Customer support is amazing. They respond within minutes and are incredibly helpful."
            </div>
            <div className="vip-testimonial-author">
              <span className="vip-author-name">Chukwuemeka Nwosu</span>
              <span className="vip-author-badge">VIP Member</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default VIP;
