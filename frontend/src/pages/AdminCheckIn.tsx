import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  X,
  QrCode,
  ScanLine,
  Camera,
  CameraOff,
  RotateCcw,
  Search,
  Clock,
  User,
  Calendar,
  CreditCard,
  Ban,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminAcademyApi, AIpreneurClassBooking } from '../services/aipreneurApi';

interface CheckInRecord {
  id: string;
  order_id: string;
  customer_name: string;
  class_title: string;
  time: string;
  success: boolean;
}

export default function AdminCheckIn() {
  const [manualInput, setManualInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Found booking (from search/scan)
  const [foundBooking, setFoundBooking] = useState<AIpreneurClassBooking | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Check-in result (after pressing check-in button)
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([]);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'qr-reader';
  const lastScannedRef = useRef<string>('');
  const cooldownRef = useRef(false);

  // Step 1: Search / Lookup booking
  const doLookup = useCallback(async (orderId: string) => {
    const trimmed = orderId.trim();
    if (!trimmed) return;
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 2000);

    setSearching(true);
    setFoundBooking(null);
    setSearchError(null);
    setCheckInResult(null);

    try {
      const response = await adminAcademyApi.lookupBooking(trimmed);
      if (response.success && response.booking) {
        setFoundBooking(response.booking);
        setManualInput(trimmed);
      } else {
        setSearchError(response.message || 'Booking not found.');
      }
    } catch (error: any) {
      setSearchError(error?.data?.message || error?.message || 'Booking not found.');
    } finally {
      setSearching(false);
    }
  }, []);

  // Step 2: Confirm check-in
  const doCheckIn = useCallback(async () => {
    if (!foundBooking) return;
    setCheckingIn(true);
    setCheckInResult(null);

    try {
      const response = await adminAcademyApi.checkInBooking(foundBooking.order_id);
      setCheckInResult({
        success: response.success,
        message: response.message || 'Check-in successful!',
      });

      if (response.success) {
        // Update local booking state to reflect check-in
        setFoundBooking(response.booking || { ...foundBooking, checked_in_at: new Date().toISOString() });
        setManualInput('');

        setRecentCheckIns((prev) => [
          {
            id: Date.now().toString(),
            order_id: foundBooking.order_id,
            customer_name: foundBooking.customer_name || 'Unknown',
            class_title: foundBooking.slot?.course?.title || 'Class',
            time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
            success: true,
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (error: any) {
      const msg = error?.data?.message || error?.message || 'Check-in failed.';
      setCheckInResult({ success: false, message: msg });
    } finally {
      setCheckingIn(false);
    }
  }, [foundBooking]);

  // Clear / reset
  const clearSearch = () => {
    setFoundBooking(null);
    setSearchError(null);
    setCheckInResult(null);
    setManualInput('');
    lastScannedRef.current = '';
  };

  // Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText: string) => {
          if (decodedText !== lastScannedRef.current || !cooldownRef.current) {
            lastScannedRef.current = decodedText;
            doLookup(decodedText);
          }
        },
        () => { /* no QR in frame */ }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access.'
          : 'Could not access camera. Make sure your device has a camera.'
      );
      setCameraActive(false);
    }
  }, [doLookup]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setCameraActive(false);
    lastScannedRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Payment status helpers
  const canCheckIn = foundBooking &&
    !foundBooking.checked_in_at &&
    (foundBooking.payment_status === 'completed' || foundBooking.payment_status === 'pay_later');

  const paymentStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return { text: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' };
      case 'pay_later': return { text: 'Pay at Workshop', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' };
      case 'failed': return { text: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' };
      default: return { text: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' };
    }
  };

  const glassCard = {
    background: 'rgba(15, 15, 30, 0.5)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  const glassInner = {
    background: 'rgba(255, 255, 255, 0.04)',
  };

  const glassInput = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'white',
  };

  return (
    <AdminLayout>
      <div className="space-y-6 font-sans max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'white' }}>
            <ScanLine className="w-8 h-8" style={{ color: 'rgb(34, 197, 94)' }} />
            Workshop Check-in
          </h1>
          <p className="mt-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Scan a QR code or enter a booking number to find and check in students.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Scanner + Manual Input + Booking Card */}
          <div className="space-y-4">
            {/* Camera Scanner */}
            <div className="rounded-3xl overflow-hidden" style={glassCard}>
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  <h2 className="font-bold" style={{ color: 'white' }}>QR Scanner</h2>
                </div>
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                  style={cameraActive
                    ? { background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(248, 113, 113)', border: '1px solid rgba(239, 68, 68, 0.2)' }
                    : { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }
                  }
                >
                  {cameraActive ? (
                    <><CameraOff className="w-4 h-4" /> Stop</>
                  ) : (
                    <><Camera className="w-4 h-4" /> Start Camera</>
                  )}
                </button>
              </div>

              <div className="relative">
                <div
                  id={scannerContainerId}
                  className={`w-full ${cameraActive ? 'min-h-[300px]' : 'h-0 overflow-hidden'}`}
                />

                {!cameraActive && !cameraError && (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                      <QrCode className="w-10 h-10" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Click "Start Camera" to scan booking QR codes
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                      Point the camera at the QR code shown on the parent's phone
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <AlertTriangle className="w-10 h-10 mb-3" style={{ color: 'rgb(248, 113, 113)' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgb(248, 113, 113)' }}>{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 text-sm font-bold flex items-center gap-1 hover:underline"
                      style={{ color: 'rgb(139, 92, 246)' }}
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Input */}
            <div className="p-5 rounded-3xl" style={glassCard}>
              <div className="flex items-center gap-3 mb-3">
                <Search className="w-5 h-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                <h2 className="font-bold text-sm" style={{ color: 'white' }}>Search Booking</h2>
              </div>
              <div className="flex gap-3">
                <input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doLookup(manualInput);
                  }}
                  placeholder="Enter booking number..."
                  className="flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-mono placeholder:font-sans"
                  style={glassInput}
                />
                <button
                  onClick={() => doLookup(manualInput)}
                  disabled={searching || !manualInput.trim()}
                  className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                >
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </button>
              </div>
            </div>

            {/* Search Error */}
            <AnimatePresence>
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(239, 68, 68)' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgb(248, 113, 113)' }}>{searchError}</span>
                  <button onClick={clearSearch} className="ml-auto" style={{ color: 'rgba(248, 113, 113, 0.6)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Found Booking Card */}
            <AnimatePresence>
              {foundBooking && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="rounded-3xl overflow-hidden"
                  style={glassCard}
                >
                  {/* Booking Header */}
                  <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h3 className="font-bold" style={{ color: 'white' }}>Booking Found</h3>
                    <button onClick={clearSearch} style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Order ID */}
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(139, 92, 246)' }} />
                      <code className="text-sm font-mono font-bold px-3 py-1.5 rounded-lg" style={{ color: 'rgb(167, 139, 250)', background: 'rgba(139, 92, 246, 0.1)' }}>
                        {foundBooking.order_id}
                      </code>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={glassInner}>
                        <User className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Student</div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: 'white' }}>
                            {foundBooking.customer_name || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={glassInner}>
                        <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Class</div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: 'white' }}>
                            {foundBooking.slot?.course?.title || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={glassInner}>
                        <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Slot</div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: 'white' }}>
                            {foundBooking.slot?.start_time
                              ? new Date(foundBooking.slot.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={glassInner}>
                        <CreditCard className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Payment</div>
                          <div className="mt-0.5">
                            {(() => {
                              const ps = paymentStatusLabel(foundBooking.payment_status);
                              return (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${ps.color}`}>
                                  {ps.text}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-center text-lg font-bold" style={{ color: 'white' }}>
                      RM {Number(foundBooking.amount).toFixed(2)}
                    </div>

                    {/* Already Checked In */}
                    {foundBooking.checked_in_at && (
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(74, 222, 128)' }} />
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'rgb(74, 222, 128)' }}>Already Checked In</div>
                          <div className="text-xs" style={{ color: 'rgba(34, 197, 94, 0.7)' }}>
                            {new Date(foundBooking.checked_in_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment pending warning */}
                    {!foundBooking.checked_in_at && foundBooking.payment_status !== 'completed' && foundBooking.payment_status !== 'pay_later' && (
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                        <Ban className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(250, 204, 21)' }} />
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'rgb(250, 204, 21)' }}>Cannot Check In</div>
                          <div className="text-xs" style={{ color: 'rgba(234, 179, 8, 0.7)' }}>
                            Payment is {foundBooking.payment_status}. Only paid or pay-later bookings can be checked in.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Check-in Result */}
                    <AnimatePresence>
                      {checkInResult && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={checkInResult.success
                            ? { background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }
                            : { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }
                          }
                        >
                          {checkInResult.success ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(74, 222, 128)' }} />
                          ) : (
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(248, 113, 113)' }} />
                          )}
                          <span className="text-sm font-bold" style={{ color: checkInResult.success ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)' }}>
                            {checkInResult.message}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Check-in Button */}
                    {!foundBooking.checked_in_at && (
                      <button
                        onClick={doCheckIn}
                        disabled={!canCheckIn || checkingIn}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                      >
                        {checkingIn ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : canCheckIn ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Confirm Check-in
                          </>
                        ) : (
                          <>
                            <Ban className="w-5 h-5" />
                            Cannot Check In
                          </>
                        )}
                      </button>
                    )}

                    {/* Search Another */}
                    {foundBooking.checked_in_at && (
                      <button
                        onClick={clearSearch}
                        className="w-full py-3 rounded-2xl font-bold text-sm transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)' }}
                      >
                        Search Another Booking
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Recent Check-ins */}
          <div className="rounded-3xl overflow-hidden" style={glassCard}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'white' }}>
                <CheckCircle className="w-5 h-5" style={{ color: 'rgb(34, 197, 94)' }} />
                Recent Check-ins
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                {recentCheckIns.filter((r) => r.success).length} successful this session
              </p>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {recentCheckIns.length === 0 ? (
                <div className="py-16 text-center" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                  <ScanLine className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">No check-ins yet</p>
                  <p className="text-xs mt-1">Scan a QR code or enter a booking number</p>
                </div>
              ) : (
                <div>
                  {recentCheckIns.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={record.success
                          ? { background: 'rgba(34, 197, 94, 0.15)' }
                          : { background: 'rgba(239, 68, 68, 0.15)' }
                        }
                      >
                        {record.success ? (
                          <CheckCircle className="w-4 h-4" style={{ color: 'rgb(74, 222, 128)' }} />
                        ) : (
                          <X className="w-4 h-4" style={{ color: 'rgb(248, 113, 113)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: 'white' }}>
                          {record.customer_name}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {record.class_title} · {record.order_id}
                        </div>
                      </div>
                      <div className="text-xs flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                        {record.time}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
