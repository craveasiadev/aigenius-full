import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Edit, Search, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ChapterModal from '../components/ChapterModal';
import { supabase } from '../lib/supabase';

interface Chapter {
  id: string;
  chapter_code: string;
  title: string;
  theme_key: string;
  primary_discovery_key: string | null;
  is_active: boolean;
  total_sessions: number;
}

export default function AdminChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChapterCode, setSelectedChapterCode] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      setLoading(true);

      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('*')
        .order('ch_orderno');

      if (chaptersData) {
        const chaptersWithStats = await Promise.all(
          chaptersData.map(async (chapter) => {
            const { count } = await supabase
              .from('user_chapter_responses')
              .select('*', { count: 'exact', head: true })
              .eq('chapter_id', chapter.id);

            return {
              id: chapter.id,
              chapter_code: chapter.chapter_code,
              title: chapter.title,
              theme_key: chapter.theme_key,
              primary_discovery_key: chapter.primary_discovery_key,
              is_active: chapter.is_active,
              total_sessions: count || 0,
            };
          })
        );

        setChapters(chaptersWithStats);
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChapters = chapters.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.chapter_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.theme_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddChapter = () => {
    setSelectedChapterCode(undefined);
    setIsModalOpen(true);
  };

  const handleEditChapter = (chapterCode: string) => {
    setSelectedChapterCode(chapterCode);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedChapterCode(undefined);
  };

  const handleModalSave = () => {
    loadChapters();
  };

  const glassCard = {
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>Chapters</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Manage chapter content and settings</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddChapter}
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-white font-medium"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            Add Chapter
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}
          />
        </div>

        {/* Chapters Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
            />
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No chapters found</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={glassCard}>
            <table className="w-full">
              <thead style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Theme
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Discovery
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Sessions
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredChapters.map((chapter) => (
                  <tr
                    key={chapter.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <td className="px-6 py-4 font-mono text-sm" style={{ color: 'white' }}>
                      {chapter.chapter_code}
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: 'white' }}>
                      {chapter.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}>
                        {chapter.theme_key}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {chapter.primary_discovery_key || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {chapter.is_active ? (
                        <span className="flex items-center gap-1 text-sm" style={{ color: 'rgb(74, 222, 128)' }}>
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {chapter.total_sessions}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEditChapter(chapter.chapter_code)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ChapterModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        chapterCode={selectedChapterCode}
      />
    </AdminLayout>
  );
}
