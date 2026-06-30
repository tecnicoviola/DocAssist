import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-image"></div>
      <div className="auth-content-wrapper">
        <div className="auth-card">
          <div className="auth-card-bg"></div>
          
          <div className="auth-logo">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={28} style={{ color: 'var(--accent-secondary)' }} />
            </div>
            <h1 className="gradient-text">DocAssist</h1>
            <p>Reset your password</p>
          </div>

          {!success ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </p>

              <div className="input-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                  <Mail size={18} className="input-icon" />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="auth-footer">
                Remember your password? <Link to="/login">Sign in</Link>
              </div>
            </form>
          ) : (
            <div className="auth-form" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>Check your email</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: '1.5' }}>
                If an account exists for <strong>{email}</strong>, we have sent a password reset link to it.
              </p>
              <Link to="/login" className="btn btn-ghost w-full">
                Return to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
