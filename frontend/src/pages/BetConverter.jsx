import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ArrowRight, Shuffle, Crown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import '../css/Predictions.css';

const BetConverter = () => {
  const { user } = useAuth();
  const [bookmakers, setBookmakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const [formData, setFormData] = useState({
    fromBookmaker: '',
    toBookmaker: '',
    bookingCode: ''
  });

  const [conversionResult, setConversionResult] = useState(null);

  useEffect(() => {
    fetchBookmakers();
  }, []);

  const fetchBookmakers = async () => {
    try {
      const response = await api.get('/api/vip/bookmakers');
      if (response.data.success) {
        setBookmakers(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load bookmakers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear previous result when form changes
    if (conversionResult) {
      setConversionResult(null);
    }
  };

  const handleConvert = async (e) => {
    e.preventDefault();

    if (!formData.fromBookmaker || !formData.toBookmaker || !formData.bookingCode) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.fromBookmaker === formData.toBookmaker) {
      toast.error('Please select different bookmakers');
      return;
    }

    setConverting(true);

    try {
      const response = await api.post('/api/vip/convert-booking-code', {
        fromBookmaker: formData.fromBookmaker,
        toBookmaker: formData.toBookmaker,
        bookingCode: formData.bookingCode.trim()
      });

      if (response.data.success) {
        setConversionResult(response.data.data);
        toast.success('Booking code converted successfully!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Conversion failed';
      toast.error(errorMessage);
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const resetForm = () => {
    setFormData({
      fromBookmaker: '',
      toBookmaker: '',
      bookingCode: ''
    });
    setConversionResult(null);
  };

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
            Loading bet converter...
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
            <Shuffle className="predictions-title-icon" />
            Bet Converter
            <Crown className="vip-crown-icon" />
          </h1>
          <p className="predictions-subtitle">
            Convert booking codes between different sportsbooks instantly
          </p>
        </div>
      </div>

      {/* VIP Notice */}
      <div className="vip-notice-card">
        <Crown className="vip-notice-icon" />
        <div className="vip-notice-content">
          <h3 className="vip-notice-title">VIP Exclusive Feature</h3>
          <p className="vip-notice-text">
            This premium tool is exclusively available to VIP members. Convert booking codes between popular sportsbooks with ease.
          </p>
        </div>
      </div>

      {/* Converter Form */}
      <div className="converter-container">
        <form onSubmit={handleConvert} className="converter-form">
          <div className="converter-form-grid">
            {/* From Bookmaker */}
            <div className="converter-field">
              <label className="converter-label">From Bookmaker</label>
              <select
                value={formData.fromBookmaker}
                onChange={(e) => handleInputChange('fromBookmaker', e.target.value)}
                className="converter-select"
                required
              >
                <option value="">Select bookmaker</option>
                {bookmakers.map(bookmaker => (
                  <option key={bookmaker.id} value={bookmaker.id}>
                    {bookmaker.name} ({bookmaker.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow Icon */}
            <div className="converter-arrow">
              <ArrowRight className="converter-arrow-icon" />
            </div>

            {/* To Bookmaker */}
            <div className="converter-field">
              <label className="converter-label">To Bookmaker</label>
              <select
                value={formData.toBookmaker}
                onChange={(e) => handleInputChange('toBookmaker', e.target.value)}
                className="converter-select"
                required
              >
                <option value="">Select bookmaker</option>
                {bookmakers.map(bookmaker => (
                  <option key={bookmaker.id} value={bookmaker.id}>
                    {bookmaker.name} ({bookmaker.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Booking Code Input */}
          <div className="converter-field converter-field-full">
            <label className="converter-label">Booking Code</label>
            <input
              type="text"
              value={formData.bookingCode}
              onChange={(e) => handleInputChange('bookingCode', e.target.value.toUpperCase())}
              className="converter-input"
              placeholder="Enter your booking code (e.g., B9J123456)"
              required
            />
            <p className="converter-help">
              Enter the booking code from your source bookmaker
            </p>
          </div>

          {/* Convert Button */}
          <div className="converter-actions">
            <button
              type="submit"
              disabled={converting}
              className="converter-btn"
            >
              {converting ? (
                <>
                  <div className="btn-spinner"></div>
                  Converting...
                </>
              ) : (
                <>
                  <Shuffle className="btn-icon" />
                  Convert Code
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="converter-reset-btn"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Conversion Result */}
        {conversionResult && (
          <div className="conversion-result">
            <div className="result-header">
              <h3 className="result-title">Conversion Successful!</h3>
              <div className="result-badge">VIP</div>
            </div>

            <div className="result-details">
              <div className="result-item">
                <span className="result-label">From:</span>
                <span className="result-value">
                  {bookmakers.find(b => b.id === conversionResult.fromBookmaker)?.name}
                </span>
                <code className="result-code">{conversionResult.originalCode}</code>
              </div>

              <ArrowRight className="result-arrow" />

              <div className="result-item">
                <span className="result-label">To:</span>
                <span className="result-value">
                  {bookmakers.find(b => b.id === conversionResult.toBookmaker)?.name}
                </span>
                <code
                  className="result-code result-code-converted"
                  onClick={() => copyToClipboard(conversionResult.convertedCode)}
                  title="Click to copy"
                >
                  {conversionResult.convertedCode}
                </code>
              </div>
            </div>

            <div className="result-actions">
              <button
                onClick={() => copyToClipboard(conversionResult.convertedCode)}
                className="copy-btn"
              >
                Copy Converted Code
              </button>
            </div>

            <div className="result-notice">
              <AlertCircle className="notice-icon" />
              <p className="notice-text">
                Please verify the converted code before placing your bet. Conversion accuracy may vary.
              </p>
            </div>
          </div>
        )}

        {/* Supported Bookmakers */}
        <div className="supported-bookmakers">
          <h3 className="bookmakers-title">Supported Bookmakers</h3>
          <div className="bookmakers-grid">
            {bookmakers.map(bookmaker => (
              <div key={bookmaker.id} className="bookmaker-item">
                <span className="bookmaker-name">{bookmaker.name}</span>
                <span className="bookmaker-country">{bookmaker.country}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetConverter;
