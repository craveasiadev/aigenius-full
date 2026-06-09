import { useEffect, useState, useMemo, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  GraduationCap,
  Users,
  Coins,
  BookOpen,
  Clock,
  Sparkles,
  Plus,
  X,
  PencilLine,
  Search,
  Trash2,
  CheckCircle,
  QrCode,
  ScanLine,
  AlertTriangle,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminAcademyApi, AIpreneurClass, AIpreneurClassBooking, GeniusProfile } from '../services/aipreneurApi';

// -- Types --
interface ParentSummary {
  id: string;
  name: string;
  email: string;
  genius_profiles_count: number;
  created_at: string;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
}

// -- Components --

function Modal({ open, title, onClose, children, size = 'max-w-2xl' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className={`relative w-full ${size} rounded-3xl shadow-2xl overflow-hidden`}
            style={{
              background: 'rgba(15, 15, 30, 0.8)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <h3 className="text-xl font-bold" style={{ color: 'white' }}>{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.5)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const TabButton = ({ active, label, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
    style={active
      ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
      : { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)' }
    }
  >
    {Icon && <Icon className="w-4 h-4" />}
    {label}
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, subValue }: any) => (
  <div className="p-5 rounded-2xl" style={{
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  }}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{label}</p>
        <h3 className="text-2xl font-black" style={{ color: 'white' }}>{value}</h3>
        {subValue && <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

// -- Main Page --

export default function AdminAcademy() {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'bookings' | 'students' | 'parents'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_classes: 0,
    total_slots: 0,
    total_bookings: 0,
    total_students: 0,
    total_parents: 0,
    total_coins: 0,
    avg_xp: 0,
  });

  // Data States
  const [classes, setClasses] = useState<AIpreneurClass[]>([]);
  const [bookings, setBookings] = useState<AIpreneurClassBooking[]>([]);
  const [students, setStudents] = useState<GeniusProfile[]>([]);
  const [parents, setParents] = useState<ParentSummary[]>([]);

  // Search/Filter States
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [creatingSlotClassId, setCreatingSlotClassId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form States
  const [saving, setSaving] = useState(false);
  const [newClass, setNewClass] = useState({
    title: '', category: 'content', description: '', level: 'Beginner', price: 39, duration_minutes: 60,
  });
  const [classEdits, setClassEdits] = useState<Record<string, Partial<AIpreneurClass>>>({});
  const [slotDrafts, setSlotDrafts] = useState<Record<string, { start: string; end: string; capacity: number; location: string }>>({});
  const [slotEdits, setSlotEdits] = useState<Record<string, { start?: string; end?: string; capacity?: number; location?: string; status?: string }>>({});

  // Check-in States
  const [checkInInput, setCheckInInput] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string; booking?: AIpreneurClassBooking } | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');

  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await adminAcademyApi.getOverview();
      if (response.success) {
        setStats(response.stats);
        setClasses(response.classes || []);
        setBookings(response.bookings || []);
        setStudents(response.students || []);
        setParents(response.parents || []);
      }
    } catch (error) {
      console.error('Failed to load academy data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, []);

  // -- Helpers --
  const toInputValue = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // -- CRUD Handlers --

  // Create Class
  const handleCreateClass = async () => {
    try {
      setSaving(true);
      await adminAcademyApi.createClass(newClass);
      setNewClass({ title: '', category: 'content', description: '', level: 'Beginner', price: 39, duration_minutes: 60 });
      setShowCreateClass(false);
      await loadOverview();
    } catch (error) { console.error(error); } finally { setSaving(false); }
  };

  // Edit Class
  const handleEditClass = (cls: AIpreneurClass) => {
    setEditingClassId(cls.id);
    setClassEdits(prev => ({
      ...prev,
      [cls.id]: {
        title: cls.title,
        category: cls.category,
        description: cls.description || '',
        level: cls.level,
        price: cls.price,
        duration_minutes: cls.duration_minutes,
        is_active: cls.is_active
      }
    }));
  };

  const handleSaveClass = async (classId: string) => {
    const edits = classEdits[classId];
    if (!edits) return;
    try {
      setSaving(true);
      await adminAcademyApi.updateClass(classId, edits);
      setEditingClassId(null);
      await loadOverview();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleToggleClass = async (id: string, current: boolean) => {
    try { await adminAcademyApi.updateClass(id, { is_active: !current }); await loadOverview(); } catch (e) { console.error(e); }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await adminAcademyApi.deleteClass(id); await loadOverview(); } catch (e) { console.error(e); }
  };

  // Slots
  const openCreateSlot = (classId: string) => {
    setSlotDrafts(prev => ({
      ...prev,
      [classId]: prev[classId] || { start: '', end: '', capacity: 20, location: 'Online (Zoom)' }
    }));
    setCreatingSlotClassId(classId);
  };

  const handleCreateSlot = async (classId: string) => {
    const draft = slotDrafts[classId];
    if (!draft?.start || !draft?.end) return;
    try {
      setSaving(true);
      await adminAcademyApi.createSlot(classId, {
        start_time: draft.start,
        end_time: draft.end,
        capacity: draft.capacity,
        location: draft.location
      });
      setSlotDrafts(prev => ({ ...prev, [classId]: { start: '', end: '', capacity: 20, location: 'Online (Zoom)' } }));
      setCreatingSlotClassId(null);
      await loadOverview();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleEditSlot = (slotId: string, slot: any) => {
    setEditingSlotId(slotId);
    setSlotEdits(prev => ({
      ...prev,
      [slotId]: {
        start: toInputValue(slot.start_time),
        end: toInputValue(slot.end_time),
        capacity: slot.capacity,
        location: slot.location || 'Online (Zoom)',
        status: slot.status
      }
    }));
  };

  const handleSaveSlot = async (slotId: string) => {
    const edits = slotEdits[slotId];
    if (!edits) return;
    try {
      setSaving(true);
      await adminAcademyApi.updateSlot(slotId, {
        start_time: edits.start,
        end_time: edits.end,
        capacity: edits.capacity,
        location: edits.location,
        status: edits.status
      } as any);
      setEditingSlotId(null);
      await loadOverview();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleCloseSlot = async (slotId: string) => {
    if (!confirm('Close this slot?')) return;
    try {
      await adminAcademyApi.updateSlot(slotId, { status: 'closed' });
      await loadOverview();
    } catch (e) { console.error(e); }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Delete this slot permanently?')) return;
    try {
      await adminAcademyApi.deleteSlot(slotId);
      await loadOverview();
    } catch (e) { console.error(e); }
  };


  // -- Render Helpers --

  // Students Table
  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.genius_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Parents Table
  const filteredParents = useMemo(() => {
    return parents.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parents, searchQuery]);

  // Search/lookup booking handler (step 1)
  const [foundBooking, setFoundBooking] = useState<AIpreneurClassBooking | null>(null);
  const handleLookup = async () => {
    const orderId = checkInInput.trim();
    if (!orderId) return;
    setCheckInLoading(true);
    setCheckInResult(null);
    setFoundBooking(null);
    try {
      const response = await adminAcademyApi.lookupBooking(orderId);
      if (response.success && response.booking) {
        setFoundBooking(response.booking);
      } else {
        setCheckInResult({ success: false, message: response.message || 'Booking not found.' });
      }
    } catch (error: any) {
      const msg = error?.data?.message || error?.message || 'Booking not found.';
      setCheckInResult({ success: false, message: msg });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Confirm check-in handler (step 2)
  const handleConfirmCheckIn = async (orderId: string) => {
    setCheckInLoading(true);
    setCheckInResult(null);
    try {
      const response = await adminAcademyApi.checkInBooking(orderId);
      setCheckInResult({ success: response.success, message: response.message || 'Check-in successful!', booking: response.booking });
      if (response.success) {
        setCheckInInput('');
        setFoundBooking(null);
        await loadOverview();
      }
    } catch (error: any) {
      const msg = error?.data?.message || error?.message || 'Check-in failed.';
      setCheckInResult({ success: false, message: msg });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Filtered bookings for search
  const filteredBookings = useMemo(() => {
    if (!bookingSearch.trim()) return bookings;
    const q = bookingSearch.toLowerCase();
    return bookings.filter(b =>
      b.order_id?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_email?.toLowerCase().includes(q) ||
      b.slot?.course?.title?.toLowerCase().includes(q)
    );
  }, [bookings, bookingSearch]);

  const activeClassForSlot = creatingSlotClassId ? classes.find(c => c.id === creatingSlotClassId) : null;

  // Glass style constants
  const glassCard = {
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  const glassInput = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'white',
  };

  return (
    <AdminLayout>
      <div className="space-y-8 font-sans">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'white' }}>Academy Management</h1>
            <p className="mt-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Oversee classes, students, and bookings in real-time.</p>
          </div>

          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <TabButton active={activeTab === 'overview'} label="Overview" icon={barchartIcon} onClick={() => setActiveTab('overview')} />
            <TabButton active={activeTab === 'classes'} label="Classes" icon={BookOpen} onClick={() => setActiveTab('classes')} />
            <TabButton active={activeTab === 'bookings'} label="Bookings" icon={Calendar} onClick={() => setActiveTab('bookings')} />
            <TabButton active={activeTab === 'students'} label="Students" icon={GraduationCap} onClick={() => setActiveTab('students')} />
            <TabButton active={activeTab === 'parents'} label="Parents" icon={Users} onClick={() => setActiveTab('parents')} />
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Students" value={stats.total_students} icon={GraduationCap} color="bg-blue-500 text-blue-500" />
                    <StatCard label="Total Bookings" value={stats.total_bookings} icon={Calendar} color="bg-purple-500 text-purple-500" />
                    <StatCard label="Active Classes" value={classes.filter(c => c.is_active).length} icon={BookOpen} color="bg-green-500 text-green-500" />
                    <StatCard label="Avg. Student XP" value={stats.avg_xp.toFixed(0)} icon={Sparkles} color="bg-amber-500 text-amber-500" />
                  </div>

                  {/* Recent Activity Section */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-3xl p-6" style={glassCard}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg" style={{ color: 'white' }}>Recent Bookings</h3>
                        <button onClick={() => setActiveTab('bookings')} className="text-sm font-bold hover:underline" style={{ color: 'rgb(139, 92, 246)' }}>View All</button>
                      </div>
                      <div className="space-y-3">
                        {bookings.slice(0, 5).map(booking => (
                          <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl transition-colors" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'rgb(96, 165, 250)' }}>
                                {(booking.customer_name?.[0] || 'S').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm" style={{ color: 'white' }}>{booking.customer_name || 'Student'}</p>
                                <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{booking.slot?.course?.title || 'Class'}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={booking.payment_status === 'completed'
                              ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                              : { background: 'rgba(234, 179, 8, 0.15)', color: 'rgb(250, 204, 21)' }
                            }>
                              {booking.payment_status}
                            </span>
                          </div>
                        ))}
                        {bookings.length === 0 && <p className="text-center py-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No bookings yet.</p>}
                      </div>
                    </div>

                    <div className="rounded-3xl p-6" style={glassCard}>
                      <h3 className="font-bold text-lg mb-6" style={{ color: 'white' }}>Top Students</h3>
                      <div className="space-y-4">
                        {students
                          .sort((a, b) => (b.rewards?.xp || 0) - (a.rewards?.xp || 0))
                          .slice(0, 5)
                          .map((student, i) => (
                            <div key={student.id} className="flex items-center gap-4">
                              <span className="font-black w-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{i + 1}</span>
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className="font-bold text-sm" style={{ color: 'white' }}>{student.first_name} {student.last_name}</span>
                                  <span className="text-xs font-bold" style={{ color: 'rgb(245, 158, 11)' }}>{student.rewards?.xp || 0} XP</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (student.rewards?.xp || 0) / 100)}%`, background: 'linear-gradient(90deg, rgb(251, 191, 36), rgb(249, 115, 22))' }} />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'classes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 rounded-2xl" style={glassCard}>
                    <h2 className="font-bold" style={{ color: 'white' }}>All Classes ({classes.length})</h2>
                    <button onClick={() => setShowCreateClass(true)} className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 text-white" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
                      <Plus className="w-4 h-4" /> New Class
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {classes.map(cls => (
                      <div key={cls.id} className={`group relative rounded-3xl transition-all ${cls.is_active ? '' : 'opacity-70'}`} style={glassCard}>
                        {/* Class Status Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1 text-xs font-bold rounded-full" style={cls.is_active
                            ? { background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }
                            : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                          }>
                            {cls.is_active ? 'Active' : 'Draft'}
                          </span>
                        </div>

                        <div className="p-6">
                          <h3 className="text-xl font-black mb-1 transition-colors" style={{ color: 'white' }}>{cls.title}</h3>
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                            <span style={{ color: 'rgb(139, 92, 246)' }}>{cls.category}</span>
                            <span>&#8226;</span>
                            <span>{cls.level}</span>
                          </div>
                          <p className="text-sm line-clamp-2 mb-6 min-h-[40px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{cls.description}</p>

                          <div className="flex items-center justify-between text-sm font-medium mb-6" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {cls.duration_minutes}m</span>
                            <span className="flex items-center gap-1"><Coins className="w-4 h-4" /> RM{Number(cls.price).toFixed(0)}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <button onClick={() => handleEditClass(cls)} className="flex-1 py-2 text-xs font-bold rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              Edit
                            </button>
                            <button onClick={() => openCreateSlot(cls.id)} className="flex-1 py-2 text-xs font-bold rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'rgb(167, 139, 250)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                              Add Slot
                            </button>
                            <button onClick={() => handleToggleClass(cls.id, cls.is_active)} className="px-3 py-2 text-xs font-bold rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {cls.is_active ? 'Deactivate' : 'Publish'}
                            </button>
                            <button onClick={() => handleDeleteClass(cls.id)} className="p-2 rounded-lg" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Slots List */}
                          {cls.slots && cls.slots.length > 0 && (
                            <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                              <p className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Upcoming Slots</p>
                              {cls.slots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                                  <div>
                                    <div className="font-bold" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{new Date(slot.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{slot.booked_count}/{slot.capacity} booked</div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditSlot(slot.id, slot)} className="p-1 rounded">
                                      <PencilLine className="w-3 h-3" style={{ color: 'rgb(96, 165, 250)' }} />
                                    </button>
                                    <button onClick={() => handleCloseSlot(slot.id)} className="p-1 rounded">
                                      <X className="w-3 h-3" style={{ color: 'rgb(248, 113, 113)' }} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  {/* Search Booking Section */}
                  <div className="p-6 rounded-3xl" style={glassCard}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <ScanLine className="w-5 h-5" style={{ color: 'rgb(74, 222, 128)' }} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg" style={{ color: 'white' }}>Workshop Check-in</h2>
                        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Search a booking number, verify details, then check in</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <input
                          value={checkInInput}
                          onChange={e => setCheckInInput(e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                          placeholder="Enter booking number (e.g. CLASS-1739125000-ABCDEF)"
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-mono placeholder:font-sans"
                          style={glassInput}
                        />
                      </div>
                      <button
                        onClick={handleLookup}
                        disabled={checkInLoading || !checkInInput.trim()}
                        className="px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap text-white"
                        style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                      >
                        {checkInLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Search
                      </button>
                    </div>

                    {/* Found Booking Card */}
                    <AnimatePresence>
                      {foundBooking && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-4 rounded-xl"
                          style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <code className="text-xs font-mono font-bold px-2.5 py-1 rounded" style={{ color: 'rgb(167, 139, 250)', background: 'rgba(139, 92, 246, 0.1)' }}>
                              {foundBooking.order_id}
                            </code>
                            <button onClick={() => { setFoundBooking(null); setCheckInResult(null); }} style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                            <div>
                              <div className="font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Student</div>
                              <div className="font-bold mt-0.5" style={{ color: 'white' }}>{foundBooking.customer_name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Class</div>
                              <div className="font-bold mt-0.5" style={{ color: 'white' }}>{foundBooking.slot?.course?.title || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Amount</div>
                              <div className="font-bold mt-0.5" style={{ color: 'white' }}>RM{Number(foundBooking.amount).toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Payment</div>
                              <div className="mt-0.5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                  foundBooking.payment_status === 'completed'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                    : foundBooking.payment_status === 'pay_later'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                }`}>
                                  {foundBooking.payment_status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {foundBooking.checked_in_at ? (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                              <CheckCircle className="w-4 h-4" style={{ color: 'rgb(74, 222, 128)' }} />
                              <span className="text-sm font-bold" style={{ color: 'rgb(74, 222, 128)' }}>
                                Already checked in at {new Date(foundBooking.checked_in_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : foundBooking.payment_status === 'completed' || foundBooking.payment_status === 'pay_later' ? (
                            <button
                              onClick={() => handleConfirmCheckIn(foundBooking.order_id)}
                              disabled={checkInLoading}
                              className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                              style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                            >
                              {checkInLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Confirm Check-in
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                              <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(250, 204, 21)' }} />
                              <span className="text-sm font-bold" style={{ color: 'rgb(250, 204, 21)' }}>
                                Cannot check in -- payment is {foundBooking.payment_status}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Check-in Result */}
                    <AnimatePresence>
                      {checkInResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-4 rounded-xl flex items-start gap-3"
                          style={checkInResult.success
                            ? { background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }
                            : { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }
                          }
                        >
                          {checkInResult.success ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(74, 222, 128)' }} />
                          ) : (
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(248, 113, 113)' }} />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-sm" style={{ color: checkInResult.success ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)' }}>
                              {checkInResult.message}
                            </div>
                            {checkInResult.booking && (
                              <div className="text-xs mt-1 space-y-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                <div>Student: {checkInResult.booking.customer_name}</div>
                                <div>Class: {checkInResult.booking.slot?.course?.title || 'N/A'}</div>
                                <div>Order: {checkInResult.booking.order_id}</div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setCheckInResult(null)}
                            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* All Bookings Table */}
                  <div className="p-6 rounded-3xl" style={glassCard}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                      <h2 className="font-bold text-lg" style={{ color: 'white' }}>All Bookings ({bookings.length})</h2>
                      <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <input
                          placeholder="Search by name, order ID, or class..."
                          value={bookingSearch}
                          onChange={e => setBookingSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                          style={glassInput}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Order ID</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Student</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Class</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Slot</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Amount</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Payment</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Check-in</th>
                            <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookings.map(booking => {
                            const isCheckedIn = !!booking.checked_in_at;
                            return (
                              <tr key={booking.id} className="group transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                <td className="py-3 px-3">
                                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ color: 'rgb(167, 139, 250)', background: 'rgba(139, 92, 246, 0.1)' }}>
                                    {booking.order_id}
                                  </code>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-sm font-bold" style={{ color: 'white' }}>{booking.customer_name || 'N/A'}</div>
                                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{booking.customer_email || ''}</div>
                                </td>
                                <td className="py-3 px-3 text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {booking.slot?.course?.title || 'N/A'}
                                </td>
                                <td className="py-3 px-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                  {booking.slot?.start_time
                                    ? new Date(booking.slot.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                    : '-'}
                                </td>
                                <td className="py-3 px-3 text-sm font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                  RM{Number(booking.amount).toFixed(0)}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                    booking.payment_status === 'completed'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                      : booking.payment_status === 'pay_later'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                        : booking.payment_status === 'failed'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                  }`}>
                                    {booking.payment_status}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {isCheckedIn ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }}>
                                      <CheckCircle className="w-3 h-3" />
                                      {new Date(booking.checked_in_at!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {!isCheckedIn && (booking.payment_status === 'completed' || booking.payment_status === 'pay_later') && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await adminAcademyApi.checkInBooking(booking.order_id);
                                          setCheckInResult({ success: res.success, message: res.message || 'Checked in!', booking: res.booking });
                                          if (res.success) await loadOverview();
                                        } catch (err: any) {
                                          setCheckInResult({ success: false, message: err?.data?.message || err?.message || 'Check-in failed.' });
                                        }
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
                                      style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'rgb(74, 222, 128)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                                    >
                                      Check In
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {filteredBookings.length === 0 && (
                        <div className="py-12 text-center" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {bookingSearch ? `No bookings matching "${bookingSearch}"` : 'No bookings yet.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Students Tab */}
              {activeTab === 'students' && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl" style={glassCard}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                      <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <input
                          placeholder="Search by name or Genius ID..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                          style={glassInput}
                        />
                      </div>
                      <div className="text-sm font-bold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        Showing {filteredStudents.length} students
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Student</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Level</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Shop Name</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Coins</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>XP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map(student => (
                            <tr key={student.id} className="group transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-bold" style={{ color: 'white' }}>{student.first_name} {student.last_name}</div>
                                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{student.genius_id}</div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'rgb(251, 191, 36)' }}>
                                  Level {student.rewards?.level || 1}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                {student.aipreneur_shop_name || <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>No Shop</span>}
                              </td>
                              <td className="py-4 px-4 font-mono text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                {student.rewards?.ai_tokens || 0}
                              </td>
                              <td className="py-4 px-4 font-mono text-sm font-bold" style={{ color: 'rgb(139, 92, 246)' }}>
                                {student.rewards?.xp || 0} XP
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredStudents.length === 0 && (
                        <div className="py-12 text-center" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No students found matching "{searchQuery}"</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Parents Tab */}
              {activeTab === 'parents' && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl" style={glassCard}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                      <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <input
                          placeholder="Search parents..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                          style={glassInput}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Parent Name</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Email</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Children</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredParents.map(parent => (
                            <tr key={parent.id} className="group transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td className="py-4 px-4 font-bold" style={{ color: 'white' }}>{parent.name}</td>
                              <td className="py-4 px-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{parent.email}</td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(96, 165, 250)' }}>
                                  <Users className="w-3 h-3" /> {parent.genius_profiles_count}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                {new Date(parent.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* -- Modals -- */}

      {/* Create Class */}
      <Modal open={showCreateClass} title="Create New Class" onClose={() => setShowCreateClass(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Title</label>
              <input
                value={newClass.title}
                onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                placeholder="e.g. Intro to Python"
                style={glassInput}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Category</label>
              <select
                value={newClass.category}
                onChange={e => setNewClass({ ...newClass, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                style={glassInput}
              >
                <option value="content">Content Creation</option>
                <option value="coding">Coding & AI</option>
                <option value="business">Business & Finance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Level</label>
              <select
                value={newClass.level}
                onChange={e => setNewClass({ ...newClass, level: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                style={glassInput}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Duration (mins)</label>
              <input
                type="number"
                value={newClass.duration_minutes}
                onChange={e => setNewClass({ ...newClass, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                style={glassInput}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Price (RM)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>RM</span>
                <input
                  type="number"
                  value={newClass.price}
                  onChange={e => setNewClass({ ...newClass, price: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Description</label>
            <textarea
              value={newClass.description}
              onChange={e => setNewClass({ ...newClass, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm min-h-[100px]"
              placeholder="Describe what students will learn..."
              style={glassInput}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowCreateClass(false)} className="px-5 py-2.5 rounded-xl font-bold transition-colors" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Cancel
            </button>
            <button
              onClick={handleCreateClass}
              disabled={saving || !newClass.title}
              className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
            >
              {saving ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal open={!!editingClassId} title="Edit Class Details" onClose={() => setEditingClassId(null)}>
        {editingClassId && classEdits[editingClassId] && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Title</label>
                <input
                  value={classEdits[editingClassId].title}
                  onChange={e => setClassEdits({ ...classEdits, [editingClassId]: { ...classEdits[editingClassId], title: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Category</label>
                <select
                  value={classEdits[editingClassId].category}
                  onChange={e => setClassEdits({ ...classEdits, [editingClassId]: { ...classEdits[editingClassId], category: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                >
                  <option value="content">Content Creation</option>
                  <option value="coding">Coding & AI</option>
                  <option value="business">Business & Finance</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Level</label>
                <select
                  value={classEdits[editingClassId].level}
                  onChange={e => setClassEdits({ ...classEdits, [editingClassId]: { ...classEdits[editingClassId], level: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Price (RM)</label>
                <input
                  type="number"
                  value={classEdits[editingClassId].price}
                  onChange={e => setClassEdits({ ...classEdits, [editingClassId]: { ...classEdits[editingClassId], price: parseFloat(e.target.value) } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Description</label>
              <textarea
                value={classEdits[editingClassId].description}
                onChange={e => setClassEdits({ ...classEdits, [editingClassId]: { ...classEdits[editingClassId], description: e.target.value } })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm min-h-[100px]"
                style={glassInput}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setEditingClassId(null)} className="px-5 py-2.5 rounded-xl font-bold transition-colors" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Cancel
              </button>
              <button
                onClick={() => handleSaveClass(editingClassId!)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Slot Modal */}
      <Modal open={!!creatingSlotClassId} title={`Add Slot: ${activeClassForSlot?.title || ''}`} onClose={() => setCreatingSlotClassId(null)}>
        {creatingSlotClassId && slotDrafts[creatingSlotClassId] && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Start Time</label>
                <input
                  type="datetime-local"
                  value={slotDrafts[creatingSlotClassId].start}
                  onChange={e => setSlotDrafts({ ...slotDrafts, [creatingSlotClassId]: { ...slotDrafts[creatingSlotClassId], start: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>End Time</label>
                <input
                  type="datetime-local"
                  value={slotDrafts[creatingSlotClassId].end}
                  onChange={e => setSlotDrafts({ ...slotDrafts, [creatingSlotClassId]: { ...slotDrafts[creatingSlotClassId], end: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Capacity</label>
                <input
                  type="number"
                  value={slotDrafts[creatingSlotClassId].capacity}
                  onChange={e => setSlotDrafts({ ...slotDrafts, [creatingSlotClassId]: { ...slotDrafts[creatingSlotClassId], capacity: parseInt(e.target.value) } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Location</label>
                <input
                  value={slotDrafts[creatingSlotClassId].location}
                  onChange={e => setSlotDrafts({ ...slotDrafts, [creatingSlotClassId]: { ...slotDrafts[creatingSlotClassId], location: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setCreatingSlotClassId(null)} className="px-5 py-2.5 rounded-xl font-bold transition-colors" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Cancel
              </button>
              <button
                onClick={() => handleCreateSlot(creatingSlotClassId!)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                {saving ? 'Creating...' : 'Create Slot'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Slot Modal */}
      <Modal open={!!editingSlotId} title="Edit Slot" onClose={() => setEditingSlotId(null)}>
        {editingSlotId && slotEdits[editingSlotId] && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Start Time</label>
                <input
                  type="datetime-local"
                  value={slotEdits[editingSlotId].start}
                  onChange={e => setSlotEdits({ ...slotEdits, [editingSlotId]: { ...slotEdits[editingSlotId], start: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>End Time</label>
                <input
                  type="datetime-local"
                  value={slotEdits[editingSlotId].end}
                  onChange={e => setSlotEdits({ ...slotEdits, [editingSlotId]: { ...slotEdits[editingSlotId], end: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Capacity</label>
                <input
                  type="number"
                  value={slotEdits[editingSlotId].capacity}
                  onChange={e => setSlotEdits({ ...slotEdits, [editingSlotId]: { ...slotEdits[editingSlotId], capacity: parseInt(e.target.value) } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Status</label>
                <select
                  value={slotEdits[editingSlotId].status}
                  onChange={e => setSlotEdits({ ...slotEdits, [editingSlotId]: { ...slotEdits[editingSlotId], status: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  style={glassInput}
                >
                  <option value="open">Open</option>
                  <option value="full">Full</option>
                  <option value="closed">Closed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setEditingSlotId(null)} className="px-5 py-2.5 rounded-xl font-bold transition-colors" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Cancel
              </button>
              <button
                onClick={() => handleSaveSlot(editingSlotId!)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}

function barchartIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
