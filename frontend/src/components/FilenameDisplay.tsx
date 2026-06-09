import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export const FilenameDisplay = () => {
  const location = useLocation();
  const showFilename = useStore((state) => state.showFilename);
  const [filename, setFilename] = useState('');

  useEffect(() => {
    const path = location.pathname;

    const routeToFilename: Record<string, string> = {
      '/': 'Landing.tsx',
      '/login': 'GeniusAuth.tsx',
      '/register': 'RegisterStudent.tsx',
      '/register/parent': 'RegisterParent.tsx',
      '/register/student': 'RegisterStudent.tsx',
      '/register/teacher': 'RegisterTeacher.tsx',
      '/s/dashboard': 'StudentDashboard.tsx',
      '/s/create': 'StudentCreate.tsx',
      '/s/profile': 'ProfilePage.tsx',
      '/s/rewards': 'RewardsPage.tsx',
      '/s/store': 'StorePage.tsx',
      '/s/persona': 'MyPersona.tsx',
      '/s/ai-data': 'GeniusProfileData.tsx',
      '/p/dashboard': 'ParentDashboard.tsx',
      '/parent/genius-profiles': 'GeniusProfileManager.tsx',
      '/parent/genius-profiles/add': 'AddGeniusProfile.tsx',
      '/t/dashboard': 'TeacherDashboard.tsx',
      '/m/dashboard': 'AdminDashboard.tsx',
      '/admin/login': 'AdminLogin.tsx',
      '/admin/dashboard': 'AdminDashboardOverview.tsx',
      '/admin/members': 'AdminMembers.tsx',
      '/admin/academy': 'AdminAcademy.tsx',
    };

    if (path.startsWith('/parent/genius-profiles/') && path.includes('/edit')) {
      setFilename('EditGeniusProfile.tsx');
    } else if (path.startsWith('/parent/genius-profiles/') && path.includes('/assessment')) {
      setFilename('GeniusAssessment.tsx');
    } else if (path.startsWith('/parent/genius-profiles/') && path.includes('/analysis')) {
      setFilename('AIAnalysis.tsx');
    } else if (path.startsWith('/parent/genius-profiles/') && path.includes('/priorities')) {
      setFilename('PrioritySelection.tsx');
    } else if (path.startsWith('/parent/genius-profiles/') && path.includes('/success')) {
      setFilename('ProfileSuccess.tsx');
    } else if (path.startsWith('/parent/genius-profiles/') && path.includes('/persona')) {
      setFilename('ParentViewPersona.tsx');
    } else if (path.startsWith('/s/storybook/')) {
      setFilename('StorybookCreate.tsx');
    } else {
      setFilename(routeToFilename[path] || 'Unknown.tsx');
    }
  }, [location]);

  return (
    <AnimatePresence>
      {showFilename && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 z-50 pointer-events-none max-w-[calc(100vw-2rem)]"
        >
          <div className="bg-black border border-green-500/50 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-green-500 font-mono text-xs sm:text-sm font-semibold tracking-wide truncate">
                {filename}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
