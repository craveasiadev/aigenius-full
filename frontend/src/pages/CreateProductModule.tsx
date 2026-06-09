/**
 * Create Product module — AIpreneur design language.
 *
 * Real backend (productsApi / businessApi / paymentApi). The "game" is the
 * actual learning experience: pick a real-world product → choose a pricing
 * + positioning strategy → see the trade-off it creates → set a charity %
 * → launch.
 *
 * Educational content baked into the flow:
 *   • Step 1 — Lesson card: "Every great product starts as an idea."
 *   • Step 2 — Strategy cards show their real trade-off (price ↑ vs reach)
 *     and explain WHY in one line. Selecting a strategy reveals a short
 *     "What this means" tip.
 *   • Step 3 — While AI image generates, show a takeaway based on the
 *     student's chosen strategy.
 *   • Step 4 — Pricing slider explains supply/demand intuition; charity
 *     slider links donating with brand loyalty.
 *
 * Visuals follow shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  CheckCircle, Loader2, RefreshCw, ImageIcon, Plus, Package, Trash2, Tag,
  Maximize2, Camera, Rocket, Upload, Sparkles, X, ArrowLeft,
  TrendingUp, Heart, FlipHorizontal, RotateCcw, Sun, Moon, Lightbulb, Zap,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ModulePage } from '../components/modules/ModulePage';
import { ModuleHero3D } from '../components/modules/ModuleHero3D';
import { KidStat } from '../components/modules/KidStat';
import { productsApi, businessApi, type AIpreneurProduct } from '../services/aipreneurApi';
import { Confetti } from '../components/Confetti';
import { ApiError, getAssetUrl } from '../lib/api';
import { COIN_COSTS } from '../constants/coinCosts';
import { paymentApi } from '../services/paymentApi';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, FIELD, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

const getProductImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  if (imageUrl.includes('/storage/products/')) {
    const filename = imageUrl.split('/storage/products/').pop();
    if (filename) return getAssetUrl(`/aipreneur/product-image/${filename}`);
  }
  return imageUrl;
};

type Step = 1 | 2 | 3 | 4;
type PositioningStrategy = 'premium' | 'volume' | 'marketing' | 'eco' | 'limited' | 'creative' | 'tech' | 'cause';

interface StrategyConfig {
  id: PositioningStrategy;
  label: string;
  short: string;
  why: string;       // 1-line "why this works" lesson
  tradeoff: string;  // honest trade-off lesson
  priceMultiplier: number;
  popularityMultiplier: number;
  tone: string;      // tile colour
}

const strategies: StrategyConfig[] = [
  { id: 'premium',   label: 'Premium',        short: 'High quality & higher price', why: 'Premium buyers pay more for quality + status.',         tradeoff: 'Fewer buyers, but each sale earns more.',     priceMultiplier: 2.5, popularityMultiplier: 0.6, tone: 'bg-violet-600 border-violet-800' },
  { id: 'volume',    label: 'Value',          short: 'Lower price, more buyers',     why: 'Low price means almost anyone can afford it.',          tradeoff: 'Many sales, but small profit per item.',      priceMultiplier: 0.5, popularityMultiplier: 2.0, tone: 'bg-emerald-500 border-emerald-700' },
  { id: 'marketing', label: 'Hype',           short: 'Famous for being talked about', why: 'Hype creates demand before anyone tries it.',           tradeoff: 'Needs constant marketing to keep buzz alive.', priceMultiplier: 1.2, popularityMultiplier: 1.5, tone: 'bg-rose-500 border-rose-700' },
  { id: 'eco',       label: 'Eco & Healthy',  short: 'Good for people and planet',   why: 'Mindful customers happily pay more for ethical goods.', tradeoff: 'Costs more to make than regular products.',   priceMultiplier: 1.5, popularityMultiplier: 1.2, tone: 'bg-lime-500 border-lime-700' },
  { id: 'limited',   label: 'Limited Edition',short: 'Rare & special',                why: 'Scarcity makes people want it more — fear of missing out.', tradeoff: 'Limited stock caps your total earnings.', priceMultiplier: 2.0, popularityMultiplier: 0.8, tone: 'bg-amber-500 border-amber-700' },
  { id: 'creative',  label: 'Creative',       short: 'Unique & colourful design',     why: 'Eye-catching design wins social-media shares.',          tradeoff: 'Trends change fast — design must keep evolving.',priceMultiplier: 1.3, popularityMultiplier: 1.4, tone: 'bg-pink-500 border-pink-700' },
  { id: 'tech',      label: 'High Tech',      short: 'Smart & futuristic',           why: 'Technology adds new value and a cool factor.',          tradeoff: 'Higher development costs.',                    priceMultiplier: 1.8, popularityMultiplier: 1.1, tone: 'bg-sky-500 border-sky-700' },
  { id: 'cause',     label: 'Cause-driven',   short: 'Donates to a real cause',       why: 'Caring brands earn loyal repeat customers.',            tradeoff: 'Donation cuts into per-sale profit.',         priceMultiplier: 1.2, popularityMultiplier: 1.3, tone: 'bg-fuchsia-500 border-fuchsia-700' },
];

export const CreateProductModule = () => {
  const { geniusProfile } = useGeniusAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const smartBack = useSmartBack();

  const [viewMode, setViewMode] = useState<'loading' | 'list' | 'create'>('loading');
  const [existingProducts, setExistingProducts] = useState<AIpreneurProduct[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyConfig | null>(null);
  const [adjustedPrice, setAdjustedPrice] = useState(5);
  const [charityPercentage, setCharityPercentage] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createdProduct, setCreatedProduct] = useState<any>(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [regeneratePrompt] = useState('');
  const [viewingProduct, setViewingProduct] = useState<AIpreneurProduct | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({ ...COIN_COSTS });

  const showToast = (msg: string, ms = 2500) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    let cancelled = false;
    const loadTokenCosts = async () => {
      try {
        const remoteCosts = await paymentApi.getTokenCosts();
        if (cancelled || !remoteCosts || Object.keys(remoteCosts).length === 0) return;
        setTokenCosts((prev) => ({ ...prev, ...remoteCosts }));
      } catch (e) {
        console.warn('[CreateProductModule] Failed to load token costs.', e);
      }
    };
    void loadTokenCosts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsApi.getAll();
        setExistingProducts(response.products || []);
        setViewMode(response.products.length === 0 ? 'create' : 'list');
      } catch (e) {
        console.error('Error loading products:', e);
        setViewMode('create');
      }
    };
    loadProducts();
  }, []);

  const handleClose = async () => {
    if (createdProduct && adjustedPrice !== createdProduct.price) {
      try {
        await productsApi.update(createdProduct.id, { price: adjustedPrice });
      } catch (e) {
        console.error('Error saving product price on close:', e);
      }
    }
    smartBack();
  };

  const handleStartNewProduct = () => {
    setStep(1);
    setProductName('');
    setProductDescription('');
    setSelectedStrategy(null);
    setAdjustedPrice(5);
    setCharityPercentage(10);
    setUploadedImage(null);
    setShowCamera(false);
    setCreatedProduct(null);
    setImageGenerating(false);
    setViewMode('create');
  };

  const handleDeleteProduct = async (productId: string) => {
    if (deletingProductId) return;
    setDeletingProductId(productId);
    try {
      await productsApi.delete(productId);
      setExistingProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Product deleted.');
    } catch (e) {
      console.error('Error deleting product:', e);
      showToast('Failed to delete product.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      showToast('Camera not available — try uploading.', 3000);
      setShowCamera(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (showCamera) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [showCamera, startCamera, stopCamera]);

  useEffect(() => {
    if (showCamera) startCamera();
  }, [facingMode, showCamera, startCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !captureCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    setUploadedImage(imageData);
    setShowCamera(false);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  const handleStrategySelect = (strategy: StrategyConfig) => {
    setSelectedStrategy(strategy);
    const basePrice = 5;
    const newPrice = Math.max(3, Math.min(15, Math.round(basePrice * strategy.priceMultiplier)));
    setAdjustedPrice(newPrice);
  };

  const handleGenerate = async () => {
    if (!productName || !selectedStrategy) return;
    if (!uploadedImage) {
      showToast('Snap or upload a photo first.');
      return;
    }
    const loadingStart = Date.now();
    setStep(3);
    try {
      const description = productDescription.trim() || selectedStrategy.short;
      const response = await productsApi.create({
        product_name: productName,
        description,
        price: adjustedPrice,
        positioning_strategy: selectedStrategy.id,
        image_data: uploadedImage || undefined,
        image_source: uploadedImage ? 'uploaded' : undefined,
        generate_image: !!uploadedImage,
      });
      if (response.success) {
        setCreatedProduct(response.product);
        setImageGenerating(response.image_generating || !!uploadedImage);
        setExistingProducts((prev) => {
          const filtered = prev.filter((p) => p.id !== response.product.id);
          return [response.product, ...filtered];
        });
        await businessApi.updateModuleProgress('product', 100);
      }
    } catch (e) {
      console.error('Error creating product:', e);
      const message = e instanceof ApiError ? e.message : 'Failed to create product.';
      showToast(message, 3000);
      setStep(2);
      return;
    }
    const elapsed = Date.now() - loadingStart;
    const delay = Math.max(0, 1500 - elapsed);
    setTimeout(() => setStep(4), delay);
  };

  const handleRegenerateImage = async (product: AIpreneurProduct) => {
    if (!product) return;
    setImageGenerating(true);
    const promptHint = regeneratePrompt.trim() || 'Make it look even more amazing and colorful!';
    try {
      const response = await productsApi.remixImage(product.id, { prompt_hint: promptHint });
      if (response.success) {
        showToast('Remixing your design…');
        setCreatedProduct(response.product || product);
        setImageGenerating(true);
      }
    } catch (e) {
      console.error('Error regenerating:', e);
      const message = e instanceof ApiError ? e.message : 'Failed to remix product image.';
      showToast(message, 3000);
      setImageGenerating(false);
    }
  };

  const handleAddToMenu = async () => {
    if (!geniusProfile || !selectedStrategy || isSaving) return;
    setIsSaving(true);
    try {
      if (createdProduct && adjustedPrice !== createdProduct.price) {
        await productsApi.update(createdProduct.id, { price: adjustedPrice });
        setCreatedProduct({ ...createdProduct, price: adjustedPrice });
      }
      setShowConfetti(true);
      showToast('Product launched! You’re a genius!');
      if (createdProduct) {
        setExistingProducts((prev) => [...prev, { ...createdProduct, price: adjustedPrice }]);
      }
      setTimeout(() => smartBack(), 2200);
    } catch (e) {
      console.error('Error:', e);
      setIsSaving(false);
    }
  };

  // Poll for image updates
  useEffect(() => {
    if (createdProduct && imageGenerating) {
      const t = setInterval(async () => {
        try {
          const response = await productsApi.getAll();
          if (response.products) setExistingProducts(response.products);
          const updated = response.products.find((p) => p.id === createdProduct.id);
          if (updated) {
            setCreatedProduct(updated);
            if (viewingProduct?.id === updated.id) setViewingProduct(updated);
            if (updated.image_status === 'completed' || updated.image_status === 'failed') {
              setImageGenerating(false);
            }
          }
        } catch (e) {
          console.error('Error polling product:', e);
        }
      }, 3000);
      return () => clearInterval(t);
    }
  }, [createdProduct, imageGenerating, viewingProduct?.id]);

  const dark = theme === 'dark';

  // ── Loading state ───────────────────────────────────────────────
  if (viewMode === 'loading') {
    return (
      <AppLoader
        title="Opening design studio…"
        icon={Package}
        hints={['Pulling your products', 'Warming up the AI', 'Almost ready']}
      />
    );
  }

  // ── LIST MODE — existing products + start new ─────────────────────
  if (viewMode === 'list') {
    const totalRevenue = existingProducts.reduce((s, p) => s + (Number(p.revenue_generated) || 0), 0);
    return (
      <ModulePage
        title="Product Studio"
        subtitle="Make + sell your big ideas"
        icon={Package}
        tone="sky"
        onBack={handleClose}
        hero={<ModuleHero3D kind="product" caption="Spin up your next big invention" />}
        lesson={{
          title: 'Every product needs a positioning',
          body: "A great product alone isn't enough — you have to decide WHO it's for and WHY they'd pick it over a competitor. Pricing, story, and audience are all part of your strategy.",
        }}
      >

          {/* Stats + create — chunky kid-friendly stat row with a big
              primary CTA. Two stats + one playful CTA tile so the row
              reads as "here's your shop's progress, here's the next
              thing to do". */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 mb-5">
            <KidStat
              emoji="📦"
              label="Your Products"
              value={existingProducts.length}
              caption={existingProducts.length === 0 ? 'Add your first one!' : `${existingProducts.length} in your shop`}
              tone="sky"
            />
            <KidStat
              emoji="💰"
              label="Total Earned"
              value={`RM ${totalRevenue.toFixed(0)}`}
              caption={totalRevenue > 0 ? 'Keep selling!' : 'Start selling to grow this'}
              tone="emerald"
            />
            <button
              type="button"
              onClick={handleStartNewProduct}
              className={`${BTN_3D_PRIMARY} col-span-2 sm:col-span-1 min-h-[80px] text-base flex-col gap-1 rounded-2xl`}
            >
              <Plus className="w-6 h-6" />
              Create New Product
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {existingProducts.map((product) => (
              <motion.div
                key={product.id}
                layoutId={product.id}
                onClick={() => setViewingProduct(product)}
                whileHover={{ y: -2 }}
                className={`${GLASS} rounded-2xl overflow-hidden cursor-pointer flex flex-col`}
              >
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  {product.image_status === 'generating' || product.image_status === 'pending' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-violet-500 dark:text-violet-300 animate-spin" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold">Designing…</span>
                    </div>
                  ) : product.image_url ? (
                    <img src={getProductImageUrl(product.image_url)} alt={product.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleDeleteProduct(product.id); }}
                    aria-label="Delete"
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-500 border-b-[2px] border-rose-700 flex items-center justify-center text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900/85 text-white">RM {product.price}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white">{product.units_sold} sold</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{product.product_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Tag className="w-3 h-3" />
                    <span className="capitalize truncate">{product.positioning_strategy}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {existingProducts.length === 0 && (
              <div className={`${GLASS} col-span-full rounded-3xl p-8 sm:p-12 text-center`}>
                <div className="text-5xl sm:text-6xl mb-3" aria-hidden>📦✨</div>
                <p className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white mb-1">
                  Your shop is waiting for its first product!
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Snap a photo of something you'd like to sell — a craft, snack, or sketch — and AI will help you turn it into a real listing.
                </p>
                <button
                  type="button"
                  onClick={handleStartNewProduct}
                  className={`${BTN_3D_PRIMARY} inline-flex items-center gap-2 px-6`}
                >
                  <Plus className="w-5 h-5" />
                  Make My First Product
                </button>
              </div>
            )}
          </div>

        {/* Product detail modal */}
        <AnimatePresence>
          {viewingProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setViewingProduct(null)}
            >
              <motion.div
                layoutId={viewingProduct.id}
                className={`${GLASS} w-full max-w-lg rounded-3xl overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  {viewingProduct.image_url ? (
                    <img src={getProductImageUrl(viewingProduct.image_url)} alt={viewingProduct.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFullImage(true)}
                    aria-label="Full image"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/85 text-white flex items-center justify-center"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{viewingProduct.product_name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">{viewingProduct.description}</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <KVCard label="Price" value={`RM ${viewingProduct.price}`} tone="violet" />
                    <KVCard label="Revenue" value={`RM ${viewingProduct.revenue_generated}`} tone="emerald" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingProduct(null)}
                    className={`${BTN_3D_SECONDARY} w-full min-h-[44px] text-sm`}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFullImage && viewingProduct && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md"
              onClick={() => setShowFullImage(false)}
            >
              <img
                src={getProductImageUrl(viewingProduct.image_url)}
                alt={viewingProduct.product_name}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl"
              />
              <button
                type="button"
                aria-label="Close"
                className="absolute top-4 right-4 text-white p-2 rounded-full bg-slate-900/60"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
        </AnimatePresence>

        <Toast message={toast} />
      </ModulePage>
    );
  }

  // ── CREATE FLOW ───────────────────────────────────────────────────
  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />
      {showConfetti && <Confetti show={showConfetti} />}

      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : handleClose())}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <div className="flex-1 flex flex-col items-center min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Step {step} of 4</p>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={[
                    'h-1.5 w-8 rounded-full',
                    s <= step ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {/* STEP 1 — Snap / Upload */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <LessonBanner
                title="Lesson 1 — Find your idea"
                body="Real entrepreneurs start with a real product. Take a photo of something you'd like to sell — a craft, a snack, a sketch — and AI will help you turn it into a polished listing."
              />

              <div className="text-center max-w-2xl mx-auto mt-6 mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                  What’s your big idea?
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Snap a photo or upload one to begin.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className={`${GLASS} ${GLASS_HOVER} group rounded-3xl p-6 text-left active:translate-y-[1px] transition-transform`}
                >
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
                    <Camera className="w-7 h-7 text-white" />
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Snap Photo</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Use your camera to capture your product.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${GLASS} ${GLASS_HOVER} group rounded-3xl p-6 text-left active:translate-y-[1px] transition-transform`}
                >
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500 border-b-[5px] border-sky-700 mb-3">
                    <Upload className="w-7 h-7 text-white" />
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Upload Photo</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Already have a picture? Upload it here.
                  </p>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </motion.div>
          )}

          {/* STEP 2 — Name + Strategy */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <LessonBanner
                title="Lesson 2 — Position your product"
                body="Strategy is who you sell to + what makes you different. Premium earns more per sale; Value sells more units. There's no single right answer — pick a clear story and stick with it."
              />

              <div className="grid lg:grid-cols-5 gap-4 mt-5">
                {/* Left column: photo + name */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={`${GLASS} rounded-2xl p-3`}>
                    {uploadedImage ? (
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="Product preview"
                          className="w-full aspect-square object-cover rounded-2xl bg-slate-100 dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => { setUploadedImage(null); setStep(1); }}
                          className={`${BTN_3D_SECONDARY} absolute top-2 right-2 min-h-[36px] px-3 text-xs`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400"
                      >
                        <Camera className="w-10 h-10 mb-2" />
                        <span className="text-sm font-bold">Tap to add photo</span>
                      </button>
                    )}
                  </div>

                  <div className={`${GLASS} rounded-2xl p-4 space-y-3`}>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-1.5">
                        Product name
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Super Sonic Sneakers"
                        className={`${FIELD} px-3 py-3 text-base font-bold`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-1.5">
                        Short description <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="What's special about it?"
                        className={`${FIELD} px-3 py-2.5 text-sm`}
                      />
                    </div>
                  </div>
                </div>

                {/* Right column: strategy grid */}
                <div className="lg:col-span-3 space-y-4">
                  <div className={`${GLASS} rounded-2xl p-4`}>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                      Choose your strategy
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {strategies.map((s) => {
                        const active = selectedStrategy?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleStrategySelect(s)}
                            className={[
                              'relative rounded-2xl p-3 text-left transition-colors border',
                              active
                                ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-400/40'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800',
                            ].join(' ')}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-b-[3px] shrink-0 ${s.tone}`}>
                                <Tag className="w-4 h-4 text-white" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{s.label}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{s.short}</p>
                              </div>
                              {active && <CheckCircle className="w-4 h-4 text-violet-600 dark:text-violet-300 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Strategy tip card */}
                  {selectedStrategy && (
                    <motion.div
                      key={selectedStrategy.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 p-4 flex items-start gap-3"
                    >
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
                        <Lightbulb className="w-4 h-4 text-white" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                          Why {selectedStrategy.label} works
                        </p>
                        <p className="text-sm text-violet-800/90 dark:text-violet-200/90">
                          {selectedStrategy.why}
                        </p>
                        <p className="text-xs text-violet-700/80 dark:text-violet-300/80 italic">
                          Trade-off: {selectedStrategy.tradeoff}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Generate */}
                  <button
                    type="button"
                    disabled={!productName || !selectedStrategy || !uploadedImage}
                    onClick={handleGenerate}
                    className={`${BTN_3D_PRIMARY} w-full min-h-[64px] px-6 text-base`}
                  >
                    <Rocket className="w-5 h-5" />
                    Generate product · {tokenCosts.product_image ?? COIN_COSTS.product_image} tokens
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Generating */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center min-h-[60vh] flex flex-col items-center justify-center"
            >
              <span className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-600 border-b-[5px] border-violet-800 mb-5">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                Fabricating your {selectedStrategy?.label.toLowerCase()} product…
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
                AI is turning your photo into a polished product listing. This takes a few seconds.
              </p>

              {selectedStrategy && (
                <div className="max-w-md mx-auto rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 p-4 flex items-start gap-3 text-left">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-violet-900 dark:text-violet-100">While you wait…</p>
                    <p className="text-sm text-violet-800/90 dark:text-violet-200/90">{selectedStrategy.why}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4 — Finalize price + launch */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid md:grid-cols-2 gap-4 items-start">
                {/* Preview */}
                <div className={`${GLASS} rounded-3xl p-4`}>
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                    {imageGenerating && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/70">
                        <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                        <span className="text-white font-bold text-sm">Refining image…</span>
                      </div>
                    )}
                    <img
                      src={createdProduct?.image_url ? getProductImageUrl(createdProduct.image_url) : uploadedImage || ''}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                    {!imageGenerating && (
                      <button
                        type="button"
                        onClick={() => createdProduct && handleRegenerateImage(createdProduct)}
                        className={`${BTN_3D_SECONDARY} absolute bottom-2 right-2 min-h-[36px] px-3 text-xs`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Remix · {tokenCosts.product_regenerate ?? COIN_COSTS.product_regenerate}
                      </button>
                    )}
                  </div>

                  {/* Price slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Price</span>
                      <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">RM {adjustedPrice}</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      value={adjustedPrice}
                      onChange={(e) => setAdjustedPrice(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Low (more buyers)</span>
                      <span>High (more profit/sale)</span>
                    </div>
                  </div>
                </div>

                {/* Details + launch */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{productName}</h2>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-extrabold text-white bg-violet-600 border-b-[2px] border-violet-800">
                      {selectedStrategy?.label} strategy
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                      {productDescription || createdProduct?.description || selectedStrategy?.short}
                    </p>
                  </div>

                  {/* Charity card */}
                  <div className={`${GLASS} rounded-2xl p-4`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-10 h-10 rounded-xl bg-rose-500 border-b-[3px] border-rose-700 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">Donate to a cause</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          A small % of every sale goes to charity.
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-rose-600 dark:text-rose-300 tabular-nums">{charityPercentage}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={5}
                      value={charityPercentage}
                      onChange={(e) => setCharityPercentage(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic">
                      Lesson: customers reward brands that give back — but a big % cuts your own profit too.
                    </p>
                  </div>

                  {/* Strategy takeaway */}
                  {selectedStrategy && (
                    <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 p-4 flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-violet-900 dark:text-violet-100">Takeaway</p>
                        <p className="text-sm text-violet-800/90 dark:text-violet-200/90">{selectedStrategy.tradeoff}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddToMenu}
                    disabled={isSaving}
                    className={`${BTN_3D_PRIMARY} w-full min-h-[56px] text-base`}
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                    Launch product
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Back to edit
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Toast message={toast} />

      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black"
          >
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              <div
                className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10"
                style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 16px))' }}
              >
                <button
                  type="button"
                  onClick={() => setShowCamera(false)}
                  aria-label="Close"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/60 backdrop-blur text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                  aria-label="Flip camera"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/60 backdrop-blur text-white"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute top-20 left-0 right-0 text-center z-10">
                <span className="inline-block px-3 py-1 rounded-full text-sm bg-slate-900/60 backdrop-blur text-white/90">
                  Point at your product and snap.
                </span>
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-8 gap-3"
                style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 32px))' }}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={capturePhoto}
                  aria-label="Capture"
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center ring-4 ring-white/30"
                >
                  <span className="w-16 h-16 bg-white border-[4px] border-slate-300 rounded-full" />
                </motion.button>
                <button
                  type="button"
                  onClick={() => { setShowCamera(false); fileInputRef.current?.click(); }}
                  className="text-white/80 text-sm font-semibold hover:text-white"
                >
                  Upload from gallery instead
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────

function LessonBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 p-4 flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
        <Lightbulb className="w-5 h-5 text-white" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-violet-900 dark:text-violet-100">{title}</p>
        <p className="text-sm text-violet-800/90 dark:text-violet-200/90 mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function KVCard({ label, value, tone }: { label: string; value: string; tone: 'violet' | 'emerald' }) {
  const valueClass = tone === 'violet' ? 'text-violet-600 dark:text-violet-300' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 p-3 text-center">
      <p className="text-[11px] uppercase font-bold tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-extrabold ${valueClass} tabular-nums`}>{value}</p>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]"
        >
          <div className={`${GLASS} rounded-2xl px-4 py-3 flex items-center gap-3 max-w-md`}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-white">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CreateProductModule;
