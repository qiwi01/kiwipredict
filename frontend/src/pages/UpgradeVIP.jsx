import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, CreditCard, Crown, Shield, Star } from 'lucide-react';
import api from '../utils/api';
import '../css/VIP.css';

const plans = [
  { id: 'monthly', label: 'Monthly', price: '10,000', note: 'Flexible VIP access for 30 days' },
  { id: 'yearly', label: 'Yearly', price: '100,000', note: 'Best value for serious users' }
];

const UpgradeVIP = () => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/vip/initialize-payment', { tier: 'vip', plan: selectedPlan });
      window.location.href = response.data.data.authorization_url;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vip-container upgrade-page">
      <div className="upgrade-hero">
        <div className="upgrade-badge"><Crown size={18} /> Upgrade to VIP</div>
        <h1>Unlock VIP - 99% Sure Games</h1>
        <p>Get full VIP selections, booking codes and premium game access with secure Paystack payment.</p>
      </div>

      <div className="upgrade-grid">
        <div className="upgrade-benefits">
          {[
            'Full VIP prediction selections',
            'SportyBet, Bet9ja and Football.com booking codes',
            'Odds attached to booking codes',
            'Access to current and future VIP games'
          ].map(item => <div key={item} className="upgrade-benefit"><CheckCircle size={18} /> {item}</div>)}
        </div>

        <div className="upgrade-card">
          <Star className="upgrade-card-icon" />
          <h2>VIP Membership</h2>
          <div className="upgrade-plan-toggle">
            {plans.map(plan => (
              <button key={plan.id} className={selectedPlan === plan.id ? 'active' : ''} onClick={() => setSelectedPlan(plan.id)}>
                {plan.label}
              </button>
            ))}
          </div>
          {plans.filter(plan => plan.id === selectedPlan).map(plan => (
            <div key={plan.id} className="upgrade-price">
              <strong>₦{plan.price}</strong>
              <span>{plan.note}</span>
            </div>
          ))}
          <button className="vip-subscribe-btn" onClick={handlePayment} disabled={loading}>
            <CreditCard className="vip-subscribe-icon" /> {loading ? 'Processing...' : 'Pay with Paystack'}
          </button>
          <div className="vip-security-note"><Shield size={16} /> Secure payment powered by Paystack</div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeVIP;