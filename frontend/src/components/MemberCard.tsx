import { motion } from 'framer-motion';

interface MemberCardProps {
  name: string;
  role: string;
  color: string;
  initials: string;
}

export const MemberCard = ({ name, role, color, initials }: MemberCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-2"
    >
      <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center shadow-lg`}>
        <span className="text-white font-bold text-lg">{initials}</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {name}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {role}
        </p>
      </div>
    </motion.div>
  );
};
