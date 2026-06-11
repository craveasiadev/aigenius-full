import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Award, ArrowRight } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';

export const Homepage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: 'Draw & Create',
      description: 'Design your cover and pages with creative tools.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: BookOpen,
      title: 'Learn by Doing',
      description: 'Fun mini art & STEM activities.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: Award,
      title: 'Earn Rewards',
      description: 'Collect badges, coins, and maintain streaks.',
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[40%] left-[30%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <header className="relative z-10 sticky top-0" style={{ background: 'rgba(10, 10, 26, 0.7)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-lg font-bold text-white">
                AI Genius AIpreneur
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Your Learning Journey
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 pb-24 sm:pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block mb-6 px-4 py-2 rounded-full"
              style={{ background: 'rgba(139, 92, 246, 0.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>Welcome to the Future</span>
            </motion.div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight text-white break-words">
              Create Your
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                Future
              </span>
            </h2>

            <p className="text-base sm:text-xl mb-8 leading-relaxed max-w-xl" style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6' }}>
              Empower your child to build real businesses with AI. Learn entrepreneurship, innovation,
              and leadership through hands-on experiences that prepare them for tomorrow's opportunities.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <PrimaryButton onClick={() => navigate('/auth/login')}>
                <div className="flex items-center gap-2 justify-center">
                  <span>Login as Student Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </PrimaryButton>
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  1000+
                </p>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Active Students
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  50+
                </p>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Learning Modules
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  100%
                </p>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Fun Guaranteed
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="rounded-3xl sm:rounded-[3rem] p-5 sm:p-8 shadow-2xl" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="grid grid-cols-1 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className={`bg-gradient-to-r ${feature.color} rounded-2xl p-6 text-white cursor-pointer`}
                      style={{ boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)' }}
                    >
                      <Icon className="w-8 h-8 mb-3" />
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-white/90 text-sm">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full"
              style={{ background: 'rgba(234, 179, 8, 0.1)', filter: 'blur(20px)' }}
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full"
              style={{ background: 'rgba(139, 92, 246, 0.1)', filter: 'blur(20px)' }}
            />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-16 sm:mt-24 text-sm"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          Demo Mode — data is simulated for preview purposes
        </motion.p>
      </main>
    </div>
  );
};
