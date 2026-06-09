import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GraduationCap, Heart, Shield } from 'lucide-react';


interface PublicNavProps {
  currentPage?: 'landing' | 'login' | 'register';
}

export const PublicNav = ({ currentPage = 'landing' }: PublicNavProps) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    if (currentPage !== 'landing') {
      navigate('/', { state: { scrollTo: sectionId } });
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const handleNavClick = (sectionId: string) => {
    scrollToSection(sectionId);
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(10, 10, 26, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/aigenius-finallogo-aug2025.svg" alt="AI Genius" className="h-10 w-10" />
            <div>
              <div className="font-bold text-lg text-white">
                AI Genius
              </div>
              <div className="text-xs text-white/40">AIpreneur</div>
            </div>
          </div>

          {/* Center Navigation */}
          <div className="hidden lg:flex items-center gap-6 text-sm text-white/40">
            <span onClick={() => handleNavClick('hero')} className="hover:text-white/80 transition cursor-pointer">Home</span>
            <span onClick={() => handleNavClick('how-it-works')} className="hover:text-white/80 transition cursor-pointer">How It Works</span>
            <span onClick={() => handleNavClick('chapters')} className="hover:text-white/80 transition cursor-pointer">Chapters</span>
            <span onClick={() => handleNavClick('who-its-for')} className="hover:text-white/80 transition cursor-pointer">For Schools</span>
            <span onClick={() => handleNavClick('role-selection')} className="hover:text-white/80 transition cursor-pointer">Pricing</span>
            <span onClick={() => handleNavClick('faq')} className="hover:text-white/80 transition cursor-pointer">FAQ</span>
          </div>

          {/* Right Buttons */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/register/parent')}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              Register
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/register')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
              }}
            >
              Get Started
            </motion.button>

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-white/80"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <span className="flex items-center gap-2">
                  Genius Login | Register
                  <motion.span
                    animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▾
                  </motion.span>
                </span>
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50"
                      style={{
                        background: 'rgba(15, 15, 30, 0.85)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {[
                        { label: 'Student', route: '/login?role=student', icon: User },
                        { label: 'Teacher', route: '/login?role=teacher', icon: GraduationCap },
                        { label: 'Parent', route: '/login?role=parent', icon: Heart },
                        { label: 'Admin', route: '/admin/login', icon: Shield },
                      ].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <motion.button
                            key={item.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              setIsDropdownOpen(false);
                              navigate(item.route);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-white/5"
                            style={{
                              borderBottom: index < 3 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                              }}
                            >
                              <Icon className="w-4 h-4 text-violet-400" />
                            </div>
                            <span className="font-medium text-white/80">
                              {item.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
