/**
 * DailyQuestWidget — Floating quest tracker for the 3D shop HUD
 * Shows daily quests as a collapsible widget in bottom-right corner.
 * Kid-friendly: big icons, simple text, progress bar.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronUp, ChevronDown, Gift, CheckCircle } from 'lucide-react';
import { getDailyTasks, type Voucher } from './DailyTaskSystem';

export interface TaskCheckData {
  productsCount: number;
  staffCount: number;
  campaignsCount: number;
  innovationsCount: number;
  decorationsSet: boolean;
  interiorCustomized: boolean;
  totalSales: number;
  shopLaunched: boolean;
}

interface DailyQuestWidgetProps {
  taskData: TaskCheckData;
  onTaskClick?: (moduleRoute: string) => void;
  streak?: number;
}

export default function DailyQuestWidget({ taskData, onTaskClick, streak = 0 }: DailyQuestWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const dailyTasks = useMemo(() => getDailyTasks(new Date(), 3), []);

  const taskStatuses = useMemo(() => {
    return dailyTasks.map(task => ({
      ...task,
      completed: task.checkCondition(taskData),
    }));
  }, [dailyTasks, taskData]);

  const completedCount = taskStatuses.filter(t => t.completed).length;
  const totalCount = taskStatuses.length;
  const allDone = completedCount === totalCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const handleTaskClick = useCallback((route?: string) => {
    if (route && onTaskClick) {
      onTaskClick(route);
    }
  }, [onTaskClick]);

  return (
    <div className="absolute bottom-[96px] sm:bottom-[108px] right-2 z-40 pointer-events-auto" style={{ maxWidth: '320px' }}>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-2 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10, 10, 26, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold text-base">Today's Quests</h3>
                {streak > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(251, 146, 60, 0.15)' }}>
                    <span className="text-sm">🔥</span>
                    <span className="text-orange-400 text-xs font-bold">{streak}</span>
                  </div>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: allDone ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs mt-1.5 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {completedCount}/{totalCount} completed
              </p>
            </div>

            {/* Quest List */}
            <div className="px-3 pb-3 space-y-1.5">
              {taskStatuses.map(task => (
                <button
                  key={task.id}
                  onClick={() => !task.completed && handleTaskClick(task.moduleRoute)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all min-h-[52px]"
                  style={{
                    background: task.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: task.completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: task.completed ? 'default' : 'pointer',
                  }}
                >
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0">{task.emoji}</span>
                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-bold ${task.completed ? 'text-emerald-400' : 'text-white'}`}>
                      {task.title}
                    </p>
                    <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      +{task.coinsReward} coins · +{task.xpReward} XP
                    </p>
                  </div>
                  {/* Status */}
                  {task.completed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)', transform: 'rotate(90deg)' }} />
                  )}
                </button>
              ))}
            </div>

            {/* All done message */}
            {allDone && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <Gift className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-bold">All quests done! Great job!</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Pill Button */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg min-h-[48px]"
        style={{
          background: allDone
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(52, 211, 153, 0.8))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: allDone ? '0 0 20px rgba(16, 185, 129, 0.3)' : '0 0 20px rgba(139, 92, 246, 0.3)',
        }}
      >
        {!allDone && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          </motion.div>
        )}
        {allDone && <CheckCircle className="w-5 h-5 text-white" />}
        <span className="text-white text-sm font-bold">
          {completedCount}/{totalCount} Quests
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white/60" />
        ) : (
          <ChevronUp className="w-4 h-4 text-white/60" />
        )}
      </motion.button>
    </div>
  );
}
