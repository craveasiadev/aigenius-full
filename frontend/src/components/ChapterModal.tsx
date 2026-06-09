import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  chapterCode?: string;
}

interface ChapterFormData {
  chapter_code: string;
  title: string;
  theme_key: string;
  primary_discovery_key: string;
  age_min: number;
  age_max: number;
  is_active: boolean;
  version: string;
  ch_orderno: number;
  description: string;
  icon: string;
  focus_areas: string[];
  reward_badge: string;
}

const THEME_OPTIONS = [
  'AMBITION',
  'INNOVATION',
  'CULTURE',
  'ENVIRONMENT',
  'SPACE',
  'EMOTIONS',
  'TECHNOLOGY',
  'SOCIAL',
  'LOGIC',
  'IDENTITY',
  'RESILIENCE',
  'COMMUNICATION',
];

const DISCOVERY_OPTIONS = [
  'CONFIDENCE',
  'CREATIVITY',
  'CURIOSITY',
  'RESPONSIBILITY',
  'EMPATHY',
  'DIGITALITY',
  'COLLABORATION',
  'LOGIC',
  'IDENTITY',
  'RESILIENCE',
  'COMMUNICATION',
  'DRIVE',
  'REFLECTION',
];

export default function ChapterModal({ isOpen, onClose, onSave, chapterCode }: ChapterModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ChapterFormData>({
    chapter_code: '',
    title: '',
    theme_key: 'AMBITION',
    primary_discovery_key: 'CONFIDENCE',
    age_min: 7,
    age_max: 12,
    is_active: true,
    version: 'V1',
    ch_orderno: 0,
    description: '',
    icon: '📚',
    focus_areas: [],
    reward_badge: '',
  });
  const [newFocusArea, setNewFocusArea] = useState('');

  const isEditMode = !!chapterCode;

  useEffect(() => {
    if (isOpen && chapterCode) {
      loadChapter();
    } else if (isOpen && !chapterCode) {
      loadNextOrderNumber();
    }
  }, [isOpen, chapterCode]);

  const loadChapter = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('chapter_code', chapterCode)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          chapter_code: data.chapter_code,
          title: data.title,
          theme_key: data.theme_key,
          primary_discovery_key: data.primary_discovery_key || 'CONFIDENCE',
          age_min: data.age_min || 7,
          age_max: data.age_max || 12,
          is_active: data.is_active,
          version: data.version || 'V1',
          ch_orderno: data.ch_orderno || 0,
          description: data.description || '',
          icon: data.icon || '📚',
          focus_areas: data.focus_areas || [],
          reward_badge: data.reward_badge || '',
        });
      }
    } catch (err) {
      console.error('Error loading chapter:', err);
      setError('Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  const loadNextOrderNumber = async () => {
    try {
      const { data } = await supabase
        .from('chapters')
        .select('ch_orderno')
        .order('ch_orderno', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (data?.ch_orderno || 0) + 1;
      setFormData((prev) => ({ ...prev, ch_orderno: nextOrder }));
    } catch (err) {
      console.error('Error getting next order number:', err);
    }
  };

  const generateChapterCode = () => {
    const theme = formData.theme_key.toUpperCase();
    const orderStr = formData.ch_orderno.toString().padStart(2, '0');
    return `CH_${theme}_${orderStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.focus_areas.length === 0) {
      setError('Please add at least one focus area');
      return;
    }

    setSaving(true);

    try {
      const chapterData = {
        ...formData,
        chapter_code: isEditMode ? formData.chapter_code : generateChapterCode(),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('chapters')
          .update(chapterData)
          .eq('chapter_code', chapterCode);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chapters')
          .insert([chapterData]);

        if (error) throw error;
      }

      onSave();
      handleClose();
    } catch (err: any) {
      console.error('Error saving chapter:', err);
      setError(err.message || 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      chapter_code: '',
      title: '',
      theme_key: 'AMBITION',
      primary_discovery_key: 'CONFIDENCE',
      age_min: 7,
      age_max: 12,
      is_active: true,
      version: 'V1',
      ch_orderno: 0,
      description: '',
      icon: '📚',
      focus_areas: [],
      reward_badge: '',
    });
    setNewFocusArea('');
    setError('');
    onClose();
  };

  const handleAddFocusArea = () => {
    if (newFocusArea.trim() && !formData.focus_areas.includes(newFocusArea.trim())) {
      setFormData(prev => ({
        ...prev,
        focus_areas: [...prev.focus_areas, newFocusArea.trim()]
      }));
      setNewFocusArea('');
    }
  };

  const handleRemoveFocusArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (field: keyof ChapterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {isEditMode ? 'Edit Chapter' : 'Add New Chapter'}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Order Number
                    </label>
                    <input
                      type="number"
                      value={formData.ch_orderno}
                      onChange={(e) => handleChange('ch_orderno', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => handleChange('version', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                {!isEditMode && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400">
                      Chapter Code will be: <span className="font-mono font-bold">{generateChapterCode()}</span>
                    </p>
                  </div>
                )}

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Chapter Code
                    </label>
                    <input
                      type="text"
                      value={formData.chapter_code}
                      disabled
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g., My Ambition Adventure"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Icon (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => handleChange('icon', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl text-center focus:outline-none focus:border-purple-500"
                      placeholder="🎯"
                      required
                      maxLength={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">Single emoji character</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reward Badge
                    </label>
                    <input
                      type="text"
                      value={formData.reward_badge}
                      onChange={(e) => handleChange('reward_badge', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Dream Achiever"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="A compelling description of what students will learn in this chapter..."
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Focus Areas
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFocusArea}
                      onChange={(e) => setNewFocusArea(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocusArea())}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Goal Setting"
                    />
                    <button
                      type="button"
                      onClick={handleAddFocusArea}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.focus_areas.map((area, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFocusArea(idx)}
                          className="hover:text-red-400 transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {formData.focus_areas.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Add at least one focus area</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={formData.theme_key}
                      onChange={(e) => handleChange('theme_key', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {THEME_OPTIONS.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Primary Discovery
                    </label>
                    <select
                      value={formData.primary_discovery_key}
                      onChange={(e) => handleChange('primary_discovery_key', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      {DISCOVERY_OPTIONS.map((discovery) => (
                        <option key={discovery} value={discovery}>
                          {discovery}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Age
                    </label>
                    <input
                      type="number"
                      value={formData.age_min}
                      onChange={(e) => handleChange('age_min', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="5"
                      max="18"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Age
                    </label>
                    <input
                      type="number"
                      value={formData.age_max}
                      onChange={(e) => handleChange('age_max', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      min="5"
                      max="18"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
                    Active (visible to users)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {isEditMode ? 'Update Chapter' : 'Create Chapter'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
