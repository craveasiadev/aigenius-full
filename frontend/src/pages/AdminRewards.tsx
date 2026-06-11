import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Plus, Edit, Trash2 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

interface Reward {
  reward_code: string;
  name: string;
  description_short: string;
  type: string;
  linked_discovery: string | null;
  active: boolean;
}

const MOCK_REWARDS: Reward[] = [
  {
    reward_code: 'dream_chaser',
    name: 'Dream Chaser',
    description_short: 'Completed an ambition adventure',
    type: 'badge',
    linked_discovery: 'confidence',
    active: true,
  },
  {
    reward_code: 'kind_heart',
    name: 'Kind Heart',
    description_short: 'Unlocked empathy in kindness quest',
    type: 'badge',
    linked_discovery: 'empathy',
    active: true,
  },
  {
    reward_code: 'creative_genius',
    name: 'Creative Genius',
    description_short: 'Completed creativity chapter',
    type: 'badge',
    linked_discovery: 'creativity',
    active: true,
  },
];

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Rewards</h1>
            <p className="text-gray-400">Manage badges, vouchers, and bonuses</p>
            <p className="text-yellow-500 text-sm mt-2">
              ⚠️ Mock data - Not connected to database yet
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium shadow-lg shrink-0"
          >
            <Plus className="w-5 h-5" />
            Add Reward
          </motion.button>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <motion.div
              key={reward.reward_code}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl p-5 sm:p-6 border border-gray-700 hover:border-purple-500/50 transition-colors min-w-0"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    reward.active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {reward.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 truncate">
                {reward.name}
              </h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {reward.description_short}
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                  {reward.type}
                </span>
                {reward.linked_discovery && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                    {reward.linked_discovery}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 font-mono truncate">
                {reward.reward_code}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
