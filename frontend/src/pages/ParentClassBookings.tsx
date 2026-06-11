import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { parentClassesApi, AIpreneurClassBooking } from '../services/aipreneurApi';

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const getQrUrl = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&bgcolor=0a0a10&color=ffffff&format=png`;

const statusBadge = (booking: AIpreneurClassBooking) => {
  if (booking.checked_in_at) {
    return { label: 'Checked In', classes: 'bg-emerald-500/20 text-emerald-300' };
  }
  if (booking.payment_status === 'completed') {
    return { label: 'Confirmed', classes: 'bg-green-500/20 text-green-300' };
  }
  if (booking.payment_status === 'pay_later') {
    return { label: 'Pay at Workshop', classes: 'bg-blue-500/20 text-blue-300' };
  }
  if (booking.payment_status === 'failed' || booking.status === 'failed') {
    return { label: 'Failed', classes: 'bg-red-500/20 text-red-300' };
  }
  return { label: 'Pending', classes: 'bg-yellow-500/20 text-yellow-300' };
};

export const ParentClassBookings = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<AIpreneurClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<AIpreneurClassBooking | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const response = await parentClassesApi.getBookings();
        if (response.success) {
          setBookings(response.bookings || []);
        }
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a1a', color: '#fff' }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <TopNav userName={currentUser?.name || 'Parent'} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pt-20 md:pt-24 relative" style={{ zIndex: 1 }}>
        <button
          onClick={() => navigate('/p/dashboard')}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'rgba(103, 232, 249, 0.8)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(103, 232, 249, 1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(103, 232, 249, 0.8)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parent Dashboard
        </button>

        <div className="rounded-3xl p-5 sm:p-8" style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.15))',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: '#fff' }}>Workshop RSVPs</h1>
              <p className="mt-2 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>Track your kids' class bookings. Tap a booking to view QR code.</p>
            </div>
            <button
              onClick={() => navigate('/p/book-class')}
              className="w-full sm:w-auto px-5 py-2.5 font-bold rounded-xl shadow-lg whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                color: '#fff',
              }}
            >
              Book a Class
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-10" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading bookings...</div>
        ) : (
          <div className="mt-8 space-y-4">
            {bookings.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <div className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>No bookings yet</div>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Book a class to get started!</p>
              </div>
            )}
            {bookings.map((booking) => {
              const badge = statusBadge(booking);
              return (
                <motion.button
                  key={booking.id}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full text-left rounded-2xl p-5 transition-colors"
                  style={{
                    background: 'rgba(15, 15, 30, 0.5)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold truncate" style={{ color: '#fff' }}>
                        {booking.slot?.course?.title || 'Class Booking'}
                      </div>
                      {booking.slot?.start_time && (
                        <div className="text-sm flex items-center gap-2 mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          {formatDate(booking.slot.start_time)} · {formatTime(booking.slot.start_time)}
                        </div>
                      )}
                      {booking.student && (
                        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Student: {booking.student.first_name || booking.student.genius_name || booking.customer_name}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${badge.classes}`}>
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs max-w-[120px] sm:max-w-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-mono truncate">{booking.order_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>RM {Number(booking.amount).toFixed(2)}</span>
                    {booking.checked_in_at && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Checked in
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Detail Modal with QR Code */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setSelectedBooking(null)}
            />
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              style={{
                background: 'rgba(15, 15, 30, 0.85)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-6 pt-6 pb-2">
                <h2 className="text-xl font-black" style={{ color: '#fff' }}>
                  {selectedBooking.slot?.course?.title || 'Booking Details'}
                </h2>
                {selectedBooking.slot?.start_time && (
                  <div className="text-sm flex items-center gap-2 mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedBooking.slot.start_time)}
                    <Clock className="w-4 h-4 ml-2" />
                    {formatTime(selectedBooking.slot.start_time)}
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Status */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const badge = statusBadge(selectedBooking);
                    return (
                      <span className={`text-sm px-4 py-1.5 rounded-full font-bold ${badge.classes}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    RM {Number(selectedBooking.amount).toFixed(2)}
                  </span>
                </div>

                {/* Info grid */}
                <div className="rounded-2xl p-4 text-sm space-y-2" style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {selectedBooking.student && (
                    <div className="flex justify-between gap-3">
                      <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>Student</span>
                      <span className="font-semibold text-right truncate min-w-0" style={{ color: '#fff' }}>
                        {selectedBooking.student.first_name || selectedBooking.student.genius_name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>Payment</span>
                    <span className="font-semibold capitalize text-right truncate min-w-0" style={{ color: '#fff' }}>{selectedBooking.payment_method?.replace('_', ' ') || '-'}</span>
                  </div>
                  {selectedBooking.checked_in_at && (
                    <div className="flex justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Checked In</span>
                      <span className="font-semibold text-emerald-400">
                        {new Date(selectedBooking.checked_in_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* QR Code + Booking Number */}
                <div className="text-center space-y-3">
                  <div className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Booking Number
                  </div>
                  <div className="flex items-center justify-center gap-2 min-w-0">
                    <code className="text-base font-mono font-bold text-cyan-300 px-4 py-2 rounded-xl truncate min-w-0" style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.15)' }}>
                      {selectedBooking.order_id}
                    </code>
                    <button
                      onClick={() => handleCopy(selectedBooking.order_id)}
                      className="p-2 rounded-lg transition-colors flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      )}
                    </button>
                  </div>

                  <div className="py-2">
                    <div className="w-44 h-44 mx-auto rounded-2xl overflow-hidden bg-white p-2" style={{ border: '2px solid rgba(255,255,255,0.08)' }}>
                      <img
                        src={getQrUrl(selectedBooking.order_id)}
                        alt="Booking QR Code"
                        className="w-full h-full"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Show this during workshop check-in</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentClassBookings;
