/**
 * AI Tokens top-up page — AIpreneur design language.
 *
 * Real backend data only (no dummy). Shows the student's:
 *   • Current AI token balance (header card)
 *   • Available token packages (cards, real packages from API)
 *   • What you can unlock (per-action token costs from API/local fallback)
 *   • Purchase modal with payment-method picker
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background). No
 * gradient surfaces, no coloured glow shadows.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  Check, X, CreditCard, ChevronRight, Sparkles, Gem, Crown, Zap, ArrowLeft,
  Sun, Moon, Star, Image as ImageIcon, Store, Megaphone, Wand2, Loader2,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { useTheme } from '../contexts/ThemeContext';
import {
  paymentApi,
  AI_TOKEN_PACKAGES,
  PAYMENT_METHODS,
  PaymentPackage,
} from '../services/paymentApi';
import { BottomNav } from '../components/BottomNav';
import { COIN_COSTS } from '../constants/coinCosts';
import {
  GLASS, GLASS_HOVER, ICON_TILE, ICON_TILE_SM,
  BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

const PAYMENT_TEST_MODE = false;
const TEST_PRICE = 1.0;

export const AITokensPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const { rewards, isLoading: dataLoading } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();

  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PaymentPackage[]>(AI_TOKEN_PACKAGES);
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({ ...COIN_COSTS });

  const isLoading = authLoading || dataLoading;
  const currentTokens = rewards?.ai_tokens || 0;

  const handleBack = () => smartBack();

  // Load remote pricing catalog (falls back to local defaults).
  useEffect(() => {
    let cancelled = false;
    const loadPricingCatalog = async () => {
      try {
        const [remotePackages, remoteTokenCosts] = await Promise.all([
          paymentApi.getTokenPackages(),
          paymentApi.getTokenCosts(),
        ]);
        if (cancelled) return;
        if (remotePackages.length > 0) setPackages(remotePackages);
        if (remoteTokenCosts && Object.keys(remoteTokenCosts).length > 0) {
          setTokenCosts((prev) => ({ ...prev, ...remoteTokenCosts }));
        }
      } catch (e) {
        console.warn('[AITokensPage] Failed to load dynamic pricing catalog.', e);
      }
    };
    void loadPricingCatalog();
    return () => { cancelled = true; };
  }, []);

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
    if (!selectedPackage || !selectedPaymentMethod || !geniusProfile) {
      setError('Please select a payment method');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const orderId = paymentApi.generateOrderId();
      const paymentAmount = PAYMENT_TEST_MODE ? TEST_PRICE : selectedPackage.price;
      const paymentData = {
        customer_id: geniusProfile.id,
        product_id: selectedPackage.id,
        order_id: orderId,
        amount: paymentAmount,
        payment_method: selectedPaymentMethod,
        customer_name: `${geniusProfile.first_name} ${geniusProfile.last_name || ''}`.trim(),
        customer_email: geniusProfile.email || `${geniusProfile.genius_id}@wonderstar.app`,
        customer_phone: '',
        product_name: `${selectedPackage.name} - ${selectedPackage.amount} AI Tokens`,
        package_type: selectedPackage.type,
        package_amount: selectedPackage.amount + (selectedPackage.bonus || 0),
        genius_profile_id: geniusProfile.id,
      };
      const response = await paymentApi.initiatePayment(paymentData);
      if (response.success && response.data) {
        await paymentApi.submitPaymentForm(
          response.data.payment_url,
          response.data.payment_data,
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

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLoader
        title="Loading token store…"
        hints={['Sorting the packs', 'Counting your tokens', 'Almost ready']}
      />
    );
  }

  // ── Auth gate ───────────────────────────────────────────────────
  if (!geniusProfile) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${GLASS} rounded-3xl px-6 py-8 text-center max-w-sm w-full`}>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
              <Gem className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to top up tokens
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Your token balance and packages live in your account.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base`}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dark = theme === 'dark';

  // What-you-can-unlock action tiles.
  const unlockItems = [
    { icon: ImageIcon, title: 'AI Images',     cost: tokenCosts.product_image ?? COIN_COSTS.product_image,         tone: 'bg-pink-500 border-pink-700' },
    { icon: Store,     title: 'Shop Designs',  cost: tokenCosts.shop_exterior ?? COIN_COSTS.shop_exterior,         tone: 'bg-violet-600 border-violet-800' },
    { icon: Megaphone, title: 'Marketing',     cost: tokenCosts.marketing_asset ?? COIN_COSTS.marketing_asset,     tone: 'bg-blue-500 border-blue-700' },
    { icon: Wand2,     title: 'Product Remix', cost: tokenCosts.product_regenerate ?? COIN_COSTS.product_regenerate, tone: 'bg-amber-500 border-amber-700' },
  ];

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      {/* ── Header (sticky) ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <Gem className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Token Store
          </h1>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark
              ? <Sun className="w-5 h-5 text-amber-300" />
              : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 relative">
        {/* ── Balance card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className={`${GLASS} rounded-3xl p-5 mb-6`}
        >
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-amber-500 border-b-[5px] border-amber-700 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                Current Balance
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight">
                {currentTokens.toLocaleString()}
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                  AI tokens
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-semibold border border-violet-200/70 dark:border-violet-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              Powers AI tools
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/70 dark:border-emerald-400/20">
              <Zap className="w-3.5 h-3.5" />
              Instant delivery
            </span>
          </div>
        </motion.div>

        {/* ── Packages grid ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 26 }}
          className="mb-6"
        >
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white mb-3">
            <Crown className="w-5 h-5 text-amber-500" />
            Choose a package
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg, idx) => {
              const isPopular = !!pkg.popular;
              const isBest = !!pkg.bestValue;
              return (
                <motion.button
                  key={pkg.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`${GLASS} ${GLASS_HOVER} relative rounded-2xl p-4 text-left active:translate-y-[1px] transition-transform`}
                >
                  {(isPopular || isBest) && (
                    <span
                      className={[
                        'absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide border-b-[2px]',
                        isPopular
                          ? 'bg-violet-600 text-white border-violet-800'
                          : 'bg-amber-500 text-white border-amber-700',
                      ].join(' ')}
                    >
                      {isPopular ? 'POPULAR' : 'BEST VALUE'}
                    </span>
                  )}

                  <span
                    className={[
                      'inline-flex items-center justify-center w-11 h-11 rounded-xl border-b-[3px] mb-2',
                      isPopular
                        ? 'bg-violet-600 border-violet-800'
                        : isBest
                          ? 'bg-amber-500 border-amber-700'
                          : 'bg-slate-700 border-slate-900 dark:bg-slate-800 dark:border-slate-950',
                    ].join(' ')}
                  >
                    {isPopular
                      ? <Gem className="w-5 h-5 text-white" />
                      : isBest
                        ? <Crown className="w-5 h-5 text-white" />
                        : <Zap className="w-5 h-5 text-white" />}
                  </span>

                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {pkg.name}
                  </p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight">
                    {pkg.amount.toLocaleString()}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                      tokens
                    </span>
                  </p>

                  {pkg.bonus && pkg.bonus > 0 ? (
                    <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/70 dark:border-emerald-400/20">
                      +{pkg.bonus} FREE
                    </span>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {pkg.originalPrice && (
                      <span className="text-xs line-through text-slate-400 dark:text-slate-500">
                        RM {pkg.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-base font-extrabold text-violet-600 dark:text-violet-300">
                      RM {pkg.price.toFixed(2)}
                    </span>
                    {pkg.originalPrice && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300">
                        {Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ── What you can unlock ──────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 26 }}
          className={`${GLASS} rounded-3xl p-5`}
        >
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white mb-3">
            <Star className="w-5 h-5 text-amber-500" />
            What you can unlock
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {unlockItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 p-3"
                >
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-b-[3px] mb-2 ${item.tone}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.cost} tokens
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>
      </main>

      <BottomNav />

      {/* ── Purchase modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPurchaseModal && selectedPackage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => !processing && setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className={`${GLASS} w-full max-w-md rounded-3xl overflow-y-auto max-h-[90vh] mx-auto`}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-5 text-center border-b border-slate-200/70 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  aria-label="Close"
                  className={`${GLASS} ${GLASS_HOVER} absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center`}
                >
                  <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                </button>

                <span
                  className={[
                    'inline-flex items-center justify-center w-16 h-16 rounded-2xl border-b-[5px] mb-3',
                    selectedPackage.popular
                      ? 'bg-violet-600 border-violet-800'
                      : selectedPackage.bestValue
                        ? 'bg-amber-500 border-amber-700'
                        : 'bg-slate-700 border-slate-900',
                  ].join(' ')}
                >
                  {selectedPackage.popular
                    ? <Gem className="w-7 h-7 text-white" />
                    : selectedPackage.bestValue
                      ? <Crown className="w-7 h-7 text-white" />
                      : <Zap className="w-7 h-7 text-white" />}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedPackage.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedPackage.amount.toLocaleString()} tokens
                  {selectedPackage.bonus ? ` + ${selectedPackage.bonus} bonus` : ''}
                </p>
              </div>

              {/* Price */}
              <div className="px-6 pt-5">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 px-4 py-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    Total
                  </p>
                  {selectedPackage.originalPrice && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-sm line-through text-slate-400 dark:text-slate-500">
                        RM {selectedPackage.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {Math.round((1 - selectedPackage.price / selectedPackage.originalPrice) * 100)}% OFF
                      </span>
                    </div>
                  )}
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    RM {selectedPackage.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="px-6 pt-5 pb-6">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </p>

                {showPaymentMethods ? (
                  <div className="flex flex-col gap-2 mb-4">
                    {PAYMENT_METHODS.map((method) => {
                      const active = selectedPaymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => handleSelectPaymentMethod(method.id)}
                          className={[
                            'w-full px-4 py-3 rounded-2xl border flex items-center gap-3 text-left transition-colors',
                            active
                              ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-400/40'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800',
                          ].join(' ')}
                        >
                          <span className="text-2xl leading-none">{method.icon}</span>
                          <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {method.name}
                          </span>
                          {active && (
                            <span className="w-6 h-6 rounded-full bg-violet-600 border-b-[2px] border-violet-800 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentMethods(true)}
                    className={`${GLASS} ${GLASS_HOVER} w-full px-4 py-3 rounded-2xl flex items-center gap-3 mb-4`}
                  >
                    {selectedPaymentMethod ? (
                      <>
                        <span className="text-2xl leading-none">
                          {PAYMENT_METHODS.find((m) => m.id === selectedPaymentMethod)?.icon}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white text-left">
                          {PAYMENT_METHODS.find((m) => m.id === selectedPaymentMethod)?.name}
                        </span>
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                          Change
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`${ICON_TILE_SM}`}>
                          <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        </span>
                        <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 text-left">
                          Choose a payment method
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </>
                    )}
                  </button>
                )}

                {error && (
                  <div className="mb-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-3 py-2 text-center">
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={processing || !selectedPaymentMethod}
                  className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base`}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Complete Purchase
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-3">
                  Secured by Wonderpay
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AITokensPage;
