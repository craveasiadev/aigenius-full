import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, BookOpen, Calendar, Clock } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminPortalApi, AdminDashboardOverviewResponse } from '../services/aipreneurApi';

interface StatCard {
  label: string;
  value: number | string;
  icon: typeof Users;
  gradient: string;
}

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState<AdminDashboardOverviewResponse['stats']>({
    total_parents: 0,
    total_genius: 0,
    total_completed_chapters: 0,
    total_bookings: 0,
    total_admins: 0,
    monthly_sales: 0,
  });
  const [topChapters, setTopChapters] = useState<Array<{ chapter_code: string; count: number }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ genius_name: string; chapter_code: string; completed_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const response = await adminPortalApi.getDashboardOverview();
        if (response.success) {
          setStats(response.stats);
          setTopChapters(response.top_chapters || []);
          setRecentActivity(response.recent_activity || []);
        }
      } catch (error) {
        console.error('Error loading admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const statCards: StatCard[] = [
    {
      label: 'Total Parents',
      value: stats.total_parents,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Total Kids',
      value: stats.total_genius,
      icon: GraduationCap,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Completed Chapters',
      value: stats.total_completed_chapters,
      icon: BookOpen,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Workshop Bookings',
      value: stats.total_bookings,
      icon: Calendar,
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full"
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'white' }}>Dashboard Overview</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Live data from Laravel database. Chapters represent kid learning progress milestones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: 'white' }}>{stat.value}</div>
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'white' }}>Top Chapters</h2>
            {topChapters.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No completed chapter data yet.</p>
            ) : (
              <div className="space-y-3">
                {topChapters.map((chapter, idx) => (
                  <div key={chapter.chapter_code} className="flex items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-medium truncate" style={{ color: 'white' }}>{chapter.chapter_code}</span>
                    </div>
                    <span className="text-sm flex-shrink-0 whitespace-nowrap" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{chapter.count} completions</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: 'white' }}>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={`${activity.chapter_code}-${idx}`} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                    <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'white' }}>
                        <span className="font-medium">{activity.genius_name}</span>
                        {' completed '}
                        <span style={{ color: 'rgb(45, 212, 191)' }}>{activity.chapter_code}</span>
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                        {activity.completed_at ? new Date(activity.completed_at).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
