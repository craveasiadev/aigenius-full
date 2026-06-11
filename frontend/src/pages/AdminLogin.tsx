import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api, setToken, clearToken, getToken } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types/models';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE } from '../lib/uiTokens';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const store = useStore();
  const { currentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'master' && getToken()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{
        success: boolean;
        token: string;
        user: {
          id: string;
          email: string;
          name: string;
          role: string;
          created_at: string;
        };
        message?: string;
      }>('/auth/login', { email, password });

      if (!response.success || !response.token || !response.user) {
        setError(response.message || 'Failed to login');
        setLoading(false);
        return;
      }

      if (response.user.role !== 'master') {
        clearToken();
        setError('This portal is only for admin accounts.');
        setLoading(false);
        return;
      }

      setToken(response.token);
      store.setCurrentUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as Role,
        passwordHash: '',
        createdAt: response.user.created_at,
      });

      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err?.message || 'Unable to login');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        overflow: 'hidden',
        // Honour the iOS notch / Android gesture bar.
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
      className={`${PAGE} flex items-center justify-center touch-manipulation`}
    >
      <StarfieldBackground />
      <DottedBackground />
      {/* Gradient orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '60%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          {/* Glass icon container */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              marginBottom: '12px',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
            }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: '#a5b4fc' }} />
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 1)',
            }}
          >
            Admin Portal
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              marginTop: '4px',
            }}
          >
            Sign in with admin credentials.
          </p>
        </div>

        {/* Glass card gradient border wrapper */}
        <div
          style={{
            padding: '1px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 50%, rgba(99,102,241,0.08) 100%)',
          }}
        >
          {/* Glass form card */}
          <div
            style={{
              background: 'rgba(15, 15, 30, 0.6)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: 'clamp(20px, 6vw, 32px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    className="w-4 h-4"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aigenius.com.my"
                    required
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '16px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: 'rgba(255, 255, 255, 1)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    className="w-4 h-4"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '16px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: 'rgba(255, 255, 255, 1)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                    background: 'rgba(239, 68, 68, 0.1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button — ≥48 px hit target so a thumb can hit it on
                  phones. `onMouseEnter/Leave` removed (dead on touch) and
                  replaced with the global `:active` scale. */}
              <button
                type="submit"
                disabled={loading}
                className="touch-manipulation active:scale-[0.97]"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'rgba(255, 255, 255, 1)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'transform 0.15s ease, opacity 0.15s ease',
                  boxShadow: '0 4px 24px rgba(99, 102, 241, 0.35), 0 0 40px rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Back button — same touch-target treatment as Submit. */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="touch-manipulation active:scale-[0.97] active:bg-white/10"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
              >
                Back to Public Login
              </button>
            </form>
          </div>
        </div>

        {/* Footer text */}
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '0.75rem',
            marginTop: '24px',
          }}
        >
          Restricted access. Authorized administrators only.
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
