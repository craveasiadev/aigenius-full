import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Heart, Sparkles, Plus, Edit, Trash2, Eye, EyeOff, Save, Settings } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/Toast';

type EngagementTab = 'Events' | 'Challenges' | 'Life Events' | 'Seasonal Content' | 'System Config';

interface Event {
  id: string;
  event_code: string;
  event_name: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  impact_sales_multiplier: number;
  impact_traffic_multiplier: number;
  reward_coins: number;
  is_active: boolean;
}

interface Challenge {
  id: string;
  challenge_code: string;
  challenge_name: string;
  description: string;
  challenge_type: string;
  difficulty: string;
  reward_coins: number;
  learning_topic: string;
  is_active: boolean;
}

interface LifeEvent {
  id: string;
  event_code: string;
  event_name: string;
  event_category: string;
  scenario_text: string;
  trigger_probability: number;
  is_active: boolean;
}

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
  category: string;
  data_type: string;
}

export default function AdminEngagement() {
  const [activeTab, setActiveTab] = useState<EngagementTab>('Events');
  const [events, setEvents] = useState<Event[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Events') {
        const { data } = await supabase
          .from('events_catalog')
          .select('*')
          .order('start_date', { ascending: false });
        setEvents(data || []);
      } else if (activeTab === 'Challenges') {
        const { data } = await supabase
          .from('challenges_catalog')
          .select('*')
          .order('challenge_type', { ascending: true });
        setChallenges(data || []);
      } else if (activeTab === 'Life Events') {
        const { data } = await supabase
          .from('life_events_catalog')
          .select('*')
          .order('event_category', { ascending: true });
        setLifeEvents(data || []);
      } else if (activeTab === 'System Config') {
        const { data } = await supabase
          .from('system_config')
          .select('*')
          .order('category', { ascending: true });
        setSystemConfigs(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (table: string, id: string, currentActive: boolean) => {
    try {
      await supabase
        .from(table)
        .update({ is_active: !currentActive })
        .eq('id', id);

      setToast({ message: `${currentActive ? 'Deactivated' : 'Activated'} successfully`, type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  const updateSystemConfig = async (configKey: string, newValue: any) => {
    try {
      await supabase
        .from('system_config')
        .update({ config_value: newValue, updated_at: new Date().toISOString() })
        .eq('config_key', configKey);

      setToast({ message: 'Configuration updated successfully', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error updating config:', error);
      setToast({ message: 'Failed to update configuration', type: 'error' });
    }
  };

  const deleteItem = async (table: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await supabase.from(table).delete().eq('id', id);
      setToast({ message: 'Deleted successfully', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      setToast({ message: 'Failed to delete item', type: 'error' });
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>Engagement System</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Manage events, challenges, life situations, and system settings</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['Events', 'Challenges', 'Life Events', 'Seasonal Content', 'System Config'] as EngagementTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all"
              style={activeTab === tab
                ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                : { background: 'rgba(15, 15, 30, 0.5)', color: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <>
            {activeTab === 'Events' && (
              <EventsManagement
                events={events}
                onToggleActive={(id, active) => toggleActive('events_catalog', id, active)}
                onDelete={(id) => deleteItem('events_catalog', id)}
                onEdit={(event) => {
                  setEditingItem(event);
                  setShowEditModal(true);
                }}
              />
            )}

            {activeTab === 'Challenges' && (
              <ChallengesManagement
                challenges={challenges}
                onToggleActive={(id, active) => toggleActive('challenges_catalog', id, active)}
                onDelete={(id) => deleteItem('challenges_catalog', id)}
                onEdit={(challenge) => {
                  setEditingItem(challenge);
                  setShowEditModal(true);
                }}
              />
            )}

            {activeTab === 'Life Events' && (
              <LifeEventsManagement
                lifeEvents={lifeEvents}
                onToggleActive={(id, active) => toggleActive('life_events_catalog', id, active)}
                onDelete={(id) => deleteItem('life_events_catalog', id)}
                onEdit={(event) => {
                  setEditingItem(event);
                  setShowEditModal(true);
                }}
              />
            )}

            {activeTab === 'Seasonal Content' && (
              <SeasonalContentManagement />
            )}

            {activeTab === 'System Config' && (
              <SystemConfigManagement
                configs={systemConfigs}
                onUpdate={updateSystemConfig}
              />
            )}
          </>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}

function EventsManagement({ events, onToggleActive, onDelete, onEdit }: any) {
  const getEventTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      seasonal: { bg: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' },
      random: { bg: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' },
      market: { bg: 'rgba(234, 179, 8, 0.15)', color: 'rgb(250, 204, 21)' },
      special: { bg: 'rgba(236, 72, 153, 0.15)', color: 'rgb(244, 114, 182)' },
      community: { bg: 'rgba(6, 182, 212, 0.15)', color: 'rgb(34, 211, 238)' },
    };
    return colors[type] || { bg: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'white' }}>Events ({events.length})</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-shadow" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
          <Plus className="w-5 h-5" />
          Create Event
        </button>
      </div>

      <div className="grid gap-4">
        {events.map((event: Event) => {
          const typeColor = getEventTypeColor(event.event_type);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6"
              style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold" style={{ color: 'white' }}>{event.event_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: typeColor.bg, color: typeColor.color }}>
                      {event.event_type}
                    </span>
                    {event.is_recurring && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'rgb(167, 139, 250)' }}>
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{event.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Dates:</span> {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Sales Impact:</span> {(event.impact_sales_multiplier * 100).toFixed(0)}%
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Traffic Impact:</span> {(event.impact_traffic_multiplier * 100).toFixed(0)}%
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Reward:</span> {event.reward_coins} coins
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleActive(event.id, event.is_active)}
                    className="p-2 rounded-lg transition-colors"
                    style={event.is_active
                      ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                      : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                    }
                  >
                    {event.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(248, 113, 113)' }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengesManagement({ challenges, onToggleActive, onDelete, onEdit }: any) {
  const getChallengeTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      daily: { bg: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' },
      weekly: { bg: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' },
      monthly: { bg: 'rgba(139, 92, 246, 0.15)', color: 'rgb(167, 139, 250)' },
      achievement: { bg: 'rgba(234, 179, 8, 0.15)', color: 'rgb(250, 204, 21)' },
    };
    return colors[type] || { bg: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' };
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'rgb(74, 222, 128)',
      medium: 'rgb(250, 204, 21)',
      hard: 'rgb(251, 146, 60)',
      expert: 'rgb(248, 113, 113)',
    };
    return colors[difficulty] || 'rgba(255, 255, 255, 0.4)';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'white' }}>Challenges ({challenges.length})</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-shadow" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
          <Plus className="w-5 h-5" />
          Create Challenge
        </button>
      </div>

      <div className="grid gap-4">
        {challenges.map((challenge: Challenge) => {
          const typeColor = getChallengeTypeColor(challenge.challenge_type);
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6"
              style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold" style={{ color: 'white' }}>{challenge.challenge_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: typeColor.bg, color: typeColor.color }}>
                      {challenge.challenge_type}
                    </span>
                    <span className="text-sm font-medium" style={{ color: getDifficultyColor(challenge.difficulty) }}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{challenge.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Reward:</span> {challenge.reward_coins} coins
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Learning:</span> {challenge.learning_topic}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleActive(challenge.id, challenge.is_active)}
                    className="p-2 rounded-lg transition-colors"
                    style={challenge.is_active
                      ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                      : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                    }
                  >
                    {challenge.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEdit(challenge)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(challenge.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(248, 113, 113)' }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function LifeEventsManagement({ lifeEvents, onToggleActive, onDelete, onEdit }: any) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      staff: { bg: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' },
      customer: { bg: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' },
      shop: { bg: 'rgba(234, 179, 8, 0.15)', color: 'rgb(250, 204, 21)' },
      supplier: { bg: 'rgba(139, 92, 246, 0.15)', color: 'rgb(167, 139, 250)' },
      community: { bg: 'rgba(236, 72, 153, 0.15)', color: 'rgb(244, 114, 182)' },
    };
    return colors[category] || { bg: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'white' }}>Life Events ({lifeEvents.length})</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-shadow" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
          <Plus className="w-5 h-5" />
          Create Life Event
        </button>
      </div>

      <div className="grid gap-4">
        {lifeEvents.map((event: LifeEvent) => {
          const catColor = getCategoryColor(event.event_category);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-6"
              style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold" style={{ color: 'white' }}>{event.event_name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: catColor.bg, color: catColor.color }}>
                      {event.event_category}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{event.scenario_text}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium">Trigger Probability:</span> {(event.trigger_probability * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleActive(event.id, event.is_active)}
                    className="p-2 rounded-lg transition-colors"
                    style={event.is_active
                      ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                      : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                    }
                  >
                    {event.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgb(248, 113, 113)' }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SeasonalContentManagement() {
  return (
    <div className="rounded-xl p-8 text-center" style={{
      background: 'rgba(15, 15, 30, 0.5)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    }}>
      <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgb(34, 211, 238)' }} />
      <h3 className="text-xl font-bold mb-2" style={{ color: 'white' }}>Seasonal Content Manager</h3>
      <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
        Manage holiday decorations, limited-time products, and seasonal themes
      </p>
      <button className="px-6 py-3 rounded-lg text-white font-medium transition-shadow" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
        Coming Soon
      </button>
    </div>
  );
}

function SystemConfigManagement({ configs, onUpdate }: any) {
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const groupedConfigs = configs.reduce((acc: any, config: SystemConfig) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {});

  const handleSave = (configKey: string, dataType: string) => {
    let parsedValue;
    try {
      if (dataType === 'boolean') {
        parsedValue = editValue === 'true';
      } else if (dataType === 'number') {
        parsedValue = editValue;
      } else if (dataType === 'string') {
        parsedValue = JSON.stringify(editValue);
      } else {
        parsedValue = JSON.parse(editValue);
      }
      onUpdate(configKey, parsedValue);
      setEditingConfig(null);
    } catch (error) {
      alert('Invalid value format');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: 'white' }}>System Configuration</h2>

      {Object.entries(groupedConfigs).map(([category, configsList]: [string, any]) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-6"
          style={{
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <h3 className="text-lg font-bold mb-4 capitalize flex items-center gap-2" style={{ color: 'white' }}>
            <Settings className="w-5 h-5" style={{ color: 'rgb(34, 211, 238)' }} />
            {category.replace(/_/g, ' ')}
          </h3>

          <div className="space-y-3">
            {configsList.map((config: SystemConfig) => (
              <div key={config.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'white' }}>{config.config_key.replace(/_/g, ' ')}</div>
                  <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{config.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  {editingConfig === config.config_key ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}
                      />
                      <button
                        onClick={() => handleSave(config.config_key, config.data_type)}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }}
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingConfig(null)}
                        className="text-sm"
                        style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-3 py-1 rounded-lg text-sm" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {typeof config.config_value === 'object'
                          ? JSON.stringify(config.config_value)
                          : String(config.config_value)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingConfig(config.config_key);
                          setEditValue(
                            typeof config.config_value === 'object'
                              ? JSON.stringify(config.config_value)
                              : String(config.config_value)
                          );
                        }}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
