import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { classesApi, AIpreneurClass, AIpreneurClassBooking } from '../services/aipreneurApi';
import { paymentApi } from '../services/paymentApi';

const PAYMENT_METHODS = [
  { id: 'fpx', label: 'Online Banking (FPX)' },
  { id: 'card', label: 'Card Payment' },
  { id: 'tng', label: 'Touch n Go' },
  { id: 'grabpay', label: 'GrabPay' },
  { id: 'boost', label: 'Boost' },
  { id: 'pay_later', label: 'Pay During Workshop' },
];

const CATEGORY_META: Record<string, { title: string; description: string; icon: typeof Video } > = {
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

export const ClassBookingPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [searchParams] = useSearchParams();
  const { geniusProfile } = useGeniusAuth();
  const displayName = geniusProfile?.first_name || 'Friend';

  const [classes, setClasses] = useState<AIpreneurClass[]>([]);
  const [bookings, setBookings] = useState<AIpreneurClassBooking[]>([]);
  const [activeClass, setActiveClass] = useState<AIpreneurClass | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const categoryFilter = searchParams.get('category');

  useEffect(() => {
    if (geniusProfile?.email) {
      setCustomerEmail(geniusProfile.email);
    }
  }, [geniusProfile]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const response = await classesApi.getAll();
        if (response.success) {
          setClasses(response.classes || []);
          setBookings(response.bookings || []);

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

    loadClasses();
  }, [categoryFilter]);

  const filteredClasses = useMemo(() => {
    if (!categoryFilter) return classes;
    return classes.filter((item) => item.category === categoryFilter);
  }, [classes, categoryFilter]);

  const myBookings = useMemo(() => {
    return bookings.slice(0, 6);
  }, [bookings]);

  const handleSelectClass = (item: AIpreneurClass) => {
    setActiveClass(item);
    setSelectedSlotId(null);
    setShowPayment(false);
    setMessage(null);
  };

  const handleBookSlot = async () => {
    if (!activeClass || !selectedSlotId || !geniusProfile) return;

    setBookingLoading(true);
    setMessage(null);

    try {
      const response = await classesApi.book({
        slot_id: selectedSlotId,
        payment_method: selectedMethod,
        customer_name: geniusProfile.first_name || 'AIpreneur Student',
        customer_email: customerEmail || 'student@aigenius.com.my',
        frontend_url: window.location.origin,
        customer_phone: customerPhone || undefined,
      });

      if (!response.success) {
        setMessage({ type: 'error', text: response.message || 'Booking failed.' });
        setBookingLoading(false);
        return;
      }

      if (response.payment_url && response.payment_data) {
        await paymentApi.submitPaymentForm(response.payment_url, response.payment_data);
      } else {
        setMessage({ type: 'success', text: 'Booking confirmed! See you in class.' });
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      setMessage({ type: 'error', text: error?.message || 'Booking failed.' });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: '#0a0a1a' }}>
      {/* Glassmorphism ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '10%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.10)', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(236, 72, 153, 0.07)', filter: 'blur(90px)' }} />
      </div>

      <TopNav userName={displayName} />

      <div className="max-w-6xl mx-auto px-6 py-10 pt-20 md:pt-24" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => smartBack()}
          className="flex items-center gap-2 mb-6"
          style={{ color: 'rgba(139, 92, 246, 0.9)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Hero header glass card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black" style={{ color: 'white' }}>Workshops & Live Classes</h1>
              <p className="mt-2 max-w-2xl" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Choose a class, pick a slot, and book your seat. Learn with mentors, build real skills, and power up your shop.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              <GraduationCap className="w-5 h-5" style={{ color: 'rgba(168, 130, 255, 0.8)' }} />
              <span>Slots update in real-time</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-10" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Loading classes...</div>
        ) : (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="text-lg font-semibold" style={{ color: 'white' }}>Choose a Class</div>
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
                          ? 'rgba(139, 92, 246, 0.15)'
                          : 'rgba(15, 15, 30, 0.5)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: isActive
                          ? '1px solid rgba(139, 92, 246, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: 'rgba(196, 167, 255, 0.9)' }} />
                        </div>
                        <div>
                          <div className="font-bold" style={{ color: 'white' }}>{item.title}</div>
                          <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{item.level} · {item.duration_minutes} mins</div>
                        </div>
                      </div>
                      <div className="text-sm mt-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{item.description}</div>
                      <div className="mt-3 text-sm font-semibold" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>RM {Number(item.price).toFixed(2)}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Slots card */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
                  <h2 className="text-xl font-bold" style={{ color: 'white' }}>Upcoming Slots</h2>
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
                            }
                          }}
                          className="rounded-2xl p-4 text-left transition"
                          style={{
                            background: selectedSlotId === slot.id
                              ? 'rgba(139, 92, 246, 0.15)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: selectedSlotId === slot.id
                              ? '1px solid rgba(139, 92, 246, 0.4)'
                              : '1px solid rgba(255, 255, 255, 0.06)',
                            opacity: isFull ? 0.6 : 1,
                            cursor: isFull ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{formatDate(slot.start_time)}</div>
                              <div className="text-lg font-semibold" style={{ color: 'white' }}>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</div>
                            </div>
                            <div className="text-xs flex items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                              <MapPin className="w-4 h-4" />
                              {slot.location || 'Online'}
                            </div>
                          </div>
                          <div className="mt-3 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{spotsLeft} seats left</div>
                          {isFull && (
                            <div className="mt-2 text-xs" style={{ color: 'rgba(255, 100, 100, 0.8)' }}>Slot full</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No slots available yet.</div>
                )}
              </div>

              {/* Confirm Booking card */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" style={{ color: 'rgba(168, 130, 255, 0.9)' }} />
                  <h2 className="text-xl font-bold" style={{ color: 'white' }}>Confirm Booking</h2>
                </div>

                {!showPayment ? (
                  <div className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Pick a slot to continue.</div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className="rounded-xl px-4 py-3 text-left text-sm transition-all"
                          style={{
                            background: selectedMethod === method.id
                              ? 'rgba(139, 92, 246, 0.15)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: selectedMethod === method.id
                              ? '1px solid rgba(139, 92, 246, 0.4)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'white',
                          }}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        placeholder="Parent email (for receipt)"
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'white',
                        }}
                      />
                      <input
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                        placeholder="Parent phone (optional)"
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'white',
                        }}
                      />
                    </div>

                    {message && (
                      <div className={`flex items-start gap-2 text-sm ${message.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span>{message.text}</span>
                      </div>
                    )}

                    <button
                      onClick={handleBookSlot}
                      disabled={!selectedSlotId || bookingLoading}
                      className="w-full rounded-2xl py-3 font-bold disabled:opacity-60"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                        color: 'white',
                      }}
                    >
                      {bookingLoading
                        ? 'Processing...'
                        : selectedMethod === 'pay_later'
                          ? 'Reserve Seat (Pay Later)'
                          : 'Book & Pay Now'}
                    </button>
                  </div>
                )}
              </div>

              {/* My RSVPs card */}
              <div
                className="rounded-3xl p-6"
                style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" style={{ color: 'rgba(250, 204, 21, 0.9)' }} />
                  <h2 className="text-xl font-bold" style={{ color: 'white' }}>My RSVPs</h2>
                </div>
                {myBookings.length ? (
                  <div className="mt-4 space-y-3">
                    {myBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl p-4"
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold" style={{ color: 'white' }}>{booking.slot?.course?.title || 'Class Booking'}</div>
                            {booking.slot?.start_time && (
                              <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                {formatDate(booking.slot.start_time)} · {formatTime(booking.slot.start_time)}
                              </div>
                            )}
                          </div>
                          <div className={`text-xs px-3 py-1 rounded-full ${
                            booking.payment_status === 'completed'
                              ? 'bg-green-500/20 text-green-300'
                              : booking.payment_status === 'pay_later'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {booking.payment_status === 'completed'
                              ? 'Confirmed'
                              : booking.payment_status === 'pay_later'
                                ? 'Pay Later'
                                : 'Pending'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No bookings yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ClassBookingPage;
