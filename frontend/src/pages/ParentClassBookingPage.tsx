import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  GraduationCap,
  Sparkles,
  Video,
  Code,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  User,
  X,
  Landmark,
  Wallet,
  Smartphone,
  HandCoins,
  Copy,
  Check,
} from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { parentClassesApi, AIpreneurClass } from '../services/aipreneurApi';
import { paymentApi } from '../services/paymentApi';

interface ChildProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  age: number | null;
  avatar_url: string | null;
  genius_id: string;
}

const PAYMENT_METHODS = [
  { id: 'fpx', label: 'Online Banking', sublabel: 'FPX', icon: Landmark, color: 'from-blue-500 to-blue-600' },
  { id: 'card', label: 'Card Payment', sublabel: 'Visa / MC', icon: CreditCard, color: 'from-violet-500 to-violet-600' },
  { id: 'tng', label: 'Touch n Go', sublabel: 'eWallet', icon: Wallet, color: 'from-sky-500 to-blue-500' },
  { id: 'grabpay', label: 'GrabPay', sublabel: 'eWallet', icon: Smartphone, color: 'from-green-500 to-emerald-600' },
  { id: 'boost', label: 'Boost', sublabel: 'eWallet', icon: Sparkles, color: 'from-red-500 to-orange-500' },
  { id: 'pay_later', label: 'Pay at Workshop', sublabel: 'Walk-in', icon: HandCoins, color: 'from-amber-500 to-yellow-500' },
];

const CATEGORY_META: Record<string, { title: string; description: string; icon: typeof Video }> = {
  content: {
    title: 'Content Creation Studio',
    description: 'Plan, film, and edit short videos to promote your shop like a pro.',
    icon: Video,
  },
  coding: {
    title: 'Mini Coding Adventure',
    description: 'Learn loops, logic, and building fun mini games with friendly mentors.',
    icon: Code,
  },
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const getQrUrl = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&bgcolor=FFFFFF&color=000000&format=png`;

export const ParentClassBookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const [classes, setClasses] = useState<AIpreneurClass[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeClass, setActiveClass] = useState<AIpreneurClass | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Success modal state
  const [successBooking, setSuccessBooking] = useState<{
    order_id: string;
    class_title: string;
    child_name: string;
    slot_time: string;
    status: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const categoryFilter = searchParams.get('category');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await parentClassesApi.getCatalog();
        if (response.success) {
          setClasses(response.classes || []);
          setChildren(response.children || []);

          if (response.children?.length > 0) {
            setSelectedChild(response.children[0]);
          }

          if (categoryFilter) {
            const match = response.classes.find((item) => item.category === categoryFilter);
            if (match) {
              setActiveClass(match);
              return;
            }
          }
          setActiveClass(response.classes[0] || null);
        }
      } catch (error) {
        console.error('Failed to load classes:', error);
        setMessage({ type: 'error', text: 'Unable to load classes right now.' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryFilter]);

  const filteredClasses = useMemo(() => {
    if (!categoryFilter) return classes;
    return classes.filter((item) => item.category === categoryFilter);
  }, [classes, categoryFilter]);

  const handleSelectClass = (item: AIpreneurClass) => {
    setActiveClass(item);
    setSelectedSlotId(null);
    setShowPayment(false);
    setMessage(null);
  };

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookSlot = async () => {
    if (!activeClass || !selectedSlotId || !selectedChild || !currentUser) return;

    setBookingLoading(true);
    setMessage(null);

    try {
      const slot = activeClass.slots?.find((s) => s.id === selectedSlotId);

      const response = await parentClassesApi.bookForChild({
        slot_id: selectedSlotId,
        student_id: selectedChild.id,
        payment_method: selectedMethod,
        customer_name: currentUser.name || 'Parent',
        customer_email: currentUser.email || 'parent@aigenius.com.my',
        frontend_url: window.location.origin,
      });

      if (!response.success) {
        setMessage({ type: 'error', text: response.message || 'Booking failed.' });
        setBookingLoading(false);
        return;
      }

      if (response.payment_url && response.payment_data) {
        await paymentApi.submitPaymentForm(response.payment_url, response.payment_data);
      } else {
        // Show success modal
        setSuccessBooking({
          order_id: response.order_id || response.booking?.order_id || 'N/A',
          class_title: activeClass.title,
          child_name: selectedChild.first_name,
          slot_time: slot
            ? `${formatDate(slot.start_time)} at ${formatTime(slot.start_time)}`
            : '',
          status: selectedMethod === 'pay_later' ? 'reserved' : 'confirmed',
        });
        setSelectedSlotId(null);
        setShowPayment(false);
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      setMessage({ type: 'error', text: error?.message || 'Booking failed.' });
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedSlot = activeClass?.slots?.find((s) => s.id === selectedSlotId);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a1a', color: '#fff' }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <TopNav userName={currentUser?.name || 'Parent'} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pt-20 md:pt-24 relative" style={{ zIndex: 1 }}>
        <button
          onClick={() => navigate('/p/dashboard')}
          className="flex items-center gap-2 mb-6 font-medium transition-colors"
          style={{ color: 'rgba(103, 232, 249, 0.8)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(103, 232, 249, 1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(103, 232, 249, 0.8)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-xl" style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(168, 85, 247, 0.25), rgba(59, 130, 246, 0.25))',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black" style={{ color: '#fff' }}>Book a Class</h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Choose a class, select which child to register, pick a slot, and confirm your booking.
              </p>
            </div>
            <button
              onClick={() => navigate('/p/classes')}
              className="flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-colors whitespace-nowrap"
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
              }}
            >
              <Calendar className="w-4 h-4" />
              View My Bookings
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="mt-10 text-center py-16">
            <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <h3 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>No classes available yet</h3>
            <p className="mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Check back soon for upcoming workshops and classes!</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Child Selector */}
            {children.length > 0 && (
              <div className="rounded-2xl p-5" style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-purple-300" />
                  <h2 className="text-lg font-bold" style={{ color: '#fff' }}>Select Child</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setSelectedChild(child);
                        setMessage(null);
                      }}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                      style={{
                        background: selectedChild?.id === child.id
                          ? 'rgba(168, 85, 247, 0.15)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: selectedChild?.id === child.id
                          ? '1px solid rgba(168, 85, 247, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        boxShadow: selectedChild?.id === child.id
                          ? '0 0 15px rgba(168, 85, 247, 0.1)'
                          : 'none',
                      }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 211, 238, 0.2))',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {child.avatar_url ? (
                          <img src={child.avatar_url} alt={child.first_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm" style={{ color: '#fff' }}>{child.first_name}</div>
                        {child.age && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Age {child.age}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Class Selection */}
              <div className="lg:col-span-1 space-y-4">
                <div className="text-lg font-semibold" style={{ color: '#fff' }}>Choose a Class</div>
                <div className="space-y-3">
                  {filteredClasses.map((item) => {
                    const Icon = CATEGORY_META[item.category]?.icon || Sparkles;
                    const isActive = activeClass?.id === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => handleSelectClass(item)}
                        className="w-full text-left rounded-2xl p-4 transition-all"
                        style={{
                          background: isActive
                            ? 'rgba(168, 85, 247, 0.12)'
                            : 'rgba(15, 15, 30, 0.5)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          border: isActive
                            ? '1px solid rgba(168, 85, 247, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                            background: 'rgba(255,255,255,0.06)',
                          }}>
                            <Icon className="w-5 h-5 text-purple-300" />
                          </div>
                          <div>
                            <div className="font-bold" style={{ color: '#fff' }}>{item.title}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              {item.level} · {item.duration_minutes} mins
                            </div>
                          </div>
                        </div>
                        <div className="text-sm mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.description}</div>
                        <div className="mt-3 text-sm font-bold text-cyan-300">
                          RM {Number(item.price).toFixed(2)}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Slots + Booking */}
              <div className="lg:col-span-2 space-y-6">
                {/* Slots */}
                <div className="rounded-3xl p-6" style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-cyan-300" />
                    <h2 className="text-xl font-bold" style={{ color: '#fff' }}>Upcoming Slots</h2>
                  </div>

                  {activeClass?.slots?.length ? (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeClass.slots.map((slot) => {
                        const spotsLeft = Math.max(0, slot.capacity - slot.booked_count);
                        const isFull = slot.status === 'full' || spotsLeft <= 0;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => {
                              if (!isFull) {
                                setSelectedSlotId(slot.id);
                                setShowPayment(true);
                                setMessage(null);
                              }
                            }}
                            className="rounded-2xl p-4 text-left transition"
                            style={{
                              background: selectedSlotId === slot.id
                                ? 'rgba(34, 211, 238, 0.1)'
                                : 'rgba(255,255,255,0.04)',
                              border: selectedSlotId === slot.id
                                ? '1px solid rgba(34, 211, 238, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.06)',
                              opacity: isFull ? 0.6 : 1,
                              cursor: isFull ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(slot.start_time)}</div>
                                <div className="text-lg font-semibold" style={{ color: '#fff' }}>
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </div>
                              </div>
                              <div className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <MapPin className="w-4 h-4" />
                                {slot.location || 'Online'}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {spotsLeft} seats left
                              </div>
                              {isFull && <div className="text-xs text-red-300 font-bold">Slot full</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>No slots available yet for this class.</div>
                  )}
                </div>

                {/* Payment / Confirm */}
                <div className="rounded-3xl p-6" style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-300" />
                    <h2 className="text-xl font-bold" style={{ color: '#fff' }}>Confirm Booking</h2>
                  </div>

                  {!showPayment || !selectedSlotId ? (
                    <div className="mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Pick a slot to continue.</div>
                  ) : !selectedChild ? (
                    <div className="mt-3 flex items-center gap-2 font-medium" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
                      <AlertTriangle className="w-4 h-4" />
                      Please select a child first.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-5">
                      {/* Booking summary */}
                      <div className="rounded-xl p-4 text-sm space-y-2" style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div className="flex items-center justify-between">
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Child</span>
                          <span className="font-semibold" style={{ color: '#fff' }}>{selectedChild.first_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Class</span>
                          <span className="font-semibold" style={{ color: '#fff' }}>{activeClass?.title}</span>
                        </div>
                        {selectedSlot && (
                          <div className="flex items-center justify-between">
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>When</span>
                            <span className="font-semibold" style={{ color: '#fff' }}>
                              {formatDate(selectedSlot.start_time)} · {formatTime(selectedSlot.start_time)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Amount</span>
                          <span className="text-cyan-300 font-bold text-lg">
                            RM {Number(activeClass?.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Payment methods */}
                      <div>
                        <div className="text-sm mb-3 font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Choose Payment Method</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {PAYMENT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isSelected = selectedMethod === method.id;
                            return (
                              <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className="relative rounded-2xl px-4 py-4 text-left transition-all"
                                style={{
                                  background: isSelected
                                    ? 'rgba(168, 85, 247, 0.12)'
                                    : 'rgba(255,255,255,0.04)',
                                  border: isSelected
                                    ? '1px solid rgba(168, 85, 247, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.06)',
                                  boxShadow: isSelected
                                    ? '0 0 15px rgba(168, 85, 247, 0.1)'
                                    : 'none',
                                }}
                              >
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-2.5 shadow-sm`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="font-bold text-sm leading-tight" style={{ color: '#fff' }}>{method.label}</div>
                                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{method.sublabel}</div>
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle className="w-4 h-4 text-purple-400" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Error message */}
                      {message && (
                        <div
                          className="flex items-start gap-2 text-sm p-3 rounded-lg"
                          style={{
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: message.type === 'error' ? 'rgba(252, 165, 165, 0.9)' : 'rgba(134, 239, 172, 0.9)',
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5" />
                          <span>{message.text}</span>
                        </div>
                      )}

                      {/* Book button */}
                      <button
                        onClick={handleBookSlot}
                        disabled={!selectedSlotId || !selectedChild || bookingLoading}
                        className="w-full rounded-2xl py-3.5 font-bold text-lg disabled:opacity-60 transition-all hover:scale-[1.01]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                          boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                          color: '#fff',
                        }}
                      >
                        {bookingLoading
                          ? 'Processing...'
                          : selectedMethod === 'pay_later'
                            ? `Reserve Seat for ${selectedChild.first_name}`
                            : `Book & Pay Now for ${selectedChild.first_name}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setSuccessBooking(null)}
            />
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(15, 15, 30, 0.85)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSuccessBooking(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Gradient header */}
              <div className="px-6 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(16, 185, 129, 0.04), rgba(34, 211, 238, 0.04))' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '2px solid rgba(74, 222, 128, 0.3)',
                }}>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-black" style={{ color: '#fff' }}>
                  {successBooking.status === 'reserved' ? 'Seat Reserved!' : 'Booking Confirmed!'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {successBooking.status === 'reserved'
                    ? 'Please pay during workshop check-in'
                    : 'You\'re all set for the workshop'}
                </p>
              </div>

              <div className="px-6 pb-8 space-y-5">
                {/* Booking details */}
                <div className="rounded-2xl p-4 text-sm space-y-2" style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Class</span>
                    <span className="font-semibold" style={{ color: '#fff' }}>{successBooking.class_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Child</span>
                    <span className="font-semibold" style={{ color: '#fff' }}>{successBooking.child_name}</span>
                  </div>
                  {successBooking.slot_time && (
                    <div className="flex justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>When</span>
                      <span className="font-semibold" style={{ color: '#fff' }}>{successBooking.slot_time}</span>
                    </div>
                  )}
                </div>

                {/* QR Code + Booking Number */}
                <div className="text-center space-y-3">
                  <div className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Your Booking Number
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-lg font-mono font-bold text-cyan-300 px-4 py-2 rounded-xl" style={{
                      background: 'rgba(34, 211, 238, 0.08)',
                      border: '1px solid rgba(34, 211, 238, 0.15)',
                    }}>
                      {successBooking.order_id}
                    </code>
                    <button
                      onClick={() => handleCopyOrderId(successBooking.order_id)}
                      className="p-2 rounded-lg transition-colors"
                      title="Copy booking number"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      )}
                    </button>
                  </div>

                  <div className="py-3">
                    <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-white p-2 text-center" style={{
                      border: '2px solid rgba(255,255,255,0.08)',
                    }}>
                      <img
                        src={getQrUrl(successBooking.order_id)}
                        alt="Booking QR Code"
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Show this QR code during workshop check-in</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/p/classes')}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#fff',
                    }}
                  >
                    View All Bookings
                  </button>
                  <button
                    onClick={() => setSuccessBooking(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                      color: '#fff',
                    }}
                  >
                    Book Another
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentClassBookingPage;
