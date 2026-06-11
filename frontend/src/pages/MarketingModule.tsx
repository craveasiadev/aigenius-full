import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  X, Megaphone, Coins, Image as ImageIcon, MapPin, Sparkles, Users,
  CheckCircle, AlertTriangle, Video, Camera, Mic, Play, ClipboardCheck, Bot,
  ArrowRight, Heart, Eye, Grid3x3, Clock, Zap, Monitor, Frame,
} from 'lucide-react';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { Confetti } from '../components/Confetti';
import { useCoinCheck } from '../hooks/useCoinCheck';
import { COIN_COSTS } from '../constants/coinCosts';
import { ApiError, getAssetUrl } from '../lib/api';
import { marketingAssetsApi } from '../services/aipreneurApi';
import { paymentApi, type PricingCatalog } from '../services/paymentApi';
import { ContentCreationGuide } from '../components/ContentCreationGuide';
import { PracticeTeleprompter } from '../components/PracticeTeleprompter';
import { GLASS } from '../lib/uiTokens';
import { ModulePage } from '../components/modules/ModulePage';
import { ModuleHero3D } from '../components/modules/ModuleHero3D';

const AD_SPACES = [
  { id: 'poster', type: 'poster', name: 'TV Poster', icon: Monitor, vibe: 'Shop TV display' },
  { id: 'wall_poster', type: 'poster', name: 'Wall Poster', icon: Frame, vibe: 'Shop wall art' },
  { id: 'banner', type: 'banner', name: 'Website Banner', icon: ImageIcon, vibe: 'Quick boost' },
  { id: 'billboard', type: 'billboard', name: 'Highway Billboard', icon: MapPin, vibe: 'Big reach' },
  { id: 'social', type: 'social_post', name: 'Social Post', icon: Megaphone, vibe: 'Viral energy' },
  { id: 'flyer', type: 'flyer', name: 'Flyer Drop', icon: Sparkles, vibe: 'Local buzz' },
];

const CHARACTER_AVATARS = [
  '/assets/character/chinese-man-shopping.png',
  '/assets/character/CHINESE-MAN.png',
  '/assets/character/chinese-woman-shopping.png',
  '/assets/character/indian-man.png',
  '/assets/character/indian-men-shopping.png',
  '/assets/character/indian-woman-shopping.png',
  '/assets/character/indian-woman.png',
  '/assets/character/malay-man-shopping.png',
  '/assets/character/malay-man.png',
  '/assets/character/malay-woman.png',
  '/assets/character/maly-woman-shopping.png',
];

const PREDEFINED_REVIEWS = [
  "OMG! This shop is literally the coolest thing ever! 🌟",
  "Run, don't walk! Best products in town! 🏃💨",
  "I'm obsessed with the vibe here. Total hidden gem! 💎",
  "10/10 would recommend to all my besties! 👯‍♀️",
  "Super creative and unique. Love it! 🎨",
];

const INFLUENCERS = [
  { id: 'nano', name: 'Sunny Scoops', artistName: 'Sarah Jenkins', tier: 'nano', cost: 120, role: 'Snack Scout', vibe: 'Trusted nearby' },
  { id: 'micro', name: 'Pixel Buddy', artistName: 'Mike Chen', tier: 'micro', cost: 500, role: 'Toy Reviewer', vibe: 'Great reviews' },
  { id: 'macro', name: 'Style Star', artistName: 'Jessica Lee', tier: 'macro', cost: 2000, role: 'Trend Maker', vibe: 'Huge reach' },
  { id: 'mega', name: 'Mega Nova', artistName: 'Alex Storm', tier: 'mega', cost: 10000, role: 'Super Fan Boss', vibe: 'Massive hype' },
];

// --- Influencer profile data (Instagram-like) ---
const TIER_STATS: Record<string, { followers: string; following: string; posts: number; bio: string; itemCount: number; videoCount: number }> = {
  nano: { followers: '1.2K', following: '342', posts: 18, bio: 'Snack lover sharing the best local finds! Your neighborhood taste-tester.', itemCount: 6, videoCount: 2 },
  micro: { followers: '12.5K', following: '891', posts: 45, bio: 'Toy reviewer & gadget geek. If it is cool, I am unboxing it!', itemCount: 9, videoCount: 3 },
  macro: { followers: '125K', following: '1.2K', posts: 120, bio: 'Trendsetter & style icon. Partnering with the freshest brands worldwide.', itemCount: 12, videoCount: 4 },
  mega: { followers: '1.2M', following: '2.1K', posts: 380, bio: 'Global creator & brand ambassador. Millions trust my picks. Let us collab!', itemCount: 15, videoCount: 5 },
};

const PORTFOLIO_GRADIENTS = [
  'from-pink-400 to-rose-600',
  'from-blue-400 to-indigo-600',
  'from-green-400 to-emerald-600',
  'from-purple-400 to-violet-600',
  'from-orange-400 to-amber-600',
  'from-cyan-400 to-teal-600',
  'from-fuchsia-400 to-pink-600',
  'from-yellow-400 to-orange-500',
  'from-indigo-400 to-blue-600',
  'from-rose-400 to-red-600',
  'from-teal-400 to-cyan-600',
  'from-violet-400 to-purple-600',
  'from-lime-400 to-green-600',
  'from-sky-400 to-blue-600',
  'from-amber-400 to-yellow-600',
];

type PortfolioItem = { id: string; type: 'image' | 'video'; gradient: string; likes: number; views?: number };

const generatePortfolio = (tier: string, influencerId: string): PortfolioItem[] => {
  const stats = TIER_STATS[tier] || TIER_STATS.nano;
  const items: PortfolioItem[] = [];
  const seed = influencerId.charCodeAt(0);

  for (let i = 0; i < stats.itemCount; i++) {
    const isVideo = i >= stats.itemCount - stats.videoCount;
    const gradientIndex = (seed + i * 3) % PORTFOLIO_GRADIENTS.length;
    items.push({
      id: `${influencerId}-${i}`,
      type: isVideo ? 'video' : 'image',
      gradient: PORTFOLIO_GRADIENTS[gradientIndex],
      likes: Math.floor(50 + (seed + i * 7) % 900) * (tier === 'mega' ? 100 : tier === 'macro' ? 30 : tier === 'micro' ? 5 : 1),
      ...(isVideo ? { views: Math.floor(200 + (seed + i * 11) % 5000) * (tier === 'mega' ? 100 : tier === 'macro' ? 30 : tier === 'micro' ? 5 : 1) } : {}),
    });
  }
  return items;
};

// Replaced Emoji Pool with Image Logic


const CONTENT_PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Live Stream'];
const CONTENT_MOODS = ['Playful', 'Cheerful', 'Cozy', 'Energetic'];
// Actual speakable scripts — these are words the kid says out loud on camera
const CONTENT_HOOKS = [
  'Hey guys! You NEED to check out {topic} at my shop!',
  'Okay wait, let me show you something super cool about {topic}!',
  'Stop scrolling! I found the BEST thing ever — {topic}!',
  'You will NOT believe what {topic} can do, watch this!',
  'Three, two, one — let me introduce you to {topic}!',
];
const CONTENT_SCENES = [
  'Look at this! Isn\'t it amazing? I love everything about it!',
  'This is my favorite part right here. So cool, right?',
  'And the best thing? It\'s super affordable for what you get!',
  'Everyone who tried it said WOW, and I totally agree!',
  'I use this every single day and it never gets old!',
];
const CONTENT_CTAS = [
  'Come visit my shop and grab yours today! Link in bio!',
  'Drop a comment if you want one! See you at my shop!',
  'Follow me for more cool stuff and come check it out!',
  'Tag your bestie who needs this! See you at the shop!',
];
const CONTENT_HASHTAGS = [
  '#KidsBiz #ShopLife #FunFinds',
  '#AIGenius #MiniCEO #LocalShop',
  '#CreativeKids #TryThis #Shorts',
  '#PlayZone #NewDrop #Wow',
];

const CONTENT_COACH_TIPS = [
  { title: 'Pick one product', text: 'Show ONE cool item or deal in your video.', icon: Video },
  { title: 'Record with your phone', text: 'Use a screen recorder or camera and keep it steady.', icon: Camera },
  { title: 'Use a happy voice', text: 'Smile and speak clearly so friends can hear you.', icon: Mic },
  { title: 'Show the best moment', text: 'Zoom in on the fun part and add a wow effect.', icon: Play },
  { title: 'Tell them what to do', text: 'Say "Come visit my shop!" at the end.', icon: ClipboardCheck },
];

type ContentIdea = {
  id: string;
  title: string;
  hook: string;
  scenes: string[];
  cta: string;
  hashtags: string;
};

const DEFAULT_DURATION_OPTIONS = [
  { label: '1 Hour', hours: 1, multiplier: 0.1 },
  { label: '6 Hours', hours: 6, multiplier: 0.3 },
  { label: '12 Hours', hours: 12, multiplier: 0.5 },
  { label: '1 Day', hours: 24, multiplier: 1 },
  { label: '3 Days', hours: 72, multiplier: 2.5 },
  { label: '7 Days', hours: 168, multiplier: 5 },
];

const getTimeRemaining = (endedAt: string): string => {
  const end = new Date(endedAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHrs = hours % 24;
    return `${days}d ${remainHrs}h left`;
  }
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
};

export const MarketingModule = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const [searchParams] = useSearchParams();
  const {
    marketingAssets,
    influencerCampaigns,
    startInfluencerCampaign,
    dismissInfluencerCampaign,
    loadMarketingAssets,
    loadInfluencerCampaigns,
    rewards,
    updateBusiness,
    business,
  } = useAIpreneur();
  const { checkCoins, spendCoins } = useCoinCheck();

  const currentTvPoster = (business?.interior_config as any)?.tv_poster_url as string | undefined;
  const currentWallPosters = useMemo(() => {
    const raw = (business?.interior_config as any)?.wall_posters;
    if (Array.isArray(raw) && raw.length === 3) return raw.map((v: unknown) => (typeof v === 'string' && v ? v : null));
    return [null, null, null] as (string | null)[];
  }, [business?.interior_config]);
  const wallPosterSlot = searchParams.get('poster') === 'wall'
    ? parseInt(searchParams.get('slot') || '0', 10)
    : null;

  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const [selectedAd, setSelectedAd] = useState<typeof AD_SPACES[number] | null>(AD_SPACES[0]);
  const [adUpload, setAdUpload] = useState<string | null>(null);
  const [adPrompt, setAdPrompt] = useState('');
  const [adSaving, setAdSaving] = useState(false);
  const [generatingAssetId, setGeneratingAssetId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'ads' | 'content' | 'influencers' | null>(null);
  const [pricingCatalog, setPricingCatalog] = useState<PricingCatalog | null>(null);

  // Auto-open ad studio with Poster selected when navigated from TV or wall poster click
  useEffect(() => {
    const posterParam = searchParams.get('poster');
    if (posterParam === 'tv') {
      setActivePanel('ads');
      const tvSpace = AD_SPACES.find(s => s.id === 'poster');
      if (tvSpace) setSelectedAd(tvSpace);
    } else if (posterParam === 'wall') {
      setActivePanel('ads');
      const wallSpace = AD_SPACES.find(s => s.id === 'wall_poster');
      if (wallSpace) setSelectedAd(wallSpace);
    }
  }, [searchParams]);
  const durationOptions = useMemo(() => {
    const dynamic = (pricingCatalog?.economy as any)?.influencer?.duration_multipliers;
    if (!dynamic || typeof dynamic !== 'object') {
      return DEFAULT_DURATION_OPTIONS;
    }

    const options = [
      { label: '1 Hour', hours: 1, multiplier: Number(dynamic['1h_percent'] ?? 10) / 100 },
      { label: '6 Hours', hours: 6, multiplier: Number(dynamic['6h_percent'] ?? 30) / 100 },
      { label: '12 Hours', hours: 12, multiplier: Number(dynamic['12h_percent'] ?? 50) / 100 },
      { label: '1 Day', hours: 24, multiplier: Number(dynamic['24h_percent'] ?? 100) / 100 },
      { label: '3 Days', hours: 72, multiplier: Number(dynamic['72h_percent'] ?? 250) / 100 },
      { label: '7 Days', hours: 168, multiplier: Number(dynamic['168h_percent'] ?? 500) / 100 },
    ].map((opt) => ({
      ...opt,
      multiplier: Number.isFinite(opt.multiplier) && opt.multiplier > 0 ? opt.multiplier : 1,
    }));

    return options;
  }, [pricingCatalog]);

  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION_OPTIONS[3]); // Default: 1 Day
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const marketingAssetCost = useMemo(() => {
    const value = Number(pricingCatalog?.token_costs?.marketing_asset);
    return Number.isFinite(value) && value >= 0 ? value : COIN_COSTS.marketing_asset;
  }, [pricingCatalog]);
  const marketingContentCost = useMemo(() => {
    const value = Number(pricingCatalog?.token_costs?.marketing_content);
    return Number.isFinite(value) && value >= 0 ? value : COIN_COSTS.marketing_content;
  }, [pricingCatalog]);

  const influencerRoster = useMemo(() => {
    // Deterministic shuffle based on something constant or just random for now
    const shuffledAvatars = [...CHARACTER_AVATARS].sort(() => Math.random() - 0.5);
    const tierCosts = pricingCatalog?.influencer_tier_costs || {};
    return INFLUENCERS.map((inf, index) => ({
      ...inf,
      cost: Number(tierCosts[inf.tier] ?? inf.cost),
      // Assign a specific image avatar
      avatar: shuffledAvatars[index % shuffledAvatars.length],
      // Add a gradient based on tier
      gradient: index === 0 ? 'from-green-400 to-emerald-500' :
        index === 1 ? 'from-blue-400 to-indigo-500' :
          index === 2 ? 'from-purple-400 to-pink-500' :
            'from-orange-400 to-red-500'
    }));
  }, [pricingCatalog]);

  const [selectedInfluencer, setSelectedInfluencer] = useState<(typeof influencerRoster)[number] | null>(null);
  const [startingInfluencer, setStartingInfluencer] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<'shop' | 'product'>('shop');

  // Instagram-like influencer profile modal (step-by-step)
  const [showInfluencerProfile, setShowInfluencerProfile] = useState(false);
  const [profileInfluencer, setProfileInfluencer] = useState<(typeof influencerRoster)[number] | null>(null);
  const [viewingPortfolioItem, setViewingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [profileStep, setProfileStep] = useState<'portfolio' | 'campaign' | 'confirm'>('portfolio');

  const [contentTopic, setContentTopic] = useState('');
  const [contentPlatform, setContentPlatform] = useState(CONTENT_PLATFORMS[0]);
  const [contentMood, setContentMood] = useState(CONTENT_MOODS[0]);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [contentGenerating, setContentGenerating] = useState(false);
  const [reviews, setReviews] = useState<Array<{ id: string; influencerName: string; avatar: string; text: string; rating: number }>>([]);
  const [contentTipIndex, setContentTipIndex] = useState(0);

  // Script browser & content creation flow
  const [scriptBrowserOpen, setScriptBrowserOpen] = useState(false);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [selectedScript, setSelectedScript] = useState<ContentIdea | null>(null);
  const [showContentGuide, setShowContentGuide] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);

  useEffect(() => {
    loadMarketingAssets();
    loadInfluencerCampaigns();
  }, [loadMarketingAssets, loadInfluencerCampaigns]);

  useEffect(() => {
    let cancelled = false;

    const loadPricingCatalog = async () => {
      try {
        const catalog = await paymentApi.getPricingCatalog();
        if (!cancelled && catalog?.success) {
          setPricingCatalog(catalog);
        }
      } catch (error) {
        console.warn('[MarketingModule] Failed to load pricing catalog.', error);
      }
    };

    void loadPricingCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (durationOptions.length === 0) return;
    const exists = durationOptions.some((option) => option.hours === selectedDuration.hours);
    if (!exists) {
      setSelectedDuration(durationOptions[3] || durationOptions[0]);
    }
  }, [durationOptions, selectedDuration.hours]);

  useEffect(() => {
    if (activePanel !== 'content') return;
    const interval = setInterval(() => {
      setContentTipIndex((prev) => (prev + 1) % CONTENT_COACH_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activePanel]);

  const latestAssets = useMemo(() => {
    return (marketingAssets || []).slice(0, 4);
  }, [marketingAssets]);

  const resolveMarketingAssetUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/storage/marketing-assets/')) {
      const filename = url.split('/storage/marketing-assets/').pop();
      if (filename) {
        return getAssetUrl(`/aipreneur/marketing-asset/${filename}`);
      }
    }
    return url;
  };

  const resolveInfluencerAvatarUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/storage/influencers/')) {
      const filename = url.split('/storage/influencers/').pop();
      if (filename) {
        return getAssetUrl(`/aipreneur/influencer-avatar/${filename}`);
      }
    }
    return url;
  };

  const handleAdUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAdUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAd = async () => {
    if (!selectedAd) return;

    if (!adUpload) {
      setMessage({ text: 'Please upload an image first.', type: 'error' });
      return;
    }

    setAdSaving(true);
    try {
      setMessage({ text: 'Generating your ad in the background. You can close this and it will appear soon.', type: 'success' });

      const isPoster = selectedAd.type === 'poster';
      const response = await marketingAssetsApi.generate({
        asset_type: selectedAd.type,
        image_data: adUpload,
        prompt_hint: adPrompt.trim() || undefined,
        placement: selectedAd.type,
      });

      if (response.success) {
        setAdUpload(null);
        setAdPrompt('');

        // If the asset already has a URL (synchronous generation), handle immediately
        const assetUrl = response.asset?.asset_url;
        if (assetUrl) {
          setShowConfetti(true);
          setMessage({ text: `${selectedAd.name} generated!`, type: 'success' });
          setTimeout(() => setShowConfetti(false), 2000);
          await loadMarketingAssets();

          // Auto-set poster on TV or wall slot
          if (isPoster) {
            const isWallPoster = selectedAd.id === 'wall_poster';
            if (isWallPoster || (wallPosterSlot !== null && wallPosterSlot >= 0 && wallPosterSlot <= 2)) {
              const slot = wallPosterSlot ?? currentWallPosters.findIndex(p => !p);
              await handleSetWallPoster(assetUrl, slot >= 0 && slot <= 2 ? slot : 0);
            } else {
              await handleSetTvPoster(assetUrl);
            }
          }
        } else {
          // Asset is being generated async — poll for completion
          const assetId = response.asset?.id;
          if (assetId) {
            setGeneratingAssetId(assetId);
            setMessage({ text: `Generating ${selectedAd.name}... This may take a moment.`, type: 'success' });
            await loadMarketingAssets();

            const pollInterval = setInterval(async () => {
              try {
                const assets = await marketingAssetsApi.getAll();
                const updated = assets.assets?.find((a: any) => a.id === assetId);
                if (updated?.asset_url) {
                  clearInterval(pollInterval);
                  setGeneratingAssetId(null);
                  setShowConfetti(true);
                  setMessage({ text: `${selectedAd.name} is ready!`, type: 'success' });
                  setTimeout(() => setShowConfetti(false), 2000);
                  await loadMarketingAssets();

                  // Auto-set poster on TV or wall slot
                  if (isPoster) {
                    const isWallPoster = selectedAd.id === 'wall_poster';
                    if (isWallPoster || (wallPosterSlot !== null && wallPosterSlot >= 0 && wallPosterSlot <= 2)) {
                      const slot = wallPosterSlot ?? currentWallPosters.findIndex(p => !p);
                      await handleSetWallPoster(updated.asset_url, slot >= 0 && slot <= 2 ? slot : 0);
                    } else {
                      await handleSetTvPoster(updated.asset_url);
                    }
                  }
                }
              } catch (e) {
                console.error('Poll error:', e);
              }
            }, 3000);
            setTimeout(() => {
              clearInterval(pollInterval);
              setGeneratingAssetId(null);
            }, 60000);
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aipreneur:refresh'));
        }
      }
    } catch (error) {
      console.error('Failed to generate ad:', error);
      setMessage({ text: 'Failed to generate ad.', type: 'error' });
    } finally {
      setAdSaving(false);
    }
  };

  // --- TV Poster management ---
  const handleSetTvPoster = async (assetUrl: string) => {
    try {
      const resolvedUrl = resolveMarketingAssetUrl(assetUrl);
      await updateBusiness({
        interior_config: { ...(business?.interior_config || {}), tv_poster_url: resolvedUrl },
      });
      setMessage({ text: 'Poster set on your shop TV!', type: 'success' });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch {
      setMessage({ text: 'Failed to set TV poster.', type: 'error' });
    }
  };

  const handleRemoveTvPoster = async () => {
    try {
      const cfg = { ...(business?.interior_config || {}) } as Record<string, unknown>;
      delete cfg.tv_poster_url;
      await updateBusiness({ interior_config: cfg });
      setMessage({ text: 'TV poster removed.', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to remove poster.', type: 'error' });
    }
  };

  // --- Wall Poster management ---
  const handleSetWallPoster = async (assetUrl: string, slotIndex: number) => {
    try {
      const resolvedUrl = resolveMarketingAssetUrl(assetUrl);
      const posters = [...currentWallPosters];
      posters[slotIndex] = resolvedUrl;
      await updateBusiness({
        interior_config: { ...(business?.interior_config || {}), wall_posters: posters },
      });
      setMessage({ text: `Poster set on wall slot ${slotIndex + 1}!`, type: 'success' });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch {
      setMessage({ text: 'Failed to set wall poster.', type: 'error' });
    }
  };

  const handleRemoveWallPoster = async (slotIndex: number) => {
    try {
      const posters = [...currentWallPosters];
      posters[slotIndex] = null;
      await updateBusiness({
        interior_config: { ...(business?.interior_config || {}), wall_posters: posters },
      });
      setMessage({ text: `Wall poster slot ${slotIndex + 1} removed.`, type: 'success' });
    } catch {
      setMessage({ text: 'Failed to remove wall poster.', type: 'error' });
    }
  };

  const scaledCost = selectedInfluencer ? Math.round(selectedInfluencer.cost * selectedDuration.multiplier) : 0;

  const handleStartInfluencer = async (overrideInfluencer?: (typeof influencerRoster)[number]) => {
    const inf = overrideInfluencer || selectedInfluencer;
    if (!inf) return;

    setStartingInfluencer(true);
    try {
      const response = await startInfluencerCampaign({
        influencer_name: inf.name,
        influencer_tier: inf.tier as 'nano' | 'micro' | 'macro' | 'mega',
        influencer_avatar: inf.avatar,
        influencer_niche: inf.role,
        duration_hours: selectedDuration.hours,
      });

      if (response) {
        setShowConfetti(true);
        setMessage({ text: `${inf.name} is promoting your shop!`, type: 'success' });

        // Generate a new review
        const newReview = {
          id: Date.now().toString(),
          influencerName: inf.name,
          avatar: inf.avatar,
          text: PREDEFINED_REVIEWS[Math.floor(Math.random() * PREDEFINED_REVIEWS.length)],
          rating: 5
        };
        setReviews(prev => [newReview, ...prev]);

        setTimeout(() => setShowConfetti(false), 2500);
      }
    } catch (error) {
      console.error('Failed to start influencer campaign:', error);
      const message = error instanceof ApiError ? error.message : 'Failed to start campaign.';
      setMessage({ text: message, type: 'error' });
    } finally {
      setStartingInfluencer(false);
    }
  };

  const handleDismissCampaign = async (campaignId: string) => {
    setDismissingId(campaignId);
    try {
      const success = await dismissInfluencerCampaign(campaignId);
      if (success) {
        setMessage({ text: 'Influencer dismissed!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to dismiss.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Failed to dismiss.', type: 'error' });
    } finally {
      setDismissingId(null);
    }
  };

  const activeCampaigns = (influencerCampaigns || []).filter(c => {
    if (c.status === 'cancelled') return false;
    if (!c.ended_at) return true;
    return new Date(c.ended_at).getTime() > Date.now();
  });

  const expiredCampaigns = (influencerCampaigns || []).filter(c => {
    if (c.status === 'cancelled') return true;
    if (!c.ended_at) return false;
    return new Date(c.ended_at).getTime() <= Date.now();
  });

  const buildContentIdea = (topic: string): ContentIdea => {
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const themeTopic = topic || 'your shop';
    const hook = pick(CONTENT_HOOKS).replace('{topic}', themeTopic);
    const scenePool = [...CONTENT_SCENES];
    const scenes = Array.from({ length: 2 }).map(() => {
      const index = Math.floor(Math.random() * scenePool.length);
      const [scene] = scenePool.splice(index, 1);
      return scene;
    });
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${contentMood} Video Script`,
      hook,
      scenes,
      cta: pick(CONTENT_CTAS),
      hashtags: pick(CONTENT_HASHTAGS),
    };
  };

  const handleGenerateContent = async () => {
    const coinCheck = checkCoins('marketing_content', 1);
    if (!coinCheck.hasEnoughCoins) {
      setMessage({ text: `Not enough AI tokens. Need ${coinCheck.required}.`, type: 'error' });
      return;
    }

    setContentGenerating(true);
    try {
      const spendResult = await spendCoins('marketing_content', 1, `Content ideas for ${contentPlatform}`);
      if (!spendResult.success) {
        setMessage({ text: spendResult.error || 'Failed to use AI tokens.', type: 'error' });
        return;
      }

      const topic = contentTopic.trim();
      const ideas = Array.from({ length: 3 }).map(() => buildContentIdea(topic));
      setContentIdeas(ideas);
      setCurrentScriptIndex(0);
      setScriptBrowserOpen(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (error) {
      console.error('Failed to generate content ideas:', error);
      setMessage({ text: 'Failed to generate content ideas.', type: 'error' });
    } finally {
      setContentGenerating(false);
    }
  };

  return (
    <ModulePage
      title="Marketing"
      subtitle="Find Your Customers"
      icon={Megaphone}
      tone="orange"
      onBack={() => smartBack()}
      hero={<ModuleHero3D kind="marketing" caption="Tell the world your story" />}
      lesson={{
        title: 'Marketing finds your customers',
        body: 'Great products fail without great marketing. Match the message to the audience: posters for foot traffic, social for buzz, billboards for reach.',
      }}
      headerExtras={
        <div className={`${GLASS} hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl`}>
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-extrabold text-slate-900 dark:text-white text-xs tabular-nums">{rewards?.ai_tokens || 0}</span>
        </div>
      }
    >
      <Confetti show={showConfetti} />
      {/* Marketing-specific content begins here; the shared header +
          lesson card is now provided by <ModulePage>. */}

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed bottom-6 left-4 right-4 sm:bottom-auto sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] p-4 rounded-3xl flex items-center gap-4 border-l-8 shadow-xl sm:max-w-lg"
              style={message.type === 'success'
                ? { background: 'rgba(15, 30, 25, 0.9)', borderColor: 'rgb(34, 197, 94)', color: 'rgb(187, 247, 208)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
                : { background: 'rgba(30, 15, 15, 0.9)', borderColor: 'rgb(239, 68, 68)', color: 'rgb(254, 202, 202)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
              }
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                {message.type === 'success' ? <CheckCircle className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
              </div>
              <p className="font-bold text-lg">{message.text}</p>
              <button onClick={() => setMessage(null)} className="ml-auto p-2 opacity-50 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friendly intro — orients the kid before the 3 big choices. */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            Pick how you want to spread the word!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Three studios, three superpowers. Try them all and see what brings the biggest crowds.
          </p>
        </div>

        {/* Main Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
          <motion.button
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePanel('ads')}
            className="relative h-80 rounded-[2.5rem] overflow-hidden group shadow-2xl transition-colors"
            style={{ border: '2px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-white/20 group-hover:scale-110 transition-transform duration-300" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <ImageIcon className="w-12 h-12 text-white drop-shadow-md" />
              </div>
              <h3 className="text-3xl font-black text-white drop-shadow-lg mb-2">Ad Studio</h3>
              <p className="text-orange-100 font-bold text-sm bg-black/20 px-4 py-1 rounded-full">
                Make Banners ({marketingAssetCost} AI)
              </p>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePanel('content')}
            className="relative h-80 rounded-[2.5rem] overflow-hidden group shadow-2xl transition-colors"
            style={{ border: '2px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-white/20 group-hover:scale-110 transition-transform duration-300" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <Video className="w-12 h-12 text-white drop-shadow-md" />
              </div>
              <h3 className="text-3xl font-black text-white drop-shadow-lg mb-2">Content Lab</h3>
              <p className="text-cyan-100 font-bold text-sm bg-black/20 px-4 py-1 rounded-full">
                Viral Videos ({marketingContentCost} AI)
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePanel('influencers')}
            className="relative h-80 rounded-[2.5rem] overflow-hidden group shadow-2xl transition-colors"
            style={{ border: '2px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-4 ring-white/20 group-hover:scale-110 transition-transform duration-300" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <Users className="w-12 h-12 text-white drop-shadow-md" />
              </div>
              <h3 className="text-3xl font-black text-white drop-shadow-lg mb-2">Team Up</h3>
              <p className="text-purple-100 font-bold text-sm bg-black/20 px-4 py-1 rounded-full">Hire Promoters</p>
            </div>
          </motion.button>
        </div>

        {/* Modal Panel */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              onClick={() => setActivePanel(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 50, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-6 md:p-8 shadow-2xl custom-scrollbar relative"
                style={{
                  background: 'rgba(15, 15, 30, 0.7)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-8 sticky top-0 z-20 pb-4 pt-2" style={{ background: 'rgba(15, 15, 30, 0.9)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-3 rounded-2xl ${activePanel === 'ads' ? 'bg-orange-500' : activePanel === 'content' ? 'bg-cyan-500' : 'bg-purple-500'
                        }`}>
                        {activePanel === 'ads' && <ImageIcon className="w-6 h-6 text-white" />}
                        {activePanel === 'content' && <Video className="w-6 h-6 text-white" />}
                        {activePanel === 'influencers' && <Users className="w-6 h-6 text-white" />}
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {activePanel === 'ads' && 'Ad Studio'}
                        {activePanel === 'content' && 'Content Lab'}
                        {activePanel === 'influencers' && 'Promoter Squad'}
                      </h2>
                    </div>
                    <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {activePanel === 'ads' && 'Create awesome banners for your shop!'}
                      {activePanel === 'content' && 'Learn to be a social media star!'}
                      {activePanel === 'influencers' && 'Pick a famous friend to help you!'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <X className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>

                {/* ADS PANEL */}
                {activePanel === 'ads' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {AD_SPACES.map((ad) => (
                        <div key={ad.id} className="relative group">
                          <button
                            onClick={() => {
                              setSelectedAd(ad);
                              setAdUpload(null);
                              setAdPrompt('');
                            }}
                            className="w-full p-3 rounded-2xl text-left transition-all h-full"
                            style={selectedAd?.id === ad.id
                              ? { border: '2px solid rgba(249, 115, 22, 0.5)', background: 'rgba(249, 115, 22, 0.1)', boxShadow: '0 0 30px rgba(249,115,22,0.15)' }
                              : { border: '2px solid rgba(255, 255, 255, 0.06)', background: 'rgba(255, 255, 255, 0.04)' }
                            }
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={selectedAd?.id === ad.id ? { background: 'rgba(249, 115, 22, 0.6)' } : { background: 'rgba(255, 255, 255, 0.05)' }}>
                              <ad.icon className="w-5 h-5" style={selectedAd?.id === ad.id ? { color: '#fff' } : { color: 'rgba(255,255,255,0.3)' }} />
                            </div>
                            <span className="text-white font-bold text-sm block leading-tight">{ad.name}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 block" style={{ color: 'rgba(255,255,255,0.3)' }}>{ad.vibe}</span>
                          </button>
                          {selectedAd?.id === ad.id && (
                            <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1 rounded-full shadow-lg animate-bounce">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[2.5rem] p-4 sm:p-8" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div className="flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 hover:bg-white/5 transition-all text-center group cursor-pointer relative" style={{ border: '4px dashed rgba(255, 255, 255, 0.06)' }}>
                        <label className="absolute inset-0 cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleAdUpload} />
                        </label>
                        {adUpload ? (
                          <img src={adUpload} alt="Preview" className="h-64 max-w-full rounded-2xl object-cover shadow-2xl" />
                        ) : (
                          <>
                            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                              <ImageIcon className="w-10 h-10 text-orange-400" />
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Drop an Image Here</h4>
                            <p style={{ color: 'rgba(255,255,255,0.3)' }}>or click to browse your files</p>
                          </>
                        )}
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        <input
                          value={adPrompt}
                          onChange={(e) => setAdPrompt(e.target.value)}
                          placeholder="✨ Magic instructions (e.g., 'Make it sparkle', 'Add rainbows')"
                          className="flex-1 h-14 sm:h-16 rounded-2xl px-6 text-base sm:text-lg text-white font-medium focus:outline-none"
                          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#fff' }}
                        />
                        <button
                          onClick={handleGenerateAd}
                          disabled={adSaving}
                          className="h-14 sm:h-16 px-8 rounded-2xl text-white font-black text-base sm:text-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.7), rgba(239, 68, 68, 0.7))', boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}
                        >
                          {adSaving ? <div className="animate-spin">⌛</div> : <Sparkles className="w-5 h-5" />}
                          {adSaving ? 'Cooking...' : `Generate (${marketingAssetCost} AI)`}
                        </button>
                      </div>

                      {selectedAd?.type === 'poster' && (
                        <div className="mt-3 flex flex-wrap gap-2 justify-center">
                          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                            🎬 Random style applied!
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Retro Cinema · Neon Glow · Comic Book · Watercolor · Kawaii · Space Galaxy · Graffiti · Pixel Art
                          </span>
                        </div>
                      )}

                      <div className="mt-3 text-center">
                        <span className="text-yellow-400 font-bold text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
                          Cost: {marketingAssetCost} AI tokens
                        </span>
                      </div>
                    </div>

                    {/* Current TV Poster */}
                    <div className="rounded-[2rem] p-6" style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
                      <h4 className="font-black text-white text-lg mb-3 flex items-center gap-2">📺 Your Shop TV Poster</h4>
                      {currentTvPoster ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <img src={currentTvPoster} alt="TV Poster" className="w-40 h-28 object-cover rounded-2xl border-2 border-indigo-400/30 shadow-lg" />
                          <div className="flex-1 text-center sm:text-left">
                            <p className="text-green-400 font-bold text-sm mb-2">Currently displaying on your shop TV!</p>
                            <div className="flex gap-2 justify-center sm:justify-start">
                              <button onClick={handleRemoveTvPoster} className="px-4 py-2 rounded-xl text-sm font-bold text-red-400 transition-all hover:bg-red-500/10" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          No poster yet — generate an ad below and tap &quot;Set as TV Poster&quot; to display it in your shop!
                        </p>
                      )}
                    </div>

                    {/* Wall Posters (3 slots) */}
                    <div className="rounded-[2rem] p-6" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid rgba(168,85,247,0.2)' }}>
                      <h4 className="font-black text-white text-lg mb-3 flex items-center gap-2">🖼️ Wall Posters ({currentWallPosters.filter(Boolean).length}/3)</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((slot) => {
                          const posterUrl = currentWallPosters[slot];
                          const resolved = posterUrl ? resolveMarketingAssetUrl(posterUrl) : null;
                          return (
                            <div key={slot} className="relative">
                              {resolved ? (
                                <div className="relative group">
                                  <img src={resolved} alt={`Wall ${slot + 1}`} className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-purple-400/30 shadow-lg" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                    <button onClick={() => handleRemoveWallPoster(slot)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                                      Remove
                                    </button>
                                  </div>
                                  <span className="absolute top-1 left-1 text-[9px] font-bold text-white/70 bg-black/40 px-1.5 py-0.5 rounded-md">Slot {slot + 1}</span>
                                </div>
                              ) : (
                                <div
                                  className="w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400/50 transition-colors"
                                  style={{ border: '2px dashed rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.04)' }}
                                  onClick={() => {
                                    // Select wall poster type and set URL param for slot targeting
                                    const wallSpace = AD_SPACES.find(s => s.id === 'wall_poster');
                                    if (wallSpace) setSelectedAd(wallSpace);
                                    // Update URL to include slot info so generation auto-assigns
                                    navigate(`/s/aipreneur/marketing?poster=wall&slot=${slot}`, { replace: true });
                                  }}
                                >
                                  <span className="text-purple-400/50 text-2xl mb-1">+</span>
                                  <span className="text-purple-400/40 text-[10px] font-bold">Slot {slot + 1}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Generate a poster and assign it to a wall slot, or click an empty frame on the right wall in your shop!
                      </p>
                    </div>

                    {(latestAssets.length > 0 || generatingAssetId) && (
                      <div className="pt-4">
                        <h4 className="font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Your Masterpieces</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {generatingAssetId && (
                            <div className="aspect-square rounded-3xl overflow-hidden relative flex flex-col items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.06)', border: '2px dashed rgba(249, 115, 22, 0.3)' }}>
                              <div className="w-10 h-10 border-3 border-orange-400 border-t-transparent rounded-full animate-spin mb-3" />
                              <span className="text-orange-400 font-bold text-xs">Generating...</span>
                            </div>
                          )}
                          {latestAssets.map((asset) => {
                            const resolved = resolveMarketingAssetUrl(asset.asset_url);
                            const isCurrentPoster = currentTvPoster && resolved === currentTvPoster;
                            return (
                              <div key={asset.id} className="rounded-3xl overflow-hidden relative group" style={{ border: isCurrentPoster ? '2px solid rgba(99,102,241,0.6)' : '1px solid rgba(255, 255, 255, 0.06)' }}>
                                {asset.asset_url ? (
                                  <img src={resolved} alt="Asset" className="w-full aspect-square object-cover" />
                                ) : (
                                  <div className="w-full aspect-square flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin mb-2" />
                                    <span className="text-white/30 text-xs font-bold">Processing...</span>
                                  </div>
                                )}
                                {asset.asset_url && (
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                    <span className="text-white font-bold text-xs uppercase">{asset.asset_type}</span>
                                    {isCurrentPoster ? (
                                      <span className="text-green-400 font-bold text-[10px] px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">On TV</span>
                                    ) : (
                                      <button
                                        onClick={() => handleSetTvPoster(asset.asset_url)}
                                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:scale-105"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
                                      >
                                        📺 Set as TV Poster
                                      </button>
                                    )}
                                    {asset.asset_url && (
                                      <div className="flex gap-1">
                                        {[0, 1, 2].map((slot) => (
                                          <button
                                            key={slot}
                                            onClick={() => handleSetWallPoster(asset.asset_url, slot)}
                                            className="px-1.5 py-1 rounded-lg text-[9px] font-bold text-white/80 hover:text-white transition-all hover:scale-105"
                                            style={{ background: 'rgba(168,85,247,0.35)', border: '1px solid rgba(168,85,247,0.4)' }}
                                          >
                                            🖼️ {slot + 1}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CONTENT PANEL */}
                {activePanel === 'content' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Coach Card */}
                      <div className="rounded-[2.5rem] p-5 sm:p-8 relative overflow-hidden" style={{ background: 'rgba(6, 182, 212, 0.08)', border: '2px solid rgba(6, 182, 212, 0.15)' }}>
                        <Bot className="absolute -bottom-8 -right-8 w-48 h-48 text-cyan-400/20 rotate-12" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center text-4xl shadow-lg">🤖</div>
                            <div>
                              <div className="text-cyan-300 font-black uppercase tracking-widest text-xs">AI Coach</div>
                              <h3 className="text-2xl font-black text-white">Video Tips</h3>
                            </div>
                          </div>
                          <div className="rounded-3xl p-6 min-h-[140px] flex flex-col justify-center" style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={contentTipIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                              >
                                <h4 className="text-xl font-bold text-white mb-2">{CONTENT_COACH_TIPS[contentTipIndex].title}</h4>
                                <p className="text-cyan-100 leading-relaxed font-medium">{CONTENT_COACH_TIPS[contentTipIndex].text}</p>
                              </motion.div>
                            </AnimatePresence>
                          </div>
                          <button
                            onClick={() => setContentTipIndex((i) => (i + 1) % CONTENT_COACH_TIPS.length)}
                            className="mt-4 w-full py-3 rounded-xl text-cyan-300 font-bold text-sm uppercase tracking-wider transition-colors"
                            style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.15)' }}
                          >
                            Next Tip &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Generator Controls */}
                      <div className="rounded-[2.5rem] p-5 sm:p-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div className="mb-6">
                          <label className="text-xs font-black uppercase tracking-widest pl-2 mb-2 block" style={{ color: 'rgba(255,255,255,0.3)' }}>Video Topic</label>
                          <input
                            value={contentTopic}
                            onChange={(e) => setContentTopic(e.target.value)}
                            placeholder="e.g. My new toy, Summer Sale, Cat video..."
                            className="w-full h-14 rounded-2xl px-5 text-white focus:outline-none font-bold text-lg"
                            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          />
                        </div>

                        <div className="mb-6">
                          <label className="text-xs font-black uppercase tracking-widest pl-2 mb-2 block" style={{ color: 'rgba(255,255,255,0.3)' }}>Mood</label>
                          <div className="grid grid-cols-2 gap-2">
                            {CONTENT_MOODS.map(m => (
                              <button
                                key={m}
                                onClick={() => setContentMood(m)}
                                className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                                style={contentMood === m
                                  ? { background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(139, 92, 246, 0.6))', color: '#fff', border: '2px solid rgba(236, 72, 153, 0.4)' }
                                  : { background: 'transparent', border: '2px solid rgba(255, 255, 255, 0.06)', color: 'rgba(255,255,255,0.5)' }
                                }
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleGenerateContent}
                          disabled={contentGenerating}
                          className="w-full py-4 rounded-2xl text-white text-xl font-black shadow-lg transition-all"
                          style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0.6))', boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}
                        >
                          {contentGenerating ? 'Thinking...' : `⚡ Generate Ideas (${marketingContentCost} AI)`}
                        </button>
                        <p className="text-center text-[11px] text-white/45 mt-2">
                          Cost is charged when AI ideas are generated.
                        </p>
                      </div>
                    </div>

                    {/* Script Browser Modal (one by one) */}
                    <AnimatePresence>
                      {scriptBrowserOpen && contentIdeas.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                          onClick={() => setScriptBrowserOpen(false)}
                        >
                          <motion.div
                            key={currentScriptIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border-4 border-gray-200 relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-t-[2rem]" />

                            <div className="text-center mt-2 mb-4">
                              <span className="bg-black text-white text-xs font-black uppercase px-3 py-1 rounded-full">
                                Script {currentScriptIndex + 1} of {contentIdeas.length}
                              </span>
                            </div>

                            <h4 className="text-xl font-black leading-tight mb-4 text-black">
                              "{contentIdeas[currentScriptIndex].hook}"
                            </h4>

                            <div className="bg-gray-100 rounded-xl p-4 mb-4 space-y-2">
                              {contentIdeas[currentScriptIndex].scenes.map((scene, idx) => (
                                <div key={idx} className="flex gap-3 text-sm font-medium text-gray-700">
                                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                  <span>{scene}</span>
                                </div>
                              ))}
                            </div>

                            <div className="mb-6">
                              <p className="text-xs font-bold text-gray-400 uppercase">Call to action</p>
                              <p className="text-pink-600 font-black">{contentIdeas[currentScriptIndex].cta}</p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  if (currentScriptIndex < contentIdeas.length - 1) {
                                    setCurrentScriptIndex(prev => prev + 1);
                                  } else {
                                    setScriptBrowserOpen(false);
                                  }
                                }}
                                className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-600 font-bold hover:bg-gray-300 transition-colors"
                              >
                                {currentScriptIndex < contentIdeas.length - 1 ? 'Skip →' : 'Close'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedScript(contentIdeas[currentScriptIndex]);
                                  setScriptBrowserOpen(false);
                                  setShowContentGuide(true);
                                }}
                                className="flex-[2] py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                                style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8))' }}
                              >
                                <Sparkles className="w-5 h-5" />
                                Use This Script
                              </button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Practice Complete Screen */}
                    {practiceComplete && selectedScript && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-7xl mb-6"
                        >
                          🎬
                        </motion.div>
                        <h2 className="text-3xl font-black text-white mb-3">Great Practice!</h2>
                        <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          You rehearsed your script like a pro! Now open TikTok or Instagram and record your real video!
                        </p>

                        <div className="rounded-2xl p-4 max-w-sm mx-auto mb-8 text-left" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <p className="text-cyan-400 font-bold text-sm mb-1">Your Script Hook:</p>
                          <p className="text-white font-medium">"{selectedScript.hook}"</p>
                        </div>

                        <div className="flex flex-col gap-3 max-w-sm mx-auto">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => window.open('https://www.tiktok.com', '_blank')}
                            className="w-full py-4 bg-gradient-to-r from-[#ff0050] to-[#00f2ea] rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2"
                          >
                            Now Do Your Video in TikTok!
                          </motion.button>
                          <button
                            onClick={() => {
                              setSelectedScript(null);
                              setContentIdeas([]);
                              setPracticeComplete(false);
                            }}
                            className="w-full py-3 rounded-2xl font-bold transition-colors"
                            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.4)' }}
                          >
                            Back to Content Lab
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Content Creation Guide */}
                    {selectedScript && (
                      <ContentCreationGuide
                        isOpen={showContentGuide}
                        onClose={() => setShowContentGuide(false)}
                        onStartRecording={() => {
                          setShowContentGuide(false);
                          setShowTeleprompter(true);
                        }}
                        scriptHook={selectedScript.hook}
                        scriptScenes={selectedScript.scenes}
                        scriptCta={selectedScript.cta}
                      />
                    )}

                    {/* Practice Teleprompter */}
                    {selectedScript && (
                      <PracticeTeleprompter
                        isOpen={showTeleprompter}
                        onClose={() => setShowTeleprompter(false)}
                        onDone={() => {
                          setShowTeleprompter(false);
                          setPracticeComplete(true);
                        }}
                        scriptHook={selectedScript.hook}
                        scriptScenes={selectedScript.scenes}
                        scriptCta={selectedScript.cta}
                      />
                    )}

                    {/* Workshop Promo */}
                    <div className="relative rounded-[3rem] overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.8), rgba(139, 92, 246, 0.8))' }}>
                      <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left">
                          <span className="inline-block px-4 py-1 rounded-full text-xs font-black text-white uppercase tracking-widest mb-3" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>Live Event</span>
                          <h3 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight">Content Creator <br /><span className="text-yellow-300">Workshop</span></h3>
                          <p className="text-indigo-100 text-lg font-medium max-w-md">Join our weekly class! Learn lighting, editing, and how to be a confident host.</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] rotate-3 shadow-xl max-w-xs w-full">
                          <div className="flex -space-x-2 justify-center mb-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white" />)}
                          </div>
                          <button
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-colors"
                            onClick={() => navigate('/s/classes?category=content')}
                          >
                            Book a Slot
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INFLUENCERS PANEL */}
                {activePanel === 'influencers' && (
                  <div className="space-y-6">
                    {/* Game-style Creator Roster */}
                    <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'rgba(15, 15, 30, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <h4 className="font-bold uppercase tracking-widest text-xs sm:text-sm mb-4 sm:mb-6 pl-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Select Your Ally</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {influencerRoster.map((inf) => {
                          const tierStats = TIER_STATS[inf.tier] || TIER_STATS.nano;
                          const tierColor = inf.tier === 'nano' ? 'rgba(156, 163, 175, 0.4)' :
                                           inf.tier === 'micro' ? 'rgba(59, 130, 246, 0.4)' :
                                           inf.tier === 'macro' ? 'rgba(139, 92, 246, 0.4)' :
                                           'rgba(234, 179, 8, 0.4)';
                          const tierBorder = inf.tier === 'nano' ? 'rgba(156, 163, 175, 0.25)' :
                                            inf.tier === 'micro' ? 'rgba(59, 130, 246, 0.25)' :
                                            inf.tier === 'macro' ? 'rgba(139, 92, 246, 0.25)' :
                                            'rgba(234, 179, 8, 0.25)';
                          const reachPct = inf.tier === 'nano' ? '15%' : inf.tier === 'micro' ? '35%' : inf.tier === 'macro' ? '65%' : '100%';

                          return (
                            <button
                              key={inf.id}
                              onClick={() => {
                                setProfileInfluencer(inf);
                                setSelectedInfluencer(inf);
                                setProfileStep('portfolio');
                                setShowInfluencerProfile(true);
                              }}
                              className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all overflow-hidden group hover:scale-[1.03] active:scale-[0.98]"
                              style={{ background: 'rgba(15, 15, 30, 0.8)', border: `1px solid ${tierBorder}` }}
                            >
                              {/* Tier accent bar */}
                              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: tierColor }} />

                              {/* Tier badge */}
                              <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider"
                                style={{ background: tierColor, color: 'rgba(255,255,255,0.9)' }}
                              >
                                {inf.tier}
                              </div>

                              {/* Avatar */}
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-2 sm:mb-3 overflow-hidden transition-all"
                                style={{ boxShadow: `0 0 0 2px ${tierBorder}` }}
                              >
                                <img src={resolveInfluencerAvatarUrl(inf.avatar)} alt={inf.name} className="w-full h-full object-cover" />
                              </div>

                              {/* Name & Role */}
                              <p className="font-bold text-white text-center text-xs sm:text-sm leading-tight">{inf.name}</p>
                              <p className="text-[9px] sm:text-[10px] text-white/30 text-center font-bold mt-0.5">{inf.role}</p>

                              {/* Stats bar */}
                              <div className="mt-2.5 sm:mt-3 space-y-1.5">
                                <div>
                                  <div className="flex justify-between text-[8px] sm:text-[9px] text-white/25 font-bold mb-0.5">
                                    <span>REACH</span>
                                    <span>{tierStats.followers}</span>
                                  </div>
                                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: reachPct, background: tierColor }} />
                                  </div>
                                </div>
                                <div className="text-center pt-0.5">
                                  <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: 'rgba(234, 179, 8, 0.5)' }}>from {Math.round(inf.cost * (durationOptions[0]?.multiplier || 1))} AI</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Instagram-like Profile Modal */}
                    <AnimatePresence>
                      {showInfluencerProfile && profileInfluencer && (() => {
                        const tierStats = TIER_STATS[profileInfluencer.tier] || TIER_STATS.nano;
                        const portfolio = generatePortfolio(profileInfluencer.tier, profileInfluencer.id);
                        const profileScaledCost = Math.round(profileInfluencer.cost * selectedDuration.multiplier);

                        return (
                          <motion.div
                            key="influencer-profile"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center pt-10 md:pt-0"
                          >
                            {/* Backdrop */}
                            <div
                              className="absolute inset-0"
                              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                              onClick={() => setShowInfluencerProfile(false)}
                            />

                            {/* Modal */}
                            <motion.div
                              initial={{ opacity: 0, y: "100%" }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: "100%" }}
                              transition={{ type: "spring", damping: 25, stiffness: 200 }}
                              className="relative z-10 w-full h-[85dvh] md:h-auto md:max-h-[85vh] md:max-w-lg rounded-t-[2.5rem] md:rounded-3xl overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                              style={{ background: '#0a0a1a', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              {/* Mobile drag pill indicator */}
                              <div className="w-full flex justify-center py-3 md:hidden absolute top-0 z-20">
                                <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                              </div>

                              {/* Header bar with step indicator */}
                              <div className="flex items-center justify-between p-4 pt-8 md:pt-4 flex-shrink-0 relative z-10" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <button
                                  onClick={() => {
                                    if (profileStep === 'campaign') setProfileStep('portfolio');
                                    else if (profileStep === 'confirm') setProfileStep('campaign');
                                    else setShowInfluencerProfile(false);
                                  }}
                                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all outline-none"
                                  style={{ background: 'rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                >
                                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </button>

                                {/* Step dots */}
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {(['portfolio', 'campaign', 'confirm'] as const).map((s, i) => (
                                    <div key={s} className="flex items-center gap-2">
                                      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${profileStep === s ? 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)] scale-125' :
                                        (['portfolio', 'campaign', 'confirm'].indexOf(profileStep) > i) ? 'bg-green-400' : ''
                                        }`} style={profileStep !== s && !(['portfolio', 'campaign', 'confirm'].indexOf(profileStep) > i) ? { background: 'rgba(255,255,255,0.1)' } : {}} />
                                      {i < 2 && <div className="w-4 sm:w-6 h-[2px] rounded-full transition-all duration-300" style={(['portfolio', 'campaign', 'confirm'].indexOf(profileStep) > i) ? { background: 'rgb(74, 222, 128)' } : { background: 'rgba(255,255,255,0.1)' }} />}
                                    </div>
                                  ))}
                                </div>

                                <button
                                  onClick={() => setShowInfluencerProfile(false)}
                                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all outline-none"
                                  style={{ background: 'rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                >
                                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/50 hover:text-white transition-colors" />
                                </button>
                              </div>

                              {/* Scrollable content */}
                              <div className="flex-1 overflow-y-auto">
                                <AnimatePresence mode="wait">

                                  {/* STEP 1: PORTFOLIO */}
                                  {profileStep === 'portfolio' && (
                                    <motion.div
                                      key="portfolio"
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                    >
                                      {/* Profile section */}
                                      <div className="p-4 sm:p-6">
                                        <div className="flex items-center gap-3 sm:gap-6 mb-4 sm:mb-5">
                                          <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full p-0.5 sm:p-1 bg-gradient-to-br ${profileInfluencer.gradient} flex-shrink-0`}>
                                            <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                              <img src={resolveInfluencerAvatarUrl(profileInfluencer.avatar)} alt={profileInfluencer.name} className="w-full h-full object-cover" />
                                            </div>
                                          </div>
                                          <div className="flex-1 flex justify-around">
                                            <div className="text-center">
                                              <p className="text-white font-black text-sm sm:text-lg leading-tight">{tierStats.posts}</p>
                                              <p className="text-[10px] sm:text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Posts</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-white font-black text-sm sm:text-lg leading-tight">{tierStats.followers}</p>
                                              <p className="text-[10px] sm:text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Followers</p>
                                            </div>
                                            <div className="text-center">
                                              <p className="text-white font-black text-sm sm:text-lg leading-tight">{tierStats.following}</p>
                                              <p className="text-[10px] sm:text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Following</p>
                                            </div>
                                          </div>
                                        </div>

                                        <p className="text-white font-bold text-base sm:text-lg">{profileInfluencer.name}</p>
                                        <p className="text-purple-300 text-xs sm:text-sm font-bold">{profileInfluencer.role}</p>
                                        <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Played by: {profileInfluencer.artistName}</p>
                                        <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{tierStats.bio}</p>

                                        {/* Tier badge inline */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                          <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-gradient-to-r ${profileInfluencer.gradient} text-white`}>
                                            {profileInfluencer.tier} creator
                                          </span>
                                          <span className="px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.4)' }}>
                                            {profileInfluencer.vibe}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Portfolio grid tab */}
                                      <div className="flex justify-center py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          <Grid3x3 className="w-4 h-4" />
                                          <span className="text-xs font-bold uppercase tracking-wider">Portfolio</span>
                                        </div>
                                      </div>

                                      {/* Portfolio grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2px] sm:gap-[3px] p-[2px] sm:p-[3px]">
                                        {portfolio.map((item) => (
                                          <button
                                            key={item.id}
                                            onClick={() => setViewingPortfolioItem(item)}
                                            className={`aspect-square bg-gradient-to-br ${item.gradient} relative group cursor-pointer overflow-hidden transition-all hover:brightness-110 active:scale-[0.98] outline-none border-none`}
                                          >
                                            {item.type === 'video' && (
                                              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-[11px] text-white font-bold shadow-sm">
                                                <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                                                {item.views && item.views > 1000 ? `${(item.views / 1000).toFixed(1)}K` : item.views}
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                                                <Heart className="w-5 h-5 fill-white" />
                                                {item.likes > 1000 ? `${(item.likes / 1000).toFixed(1)}K` : item.likes}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>

                                      <div className="h-4" />
                                    </motion.div>
                                  )}

                                  {/* STEP 2: CAMPAIGN SETUP */}
                                  {profileStep === 'campaign' && (
                                    <motion.div
                                      key="campaign"
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      className="p-4 sm:p-6"
                                    >
                                      {/* Mini profile recap */}
                                      <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 p-3 sm:p-4 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                        <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-br ${profileInfluencer.gradient} flex-shrink-0`}>
                                          <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            <img src={resolveInfluencerAvatarUrl(profileInfluencer.avatar)} alt={profileInfluencer.name} className="w-full h-full object-cover" />
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-white font-bold text-sm sm:text-base">{profileInfluencer.name}</p>
                                          <p className="text-purple-300 text-[10px] sm:text-xs font-bold">{tierStats.followers} followers</p>
                                        </div>
                                      </div>

                                      {/* Review Target */}
                                      <div className="mb-5 sm:mb-6">
                                        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 sm:mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>What should they review?</p>
                                        <div className="flex rounded-xl p-1" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                          <button
                                            onClick={() => setReviewTarget('shop')}
                                            className="flex-1 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all"
                                            style={reviewTarget === 'shop' ? { background: 'rgba(139, 92, 246, 0.6)', color: '#fff', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' } : { color: 'rgba(255,255,255,0.3)' }}
                                          >
                                            Review Shop
                                          </button>
                                          <button
                                            onClick={() => setReviewTarget('product')}
                                            className="flex-1 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all"
                                            style={reviewTarget === 'product' ? { background: 'rgba(236, 72, 153, 0.6)', color: '#fff', boxShadow: '0 4px 15px rgba(236,72,153,0.3)' } : { color: 'rgba(255,255,255,0.3)' }}
                                          >
                                            Review Product
                                          </button>
                                        </div>
                                      </div>

                                      {/* Duration Selection */}
                                      <div className="mb-5 sm:mb-6">
                                        <p className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 sm:mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> How long?
                                        </p>
                                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                          {durationOptions.map((opt) => (
                                            <button
                                              key={opt.hours}
                                              onClick={() => setSelectedDuration(opt)}
                                              className="py-3 sm:py-4 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all"
                                              style={selectedDuration.hours === opt.hours
                                                ? { background: 'rgba(139, 92, 246, 0.2)', border: '2px solid rgba(139, 92, 246, 0.5)', color: '#fff', boxShadow: '0 0 15px rgba(139,92,246,0.2)' }
                                                : { background: 'rgba(255, 255, 255, 0.04)', border: '2px solid rgba(255, 255, 255, 0.06)', color: 'rgba(255,255,255,0.3)' }
                                              }
                                            >
                                              {opt.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Cost Preview */}
                                      <div className="rounded-2xl p-4 sm:p-5 text-center" style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                                        <p className="text-[10px] sm:text-xs font-bold uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Total Cost</p>
                                        <p className="text-yellow-300 text-2xl sm:text-3xl font-black">{profileScaledCost} <span className="text-sm sm:text-lg" style={{ color: 'rgba(234,179,8,0.5)' }}>AI tokens</span></p>
                                        <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>for {selectedDuration.label.toLowerCase()}</p>
                                      </div>

                                      <div className="h-4" />
                                    </motion.div>
                                  )}

                                  {/* STEP 3: CONFIRM & HIRE */}
                                  {profileStep === 'confirm' && (
                                    <motion.div
                                      key="confirm"
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      className="p-4 sm:p-6"
                                    >
                                      <div className="text-center mb-5 sm:mb-6">
                                        <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400 mx-auto mb-2 sm:mb-3" />
                                        <h3 className="text-xl sm:text-2xl font-black text-white">Ready to Hire?</h3>
                                        <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Review your campaign details</p>
                                      </div>

                                      {/* Summary card */}
                                      <div className="rounded-2xl overflow-hidden mb-5 sm:mb-6" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                        {/* Influencer */}
                                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-br ${profileInfluencer.gradient} flex-shrink-0`}>
                                            <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                              <img src={resolveInfluencerAvatarUrl(profileInfluencer.avatar)} alt={profileInfluencer.name} className="w-full h-full object-cover" />
                                            </div>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-white font-bold text-sm sm:text-lg truncate">{profileInfluencer.name}</p>
                                            <p className="text-purple-300 text-xs sm:text-sm font-bold">{profileInfluencer.role}</p>
                                            <p className="text-[10px] sm:text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{tierStats.followers} followers</p>
                                          </div>
                                        </div>

                                        {/* Details */}
                                        <div>
                                          <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                            <span className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Review Type</span>
                                            <span className="text-white font-bold text-xs sm:text-sm capitalize">{reviewTarget}</span>
                                          </div>
                                          <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                            <span className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Duration</span>
                                            <span className="text-white font-bold text-xs sm:text-sm">{selectedDuration.label}</span>
                                          </div>
                                          <div className="flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3">
                                            <span className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Cost</span>
                                            <span className="text-yellow-400 font-black text-base sm:text-lg">{profileScaledCost} tokens</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="h-4" />
                                    </motion.div>
                                  )}

                                </AnimatePresence>
                              </div>

                              {/* Portfolio Item Popup (shows above everything) */}
                              <AnimatePresence>
                                {viewingPortfolioItem && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md"
                                  >
                                    <div className="absolute inset-0 bg-black/80" onClick={() => setViewingPortfolioItem(null)} />
                                    <motion.div
                                      initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                      animate={{ scale: 1, y: 0, opacity: 1 }}
                                      exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                      className="relative z-10 w-full max-w-sm sm:max-w-md rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col"
                                      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #0f0f1e)' }}
                                    >
                                      <button
                                        onClick={() => setViewingPortfolioItem(null)}
                                        className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                                      >
                                        <X className="w-5 h-5 text-white" />
                                      </button>
                                      {viewingPortfolioItem.type === 'video' ? (
                                        <div className={`aspect-[9/16] max-h-[70vh] bg-gradient-to-br ${viewingPortfolioItem.gradient} flex flex-col items-center justify-center`}>
                                          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                                            <Play className="w-10 h-10 text-white fill-white ml-1" />
                                          </div>
                                          <p className="text-white/80 font-bold text-lg">Video Preview</p>
                                          <p className="text-white/50 text-sm mt-1">Dummy video placeholder</p>
                                        </div>
                                      ) : (
                                        <div className={`aspect-square bg-gradient-to-br ${viewingPortfolioItem.gradient} flex flex-col items-center justify-center`}>
                                          <ImageIcon className="w-16 h-16 text-white/40 mb-3" />
                                          <p className="text-white/80 font-bold text-lg">Photo Preview</p>
                                          <p className="text-white/50 text-sm mt-1">Dummy image placeholder</p>
                                        </div>
                                      )}
                                      <div className="p-4 flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-white">
                                          <Heart className="w-6 h-6 text-red-400 fill-red-400" />
                                          <span className="font-bold">{viewingPortfolioItem.likes > 1000 ? `${(viewingPortfolioItem.likes / 1000).toFixed(1)}K` : viewingPortfolioItem.likes}</span>
                                        </div>
                                        {viewingPortfolioItem.views && (
                                          <div className="flex items-center gap-2 text-white">
                                            <Eye className="w-6 h-6 text-blue-400" />
                                            <span className="font-bold">{viewingPortfolioItem.views > 1000 ? `${(viewingPortfolioItem.views / 1000).toFixed(1)}K` : viewingPortfolioItem.views} views</span>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Sticky bottom bar — changes per step */}
                              <div
                                className="flex-shrink-0 px-4 sm:px-5 py-3 sm:py-4 relative z-10"
                                style={{ background: '#0a0a1a', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))' }}
                              >
                                {profileStep === 'portfolio' && (
                                  <button
                                    onClick={() => setProfileStep('campaign')}
                                    className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white text-sm sm:text-lg font-black shadow-lg transition-all flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(236, 72, 153, 0.7))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                                  >
                                    Hire This Creator <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                )}
                                {profileStep === 'campaign' && (
                                  <button
                                    onClick={() => setProfileStep('confirm')}
                                    className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white text-sm sm:text-lg font-black shadow-lg transition-all flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(236, 72, 153, 0.7))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                                  >
                                    Review &amp; Confirm <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                )}
                                {profileStep === 'confirm' && (
                                  <button
                                    onClick={async () => {
                                      setSelectedInfluencer(profileInfluencer);
                                      await handleStartInfluencer(profileInfluencer);
                                      setShowInfluencerProfile(false);
                                    }}
                                    disabled={startingInfluencer}
                                    className="w-full py-3.5 sm:py-5 rounded-xl sm:rounded-2xl text-white text-sm sm:text-xl font-black shadow-xl transition-all disabled:opacity-50 disabled:scale-100"
                                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.7), rgba(16, 185, 129, 0.7))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                                  >
                                    {startingInfluencer ? (
                                      <span className="flex items-center justify-center gap-2 sm:gap-3">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Hiring...
                                      </span>
                                    ) : (
                                      <span className="text-xs sm:text-base">HIRE FOR {profileScaledCost} AI TOKENS</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>

                    {/* Active Campaigns */}
                    {activeCampaigns.length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-bold uppercase tracking-widest mb-4 pl-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Active Jobs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeCampaigns.map((camp) => (
                            <div key={camp.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                                <img src={resolveInfluencerAvatarUrl(influencerRoster.find(i => i.name === camp.influencer_name)?.avatar)} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold truncate">{camp.influencer_name}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Reaching {camp.reach} people</p>
                                {camp.ended_at && (
                                  <p className="text-cyan-400 text-xs font-bold mt-1">{getTimeRemaining(camp.ended_at)}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDismissCampaign(camp.id)}
                                disabled={dismissingId === camp.id}
                                className="p-2 rounded-xl text-red-400 transition-all flex-shrink-0 disabled:opacity-50"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                                title="Dismiss influencer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expired / Dismissed Campaigns */}
                    {expiredCampaigns.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-bold uppercase tracking-widest mb-3 pl-2" style={{ color: 'rgba(255,255,255,0.15)' }}>Past Campaigns</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {expiredCampaigns.slice(0, 4).map((camp) => (
                            <div key={camp.id} className="rounded-2xl p-3 flex items-center gap-3 opacity-60" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <img src={resolveInfluencerAvatarUrl(influencerRoster.find(i => i.name === camp.influencer_name)?.avatar)} className="w-full h-full object-cover grayscale" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{camp.influencer_name}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{camp.status === 'cancelled' ? 'Dismissed' : 'Expired'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </ModulePage>
  );
};

export default MarketingModule;
