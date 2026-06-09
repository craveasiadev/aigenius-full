import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, Users, Heart, Rocket, Star, Zap } from 'lucide-react';
import type { Role } from '../types/models';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE } from '../lib/uiTokens';

// Glassmorphism RoleCard component
const RoleCard = ({
  role,
  icon: Icon,
  label,
  description,
  emoji,
  onClick,
  disabled,
  comingSoon
}: {
  role: Role;
  icon: any;
  gradient: string;
  label: string;
  description: string;
  emoji: string;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) => (
  <motion.button
    whileHover={disabled ? {} : { scale: 1.03, y: -4 }}
    whileTap={disabled ? {} : { scale: 0.97 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '20px',
    }}
    className="relative p-6 sm:p-8 w-full text-center transition-all duration-300 group overflow-hidden"
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.06)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
    }}
  >
    {/* Coming Soon Badge - glass pill */}
    {comingSoon && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            padding: '4px 14px',
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
          }}
        >
          Coming Soon
        </div>
      </div>
    )}

    <div className={`relative z-10 ${comingSoon ? 'mt-4' : ''}`} style={{ opacity: disabled ? 0.4 : 1 }}>
      {/* Centered emoji */}
      <div
        className="mx-auto mb-4 flex items-center justify-center"
        style={{
          width: '64px',
          height: '64px',
          fontSize: '36px',
          lineHeight: 1,
        }}
      >
        {emoji}
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: '17px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.88)',
          marginBottom: '6px',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </div>

      {/* Description - muted */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.4)',
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {/* Get Started indicator */}
      {!disabled && (
        <div
          className="transition-all duration-300"
          style={{
            marginTop: '16px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}
        >
          Get Started
        </div>
      )}
    </div>
  </motion.button>
);

export const Register = () => {
  const navigate = useNavigate();

  const accountTypes = [
    {
      role: 'parent' as Role,
      icon: Heart,
      gradient: 'from-pink-400 to-rose-500',
      label: 'Parent Hero',
      description: "Support your child's AI journey",
      emoji: '\u{1F496}',
      route: '/register/parent',
      disabled: true,
      comingSoon: true
    },
    {
      role: 'student' as Role,
      icon: GraduationCap,
      gradient: 'from-cyan-400 to-blue-500',
      label: 'Young Genius',
      description: 'Start your epic learning adventure!',
      emoji: '\u{1F680}',
      route: '/register/student',
      disabled: false,
      comingSoon: false
    },
    {
      role: 'teacher' as Role,
      icon: Users,
      gradient: 'from-emerald-400 to-green-500',
      label: 'Super Teacher',
      description: 'Guide future innovators to success',
      emoji: '\u{1F31F}',
      route: '/register/teacher',
      disabled: true,
      comingSoon: true
    },
  ];

  return (
    <div
      className={`${PAGE} touch-manipulation overflow-y-auto`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <StarfieldBackground />
      <DottedBackground />
      {/* Background gradient orbs */}
      <div
        style={{
          position: 'fixed',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '40%',
          right: '20%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Glass card container */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '28px',
            padding: '24px 16px',
          }}
        >
          {/* Header with glass badge */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px',
              }}
            >
              <Sparkles style={{ width: '28px', height: '28px', color: 'rgba(255, 255, 255, 0.7)' }} />
            </motion.div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.92)',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              Join the Adventure
            </h1>

            <p
              style={{
                fontSize: '15px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.4)',
                maxWidth: '380px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Choose your path and start your AI-powered learning journey today
            </p>
          </div>

          {/* Role selection cards - staggered animation */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '32px',
            }}
            className="sm:grid-cols-3 max-sm:!grid-cols-1"
          >
            {accountTypes.map((account, index) => (
              <motion.div
                key={account.role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.25 + index * 0.12,
                  duration: 0.45,
                  ease: 'easeOut',
                }}
              >
                <RoleCard
                  role={account.role}
                  icon={account.icon}
                  gradient={account.gradient}
                  label={account.label}
                  description={account.description}
                  emoji={account.emoji}
                  onClick={() => navigate(account.route)}
                  disabled={account.disabled}
                  comingSoon={account.comingSoon}
                />
              </motion.div>
            ))}
          </div>

          {/* Footer login link - muted glass style */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            style={{ textAlign: 'center' }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.55)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Login Here
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Responsive style override for small screens */}
      <style>{`
        @media (max-width: 640px) {
          .max-sm\\:!grid-cols-1 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
