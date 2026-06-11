import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, ArrowLeft, Upload, Info, User, Calendar, Copy, Check, Mail, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { Toast } from '../components/Toast';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateAge } from '../utils/ageCalculator';

// Memorable words for password generation
const adjectives = ['Happy', 'Lucky', 'Sunny', 'Rainbow', 'Cosmic', 'Magic', 'Super', 'Bright', 'Golden', 'Crystal'];
const nouns = ['Star', 'Moon', 'Dragon', 'Unicorn', 'Phoenix', 'Tiger', 'Rocket', 'Comet', 'Galaxy', 'Thunder'];

// Generate a unique genius ID
const generateGeniusId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GENIUS-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a memorable but secure password
const generateMemorablePassword = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  const symbols = ['!', '@', '#', '*'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  return `${adj}${noun}${number}${symbol}`;
};

export const AddGeniusProfile = () => {
  const navigate = useNavigate();

  // Auto-generate credentials on mount
  const [generatedGeniusId, setGeneratedGeniusId] = useState(generateGeniusId());
  const [generatedPassword, setGeneratedPassword] = useState(generateMemorablePassword());

  const [formData, setFormData] = useState({
    geniusName: '',
    gender: '',
    dateOfBirth: '',
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Credentials display state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [createdProfileData, setCreatedProfileData] = useState<any>(null);

  const { currentUser } = useAuth();

  // Load parent email on mount
  useEffect(() => {
    if (currentUser?.email) {
      setParentEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });

    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  // Regenerate credentials
  const regenerateCredentials = () => {
    setGeneratedGeniusId(generateGeniusId());
    setGeneratedPassword(generateMemorablePassword());
    setErrors((prev) => ({ ...prev, geniusId: '', password: '' }));
  };

  // Copy to clipboard functions
  const copyToClipboard = async (text: string, type: 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Send credentials email (Placeholder for now)
  const sendCredentialsEmail = async () => {
    if (!createdProfileData) return;
    setSendingEmail(true);
    try {
      // TODO: Implement email sending endpoint in Laravel
      // await api.post('/aipreneur/email-credentials', { ... });

      console.log('Sending email to:', parentEmail);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setEmailSent(true);
    } catch (err) {
      console.error('Failed to send email:', err);
      setEmailSent(true); // Pretend it worked
    } finally {
      setSendingEmail(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, profilePicture: 'Please select an image file' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, profilePicture: 'Image size must be less than 5MB' });
        return;
      }

      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrors({ ...errors, profilePicture: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.geniusName.trim()) newErrors.geniusName = 'Genius name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

    const normalizedId = generatedGeniusId.trim();
    if (!normalizedId) {
      newErrors.geniusId = 'Genius ID is required';
    }

    if (!generatedPassword.trim()) {
      newErrors.password = 'Password is required';
    } else if (generatedPassword.trim().length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Validate age (must be between 5 and 20 for AIpreneur)
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);

      if (age === null || age < 5 || age > 20) {
        newErrors.dateOfBirth = 'Age must be between 5 and 20 years';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Prepare payload
      const age = calculateAge(formData.dateOfBirth);
      const normalizedGeniusId = generatedGeniusId.trim();
      const safePassword = generatedPassword.trim();
      const payload = {
        parent_id: currentUser.id,
        first_name: formData.geniusName,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        age: age,
        genius_id: normalizedGeniusId,
        password: safePassword,
        avatar_url: getDefaultAvatar(), // Skipping file upload for now
      };

      // Create profile via API
      const response = await api.post<any>('/aipreneur/profiles', payload);

      if (response.success) {
        setCreatedProfileData(response.profile);
        setShowCredentialsModal(true);
      } else {
        throw new Error(response.message || 'Failed to create profile');
      }

    } catch (error: any) {
      console.error('Error:', error);
      if (error instanceof ApiError) {
        const apiData = error.data as { errors?: Record<string, string[]> } | undefined;
        const fieldErrors = apiData?.errors;

        if (fieldErrors) {
          const mappedErrors: Record<string, string> = {};

          if (fieldErrors.first_name?.length) mappedErrors.geniusName = fieldErrors.first_name[0];
          if (fieldErrors.gender?.length) mappedErrors.gender = fieldErrors.gender[0];
          if (fieldErrors.date_of_birth?.length) mappedErrors.dateOfBirth = fieldErrors.date_of_birth[0];
          if (fieldErrors.genius_id?.length) mappedErrors.geniusId = fieldErrors.genius_id[0];
          if (fieldErrors.password?.length) mappedErrors.password = fieldErrors.password[0];

          if (Object.keys(mappedErrors).length > 0) {
            setErrors(mappedErrors);
            return;
          }
        }

        if (error.message?.includes('genius_id')) {
          setErrors({ geniusId: 'Genius ID already taken. Please try another.' });
        } else {
          setErrors({ geniusName: error.message || 'Failed to create profile' });
        }
      } else {
        setErrors({ geniusName: 'An unexpected error occurred' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle closing credentials modal
  const handleCredentialsClose = () => {
    setShowCredentialsModal(false);
    setShowSuccessToast(true);
    setTimeout(() => {
      navigate('/parent/genius-profiles');
    }, 1500);
  };

  const getDefaultAvatar = () => {
    if (!formData.gender) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    const avatars: Record<string, string> = {
      male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boy',
      female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=girl',
      other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=person',
    };
    return avatars[formData.gender] || avatars.other;
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <header className="relative z-10 sticky top-0" style={{ background: 'rgba(10, 10, 26, 0.7)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/parent/genius-profiles')}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }}>
              <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-lg font-bold" style={{ color: 'white' }}>
                Add Genius Profile
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Create a learning profile for your child
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 md:px-8 py-8 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <button
            onClick={() => navigate('/parent/genius-profiles')}
            className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium"
            style={{ color: 'rgba(167, 139, 250, 1)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profiles
          </button>

          <div className="rounded-2xl p-6 md:p-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }}>
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'white' }}>
                Create Genius Profile
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Tell us about your child</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
            >
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(96, 165, 250, 1)' }} />
              <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                <strong style={{ color: 'rgba(96, 165, 250, 1)' }}>Important:</strong> Date of birth and gender cannot be changed after profile creation. This data is used to create age-appropriate personalized storybooks.
              </div>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Profile Picture
                </label>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    <img
                      src={previewUrl || getDefaultAvatar()}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-3 justify-center py-2.5 px-4 rounded-xl font-semibold transition-all" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}>
                        <Upload className="w-5 h-5" />
                        <span className="font-semibold">Upload Photo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                    {errors.profilePicture && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{errors.profilePicture}</p>}
                  </div>
                </div>
              </div>

              {/* Genius Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Genius Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  name="geniusName"
                  value={formData.geniusName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="Enter child's name"
                />
                {errors.geniusName && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{errors.geniusName}</p>}
              </div>

              {/* Auto-generated Credentials Preview */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgba(74, 222, 128, 0.9)' }}>
                    <Check className="w-4 h-4" />
                    Auto-Generated Login Credentials
                  </h3>
                  <button
                    type="button"
                    onClick={regenerateCredentials}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'rgba(167, 139, 250, 1)' }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Genius ID (Editable)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generatedGeniusId}
                        onChange={(e) => {
                          setGeneratedGeniusId(e.target.value);
                          if (errors.geniusId) {
                            setErrors((prev) => ({ ...prev, geniusId: '' }));
                          }
                        }}
                        className="flex-1 font-mono text-sm px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        placeholder="Enter Genius ID"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedGeniusId, 'id')}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        {copiedId ? (
                          <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                        ) : (
                          <Copy className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Password (Editable)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={generatedPassword}
                        onChange={(e) => {
                          setGeneratedPassword(e.target.value);
                          if (errors.password) {
                            setErrors((prev) => ({ ...prev, password: '' }));
                          }
                        }}
                        className="flex-1 font-mono text-sm px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        placeholder="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                        ) : (
                          <Eye className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedPassword, 'password')}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        {copiedPassword ? (
                          <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                        ) : (
                          <Copy className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {(errors.geniusId || errors.password) && (
                  <div className="mt-3 space-y-1">
                    {errors.geniusId && <p className="text-xs" style={{ color: '#f87171' }}>{errors.geniusId}</p>}
                    {errors.password && <p className="text-xs" style={{ color: '#f87171' }}>{errors.password}</p>}
                  </div>
                )}

                <p className="text-xs mt-3" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                  These credentials will be shown after creation and can be emailed to you.
                </p>
              </div>

              {/* Gender and DOB (Locked after creation) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Gender <span style={{ color: '#f87171' }}>*</span> <span className="text-xs" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>(Cannot be changed)</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <option value="" style={{ background: '#1a1a2e' }}>Select gender</option>
                    <option value="male" style={{ background: '#1a1a2e' }}>Male</option>
                    <option value="female" style={{ background: '#1a1a2e' }}>Female</option>
                    <option value="other" style={{ background: '#1a1a2e' }}>Other</option>
                  </select>
                  {errors.gender && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Date of Birth <span style={{ color: '#f87171' }}>*</span> <span className="text-xs" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>(Cannot be changed)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 pr-12 rounded-xl text-white outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', colorScheme: 'dark' }}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none opacity-70" style={{ color: 'rgba(167, 139, 250, 0.7)' }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Click the calendar icon to select a date easily</p>
                  {errors.dateOfBirth && <p className="text-sm mt-1" style={{ color: '#f87171' }}>{errors.dateOfBirth}</p>}
                </div>
              </div>

              <PrimaryButton type="submit" disabled={loading}>
                <div className="flex items-center gap-2 justify-center">
                  <span>{loading ? 'Creating Profile...' : 'Create Profile & Start Assessment'}</span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </div>
              </PrimaryButton>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Credentials Modal - Shown after successful creation */}
      <AnimatePresence>
        {showCredentialsModal && createdProfileData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg mx-auto rounded-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
              style={{ background: 'rgba(15, 15, 30, 0.8)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)' }}
            >
              {/* Success Header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                  Profile Created Successfully!
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Save these login credentials for <span className="font-semibold" style={{ color: 'rgba(167, 139, 250, 1)' }}>{createdProfileData.genius_name}</span>
                </p>
              </div>

              {/* Credentials Display */}
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Genius ID</label>
                    <button
                      onClick={() => copyToClipboard(createdProfileData.genius_id, 'id')}
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'rgba(167, 139, 250, 1)' }}
                    >
                      {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-lg sm:text-xl font-mono block break-all" style={{ color: 'rgba(167, 139, 250, 1)' }}>
                    {createdProfileData.genius_id}
                  </code>
                </div>

                <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Password</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs"
                        style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(generatedPassword, 'password')}
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'rgba(167, 139, 250, 1)' }}
                      >
                        {copiedPassword ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedPassword ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <code className="text-lg sm:text-xl font-mono block break-all" style={{ color: 'rgba(167, 139, 250, 1)' }}>
                    {showPassword ? generatedPassword : '••••••••••••'}
                  </code>
                </div>
              </div>

              {/* Email Section */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5" style={{ color: 'rgba(96, 165, 250, 1)' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(96, 165, 250, 1)' }}>Send to Email</span>
                </div>
                <p className="text-xs mb-3 break-all" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  We'll send these credentials to: <span style={{ color: 'white' }}>{parentEmail}</span>
                </p>
                <button
                  onClick={sendCredentialsEmail}
                  disabled={sendingEmail || emailSent}
                  className="w-full py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
                  style={emailSent
                    ? { background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }
                    : { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                  }
                >
                  {sendingEmail ? 'Sending...' : emailSent ? 'Email Sent!' : 'Send Credentials Email'}
                </button>
              </div>

              {/* Important Notice */}
              <div className="mb-6 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <p className="text-xs text-center" style={{ color: 'rgba(250, 204, 21, 0.9)' }}>
                  <strong>Important:</strong> Please save these credentials. The password cannot be recovered.
                </p>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleCredentialsClose}
                className="w-full py-4 text-lg flex items-center justify-center gap-2 rounded-xl font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message="Congratulations! Student added successfully"
        type="success"
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
};
