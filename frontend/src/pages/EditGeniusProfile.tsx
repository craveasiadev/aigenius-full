import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { User, ArrowLeft, Upload, Lock, Save, Calendar } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { api, getAssetUrl } from '../lib/api';

export const EditGeniusProfile = () => {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();

  const [formData, setFormData] = useState({
    geniusName: '',
    geniusId: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: '',
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [currentPictureUrl, setCurrentPictureUrl] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    try {
      const response = await api.get<{
        success: boolean;
        profile: {
          id: string;
          genius_id: string;
          genius_name: string;
          gender: string;
          date_of_birth: string;
          profile_picture_url: string | null;
        };
      }>(`/aipreneur/profiles/${profileId}`);

      if (!response.success || !response.profile) {
        console.error('Error loading profile: Profile not found');
        navigate('/parent/genius-profiles');
        return;
      }

      const data = response.profile;
      setFormData({
        geniusName: data.genius_name,
        geniusId: data.genius_id || '',
        password: '',
        confirmPassword: '',
        gender: data.gender,
        dateOfBirth: data.date_of_birth,
      });

      // Handle profile picture URL with assets URL
      if (data.profile_picture_url) {
        const pictureUrl = data.profile_picture_url.startsWith('http')
          ? data.profile_picture_url
          : getAssetUrl(data.profile_picture_url);
        setCurrentPictureUrl(pictureUrl);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      navigate('/parent/genius-profiles');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, profilePicture: 'Please select an image file' });
        return;
      }

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
    if (!formData.geniusId.trim()) {
      newErrors.geniusId = 'Genius ID is required';
    }

    if (formData.password) {
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      // Create FormData for multipart upload if there's a new profile picture
      const formDataToSend = new FormData();
      formDataToSend.append('genius_name', formData.geniusName);
      formDataToSend.append('genius_id', formData.geniusId.trim());

      if (formData.password) {
        formDataToSend.append('password', formData.password);
      }

      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }

      const response = await api.postFormData<{
        success: boolean;
        message?: string;
        profile?: any;
      }>(`/aipreneur/profiles/${profileId}`, formDataToSend);

      if (!response.success) {
        setErrors({ geniusName: response.message || 'Failed to update profile' });
        setSaving(false);
        return;
      }

      // Navigate back to parent dashboard
      navigate('/p/dashboard');
    } catch (error: any) {
      console.error('Error:', error);
      const backendErrors = error?.data?.errors as Record<string, string[]> | undefined;
      if (backendErrors) {
        const mapped: Record<string, string> = {};
        if (backendErrors.genius_name?.length) mapped.geniusName = backendErrors.genius_name[0];
        if (backendErrors.genius_id?.length) mapped.geniusId = backendErrors.genius_id[0];
        if (backendErrors.password?.length) mapped.password = backendErrors.password[0];
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          setSaving(false);
          return;
        }
      }
      setErrors({ geniusName: error.message || 'An unexpected error occurred' });
      setSaving(false);
    }
  };

  const getDefaultAvatar = () => {
    const avatars: Record<string, string> = {
      male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boy',
      female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=girl',
      other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=person',
    };
    return avatars[formData.gender] || avatars.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          <p className="text-sm sm:text-base" style={{ color: 'white' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <header className="relative z-10 sticky top-0" style={{ background: 'rgba(10, 10, 26, 0.7)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-14 sm:h-16 md:h-20 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            onClick={() => navigate('/parent/genius-profiles')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }}>
              <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold" style={{ color: 'white' }}>
                Edit Genius Profile
              </h1>
              <p className="text-[10px] sm:text-xs hidden xs:block" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Update profile information
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl"
        >
          <button
            onClick={() => navigate('/parent/genius-profiles')}
            className="mb-3 sm:mb-4 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
            style={{ color: 'rgba(167, 139, 250, 1)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back to profiles</span>
            <span className="xs:hidden">Back</span>
          </button>

          <div className="rounded-2xl p-5 sm:p-6 md:p-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 rounded-2xl sm:rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }}>
                <User className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: 'white' }}>
                Edit Profile
              </h2>
              <p className="text-sm sm:text-base" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Update editable information</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Profile Picture Upload */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Profile Picture
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    <img
                      src={previewUrl || currentPictureUrl || getDefaultAvatar()}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="cursor-pointer block">
                      <div className="flex items-center gap-2 sm:gap-3 justify-center text-sm sm:text-base py-2.5 px-4 rounded-xl font-semibold transition-all" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}>
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-semibold">Upload New Photo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] sm:text-xs mt-2 text-center sm:text-left" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                    {errors.profilePicture && <p className="text-xs sm:text-sm mt-1 text-center sm:text-left" style={{ color: '#f87171' }}>{errors.profilePicture}</p>}
                  </div>
                </div>
              </div>

              {/* Genius Name - Editable */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Genius Name <span style={{ color: '#4ade80' }}>(Editable)</span>
                </label>
                <input
                  type="text"
                  name="geniusName"
                  value={formData.geniusName}
                  onChange={handleChange}
                  className="w-full text-sm sm:text-base px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="Enter genius name"
                />
                {errors.geniusName && <p className="text-xs sm:text-sm mt-1" style={{ color: '#f87171' }}>{errors.geniusName}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Genius ID <span style={{ color: '#4ade80' }}>(Editable)</span>
                </label>
                <input
                  type="text"
                  name="geniusId"
                  value={formData.geniusId}
                  onChange={handleChange}
                  className="w-full text-sm sm:text-base font-mono px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  placeholder="Enter Genius ID"
                />
                {errors.geniusId && <p className="text-xs sm:text-sm mt-1" style={{ color: '#f87171' }}>{errors.geniusId}</p>}
              </div>

              {/* Password Fields - Editable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    New Password <span className="text-[10px] sm:text-xs" style={{ color: '#4ade80' }}>(Optional)</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full text-sm sm:text-base px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Leave blank to keep"
                  />
                  {errors.password && <p className="text-xs sm:text-sm mt-1" style={{ color: '#f87171' }}>{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full text-sm sm:text-base px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    placeholder="Re-enter password"
                  />
                  {errors.confirmPassword && <p className="text-xs sm:text-sm mt-1" style={{ color: '#f87171' }}>{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Locked Fields - Gender and DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Gender - Locked */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Gender <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.gender}
                    disabled
                    className="w-full text-sm sm:text-base capitalize cursor-not-allowed opacity-60 px-4 py-3 rounded-xl text-white"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                  />
                </div>

                {/* DOB - Locked */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Date of Birth <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      disabled
                      className="w-full text-sm sm:text-base pr-10 sm:pr-12 cursor-not-allowed opacity-60 px-4 py-3 rounded-xl text-white"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', colorScheme: 'dark' }}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none opacity-50" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs -mt-2 sm:-mt-3" style={{ color: 'rgba(250, 204, 21, 0.6)' }}>Gender and date of birth cannot be changed</p>

              <PrimaryButton type="submit" disabled={saving}>
                <div className="flex items-center gap-2 justify-center">
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </div>
              </PrimaryButton>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
