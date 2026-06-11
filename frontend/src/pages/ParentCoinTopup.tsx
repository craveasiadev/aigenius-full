/**
 * ParentCoinTopup - Parent tops up AI tokens for a selected kid
 *
 * Dark-themed version of AITokensPage using parent auth.
 * Uses the same Fiuuu payment gateway flow.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, CreditCard, ChevronRight, ArrowLeft, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { TopNav } from '../components/TopNav';
import {
  paymentApi,
  COIN_PACKAGES,
  PAYMENT_METHODS,
  PaymentPackage
} from '../services/paymentApi';

// AI token image mapping
const COIN_IMAGES = {
  small: '/assets/aitokens/stars2.png',
  medium: '/assets/aitokens/stars3.png',
  large: '/assets/aitokens/stars4.png',
  mega: '/assets/aitokens/stars6.png',
};

interface ChildProfile {
  id: string;
  genius_name: string;
  gender: string;
  profile_picture_url: string | null;
}

export const ParentCoinTopup = () => {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const { currentUser } = useAuth();

  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [currentAiTokens, setCurrentAiTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PaymentPackage[]>(COIN_PACKAGES);

  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId || !currentUser) return;
    loadChildData();
  }, [profileId, currentUser]);

  useEffect(() => {
    let cancelled = false;

    const loadPricingCatalog = async () => {
      try {
        const dynamicPackages = await paymentApi.getTokenPackages();
        if (!cancelled && dynamicPackages.length > 0) {
          setPackages(dynamicPackages);
        }
      } catch (error) {
        console.warn('[ParentCoinTopup] Failed to load dynamic token packages.', error);
      }
    };

    void loadPricingCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadChildData = async () => {
    if (!profileId) return;
    try {
      // Fetch child profile
      const profileRes = await api.get<{ success: boolean; profile: ChildProfile }>(
        `/aipreneur/profiles/${profileId}`
      );
      if (profileRes.success && profileRes.profile) {
        setChildProfile(profileRes.profile);
      }

      // Fetch AI token balance
      const balRes = await api.get<{ success: boolean; data?: { ai_tokens: number; coins: number } }>(
        `/aigenius/payments/balance?student_id=${profileId}`
      );
      setCurrentAiTokens(balRes.data?.ai_tokens ?? 0);
    } catch (err) {
      console.error('Failed to load child data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
    setSelectedPaymentMethod(null);
    setShowPurchaseModal(true);
    setShowPaymentMethods(false);
    setError(null);
  };

  const handleSelectPaymentMethod = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setShowPaymentMethods(false);
  };

  const handleProceedToPayment = async () => {
    if (!selectedPackage || !selectedPaymentMethod || !profileId || !currentUser) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const orderId = paymentApi.generateOrderId();
      // Append source=parent so callback page knows to redirect back to parent dashboard
      const frontendUrl = `${window.location.origin}?source=parent`;

      const paymentData = {
        student_id: profileId,
        order_id: orderId,
        amount: selectedPackage.price,
        payment_method: selectedPaymentMethod,
        product_id: selectedPackage.id,
        package_type: 'ai_tokens' as const,
        package_name: `${selectedPackage.name} - ${selectedPackage.amount} AI Tokens`,
        package_amount: selectedPackage.amount + (selectedPackage.bonus || 0),
        customer_name: currentUser.name || 'Parent',
        customer_email: currentUser.email || 'parent@wonderstar.app',
        customer_phone: '0123456789',
        frontend_url: frontendUrl,
      };

      const response = await api.post<{
        success: boolean;
        data?: { payment_url: string; payment_data: Record<string, string>; order_id: string };
        error?: string;
      }>('/aigenius/payments/initiate', paymentData);

      if (response.success && response.data) {
        await paymentApi.submitPaymentForm(
          response.data.payment_url,
          response.data.payment_data
        );
      } else {
        setError(response.error || 'Failed to initiate payment');
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-28" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <TopNav userName={currentUser?.name || 'Parent'} />

      <main className="max-w-lg mx-auto px-4 pt-20 md:pt-24 relative" style={{ zIndex: 1 }}>
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/p/dashboard')}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </motion.button>

        {/* Child Info + Balance */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl p-5 mb-6"
          style={{
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 flex-shrink-0">
              {childProfile?.profile_picture_url ? (
                <img src={childProfile.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {childProfile?.gender === 'female' ? '👧' : '👦'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate" style={{ color: '#fff' }}>
                Top Up for {childProfile?.genius_name || 'Kid'}
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Add AI tokens to their account</p>
            </div>
          </div>

          {/* Current Balance */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Current Balance</span>
              </div>
                <span className="text-2xl font-bold text-amber-400">{currentAiTokens.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* AI Token Packages */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#fff' }}>
            <span>✨</span> Select an AI Token Pack
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg, index) => (
              <motion.button
                key={pkg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPackage(pkg)}
                className="relative overflow-hidden rounded-xl p-4 text-left shadow-lg"
                style={{
                  background: pkg.popular
                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))'
                    : pkg.bestValue
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))'
                      : 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: pkg.popular
                    ? '1px solid rgba(168, 85, 247, 0.3)'
                    : pkg.bestValue
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {(pkg.popular || pkg.bestValue) && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold" style={{
                    background: pkg.popular ? 'rgba(168, 85, 247, 0.8)' : 'rgba(245, 158, 11, 0.8)',
                    color: '#fff',
                  }}>
                    {pkg.popular ? '🔥 HOT' : '👑 BEST'}
                  </div>
                )}

                <div className="w-16 h-16 mb-2 mx-auto">
                  <img
                    src={index === 0 ? COIN_IMAGES.small : index === 1 ? COIN_IMAGES.medium : index === 2 ? COIN_IMAGES.large : COIN_IMAGES.mega}
                    alt={pkg.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <h4 className="font-bold text-sm mb-1 truncate" style={{ color: '#fff' }}>{pkg.name}</h4>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-lg font-bold" style={{ color: '#fff' }}>{pkg.amount.toLocaleString()}</span>
                  <span className="text-sm">🪙</span>
                  {pkg.bonus && pkg.bonus > 0 && (
                    <span className="text-green-400 text-xs font-bold">+{pkg.bonus}</span>
                  )}
                </div>
                {pkg.originalPrice && (
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      RM {pkg.originalPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                      {Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF
                    </span>
                  </div>
                )}
                <div className="py-1.5 px-3 rounded-lg text-center font-bold text-sm" style={{
                  background: pkg.bestValue
                    ? 'rgba(245, 158, 11, 0.7)'
                    : pkg.popular
                      ? 'rgba(168, 85, 247, 0.7)'
                      : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                }}>
                  RM {pkg.price.toFixed(2)}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchaseModal && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => !processing && setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-sm max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{
                background: 'rgba(15, 15, 30, 0.8)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                {/* Header */}
                <div className="relative p-6 text-center">
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <X className="w-5 h-5" style={{ color: '#fff' }} />
                  </button>

                  <span className="text-5xl block mb-3">
                    {selectedPackage.bestValue ? '👑' : selectedPackage.popular ? '⭐' : '🎁'}
                  </span>
                  <h3 className="text-xl font-bold mb-1 px-8 truncate" style={{ color: '#fff' }}>{selectedPackage.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    for {childProfile?.genius_name || 'your kid'}
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {selectedPackage.amount.toLocaleString()} 🪙
                    {selectedPackage.bonus ? ` + ${selectedPackage.bonus} bonus` : ''}
                  </p>
                </div>

                {/* Price */}
                <div className="px-5 pb-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Price</span>
                    {selectedPackage.originalPrice && (
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-sm line-through" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          RM {selectedPackage.originalPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                          {Math.round((1 - selectedPackage.price / selectedPackage.originalPrice) * 100)}% OFF
                        </span>
                      </div>
                    )}
                    <div className="text-3xl font-bold" style={{ color: '#fff' }}>RM {selectedPackage.price.toFixed(2)}</div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="px-5 pb-5">
                  <p className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#fff' }}>
                    <CreditCard className="w-4 h-4" />
                    Payment Method
                  </p>

                  {showPaymentMethods ? (
                    <div className="space-y-2 mb-4">
                      {PAYMENT_METHODS.map((method) => (
                        <motion.button
                          key={method.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectPaymentMethod(method.id)}
                          className="w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all"
                          style={{
                            background: selectedPaymentMethod === method.id ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)',
                            border: selectedPaymentMethod === method.id ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <span className="text-2xl flex-shrink-0">{method.icon}</span>
                          <span className="font-medium text-sm flex-1 min-w-0 truncate" style={{ color: '#fff' }}>{method.name}</span>
                          {selectedPaymentMethod === method.id && (
                            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPaymentMethods(true)}
                      className="w-full p-3 rounded-xl flex items-center gap-3 transition-all mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {selectedPaymentMethod ? (
                        <>
                          <span className="text-2xl flex-shrink-0">
                            {PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod)?.icon}
                          </span>
                          <span className="font-medium text-sm flex-1 min-w-0 truncate" style={{ color: '#fff' }}>
                            {PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod)?.name}
                          </span>
                          <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>Change</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl flex-shrink-0">💳</span>
                          <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>Choose payment method</span>
                          <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </>
                      )}
                    </motion.button>
                  )}

                  {error && (
                    <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                      <p className="text-red-300 text-sm text-center">{error}</p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleProceedToPayment}
                    disabled={processing || !selectedPaymentMethod}
                    className="w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                      color: '#fff',
                    }}
                  >
                    {processing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay Now</>
                    )}
                  </motion.button>

                  <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    🔒 Secure Payment via Fiuuu
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Processing Overlay */}
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: '#0a0a1a' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <Coins className="w-10 h-10 text-amber-400" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Processing...</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Redirecting to payment gateway</p>
            <div className="mt-6 w-40 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-full w-1/2 bg-amber-500 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentCoinTopup;
