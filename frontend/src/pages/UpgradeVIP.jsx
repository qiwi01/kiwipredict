import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  CreditCard,
  Crown,
  Shield,
  Sparkles,
  Trophy,
  Zap,
  Headphones,
  RefreshCcw,
  ArrowRight
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../App';
import '../css/VIP.css';

const plans = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly (save big)' }
];

const tiers = [
  {
    id: 'vip',
    name: 'VIP',
    tagline: 'Everything you need for serious daily picks',
    prices: { monthly: '10,000', yearly: '100,000' },
    icon: Crown,
    features: [
      '3 odds & 5 odds selections daily',
      'VIP predictions for 99% sure games',
      'Priority customer support',
      'Access to VIP booking codes area'
    ]
  },
  {
    id: 'vvip',
    name: 'VVIP',
    tagline: 'The complete premium experience',
    prices: { monthly: '30,000', yearly: '300,000' },
    icon: Trophy,
    featured: true,
    features: [
      '3, 5, 10 & 20 odds selections daily',
      'Top picks predictions (exclusive)',
      'Bet code converter access',
      'All VIP predictions & booking codes',
      'Priority customer support'
    ]
  }
];

const UpgradeVIP = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [payingTier, setPayingTier] = useState(null);

  const alreadyHas = (tier) =>
    (tier === 'vip' && (user?.vipTier === 'vip' || user?.vipTier === 'vvip')) ||
    (tier === 'vvip' && user?.vipTier === 'vvip');

  const handlePayment = async (tier) => {
    try {
      setPayingTier(tier);
      const response = await api.post('/api/vip/initialize-payment', { tier, plan: selectedPlan });
      window.location.href = response.data.data.authorization_url;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initialize payment');
      setPayingTier(null);
    }
  };

  return (
    <div className="vip-container upgrade-page">
      <div className="upgrade-hero">
        <div className="upgrade-badge"><Sparkles size={18} /> Choose your membership</div>
        <h1 className="upgrade-hero-title">Upgrade to VIP or VVIP</h1>
        <p className="upgrade-hero-sub">
          Pick the tier that matches your goals. All payments are processed securely through Paystack and your access activates immediately after confirmation.
        </p>

        <div className="upgrade-plan-toggle-wrap">
          <div className="upgrade-plan-toggle">
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                className={selectedPlan === plan.id ? 'active' : ''}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.label}
                {plan.id === 'yearly' && <span className="upgrade-plan-save">2 months free</span>}
              </button>
            ))}
          </div>
          <p className="upgrade-plan-hint">
            Prices shown are for <strong>{plans.find(p => p.id === selectedPlan).label}</strong> billing.
          </p>
        </div>
      </div>

      <div className="upgrade-grid">
        {tiers.map(tier => {
          const Icon = tier.icon;
          return (
            <div key={tier.id} className={`upgrade-tier-card ${tier.featured ? 'featured' : ''}`}>
              {tier.featured && <span className="upgrade-tier-ribbon">Most Popular</span>}

              <div className="upgrade-tier-head">
                <span className={`upgrade-tier-icon ${tier.id}`}><Icon size={26} /></span>
                <h2>{tier.name}</h2>
                <p>{tier.tagline}</p>
              </div>

              <div className="upgrade-price">
                <span className="upgrade-currency">₦</span>
                <strong>{tier.prices[selectedPlan]}</strong>
                <span className="upgrade-period">/ {selectedPlan === 'monthly' ? 'month' : 'year'}</span>
              </div>

              <ul className="upgrade-features">
                {tier.features.map(feature => (
                  <li key={feature} className="upgrade-feature">
                    <CheckCircle size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="upgrade-pay-btn"
                onClick={() => handlePayment(tier.id)}
                disabled={payingTier === tier.id || alreadyHas(tier.id)}
              >
                {alreadyHas(tier.id) ? (
                  <>
                    <Shield size={18} /> Already {tier.name}
                  </>
                ) : payingTier === tier.id ? (
                  <>
                    <RefreshCcw size={18} className="upgrade-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} /> Get {tier.name} now
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="upgrade-includes">
        <div className="upgrade-include-item">
          <Headphones size={18} />
          <span>Priority customer support on both tiers</span>
        </div>
        <div className="upgrade-include-item">
          <Zap size={18} />
          <span>Access activates immediately after confirmation</span>
        </div>
        <div className="upgrade-include-item">
          <Shield size={18} />
          <span>Secure payment powered by Paystack</span>
        </div>
      </div>
    </div>
  );
};

export default UpgradeVIP;