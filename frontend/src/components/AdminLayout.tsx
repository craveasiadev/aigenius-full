import { useState, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ChevronRight,
  GraduationCap,
  ScanLine,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clearAllTokens } from '../lib/api';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const menuItems: MenuItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/members', label: 'Members', icon: Users },
  { path: '/admin/academy', label: 'Academy', icon: GraduationCap },
  { path: '/admin/check-in', label: 'Check-in', icon: ScanLine },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapse
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Theme state initialized from localStorage or system preference
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    }
    return 'system';
  });

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to apply theme to DOM and persist to localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem('theme', theme); // Persist theme

    // Remove existing theme classes to avoid conflicts
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  const handleLogout = async () => {
    clearAllTokens();
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark');
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    if (theme === 'light') return <Sun className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: '#0a0a1a', color: 'white' }}>

      {/* Ambient Gradient Orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '35%', height: '35%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <motion.aside
        className="fixed lg:static inset-y-0 left-0 z-50 flex flex-col h-full transition-all duration-300 flex-shrink-0"
        style={{
          background: 'rgba(10, 10, 26, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '4px 0 30px rgba(0, 0, 0, 0.3)',
        }}
        initial={false}
        animate={{
          x: typeof window !== 'undefined' && window.innerWidth < 1024 ? (sidebarOpen ? 0 : -320) : 0,
          width: sidebarCollapsed ? 88 : 280
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {!sidebarCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.8))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
                AI
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: 'white' }}>Genius<span style={{ color: 'rgb(6, 182, 212)' }}>Admin</span></span>
            </motion.div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.8))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>AI</div>
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                <div
                  className="relative group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)',
                    color: 'rgba(196, 167, 255, 1)',
                  } : {
                    color: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid transparent',
                  }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: 'rgb(139, 92, 246)' }} />
                  )}
                  <Icon className="w-5 h-5 flex-shrink-0 transition-colors" style={{ color: isActive ? 'rgba(167, 139, 250, 1)' : 'inherit' }} />

                  {!sidebarCollapsed && (
                    <span className="font-semibold text-sm tracking-wide flex-1">{item.label}</span>
                  )}

                  {!sidebarCollapsed && isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" style={{ opacity: 0.5 }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions (Theme / Collapse) */}
        <div className="p-4 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgb(236, 72, 153), rgb(244, 63, 94))', boxShadow: '0 0 15px rgba(236, 72, 153, 0.3)' }}>
                  {currentUser?.name?.[0] || 'A'}
                </div>
                <div className="text-xs min-w-0">
                  <div className="font-bold truncate" style={{ color: 'white' }}>{currentUser?.name || 'Admin'}</div>
                  <div className="uppercase tracking-wider text-[9px] truncate" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{currentUser?.role || 'Master'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgb(236, 72, 153), rgb(244, 63, 94))', boxShadow: '0 0 15px rgba(236, 72, 153, 0.3)' }}>
                {currentUser?.name?.[0] || 'A'}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center p-2 rounded-lg transition-colors"
              title="Sign Out"
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden lg:flex flex-1 items-center justify-center p-2 rounded-lg transition-colors ${sidebarCollapsed ? 'w-full' : ''}`}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ background: 'transparent' }}>
        {/* Top Header */}
        <header
          className="h-20 flex items-center justify-between px-4 lg:px-8 z-20 sticky top-0"
          style={{
            background: 'rgba(10, 10, 26, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl transition-colors"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-xl lg:text-2xl font-black flex items-center gap-2" style={{ color: 'white' }}>
                Dashboard <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'rgba(167, 139, 250, 1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>Beta</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/', '_blank')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <ExternalLink className="w-4 h-4" /> <span className="hidden md:inline">View Site</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center gap-2"
              title="Toggle Theme"
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              {getThemeIcon()}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1 rounded-full transition-all"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)', border: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  {currentUser?.name?.[0] || 'A'}
                </div>
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-14 w-64 rounded-2xl overflow-hidden z-40 transform origin-top-right"
                      style={{
                        background: 'rgba(15, 15, 30, 0.8)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <div className="p-4" style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <p className="font-bold truncate" style={{ color: 'white' }}>{currentUser?.name}</p>
                        <p className="text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{currentUser?.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm"
                          style={{ color: 'rgb(239, 68, 68)' }}
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth" style={{ background: 'transparent' }}>
          <div className="max-w-[1600px] mx-auto p-4 lg:p-8 w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
