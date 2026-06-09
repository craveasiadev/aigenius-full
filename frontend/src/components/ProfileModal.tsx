import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, MapPin, Calendar, Users, Award, BookOpen } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  type: 'teacher' | 'student' | 'parent';
}

export const ProfileModal = ({ isOpen, onClose, profile, type }: ProfileModalProps) => {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a24] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {type.charAt(0).toUpperCase() + type.slice(1)} Profile
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {profile.name?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                  <p className="text-gray-400">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0f0f15] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <p className="text-white font-medium">{profile.email}</p>
                </div>

                <div className="bg-[#0f0f15] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Joined</span>
                  </div>
                  <p className="text-white font-medium">
                    {new Date(profile.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>

                {type === 'teacher' && (
                  <div className="bg-[#0f0f15] rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Students</span>
                    </div>
                    <p className="text-white font-medium text-2xl">{profile.studentCount || 0}</p>
                  </div>
                )}

                {type === 'student' && (
                  <>
                    <div className="bg-[#0f0f15] rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">Badges</span>
                      </div>
                      <p className="text-white font-medium text-2xl">{profile.badges || 0}</p>
                    </div>

                    <div className="bg-[#0f0f15] rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm">Current Chapter</span>
                      </div>
                      <p className="text-white font-medium">{profile.current_chapter || 'None'}</p>
                    </div>
                  </>
                )}

                {type === 'parent' && (
                  <div className="bg-[#0f0f15] rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Children</span>
                    </div>
                    <p className="text-white font-medium text-2xl">{profile.children_count || 0}</p>
                  </div>
                )}
              </div>

              {type === 'student' && profile.teacher_name && (
                <div className="bg-[#0f0f15] rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Teacher</span>
                  </div>
                  <p className="text-white font-medium">{profile.teacher_name}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
                  Edit Profile
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
