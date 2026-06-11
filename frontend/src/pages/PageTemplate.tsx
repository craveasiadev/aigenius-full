import { motion } from 'framer-motion';
import { TopNav } from '../components/TopNav';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAuth } from '../contexts/AuthContext';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
}

export const PageTemplate = ({ title, subtitle }: PageTemplateProps) => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopNav userName={currentUser.name} />

      <div
        className="w-full px-4 md:px-8 py-8 pt-20 md:pt-24 pb-24 sm:pb-28"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        <SectionHeader subtitle={subtitle || 'Coming soon'}>
          {title}
        </SectionHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="text-center p-6 sm:p-12">
            <div className="text-5xl sm:text-6xl mb-4">🚧</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>
              Under Construction
            </h3>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              This page is being built. Check back soon!
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};
