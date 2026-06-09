/**
 * Explore Shops — AIpreneur design language.
 *
 * Browse other students' public shops. Real backend results only
 * (publicShopApi.searchShops). Cards link out to /shop/{slug}.
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  ArrowLeft, Heart, Search, Store, Users, Sun, Moon, Loader2,
  ExternalLink,
} from 'lucide-react';
import { publicShopApi, type PublicShopSearchResult } from '../services/aipreneurApi';
import { getAssetUrl } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_PRIMARY_SM, BTN_3D_SECONDARY,
  FIELD, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

type BadgeTone = 'amber' | 'rose' | 'sky' | 'violet' | 'emerald' | 'lime';

const BADGE_TONES: Record<BadgeTone, string> = {
  amber:   'bg-amber-500 border-amber-700',
  rose:    'bg-rose-500 border-rose-700',
  sky:     'bg-sky-500 border-sky-700',
  violet:  'bg-violet-600 border-violet-800',
  emerald: 'bg-emerald-500 border-emerald-700',
  lime:    'bg-lime-500 border-lime-700',
};

const getShopBadges = (shop: PublicShopSearchResult, allShops: PublicShopSearchResult[]) => {
  const badges: Array<{ label: string; tone: BadgeTone }> = [];
  const visitors = shop.store_visitors || 0;
  const likes = shop.store_likes || 0;

  const sortedByVisitors = [...allShops].sort((a, b) => (b.store_visitors || 0) - (a.store_visitors || 0));
  const sortedByLikes    = [...allShops].sort((a, b) => (b.store_likes || 0) - (a.store_likes || 0));
  const visitorRank = sortedByVisitors.findIndex((s) => s.shop_url_slug === shop.shop_url_slug);
  const likeRank    = sortedByLikes.findIndex((s) => s.shop_url_slug === shop.shop_url_slug);

  if (allShops.length >= 3 && visitorRank === 0 && visitors > 0) {
    badges.push({ label: 'Most Visited', tone: 'amber' });
  } else if (allShops.length >= 3 && visitorRank <= 2 && visitors > 0) {
    badges.push({ label: 'Popular', tone: 'rose' });
  }
  if (allShops.length >= 3 && likeRank === 0 && likes > 0) {
    badges.push({ label: 'Most Loved', tone: 'rose' });
  }
  if (visitors >= 50)  badges.push({ label: 'Busy', tone: 'sky' });
  if (likes >= 20)     badges.push({ label: 'Fan Favorite', tone: 'violet' });
  if (visitors >= 100 && likes >= 30) badges.push({ label: 'Viral', tone: 'emerald' });
  if (visitors === 0 && likes === 0)  badges.push({ label: 'New', tone: 'lime' });

  return badges.slice(0, 2);
};

const getShopImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/shops/')) {
    const filename = imageUrl.split('/storage/shops/').pop();
    if (filename) return getAssetUrl(`/aipreneur/shop-image/${filename}`);
  }
  return imageUrl;
};

export const ExploreShopsPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<PublicShopSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadShops = async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publicShopApi.searchShops(search);
      setShops(response.shops || []);
    } catch (err) {
      console.error('Failed to load shops:', err);
      setError('Unable to load shops right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShops(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadShops(query.trim());
  };

  const dark = theme === 'dark';

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => smartBack()}
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <Store className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Explore Shops
          </h1>
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
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Search other students’ shops and visit their storefronts.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by shop or owner name…"
              className={`${FIELD} pl-9 pr-3 py-3 text-sm`}
            />
          </div>
          <button type="submit" className={`${BTN_3D_PRIMARY_SM} min-h-[44px] px-4`}>
            Search
          </button>
        </form>

        {loading && (
          <div className={`${GLASS} rounded-2xl p-5 text-sm text-center text-slate-500 dark:text-slate-400`}>
            <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
            Loading shops…
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-3 py-3 text-sm text-rose-700 dark:text-rose-300 mb-4">
            {error}
          </div>
        )}
        {!loading && !error && shops.length === 0 && (
          <div className={`${GLASS} rounded-2xl p-5 text-sm text-center text-slate-500 dark:text-slate-400`}>
            No shops found. Try another name.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shops.map((shop) => {
            const imageUrl = getShopImageUrl(shop.shop_image_url);
            const badges = getShopBadges(shop, shops);
            return (
              <motion.div
                key={shop.shop_url_slug}
                whileHover={{ y: -2 }}
                className={`${GLASS} rounded-2xl overflow-hidden flex flex-col`}
              >
                <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800">
                  {imageUrl ? (
                    <img src={imageUrl} alt={shop.shop_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  {badges.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {badges.map((b, i) => (
                        <span
                          key={i}
                          className={[
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white border-b-[2px]',
                            BADGE_TONES[b.tone],
                          ].join(' ')}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{shop.shop_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Owner: {shop.owner_name || 'Kid Entrepreneur'}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span className="tabular-nums">{shop.store_likes || 0}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span className="tabular-nums">{shop.store_visitors || 0}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/shop/${shop.shop_url_slug}`)}
                    className={`${BTN_3D_SECONDARY} mt-3 w-full min-h-[40px] text-xs px-3`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit Shop
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ExploreShopsPage;
