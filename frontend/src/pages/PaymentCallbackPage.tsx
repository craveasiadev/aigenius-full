/**
 * PaymentCallbackPage
 *
 * Handles the return redirect from Fiuu payment gateway.
 * Displays payment status and redirects user appropriately.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Sparkles, Coins } from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

type PaymentStatus = 'loading' | 'success' | 'failed';

export const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useGeniusAuth();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('Processing your payment...');

  // Get query params from Fiuu redirect
  const orderId = searchParams.get('order_id');
  const paymentStatus = searchParams.get('status');
  const amount = searchParams.get('amount');
  const tranId = searchParams.get('tran_id');
  const source = searchParams.get('source');
  const isParentFlow = source === 'parent';
  const isClassFlow = source === 'class';

  useEffect(() => {
    const processPaymentResult = async () => {
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (paymentStatus === 'success') {
        setStatus('success');
        setMessage(isClassFlow ? 'Booking confirmed! Your seat is secured.' : 'Payment successful! Coins have been added.');

        // Refresh the user's profile to get updated balances (skip for parent flow)
        if (!isParentFlow && !isClassFlow) {
          try {
            await refreshProfile();
          } catch (error) {
            console.error('Failed to refresh profile:', error);
          }
        }
      } else {
        setStatus('failed');
        setMessage('Payment was not completed. Please try again.');
      }
    };

    processPaymentResult();
  }, [paymentStatus, refreshProfile, isParentFlow]);

  const handleGoBack = () => {
    if (isParentFlow) {
      navigate('/p/dashboard');
      return;
    }
    if (isClassFlow) {
      navigate('/s/classes');
      return;
    }
    navigate('/s/aipreneur/ai-tokens');
  };

  const handleGoToDashboard = () => {
    if (isParentFlow) {
      navigate('/p/dashboard');
      return;
    }
    if (isClassFlow) {
      navigate('/s/classes');
      return;
    }
    navigate('/s/aipreneur');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="rounded-2xl overflow-hidden p-8 text-center" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)' }}>
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
              >
                <Loader2 className="w-10 h-10" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6))', boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
            )}

            {status === 'failed' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(225, 29, 72, 0.6))', boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)' }}
              >
                <XCircle className="w-10 h-10 text-white" />
              </motion.div>
            )}
          </div>

          {/* Title */}
          <h1 className={`text-2xl font-bold mb-2 ${
            status === 'success' ? 'text-green-400' :
            status === 'failed' ? 'text-red-400' :
            'text-white'
          }`}>
            {status === 'loading' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </h1>

          {/* Message */}
          <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{message}</p>

          {/* Transaction Details */}
          {orderId && status !== 'loading' && (
            <div className="rounded-xl p-4 mb-6 text-left" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Order ID</span>
                <span className="text-white font-mono text-sm">{orderId}</span>
              </div>
              {amount && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Amount</span>
                  <span className="text-white font-bold">RM {parseFloat(amount).toFixed(2)}</span>
                </div>
              )}
              {tranId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Transaction ID</span>
                  <span className="text-white font-mono text-sm">{tranId}</span>
                </div>
              )}
            </div>
          )}

          {/* Success Animation */}
          {status === 'success' && !isClassFlow && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <Sparkles className="w-5 h-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                <span className="font-bold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>Coins Added</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold">Balance Updated</span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {status !== 'loading' && (
            <div className="flex gap-3">
              {status === 'failed' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoBack}
                  className="flex-1 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-colors"
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  Try Again
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToDashboard}
                className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={
                  status === 'success'
                    ? { background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.6))', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }
                    : { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                }
              >
                Go to Dashboard
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCallbackPage;
