import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Crown, Trophy, Home, Star, ArrowRight } from 'lucide-react';
import { useAuth } from '../App';
import api from '../utils/api';
import '../css/VIP.css';

const VIPSuccess = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || searchParams.get('trxref');

      if (!reference) {
        setError('Payment reference not found');
        setVerificationStatus('failed');
        return;
      }

      try {
        // Verify payment with backend
        const response = await api.post('/api/vip/verify-payment', {
          reference: reference
        });

        if (response.data.success) {
          setVerificationStatus('success');
          // Get updated VIP status
          const vipStatusResponse = await api.get('/api/vip/status');
          setPaymentDetails({
            reference: reference,
            status: 'success',
            vipStatus: vipStatusResponse.data
          });
        } else {
          setVerificationStatus('failed');
          setError('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationStatus('failed');
        setError(error.response?.data?.error || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verificationStatus === 'verifying') {
    return (
      <div className="vip-success-container">
        <div className="vip-success-card">
          <div className="vip-loading-spinner"></div>
          <h2 className="vip-success-title">Verifying Payment...</h2>
          <p className="vip-success-message">
            Please wait while we confirm your payment with Paystack.
          </p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'failed') {
    return (
      <div className="vip-success-container">
        <div className="vip-success-card error">
          <div className="vip-success-icon error">
            <CheckCircle size={64} />
          </div>
          <h2 className="vip-success-title">Payment Verification Failed</h2>
          <p className="vip-success-message">
            {error || 'There was an issue verifying your payment. Please contact support if the issue persists.'}
          </p>
          <div className="vip-success-actions">
            <Link to="/vip" className="vip-action-btn primary">
              Try Again
            </Link>
            <Link to="/" className="vip-action-btn secondary">
              <Home size={18} />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isVVIP = paymentDetails?.vipStatus?.vipTier === 'vvip';

  return (
    <div className="vip-success-container">
      <div className="vip-success-card">
        <div className="vip-success-icon">
          <CheckCircle size={64} />
        </div>

        <h1 className="vip-success-title">
          Welcome to {isVVIP ? 'VVIP' : 'VIP'}!
        </h1>

        <p className="vip-success-message">
          Your payment has been successfully processed. You now have access to all {isVVIP ? 'VVIP' : 'VIP'} features and premium predictions.
        </p>

        <div className="vip-success-details">
          <div className="vip-success-detail">
            <span className="vip-detail-label">Payment Reference:</span>
            <span className="vip-detail-value">{paymentDetails?.reference}</span>
          </div>

          {paymentDetails?.vipStatus?.vipExpiry && (
            <div className="vip-success-detail">
              <span className="vip-detail-label">{isVVIP ? 'VVIP' : 'VIP'} Expires:</span>
              <span className="vip-detail-value">
                {new Date(paymentDetails.vipStatus.vipExpiry).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="vip-success-detail">
            <span className="vip-detail-label">Status:</span>
            <span className="vip-detail-value success">Active</span>
          </div>
        </div>

        <div className="vip-success-features">
          <h3>You now have access to:</h3>
          <div className="vip-features-list">
            <div className="vip-feature-item">
              <Star size={16} />
              <span>{isVVIP ? 'VVIP' : 'VIP'}-only predictions</span>
            </div>
            <div className="vip-feature-item">
              <Star size={16} />
              <span>Advanced bet code converter</span>
            </div>
            <div className="vip-feature-item">
              <Star size={16} />
              <span>Premium analytics dashboard</span>
            </div>
            <div className="vip-feature-item">
              <Star size={16} />
              <span>Priority customer support</span>
            </div>
            {isVVIP && (
              <>
                <div className="vip-feature-item">
                  <Trophy size={16} />
                  <span>Exclusive VVIP badge</span>
                </div>
                <div className="vip-feature-item">
                  <Trophy size={16} />
                  <span>Public profile with tweet functionality</span>
                </div>
                <div className="vip-feature-item">
                  <Trophy size={16} />
                  <span>Follow/follower system</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="vip-success-actions">
          <Link to="/predictions/vip" className="vip-action-btn primary">
            {isVVIP ? <Trophy size={18} /> : <Crown size={18} />}
            View {isVVIP ? 'VVIP' : 'VIP'} Predictions
            <ArrowRight size={18} />
          </Link>
          <Link to="/vip/converter" className="vip-action-btn secondary">
            <Star size={18} />
            Bet Code Converter
          </Link>
          {isVVIP && (
            <Link to={`/profile/${user?.username}`} className="vip-action-btn secondary">
              <Trophy size={18} />
              Public Profile
            </Link>
          )}
          <Link to="/" className="vip-action-btn outline">
            <Home size={18} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VIPSuccess;
