import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface DeviceCardProps {
  icon: LucideIcon;
  label: string;
  isOn: boolean;
  color: string;
  onToggle?: () => void;
}

export const DeviceCard = ({ icon: Icon, label, isOn, color, onToggle }: DeviceCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${color} rounded-3xl p-6 flex flex-col justify-between min-h-[140px] cursor-pointer transition-all`}
      onClick={onToggle}
    >
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">ON</span>
          <div className={`w-12 h-6 rounded-full transition-all ${isOn ? 'bg-white/30' : 'bg-white/10'} relative`}>
            <motion.div
              animate={{ x: isOn ? 24 : 2 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full"
            />
          </div>
        </div>
      </div>
      <h3 className="text-white font-semibold text-lg">{label}</h3>
    </motion.div>
  );
};
