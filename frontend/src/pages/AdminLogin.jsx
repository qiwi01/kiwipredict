import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield } from 'lucide-react';
import api from '../utils/api';
import '../css/Login.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/api/auth/login', formData);

      // Check if user has admin role
      if (!res.data.user || res.data.user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        return;
      }

      login(res.data.user);
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Shield className="login-logo-icon" />
          </div>
          <h2 className="login-title">
            Admin Access
          </h2>
          <p className="login-subtitle">
            Sign in with your admin credentials to access the admin panel
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="email" className="login-form-label">
              Admin Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="login-input"
              placeholder="Enter admin email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password" className="login-form-label">
              Admin Password
            </label>
            <div className="login-password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="login-input"
                placeholder="Enter admin password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="login-password-icon" />
                ) : (
                  <Eye className="login-password-icon" />
                )}
              </button>
            </div>
          </div>

          <div className="login-form-actions">
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </div>

          <div className="login-links">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="login-link"
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
