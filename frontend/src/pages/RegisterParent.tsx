import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, ArrowLeft, Info, CheckCircle, Loader2 } from 'lucide-react';
import { api, setToken } from '../lib/api';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE } from '../lib/uiTokens';

const countryCodes = [
  { code: '+60', country: 'Malaysia', flag: '\u{1F1F2}\u{1F1FE}' },
  { code: '+65', country: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}' },
  { code: '+1', country: 'USA/Canada', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '+44', country: 'UK', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: '+61', country: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: '+86', country: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: '+91', country: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: '+81', country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
];

export const RegisterParent = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    countryCode: '+60',
    location: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.post<{
        success: boolean;
        token: string;
        user: any;
        message?: string;
      }>('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: 'parent',
        mobile: formData.mobile,
        country_code: formData.countryCode,
        location: formData.location,
      });

      if (!response.success || !response.token) {
        setErrors({ email: response.message || 'Registration failed' });
        setLoading(false);
        return;
      }

      // Save token
      setToken(response.token);
      localStorage.setItem('parent_onboarding_show', '1');

      // Show success modal then navigate
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/parent/genius-profiles');
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ email: error.message || 'An unexpected error occurred' });
      setLoading(false);
    }
  };

  return (
    <div
      className={`${PAGE} overflow-y-auto px-4 touch-manipulation`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <StarfieldBackground />
      <DottedBackground />
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto relative z-10"
      >
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(139, 92, 246, 0.6))', boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)' }}>
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Parent Hero
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Support your child's AI journey</p>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/register')}
          className="px-0 flex items-center gap-2 mb-4 text-sm transition-colors"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to role selection
        </button>

        {/* Form Card */}
        <div className="p-6 sm:p-8 rounded-2xl" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {/* Info banner */}
          <div className="mb-5 p-3 rounded-lg flex items-start gap-3" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(99, 102, 241, 0.8)' }} />
            <div className="text-xs sm:text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              <strong style={{ color: 'rgba(99, 102, 241, 0.8)' }}>Note:</strong> Your child's profile data will be used to create personalized, AI-generated learning experiences tailored to their interests.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="Enter your name"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className="w-auto px-3 py-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code} style={{ background: '#1a1a2e' }}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="12-345 6789"
                />
              </div>
              {errors.mobile && <p className="text-red-400 text-xs mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="City, Country"
              />
              {errors.location && <p className="text-red-400 text-xs mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="At least 6 characters"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              By creating an account you agree to our{' '}
              <Link to="/terms" className="underline hover:opacity-80" style={{ color: 'rgba(167, 139, 250, 0.95)' }}>
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="underline hover:opacity-80" style={{ color: 'rgba(167, 139, 250, 0.95)' }}>
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs sm:text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-semibold hover:underline transition-colors"
                style={{ color: 'rgba(139, 92, 246, 0.8)' }}
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-8 max-w-md w-full text-center rounded-2xl"
              style={{ background: 'rgba(15, 15, 30, 0.8)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
              >
                <CheckCircle className="w-10 h-10" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome, Parent Hero!
              </h2>

              <p className="mb-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Your account is ready! Let's set up your child's genius profile.
              </p>

              <button
                onClick={() => {
                  localStorage.setItem('parent_onboarding_show', '1');
                  navigate('/parent/genius-profiles');
                }}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                <span>Set Up Genius Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
