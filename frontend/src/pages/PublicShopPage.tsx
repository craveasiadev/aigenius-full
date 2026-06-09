/**
 * PublicShopPage - Public View of Student's Online Store
 *
 * A modern, AI-themed, kid-friendly public store page with:
 * - Animated hero section with shop branding
 * - Interactive product grid with hover effects
 * - Social sharing and like functionality
 * - Responsive design with playful animations
 * - AI Genius branding throughout
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Star, Heart, ShoppingCart, Package, Sparkles,
  ExternalLink, ArrowLeft, DollarSign, TrendingUp, Share2,
  Copy, Check, X, Eye, Bot, Wand2
} from 'lucide-react';
import { publicShopApi } from '../services/aipreneurApi';
import { paymentApi } from '../services/paymentApi';
import { getAssetUrl } from '../lib/api';

interface Product {
  id: string;
  product_name: string;
  description: string | null;
  price: number;
  positioning_strategy: string;
  units_sold: number;
  revenue_generated: number;
  image_url?: string | null;
  image_status?: string | null;
}

interface ShopInfo {
  student_id: string;
  shop_name: string;
  shop_theme: string;
  total_profit: number;
  store_rating: number;
  store_reviews_count: number;
  selected_cause: string | null;
  charity_percentage: number;
  passion_category: string;
  store_visitors: number;
  store_likes: number;
  shop_image_url?: string | null;
  shop_tagline?: string | null;
}

const PUBLIC_PRODUCT_PRICE = 15;
const PUBLIC_PRODUCT_KID_TOKENS = 400;
const DEFAULT_PAYMENT_METHOD = 'fpx';
const MAX_PAYMENT_PACKAGE_NAME_LENGTH = 30;

// Floating particle component for magical background
const FloatingParticle = ({ delay = 0, size = 4, duration = 20 }: { delay?: number; size?: number; duration?: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{ width: size, height: size, background: 'linear-gradient(to right, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.3))', filter: 'blur(2px)' }}
    initial={{
      x: Math.random() * 100 + '%',
      y: '110%',
      opacity: 0
    }}
    animate={{
      y: '-10%',
      opacity: [0, 0.8, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'linear'
    }}
  />
);

// Animated emoji component
const FloatingEmoji = ({ emoji, delay = 0 }: { emoji: string; delay?: number }) => (
  <motion.span
    className="absolute text-2xl md:text-3xl pointer-events-none"
    initial={{ opacity: 0, y: 50, x: Math.random() * 200 - 100 }}
    animate={{
      opacity: [0, 1, 1, 0],
      y: [50, -100],
      rotate: [0, 15, -15, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 3,
    }}
    style={{ left: `${Math.random() * 80 + 10}%` }}
  >
    {emoji}
  </motion.span>
);

// Asset helpers (proxy storage URLs to avoid CORS)
const getShopImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/shops/')) {
    const filename = imageUrl.split('/storage/shops/').pop();
    if (filename) {
      return getAssetUrl(`/aipreneur/shop-image/${filename}`);
    }
  }
  return imageUrl;
};

const getProductImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/products/')) {
    const filename = imageUrl.split('/storage/products/').pop();
    if (filename) {
      return getAssetUrl(`/aipreneur/product-image/${filename}`);
    }
  }
  return imageUrl;
};

export const PublicShopPage = () => {
  const { shop_slug } = useParams();
  const navigate = useNavigate();
  const smartBack = useSmartBack('/');
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [liked, setLiked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    loadShopData();
  }, [shop_slug]);

  // Restore "already liked" state across refreshes. The like API has no
  // visitor identity (public anonymous viewers), so we dedupe client-side
  // by remembering each slug the user has liked in localStorage. The
  // server-stored count remains the source of truth for the number itself.
  useEffect(() => {
    if (!shop_slug) return;
    try {
      if (localStorage.getItem(`shop_liked_${shop_slug}`) === '1') {
        setLiked(true);
      }
    } catch {
      // localStorage can throw in private-mode Safari — ignore.
    }
  }, [shop_slug]);

  useEffect(() => {
    setPurchaseProcessing(false);
    setPurchaseError(null);
  }, [selectedProduct]);

  const loadShopData = async () => {
    if (!shop_slug) {
      console.error('[PublicShopPage] No shop slug provided');
      setLoading(false);
      return;
    }

    try {
      console.log('[PublicShopPage] Loading shop with slug:', shop_slug);

      // Use the Laravel API to get public shop data
      const response = await publicShopApi.getShop(shop_slug);

      console.log('[PublicShopPage] API response:', response);

      if (!response.success || !response.shop) {
        console.error('[PublicShopPage] Shop not found');
        setLoading(false);
        return;
      }

      const { shop, products: shopProducts } = response;

      setShopInfo({
        student_id: shop.student_id,
        shop_name: shop.shop_name,
        shop_theme: shop.shop_theme || 'modern',
        total_profit: Number(shop.total_profit) || 0,
        store_rating: Number(shop.store_rating) || 4.5,
        store_reviews_count: Number(shop.store_reviews_count) || 0,
        selected_cause: shop.selected_cause,
        charity_percentage: Number(shop.charity_percentage) || 0,
        passion_category: shop.passion_category || 'general',
        store_visitors: Number(shop.store_visitors) || 0,
        store_likes: Number(shop.store_likes) || 0,
        shop_image_url: shop.shop_image_url,
        shop_tagline: shop.shop_tagline
      });

      setProducts(shopProducts || []);
    } catch (error) {
      console.error('[PublicShopPage] Error loading shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!shopInfo || liked || !shop_slug) return;
    // Optimistic: flip the heart + bump the displayed count immediately so
    // the click feels instant. The server response then replaces the count
    // with the authoritative value.
    setLiked(true);
    const previousLikes = shopInfo.store_likes;
    setShopInfo((prev) => (prev ? { ...prev, store_likes: prev.store_likes + 1 } : null));
    try {
      const response = await publicShopApi.likeShop(shop_slug);
      if (response.success) {
        setShopInfo((prev) => (prev ? { ...prev, store_likes: response.store_likes } : null));
        // Persist the like so a refresh doesn't reset the button. Key
        // is per-slug so liking shop A doesn't disable the button on shop B.
        try {
          localStorage.setItem(`shop_liked_${shop_slug}`, '1');
        } catch {
          // localStorage may be unavailable (private mode); the in-memory
          // `liked` flag still prevents double-clicks for this session.
        }
      } else {
        // Roll back the optimistic UI so the user can retry.
        setLiked(false);
        setShopInfo((prev) => (prev ? { ...prev, store_likes: previousLikes } : null));
      }
    } catch (error) {
      console.error('[PublicShopPage] Error liking shop:', error);
      setLiked(false);
      setShopInfo((prev) => (prev ? { ...prev, store_likes: previousLikes } : null));
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyShopLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out ${shopInfo?.shop_name} - an amazing online shop by a young entrepreneur! 🚀`);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    };

    window.open(urls[platform], '_blank');
    setShowShareModal(false);
  };

  const handleRequestToBuy = async () => {
    if (!selectedProduct || !shopInfo?.student_id) {
      setPurchaseError('Unable to start payment right now. Please refresh and try again.');
      return;
    }

    setPurchaseProcessing(true);
    setPurchaseError(null);

    try {
      const rawPaymentProductName = `${selectedProduct.product_name} Request`.trim();
      const safePaymentProductName = (rawPaymentProductName.length > MAX_PAYMENT_PACKAGE_NAME_LENGTH
        ? rawPaymentProductName.slice(0, MAX_PAYMENT_PACKAGE_NAME_LENGTH)
        : rawPaymentProductName).trim() || 'Public Shop Request';
      const orderId = paymentApi.generateOrderId();
      const response = await paymentApi.initiatePayment({
        customer_id: shopInfo.student_id,
        product_id: selectedProduct.id,
        order_id: orderId,
        amount: PUBLIC_PRODUCT_PRICE,
        payment_method: DEFAULT_PAYMENT_METHOD,
        customer_name: 'Public Buyer',
        customer_email: `public-buyer-${Date.now()}@aigenius.com.my`,
        customer_phone: '',
        product_name: safePaymentProductName,
        package_type: 'ai_tokens',
        package_amount: PUBLIC_PRODUCT_KID_TOKENS,
        genius_profile_id: shopInfo.student_id,
      });

      if (response.success && response.data) {
        await paymentApi.submitPaymentForm(response.data.payment_url, response.data.payment_data);
        return;
      }

      setPurchaseError(response.error || 'Failed to initiate payment. Please try again.');
      setPurchaseProcessing(false);
    } catch (error: any) {
      console.error('[PublicShopPage] Error initiating purchase request:', error);
      setPurchaseError(error?.message || 'Payment failed. Please try again.');
      setPurchaseProcessing(false);
    }
  };

  const getPassionEmoji = (passion: string) => {
    const emojis: Record<string, string> = {
      ice_cream: '🍦',
      pets: '🐾',
      games: '🎮',
      bakery: '🍰',
      cars: '🚗',
      drinks: '🥤',
      art: '🎨',
      nature: '🌿',
      food: '🍔',
      tech: '💻',
      fashion: '👗',
      sports: '⚽',
      music: '🎵',
      books: '📚'
    };
    return emojis[passion] || '🌟';
  };

  const getStrategyBadge = (strategy: string) => {
    const badges: Record<string, { label: string; gradient: string; emoji: string }> = {
      premium: { label: 'Premium', gradient: 'from-amber-500 to-yellow-500', emoji: '👑' },
      volume: { label: 'Best Value', gradient: 'from-blue-500 to-cyan-500', emoji: '💎' },
      marketing: { label: 'Trending', gradient: 'from-orange-500 to-red-500', emoji: '🔥' },
      eco: { label: 'Eco-Friendly', gradient: 'from-green-500 to-emerald-500', emoji: '🌱' },
      limited: { label: 'Limited Edition', gradient: 'from-purple-500 to-pink-500', emoji: '⭐' },
      creative: { label: 'Creative', gradient: 'from-pink-500 to-rose-500', emoji: '✨' },
      tech: { label: 'Tech Enhanced', gradient: 'from-violet-500 to-purple-500', emoji: '🤖' },
      cause: { label: 'For a Cause', gradient: 'from-red-500 to-pink-500', emoji: '❤️' }
    };
    return badges[strategy] || badges.volume;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a1a' }}>
        {/* Animated background */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '25%', left: '25%', width: 384, height: 384, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', filter: 'blur(80px)' }} className="animate-pulse" />
          <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: 384, height: 384, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', filter: 'blur(80px)' }} className="animate-pulse delay-1000" />
        </div>

        <div className="text-center relative z-10">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
            className="w-24 h-24 mx-auto mb-6"
          >
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ border: '4px solid rgba(139, 92, 246, 0.2)', borderTopColor: 'rgba(139, 92, 246, 0.8)' }}>
              <Bot className="w-10 h-10" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
            </div>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            className="text-xl font-medium"
          >
            Loading amazing store...
          </motion.p>
        </div>
      </div>
    );
  }

  // Shop not found state
  if (!shopInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
        {/* Background effects */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', top: '25%', left: '25%', width: 384, height: 384, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.08)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: 384, height: 384, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.08)', filter: 'blur(80px)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md relative z-10"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-32 h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Store className="w-16 h-16" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'white' }}>Shop Not Found</h2>
          <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            This shop doesn't exist or hasn't been launched yet. Check back later!
          </p>
          <p
            className="text-sm mb-8 font-mono px-4 py-2 rounded-lg"
            style={{ color: 'rgba(255, 255, 255, 0.3)', background: 'rgba(0, 0, 0, 0.3)' }}
          >
            Looking for: {shop_slug || '(empty)'}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => smartBack()}
            className="px-8 py-4 rounded-2xl font-bold inline-flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
              color: 'white',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Shop
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const emoji = getPassionEmoji(shopInfo.passion_category);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', top: 0, left: '25%', width: 600, height: 600, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.08)', filter: 'blur(120px)' }} className="animate-pulse" />
        <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.08)', filter: 'blur(100px)' }} className="animate-pulse delay-1000" />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(236, 72, 153, 0.05)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 1.2} size={Math.random() * 8 + 2} duration={15 + Math.random() * 10} />
        ))}

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Hero Header Section */}
      <div className="relative">
        {/* Shop Banner Image or Gradient */}
        <div className="h-64 md:h-80 relative overflow-hidden">
          {getShopImageUrl(shopInfo.shop_image_url) ? (
            <>
              <img
                src={getShopImageUrl(shopInfo.shop_image_url) as string}
                alt={shopInfo.shop_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(10,10,26,0.2), #0a0a1a)' }} />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.5), rgba(6, 182, 212, 0.5))' }}>
              <div className="absolute inset-0" style={{ background: 'rgba(10, 10, 26, 0.4)' }} />
              {/* Floating emojis for fun */}
              <div className="absolute inset-0 overflow-hidden">
                {['✨', '🚀', '💫', '⭐', emoji].map((e, i) => (
                  <FloatingEmoji key={i} emoji={e} delay={i * 0.8} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shop Info Card - Overlapping banner */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 md:p-8 shadow-2xl"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Shop Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl p-1 flex-shrink-0 mx-auto md:mx-0"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.7), rgba(99, 102, 241, 0.6), rgba(6, 182, 212, 0.6))',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.25)',
                }}
              >
                <div className="w-full h-full rounded-3xl flex items-center justify-center" style={{ background: 'rgba(15, 15, 30, 0.9)' }}>
                  <span className="text-5xl md:text-6xl">{emoji}</span>
                </div>
              </motion.div>

              {/* Shop Details */}
              <div className="flex-1 text-center md:text-left">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white mb-2 break-words"
                >
                  {shopInfo.shop_name}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                >
                  {shopInfo.shop_tagline || `Welcome to my ${shopInfo.passion_category?.replace(/_/g, ' ')} shop! 🎉`}
                </motion.p>

                {/* Stats Row */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4"
                >
                  {/* Rating */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)' }}
                  >
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-sm" style={{ color: 'rgba(250, 204, 21, 0.9)' }}>{Number(shopInfo.store_rating || 4.5).toFixed(1)}</span>
                  </div>

                  {/* Visitors */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
                  >
                    <Eye className="w-4 h-4" style={{ color: 'rgba(6, 182, 212, 0.9)' }} />
                    <span className="font-medium text-sm" style={{ color: 'rgba(6, 182, 212, 0.9)' }}>{shopInfo.store_visitors}</span>
                  </div>

                  {/* Likes */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-pink-400' : ''}`} style={{ color: 'rgba(236, 72, 153, 0.9)' }} />
                    <span className="font-medium text-sm" style={{ color: 'rgba(236, 72, 153, 0.9)' }}>{shopInfo.store_likes}</span>
                  </div>

                  {/* Products */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                  >
                    <Package className="w-4 h-4" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
                    <span className="font-medium text-sm" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>{products.length} products</span>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLike}
                    disabled={liked}
                    className="px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 transition-all"
                    style={liked
                      ? {
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(244, 63, 94, 0.6))',
                          boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
                          color: 'white',
                          border: 'none',
                        }
                      : {
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'white',
                        }
                    }
                  >
                    <Heart className={`w-5 h-5 ${liked ? 'fill-white' : ''}`} />
                    {liked ? 'Liked!' : 'Like Shop'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    className="px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                      color: 'white',
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </motion.button>
                </motion.div>
              </div>

              {/* AI Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
                className="hidden lg:flex flex-col items-center justify-center px-6"
                style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <Wand2 className="w-8 h-8" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
                </div>
                <span className="text-xs text-center" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>AI-Powered<br />Shop</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div >

      {/* CSR Banner */}
      {
        shopInfo.selected_cause && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="max-w-6xl mx-auto px-4 md:px-6 mt-6"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.5), rgba(244, 63, 94, 0.5))',
                }}
              >
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'white' }}>Making a Difference! 💖</p>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {shopInfo.charity_percentage}% of profits support{' '}
                  <span className="font-medium capitalize" style={{ color: 'rgba(236, 72, 153, 0.8)' }}>
                    {shopInfo.selected_cause.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )
      }

      {/* Products Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center mb-10"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'rgba(139, 92, 246, 0.9)' }} />
            <span className="text-sm font-medium" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>Kid-Created Products</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: 'white' }}>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Amazing Products
            </span>
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Created with creativity and powered by imagination ✨</p>
        </motion.div>

        {products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center"
              style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Package className="w-12 h-12" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
            </div>
            <p className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Products coming soon! 🚀</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => {
              const badge = getStrategyBadge(product.positioning_strategy);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => setSelectedProduct(product)}
                  className="group cursor-pointer"
                >
                  <div
                    className="relative rounded-3xl overflow-hidden transition-all shadow-xl"
                    style={{
                      background: 'rgba(15, 15, 30, 0.5)',
                      backdropFilter: 'blur(30px)',
                      WebkitBackdropFilter: 'blur(30px)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {/* Product Image */}
                    <div className="relative h-56 overflow-hidden">
                      {getProductImageUrl(product.image_url) ? (
                        <img
                          src={getProductImageUrl(product.image_url) as string}
                          alt={product.product_name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.4), rgba(99, 102, 241, 0.4), rgba(6, 182, 212, 0.4))' }}>
                          <span className="text-6xl">{emoji}</span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10, 10, 26, 0.8), transparent, transparent)', opacity: 0.6 }} />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between">
                        <div className={`px-3 py-1.5 bg-gradient-to-r ${badge.gradient} rounded-lg text-white text-xs font-bold shadow-lg flex items-center gap-1`}>
                          <span>{badge.emoji}</span>
                          {badge.label}
                        </div>
                        {product.units_sold > 0 && (
                          <div
                            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                            style={{
                              background: 'rgba(0, 0, 0, 0.5)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                            }}
                          >
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            {product.units_sold} sold
                          </div>
                        )}
                      </div>

                      {/* View Details Overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3), transparent)' }}>
                        <div
                          className="px-6 py-2 rounded-full font-semibold flex items-center gap-2"
                          style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'white',
                          }}
                        >
                          <Eye className="w-4 h-4" /> View Details
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-400 transition-colors line-clamp-1" style={{ color: 'white' }}>
                        {product.product_name}
                      </h3>
                      <p className="text-sm mb-4 line-clamp-2 h-10" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>RM</span>
                          <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            25.00
                          </span>
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-12 px-6 relative z-10" style={{ background: 'linear-gradient(to top, #0a0a1a, transparent)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-4"
              style={{
                background: 'rgba(15, 15, 30, 0.5)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(6, 182, 212, 0.6))',
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold" style={{ color: 'white' }}>{shopInfo.shop_name}</p>
                <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Young Entrepreneur 🚀</p>
              </div>
            </motion.div>

            <div className="flex items-center justify-center gap-4 text-sm mb-6" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered</span>
              </div>
              <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.2)' }} />
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{products.length} Products</span>
              </div>
              {shopInfo.selected_cause && (
                <>
                  <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.2)' }} />
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>Giving Back</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <a
              href="https://www.aigenius.com.my"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors"
              style={{ color: 'rgba(139, 92, 246, 0.8)' }}
            >
              <img src="/aigenius-finallogo-aug2025.svg" alt="AI Genius" className="h-6 opacity-70" />
              <span className="text-sm">Powered by AI Genius AIpreneur</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-xs mt-2" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>
              Empowering young entrepreneurs with AI 🌟
            </p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl p-6 max-w-md w-full shadow-2xl"
              style={{
                background: 'rgba(15, 15, 30, 0.8)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(99, 102, 241, 0.5))',
                    }}
                  >
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>Share This Shop</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Copy Link */}
              <div className="mb-6">
                <label className="text-sm mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Shop Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'white',
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyShopLink}
                    className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                    style={copiedLink
                      ? { background: 'rgba(74, 222, 128, 0.5)', color: 'white' }
                      : {
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                          color: 'white',
                        }
                    }
                  >
                    {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </motion.button>
                </div>
                {copiedLink && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm mt-2 flex items-center gap-2"
                    style={{ color: 'rgba(74, 222, 128, 0.9)' }}
                  >
                    <Check className="w-4 h-4" /> Link copied to clipboard!
                  </motion.p>
                )}
              </div>

              {/* Social Share */}
              <div>
                <label className="text-sm mb-3 block" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Share on Social Media</label>
                <div className="grid grid-cols-3 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocial('whatsapp')}
                    className="py-3 rounded-xl font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.5), rgba(22, 163, 74, 0.5))', boxShadow: '0 0 15px rgba(34, 197, 94, 0.15)' }}
                  >
                    WhatsApp
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocial('facebook')}
                    className="py-3 rounded-xl font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.5), rgba(29, 78, 216, 0.5))', boxShadow: '0 0 15px rgba(37, 99, 235, 0.15)' }}
                  >
                    Facebook
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocial('twitter')}
                    className="py-3 rounded-xl font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.5), rgba(2, 132, 199, 0.5))', boxShadow: '0 0 15px rgba(14, 165, 233, 0.15)' }}
                  >
                    Twitter
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              style={{
                background: 'rgba(15, 15, 30, 0.8)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Product Image — fixed header so the close button stays
                  visible while the body scrolls. Shorter on small screens
                  so the modal still fits when the user's viewport is tight. */}
              <div className="relative h-44 sm:h-56 md:h-64 shrink-0">
                {getProductImageUrl(selectedProduct.image_url) ? (
                  <img
                    src={getProductImageUrl(selectedProduct.image_url) as string}
                    alt={selectedProduct.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.5), rgba(99, 102, 241, 0.5), rgba(6, 182, 212, 0.5))' }}>
                    <span className="text-8xl">{emoji}</span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15, 15, 30, 0.9), transparent)' }} />

                {/* Close button */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Badge */}
                <div className="absolute bottom-4 left-4">
                  <div className={`px-4 py-2 bg-gradient-to-r ${getStrategyBadge(selectedProduct.positioning_strategy).gradient} rounded-xl text-white text-sm font-bold shadow-lg flex items-center gap-2`}>
                    <span>{getStrategyBadge(selectedProduct.positioning_strategy).emoji}</span>
                    {getStrategyBadge(selectedProduct.positioning_strategy).label}
                  </div>
                </div>
              </div>

              {/* Product Info — scrollable body when content exceeds the
                  modal's max-h-[90vh]. Inner padding stays for breathing
                  room; overscroll-contain prevents the page underneath
                  from scrolling when this body bottoms out. */}
              <div className="p-6 overflow-y-auto overscroll-contain">
                <h2 className="text-2xl font-black mb-2" style={{ color: 'white' }}>
                  {selectedProduct.product_name}
                </h2>
                <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {selectedProduct.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.15)',
                    }}
                  >
                    <DollarSign className="w-6 h-6 mx-auto mb-1" style={{ color: 'rgba(6, 182, 212, 0.9)' }} />
                    <div className="text-2xl font-black" style={{ color: 'white' }}>RM{PUBLIC_PRODUCT_PRICE.toFixed(2)}</div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Price</div>
                  </div>
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: 'rgba(74, 222, 128, 0.08)',
                      border: '1px solid rgba(74, 222, 128, 0.15)',
                    }}
                  >
                    <TrendingUp className="w-6 h-6 mx-auto mb-1" style={{ color: 'rgba(74, 222, 128, 0.9)' }} />
                    <div className="text-2xl font-black" style={{ color: 'white' }}>{selectedProduct.units_sold}</div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Units Sold</div>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4">
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(6, 182, 212, 0.06)',
                      border: '1px solid rgba(6, 182, 212, 0.12)',
                    }}
                  >
                    <h3 className="text-sm font-black mb-2" style={{ color: 'white' }}>What You Get</h3>
                    <div className="space-y-1 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      <p>- High quality acrylic paint</p>
                      <p>- Kids' paintings and product designs to collect</p>
                      <p>- A unique story behind each creation</p>
                      <p>- A chance to support young talent</p>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(139, 92, 246, 0.06)',
                      border: '1px solid rgba(139, 92, 246, 0.12)',
                    }}
                  >
                    <h3 className="text-sm font-black mb-2" style={{ color: 'white' }}>What The Kid Gets</h3>
                    <div className="space-y-1 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      <p>- Kids will get {PUBLIC_PRODUCT_KID_TOKENS} AI tokens (worth RM5)</p>
                      <p>- Continued learning about business and AI</p>
                      <p>- Motivation to create and improve</p>
                      <p>- Real-world feedback from supporters</p>
                    </div>
                  </div>
                </div>

                {/* Order Button */}
                <motion.button
                  whileHover={purchaseProcessing ? undefined : { scale: 1.02 }}
                  whileTap={purchaseProcessing ? undefined : { scale: 0.98 }}
                  onClick={handleRequestToBuy}
                  disabled={purchaseProcessing}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.5), rgba(236, 72, 153, 0.5))',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                    color: 'white',
                    opacity: purchaseProcessing ? 0.7 : 1,
                    cursor: purchaseProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {purchaseProcessing ? 'Redirecting to Payment...' : `Request to Buy - RM${PUBLIC_PRODUCT_PRICE.toFixed(2)}`}
                </motion.button>

                <p className="text-center text-xs mt-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                  Public buyers can request to purchase the artwork and products.
                </p>
                {purchaseError && (
                  <p className="text-center text-xs mt-2" style={{ color: 'rgba(248, 113, 113, 0.9)' }}>{purchaseError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};
