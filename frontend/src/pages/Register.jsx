import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import api from '../utils/api';
import '../css/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;
  const isPasswordValid = Object.values(passwordChecks).every(check => check);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      register(res.data.user);
      toast.success('Account created successfully! Welcome to Kiwi Predict!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }) => (
    <div className={`password-requirement ${met ? 'met' : ''}`}>
      {met ? <Check className="password-check-icon" /> : <X className="password-check-icon" />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="register-logo">
            <span className="register-logo-text">KP</span>
          </div>
          <h2 className="register-title">
            Join Kiwi Predict
          </h2>
          <p className="register-subtitle">
            Create your account and start accessing professional AI predictions
          </p>
          <p className="register-login-prompt">
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign in here
            </Link>
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form-group">
            <label htmlFor="username" className="register-form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="register-input"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="register-form-group">
            <label htmlFor="email" className="register-form-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="register-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="register-form-group">
            <label htmlFor="password" className="register-form-label">
              Password
            </label>
            <div className="register-password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="register-input"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="register-password-icon" />
                ) : (
                  <Eye className="register-password-icon" />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <>
                <div className="register-password-strength">
                  <div className={`register-password-strength-fill ${
                    Object.values(passwordChecks).filter(Boolean).length === 5 ? 'strong' :
                    Object.values(passwordChecks).filter(Boolean).length >= 3 ? 'medium' : 'weak'
                  }`}></div>
                  <div className={`register-password-strength-text ${
                    Object.values(passwordChecks).filter(Boolean).length === 5 ? 'strong' :
                    Object.values(passwordChecks).filter(Boolean).length >= 3 ? 'medium' : 'weak'
                  }`}>
                    {Object.values(passwordChecks).filter(Boolean).length === 5 ? 'Strong' :
                     Object.values(passwordChecks).filter(Boolean).length >= 3 ? 'Medium' : 'Weak'} password
                  </div>
                </div>
                <div className="password-requirements">
                  <PasswordRequirement met={passwordChecks.length} text="At least 8 characters" />
                  <PasswordRequirement met={passwordChecks.uppercase} text="One uppercase letter" />
                  <PasswordRequirement met={passwordChecks.lowercase} text="One lowercase letter" />
                  <PasswordRequirement met={passwordChecks.number} text="One number" />
                  <PasswordRequirement met={passwordChecks.special} text="One special character" />
                </div>
              </>
            )}
          </div>

          <div className="register-form-group">
            <label htmlFor="confirmPassword" className="register-form-label">
              Confirm Password
            </label>
            <div className="register-password-input">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="register-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="register-password-icon" />
                ) : (
                  <Eye className="register-password-icon" />
                )}
              </button>
            </div>
            {formData.confirmPassword && (
              <div className={`register-password-match ${passwordsMatch ? 'match' : 'no-match'}`}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          <div className="register-form-actions">
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="register-submit-btn"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="register-links">
            Already have an account?{' '}
            <Link to="/login" className="register-link">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
