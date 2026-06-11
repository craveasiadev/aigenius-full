import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  DollarSign,
  Bell,
  Search,
  UserPlus,
  Edit,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopNav } from '../components/TopNav';
import { ProfileModal } from '../components/ProfileModal';
import { AIGeniusProfilesTab } from '../components/AIGeniusProfilesTab';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE } from '../lib/uiTokens';

type AdminTab = 'Dashboard' | 'Teachers' | 'Students' | 'Parents' | 'Team' | 'Revenue & Performance' | 'Chapters & Content' | 'Reports & Analytics' | 'AI & Genius Profiles' | 'System Settings';

interface DashboardStats {
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalChapters: number;
  totalBadges: number;
  activeStudents: number;
  monthlyRevenue: number;
  countriesActive: number;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  teacher_name?: string;
  current_chapter?: string;
  last_active?: string;
  badges: number;
  progress: number;
}

interface Parent {
  id: string;
  name: string;
  email: string;
  children_count: number;
}

interface Chapter {
  id: string;
  title: string;
  student_name: string;
  status: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  hire_date: string;
  phone: string;
}

export const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('Dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalParents: 0,
    totalChapters: 0,
    totalBadges: 0,
    activeStudents: 0,
    monthlyRevenue: 214320,
    countriesActive: 4,
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileType, setProfileType] = useState<'teacher' | 'student' | 'parent'>('teacher');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    openai_api_key: '',
    text_generation_model: 'gpt-4',
    image_generation_model: 'dall-e-3',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadDashboardData();
    if (activeTab === 'System Settings') {
      loadAISettings();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: allUsers } = await supabase
        .from('users')
        .select('*');

      const { data: allChapters } = await supabase
        .from('generated_chapters')
        .select('*, users!generated_chapters_student_id_fkey(name)');

      const { data: allRewards } = await supabase
        .from('rewards')
        .select('badges, last_check_in, student_id');

      const { data: allTeamMembers } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (allUsers) {
        const teachersList = allUsers.filter((u: any) => u.role === 'teacher');
        const studentsList = allUsers.filter((u: any) => u.role === 'student');
        const parentsList = allUsers.filter((u: any) => u.role === 'parent');

        const teachersData = teachersList.map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          studentCount: studentsList.filter((s: any) => s.teacher_id === teacher.id).length,
        }));

        const studentsData = studentsList.map((student: any) => {
          const teacher = teachersList.find((t: any) => t.id === student.teacher_id);
          const studentChapters = allChapters?.filter((c: any) => c.student_id === student.id) || [];
          const currentChapter = studentChapters.find((c: any) => c.status === 'in_progress');
          const reward = allRewards?.find((r: any) => r.student_id === student.id);

          return {
            id: student.id,
            name: student.name,
            email: student.email,
            teacher_name: teacher?.name,
            current_chapter: currentChapter?.title,
            last_active: reward?.last_check_in,
            badges: reward?.badges?.length || 0,
            progress: currentChapter ? Math.round((currentChapter.current_page_index / 10) * 100) : 0,
          };
        });

        const parentsData = parentsList.map((parent: any) => ({
          id: parent.id,
          name: parent.name,
          email: parent.email,
          children: studentsList.filter((s: any) => s.parent_email === parent.email),
          children_count: studentsList.filter((s: any) => s.parent_email === parent.email).length
        }));

        const chaptersData = (allChapters || []).map(chapter => ({
          id: chapter.id,
          title: chapter.title || 'Untitled',
          student_name: chapter.users?.name || 'Unknown',
          status: chapter.status,
          created_at: chapter.created_at,
        }));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeCount = allRewards?.filter(r =>
          r.last_check_in && new Date(r.last_check_in) > sevenDaysAgo
        ).length || 0;

        const totalBadges = allRewards?.reduce((sum, r) => sum + (r.badges?.length || 0), 0) || 0;

        setStats({
          totalTeachers: teachersList.length,
          totalStudents: studentsList.length,
          totalParents: parentsList.length,
          totalChapters: allChapters?.length || 0,
          totalBadges,
          activeStudents: activeCount,
          monthlyRevenue: 214320,
          countriesActive: 4,
        });

        setTeachers(teachersData);
        setStudents(studentsData);
        setParents(parentsData);
        setChapters(chaptersData);
        setTeamMembers(allTeamMembers || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (profile: any, type: 'teacher' | 'student' | 'parent') => {
    setSelectedProfile(profile);
    setProfileType(type);
    setShowProfileModal(true);
  };

  const loadAISettings = async () => {
    try {
      const { data } = await supabase
        .from('ai_settings')
        .select('setting_key, setting_value');

      if (data) {
        const settings: Record<string, string> = {};
        data.forEach((setting: any) => {
          settings[setting.setting_key] = setting.setting_value;
        });
        setAiSettings({
          openai_api_key: settings.openai_api_key || '',
          text_generation_model: settings.text_generation_model || 'gpt-4',
          image_generation_model: settings.image_generation_model || 'dall-e-3',
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const handleSaveAISettings = async () => {
    setSavingSettings(true);
    try {
      const updates = [
        { setting_key: 'openai_api_key', setting_value: aiSettings.openai_api_key, setting_type: 'api_key', description: 'OpenAI API key for GPT-4 and DALL-E access' },
        { setting_key: 'text_generation_model', setting_value: aiSettings.text_generation_model, setting_type: 'text_model', description: 'Model for text generation' },
        { setting_key: 'image_generation_model', setting_value: aiSettings.image_generation_model, setting_type: 'image_model', description: 'Model for image generation' },
      ];

      for (const update of updates) {
        await supabase
          .from('ai_settings')
          .upsert(update, { onConflict: 'setting_key' });
      }

      alert('AI Settings saved successfully!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Failed to save AI settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!currentUser || currentUser.role !== 'master') {
    return (
      <div className={`${PAGE} flex items-center justify-center`}>
        <StarfieldBackground />
        <DottedBackground />
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'white' }}>Access Denied</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs: AdminTab[] = ['Dashboard', 'Teachers', 'Students', 'Parents', 'Team', 'Revenue & Performance', 'Chapters & Content', 'Reports & Analytics', 'AI & Genius Profiles', 'System Settings'];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredParents = parents.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Glass card style
  const glassCard = {
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
  };

  const glassInput = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'white',
  };

  return (
    <div className={PAGE}>
      <StarfieldBackground />
      <DottedBackground />
      {/* Ambient Gradient Orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '35%', height: '35%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />
      </div>

      <TopNav userName={currentUser.name} />

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 pt-20 md:pt-24 pb-24 sm:pb-28 relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'white' }}>AI Genius AIpreneur Master Admin Dashboard</h1>
          <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Monitor teachers, track engagement, and measure growth across all programs.</p>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className="px-4 sm:px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm sm:text-base"
                style={activeTab === tab
                  ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                  : { background: 'rgba(15, 15, 30, 0.5)', color: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }
                }
              >
                {tab}
              </motion.button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-xl" style={{ color: 'white' }}>Loading dashboard data...</div>
          </div>
        ) : (
          <>
            {activeTab === 'Dashboard' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: 'white' }}>Welcome, Admin - Oversee the AIpreneur Network</h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Monitor teachers, track engagement, and measure growth across all programs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, borderColor: 'rgba(6, 182, 212, 0.15)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(6, 182, 212), rgb(59, 130, 246))' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Active Teachers</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>{stats.totalTeachers}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, borderColor: 'rgba(139, 92, 246, 0.15)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(236, 72, 153))' }}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Active Students</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>{stats.totalStudents}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, borderColor: 'rgba(34, 197, 94, 0.15)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Registered Parents</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>{stats.totalParents}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, borderColor: 'rgba(249, 115, 22, 0.15)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(234, 179, 8))' }}>
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Monthly Revenue</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>RM{(stats.monthlyRevenue / 1000).toFixed(0)}K</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, borderColor: 'rgba(59, 130, 246, 0.15)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(99, 102, 241))' }}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Countries Active</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>{stats.countriesActive} (MY, JP, SG, ID)</p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6"
                    style={glassCard}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5" style={{ color: 'rgb(6, 182, 212)' }} />
                      <h3 className="text-xl font-bold" style={{ color: 'white' }}>Engagement Graph</h3>
                    </div>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Daily Active Users</p>
                    <div className="h-48 flex items-end gap-2">
                      {[1200, 1420, 1680, 1550, 1850, 2100, 1920].map((value, i) => (
                        <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${(value / 2100) * 100}%`, background: 'linear-gradient(to top, rgb(6, 182, 212), rgb(59, 130, 246))' }} />
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6"
                    style={glassCard}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5" style={{ color: 'rgb(234, 179, 8)' }} />
                      <h3 className="text-xl font-bold" style={{ color: 'white' }}>Top Performing Teachers</h3>
                    </div>
                    <div className="space-y-4">
                      {teachers.slice(0, 4).map((teacher, i) => (
                        <div key={teacher.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(234, 179, 8))' }}>
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate" style={{ color: 'white' }}>{teacher.name}</p>
                              <p className="text-sm truncate" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{teacher.email.split('@')[0]}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold" style={{ color: 'white' }}>{teacher.studentCount}</p>
                            <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>students</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6"
                    style={glassCard}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5" style={{ color: 'rgb(139, 92, 246)' }} />
                      <h3 className="text-xl font-bold" style={{ color: 'white' }}>Badges Earned This Month</h3>
                    </div>
                    <div className="text-center py-8">
                      <p className="text-6xl font-bold mb-2" style={{ color: 'rgb(234, 179, 8)' }}>{stats.totalBadges}</p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total badges earned</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-6"
                    style={glassCard}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Bell className="w-5 h-5" style={{ color: 'rgb(34, 197, 94)' }} />
                      <h3 className="text-xl font-bold" style={{ color: 'white' }}>System Notifications</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(59, 130, 246)' }}>
                          <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: 'white' }}>New chapter uploaded: AI & Space Adventures</p>
                          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(34, 197, 94)' }}>
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: 'white' }}>Teacher Sarah joined AI Trainer Programme</p>
                          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>6 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.15)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(249, 115, 22)' }}>
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: 'white' }}>3 subscriptions expiring in 7 days</p>
                          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>1 day ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(34, 197, 94)' }}>
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: 'white' }}>{stats.totalBadges} badges earned this month</p>
                          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>2 days ago</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </>
            )}

            {activeTab === 'Teachers' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>Teacher Directory</h2>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <input
                      type="text"
                      placeholder="Search by name, region, or status"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={glassInput}
                    />
                  </div>
                </div>

                <div className="rounded-2xl overflow-x-auto" style={glassCard}>
                  <table className="w-full min-w-[640px]">
                    <thead style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <tr>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Teacher Name</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Region</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Active Students</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Chapters</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Earnings %</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Status</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((teacher, idx) => (
                        <tr key={teacher.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td className="p-4 font-medium" style={{ color: 'white' }}>{teacher.name}</td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {idx === 0 ? 'Kuala Lumpur' : idx === 1 ? 'Singapore' : idx === 2 ? 'Tokyo' : idx === 3 ? 'Jakarta' : 'Manila'}
                          </td>
                          <td className="p-4" style={{ color: 'white' }}>{teacher.studentCount}</td>
                          <td className="p-4" style={{ color: 'white' }}>{Math.floor(Math.random() * 5) + 3}</td>
                          <td className="p-4" style={{ color: 'white' }}>{12 + idx * 3}%</td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={idx === 2
                              ? { background: 'rgba(234, 179, 8, 0.15)', color: 'rgb(234, 179, 8)' }
                              : { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }
                            }>
                              {idx === 2 ? 'Pending' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleViewProfile(teacher, 'teacher')}
                              className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'Students' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>Student Overview</h2>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or teacher"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={glassInput}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="rounded-2xl p-4 sm:p-6 transition-all" style={{ ...glassCard, borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgb(234, 179, 8), rgb(249, 115, 22))' }}>
                            {student.name[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg truncate" style={{ color: 'white' }}>{student.name}</h3>
                            <p className="text-sm truncate" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Teacher: {student.teacher_name || 'Not assigned'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewProfile(student, 'student')}
                          className="w-full sm:w-auto flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                        >
                          Open Profile
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Current Chapter</p>
                          <p className="font-medium" style={{ color: 'white' }}>{student.current_chapter || 'None'}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Last Login</p>
                          <p className="font-medium" style={{ color: 'white' }}>{formatDate(student.last_active)}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Badges</p>
                          <p className="font-medium" style={{ color: 'white' }}>{student.badges}</p>
                        </div>
                      </div>

                      {student.current_chapter && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Progress</p>
                            <p className="text-sm font-semibold" style={{ color: 'rgb(6, 182, 212)' }}>{student.progress}%</p>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${student.progress}%`, background: 'linear-gradient(90deg, rgb(6, 182, 212), rgb(59, 130, 246))' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'Parents' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>Parent Management</h2>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <input
                      type="text"
                      placeholder="Search parents"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={glassInput}
                    />
                  </div>
                </div>

                <div className="rounded-2xl overflow-x-auto" style={glassCard}>
                  <table className="w-full min-w-[640px]">
                    <thead style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <tr>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Parent Name</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Children</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Subscription</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Billing</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Country</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Contact</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParents.map((parent, idx) => (
                        <tr key={parent.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td className="p-4 font-medium" style={{ color: 'white' }}>{parent.name}</td>
                          <td className="p-4" style={{ color: 'white' }}>{parent.children_count}</td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={idx === 2
                              ? { background: 'rgba(234, 179, 8, 0.15)', color: 'rgb(234, 179, 8)' }
                              : { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }
                            }>
                              {idx === 2 ? 'Paused' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>RM45/month</td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {idx === 0 ? 'Malaysia' : idx === 1 ? 'Japan' : 'Philippines'}
                          </td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{parent.email}</td>
                          <td className="p-4">
                            <button
                              onClick={() => handleViewProfile(parent, 'parent')}
                              className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                            >
                              View Family
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'Chapters & Content' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>AI Genius Chapters Management</h2>
                  <button className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
                    + Add New Chapter
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {chapters.slice(0, 6).map((chapter, idx) => (
                    <div key={chapter.id} className="rounded-2xl p-6 transition-all" style={glassCard}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(6, 182, 212), rgb(59, 130, 246))' }}>
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: 'white' }}>{chapter.title}</h3>
                      <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Who do you want to be?</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {idx === 0 ? 'Drawing' : idx === 1 ? 'Design Thinking' : 'Astronomy'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {idx === 0 ? 'Storytelling' : idx === 1 ? 'Robotics' : 'AI Basics'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {idx === 0 ? 'STEM Basics' : idx === 1 ? 'AI Creativity' : 'Future Tech'}
                        </span>
                      </div>
                      <p className="text-xs mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>By {chapter.student_name}</p>

                      <p className="font-semibold mb-2" style={{ color: 'white' }}>{Math.floor(Math.random() * 300) + 50} students engaged</p>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={chapter.status === 'completed'
                          ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }
                          : { background: 'rgba(234, 179, 8, 0.15)', color: 'rgb(234, 179, 8)' }
                        }>
                          {chapter.status === 'completed' ? 'Live' : idx === 2 ? 'Draft' : 'Live'}
                        </span>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(59, 130, 246, 0.5)' }}>
                            Edit
                          </button>
                          <button className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(239, 68, 68)' }}>
                            Deactivate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-6" style={glassCard}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'white' }}>Top 5 Most Engaging Chapters</h3>
                  <div className="space-y-3">
                    {chapters.slice(0, 2).map((chapter, i) => (
                      <div key={chapter.id} className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgb(234, 179, 8), rgb(249, 115, 22))' }}>
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'white' }}>{chapter.title}</p>
                            <p className="text-sm truncate" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>By {chapter.student_name}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold" style={{ color: 'white' }}>{Math.floor(Math.random() * 200) + 150}</p>
                          <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>students engaged</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Team' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>Team Management</h2>
                  <button className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
                    <UserPlus className="w-5 h-5" />
                    Add Team Member
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl p-6" style={{ ...glassCard, borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(6, 182, 212), rgb(59, 130, 246))' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total Team Members</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>{teamMembers.length}</p>
                  </div>

                  <div className="rounded-xl p-6" style={{ ...glassCard, borderColor: 'rgba(34, 197, 94, 0.15)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Active Members</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>
                      {teamMembers.filter(m => m.status === 'Active').length}
                    </p>
                  </div>

                  <div className="rounded-xl p-6" style={{ ...glassCard, borderColor: 'rgba(139, 92, 246, 0.15)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(236, 72, 153))' }}>
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Departments</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>
                      {new Set(teamMembers.map(m => m.department)).size}
                    </p>
                  </div>

                  <div className="rounded-xl p-6" style={{ ...glassCard, borderColor: 'rgba(249, 115, 22, 0.15)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(234, 179, 8))' }}>
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>New This Month</p>
                    <p className="text-4xl font-bold" style={{ color: 'white' }}>2</p>
                  </div>
                </div>

                <div className="rounded-2xl overflow-x-auto" style={glassCard}>
                  <table className="w-full min-w-[720px]">
                    <thead style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <tr>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Name</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Email</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Role</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Department</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Hire Date</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Status</th>
                        <th className="text-left p-4 font-semibold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, rgb(6, 182, 212), rgb(59, 130, 246))' }}>
                                {member.name[0]}
                              </div>
                              <span className="font-medium" style={{ color: 'white' }}>{member.name}</span>
                            </div>
                          </td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{member.email}</td>
                          <td className="p-4" style={{ color: 'white' }}>{member.role}</td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{member.department}</td>
                          <td className="p-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {new Date(member.hire_date).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={member.status === 'Active'
                              ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(34, 197, 94)' }
                              : { background: 'rgba(156, 163, 175, 0.15)', color: 'rgba(255, 255, 255, 0.4)' }
                            }>
                              {member.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button className="p-2 rounded-lg transition" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <Edit className="w-4 h-4" style={{ color: 'rgb(96, 165, 250)' }} />
                              </button>
                              <button className="p-2 rounded-lg transition" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                <Trash2 className="w-4 h-4" style={{ color: 'rgb(248, 113, 113)' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'AI & Genius Profiles' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <AIGeniusProfilesTab />
              </motion.div>
            )}

            {activeTab === 'System Settings' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'white' }}>AI Settings</h2>
                <div className="rounded-2xl p-4 sm:p-8" style={glassCard}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        OpenAI API Key
                      </label>
                      <input
                        type="password"
                        value={aiSettings.openai_api_key}
                        onChange={(e) => setAiSettings({ ...aiSettings, openai_api_key: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="sk-proj-..."
                        style={glassInput}
                      />
                      <p className="text-sm mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        Used for GPT-4 text generation and DALL-E image generation
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Text Generation Model
                        </label>
                        <select
                          value={aiSettings.text_generation_model}
                          onChange={(e) => setAiSettings({ ...aiSettings, text_generation_model: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={glassInput}
                        >
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          Image Generation Model
                        </label>
                        <select
                          value={aiSettings.image_generation_model}
                          onChange={(e) => setAiSettings({ ...aiSettings, image_generation_model: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          style={glassInput}
                        >
                          <option value="dall-e-3">DALL-E 3</option>
                          <option value="dall-e-2">DALL-E 2</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        Changes take effect immediately after saving
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveAISettings}
                        disabled={savingSettings}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white"
                        style={savingSettings
                          ? { background: 'rgba(107, 114, 128, 0.5)', cursor: 'not-allowed' }
                          : { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                        }
                      >
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === 'Revenue & Performance' || activeTab === 'Reports & Analytics') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-8 sm:p-12 text-center"
                style={glassCard}
              >
                <h3 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'white' }}>{activeTab}</h3>
                <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>This section is coming soon!</p>
              </motion.div>
            )}
          </>
        )}
      </div>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={selectedProfile}
        type={profileType}
      />
    </div>
  );
};
