import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Baby, Search } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminPortalApi, AdminMembersResponse } from '../services/aipreneurApi';

type TabType = 'parents' | 'genius';

export default function AdminMembers() {
  const [activeTab, setActiveTab] = useState<TabType>('parents');
  const [parents, setParents] = useState<AdminMembersResponse['parents']>([]);
  const [genius, setGenius] = useState<AdminMembersResponse['genius']>([]);
  const [summary, setSummary] = useState<AdminMembersResponse['summary']>({
    total_parents: 0,
    total_genius: 0,
    total_children: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await adminPortalApi.getMembers();
        if (response.success) {
          setParents(response.parents || []);
          setGenius(response.genius || []);
          setSummary(response.summary);
        }
      } catch (error) {
        console.error('Error loading members data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredParents = useMemo(() => {
    return parents.filter(
      (p) =>
        p.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.parent_email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parents, searchTerm]);

  const filteredGenius = useMemo(() => {
    return genius.filter(
      (g) =>
        g.genius_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.genius_uid && g.genius_uid.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [genius, searchTerm]);

  const glassCard = {
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'white' }}>Members</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Live parent and kid records from Laravel database.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={glassCard}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total Parents</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'white' }}>{summary.total_parents}</div>
          </div>
          <div className="rounded-xl p-4" style={glassCard}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total Kids</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'white' }}>{summary.total_genius}</div>
          </div>
          <div className="rounded-xl p-4" style={glassCard}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total Children Linked</div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'white' }}>{summary.total_children}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={() => setActiveTab('parents')}
            className="flex flex-shrink-0 items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap"
            style={activeTab === 'parents'
              ? { borderColor: 'rgb(45, 212, 191)', color: 'white' }
              : { borderColor: 'transparent', color: 'rgba(255, 255, 255, 0.4)' }
            }
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Parents ({parents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('genius')}
            className="flex flex-shrink-0 items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap"
            style={activeTab === 'genius'
              ? { borderColor: 'rgb(45, 212, 191)', color: 'white' }
              : { borderColor: 'transparent', color: 'rgba(255, 255, 255, 0.4)' }
            }
          >
            <Baby className="w-5 h-5" />
            <span className="font-medium">Kids ({genius.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full"
            />
          </div>
        ) : activeTab === 'parents' ? (
          <ParentsTable parents={filteredParents} />
        ) : (
          <GeniusTable genius={filteredGenius} />
        )}
      </div>
    </AdminLayout>
  );
}

function ParentsTable({ parents }: { parents: AdminMembersResponse['parents'] }) {
  if (parents.length === 0) {
    return (
      <div className="text-center py-20">
        <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
        <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No parents found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-x-auto" style={{
      background: 'rgba(15, 15, 30, 0.5)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    }}>
      <table className="w-full min-w-[680px]">
        <thead style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
          <tr>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Parent</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Email</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Children</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {parents.map((parent) => (
            <tr key={parent.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <td className="px-6 py-4 font-medium" style={{ color: 'white' }}>{parent.parent_name}</td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{parent.parent_email}</td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{parent.total_children}</td>
              <td className="px-6 py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                {parent.created_at ? new Date(parent.created_at).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GeniusTable({ genius }: { genius: AdminMembersResponse['genius'] }) {
  if (genius.length === 0) {
    return (
      <div className="text-center py-20">
        <Baby className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
        <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No kids found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-x-auto" style={{
      background: 'rgba(15, 15, 30, 0.5)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    }}>
      <table className="w-full min-w-[980px]">
        <thead style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
          <tr>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Kid</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>UID</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Parent</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Persona</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Chapters</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>XP / Coins</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Sales / Profit</th>
            <th className="px-6 py-4 text-left text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {genius.map((g) => (
            <tr key={g.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <td className="px-6 py-4 font-medium" style={{ color: 'white' }}>
                {g.genius_name}
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Age: {g.age ?? '-'}</div>
              </td>
              <td className="px-6 py-4 font-mono text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{g.genius_uid || 'N/A'}</td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {g.parent_name || '-'}
                <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{g.parent_email || ''}</div>
              </td>
              <td className="px-6 py-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={g.persona_status === 'completed'
                    ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                    : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                  }
                >
                  {g.persona_status}
                </span>
              </td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{g.completed_chapters}</td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{g.xp} / {g.coins}</td>
              <td className="px-6 py-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                RM {Number(g.total_sales).toFixed(2)} / RM {Number(g.total_profit).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                {g.last_activity ? new Date(g.last_activity).toLocaleDateString() : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
