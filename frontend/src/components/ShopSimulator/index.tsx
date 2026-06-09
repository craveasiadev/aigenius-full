import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Coins, TrendingUp, Users, Star } from 'lucide-react';
import { TabletMenu } from '../ShopSimulator3D/TabletMenu';
import { BootScreen } from '../ShopSimulator3D/BootScreen';

// Lazy-load the 2D Phaser shell. Phaser is a 1.5 MB chunk and was previously
// pulled into the entry bundle via this static import — every route paid for
// it even if Phaser was never used on that page. Splitting it behind lazy()
// keeps the main shell tiny and only downloads Phaser when the user actually
// opens an AIpreneur shop view.
const ShopGame = lazy(() => import('./ShopGame'));
import type { ShopGameProps } from './ShopGame';

// Lazy load 3D game
const ShopGame3D = lazy(() => import('../ShopSimulator3D/ShopGame3D'));

interface ShopSimulatorProps {
  shopName: string;
  shopTheme: string;
  shopImageUrl?: string;
  shopSceneImageUrl?: string;
  products: Array<{
    id: string;
    product_name: string;
    price: number;
    image_url?: string | null;
  }>;
  staff: Array<{
    id: string;
    staff_role: string;
    staff_name?: string;
    mood: number;
  }>;
  isShopLaunched?: boolean;
  trafficMultiplier?: number;
  userStats?: {
    aiTokens: number;
    level: number;
    streak: number;
    visitors?: number;
    popularity?: number;
  };
  activeInfluencers?: Array<{
    id: string;
    name: string;
    tier: string;
    avatar?: string;
    avatarUrl?: string;
    reach?: number;
  }>;
  activeAdSpaces?: Array<{
    id: string;
    name: string;
    type: string;
    imageUrl?: string;
  }>;
  activeInnovations?: Array<{
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    x?: number;
    y?: number;
  }>;
  initialStats?: {
    totalSales: number;
    totalProfit: number;
    visitors: number;
    likes: number;
  };
  dailyRewardLastClaimDate?: string | null;
  onClaimDailyReward?: () => Promise<boolean>;
  interiorFloorColor?: string;
  interiorFloorStyleId?: string;
  interiorWallColor?: string;
  interiorWallStyleId?: string;
  remainingDailyVisitors?: number;
  storageScopeId?: string | number | null;
  csrBadges?: string[];
  shelfStyle?: string;
  counterStyle?: string;
  layoutPositions?: Record<string, { x: number; y: number; rotation?: number }> | null;
  shiftOpen?: boolean;
  requireShiftOpenOn3DEntry?: boolean;
  onOpenShift?: () => void;
  [key: string]: unknown;
}

// Fullscreen Modal for 3D world
const FullscreenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black"
      >
        {/* Back button - bottom-left to avoid stats board overlap */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          className="fixed bottom-[180px] left-4 sm:bottom-6 sm:left-6 z-[10000] flex items-center gap-1.5 px-4 py-2.5 sm:px-5 sm:py-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full border border-white/20 text-white text-xs sm:text-sm font-medium transition-all group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Exit 3D
        </motion.button>
        {children}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// Stats overlay for 2D view
const StatsOverlay: React.FC<{
  userStats?: ShopSimulatorProps['userStats'];
  initialStats?: ShopSimulatorProps['initialStats'];
}> = ({ userStats, initialStats }) => {
  const stats = [
    { icon: Star, label: 'Level', value: userStats?.level || 1, color: 'text-yellow-400' },
    { icon: Coins, label: 'Tokens', value: userStats?.aiTokens || 0, color: 'text-amber-400' },
    { icon: Users, label: 'Visitors', value: initialStats?.visitors || 0, color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Profit', value: `$${(initialStats?.totalProfit || 0).toLocaleString()}`, color: 'text-green-400' },
  ];

  return (
    <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-[50] pointer-events-none">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10"
          >
            <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${color}`} />
            <span className="text-white/70 text-[10px] sm:text-xs">{label}</span>
            <span className="text-white font-bold text-[10px] sm:text-xs">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Phone button for 2D view - iPhone style
const PhoneButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    onClick={onClick}
    className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[100]"
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
  >
    <div className="relative w-[52px] h-[100px] sm:w-[60px] sm:h-[116px]">
      {/* iPhone body - titanium frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2e] via-[#1c1c1e] to-[#0a0a0a] rounded-[14px] sm:rounded-[16px] border-[2px] border-[#4a4a4e] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset] overflow-hidden">
        {/* Side button accents */}
        <div className="absolute -left-[2.5px] top-[22px] w-[2px] h-[10px] bg-[#4a4a4e] rounded-l-sm" />
        <div className="absolute -left-[2.5px] top-[38px] w-[2px] h-[16px] bg-[#4a4a4e] rounded-l-sm" />
        <div className="absolute -left-[2.5px] top-[56px] w-[2px] h-[16px] bg-[#4a4a4e] rounded-l-sm" />
        <div className="absolute -right-[2.5px] top-[34px] w-[2px] h-[20px] bg-[#4a4a4e] rounded-r-sm" />
        {/* Dynamic Island */}
        <div className="absolute top-[5px] sm:top-[6px] left-1/2 -translate-x-1/2 w-[22px] sm:w-[26px] h-[7px] sm:h-[8px] bg-black rounded-full flex items-center justify-center">
          <div className="w-[3px] h-[3px] rounded-full bg-[#1a1a2e] ring-1 ring-[#2a2a3e]" />
        </div>
        {/* Screen */}
        <div className="absolute inset-[3px] top-[15px] sm:top-[17px] bottom-[10px] sm:bottom-[12px] bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] rounded-[10px] sm:rounded-[12px] overflow-hidden">
          {/* Wallpaper subtle pattern */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
          {/* Status bar */}
          <div className="flex items-center justify-between px-[4px] pt-[2px]">
            <span className="text-white/80 text-[5px] sm:text-[6px] font-semibold">9:41</span>
            <div className="flex items-center gap-[2px]">
              <div className="flex gap-[1px]">
                <div className="w-[2px] h-[4px] bg-white/70 rounded-[0.5px]" />
                <div className="w-[2px] h-[5px] bg-white/70 rounded-[0.5px]" />
                <div className="w-[2px] h-[6px] bg-white/70 rounded-[0.5px]" />
                <div className="w-[2px] h-[7px] bg-white/40 rounded-[0.5px]" />
              </div>
              <div className="w-[10px] h-[5px] border border-white/60 rounded-[1px] flex items-center p-[0.5px]">
                <div className="w-[60%] h-full bg-green-400 rounded-[0.5px]" />
              </div>
            </div>
          </div>
          {/* App grid */}
          <div className="grid grid-cols-3 gap-[3px] sm:gap-[4px] px-[4px] sm:px-[5px] pt-[4px] sm:pt-[5px]">
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm" />
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-sm" />
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm" />
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-pink-400 to-rose-600 shadow-sm" />
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm" />
            <div className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[3px] bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
          </div>
          {/* Dock bar */}
          <div className="absolute bottom-[2px] left-[4px] right-[4px] h-[14px] sm:h-[16px] bg-white/15 backdrop-blur-sm rounded-[5px] flex items-center justify-center gap-[3px] px-[3px]">
            <div className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px] rounded-[2.5px] bg-gradient-to-br from-green-400 to-green-600" />
            <div className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px] rounded-[2.5px] bg-gradient-to-br from-blue-400 to-blue-600" />
            <div className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px] rounded-[2.5px] bg-gradient-to-br from-white/90 to-gray-200" />
          </div>
        </div>
        {/* Home indicator bar */}
        <div className="absolute bottom-[3px] sm:bottom-[4px] left-1/2 -translate-x-1/2 w-[20px] sm:w-[24px] h-[3px] bg-white/30 rounded-full" />
      </div>
      {/* Notification badge */}
      <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] bg-red-500 rounded-full animate-pulse flex items-center justify-center z-20 shadow-lg border border-red-400/50">
        <span className="text-white text-[8px] sm:text-[9px] font-bold">!</span>
      </div>
      {/* Glow effect */}
      <div className="absolute -inset-2 bg-purple-500/15 rounded-[20px] blur-lg -z-10 animate-pulse" style={{ animationDuration: '3s' }} />
    </div>
  </motion.button>
);

export const ShopSimulator: React.FC<ShopSimulatorProps> = ({
  shopName = 'My Shop',
  shopTheme = 'modern_clean',
  shopImageUrl,
  shopSceneImageUrl,
  products = [],
  staff = [],
  isShopLaunched = false,
  trafficMultiplier = 1.0,
  userStats,
  activeInfluencers = [],
  activeAdSpaces = [],
  activeInnovations = [],
  initialStats,
  dailyRewardLastClaimDate,
  onClaimDailyReward,
  interiorFloorColor,
  interiorFloorStyleId,
  interiorWallColor,
  interiorWallStyleId,
  remainingDailyVisitors,
  storageScopeId,
  csrBadges,
  shelfStyle,
  counterStyle,
  layoutPositions,
  shiftOpen = true,
  requireShiftOpenOn3DEntry = false,
  onOpenShift,
  tvPosterUrl,
  wallPosters,
  onWallPosterRemove,
  onInnovationMove,
  onLaunchShop,
}) => {
  const [show3D, setShow3D] = useState(() => {
    if (typeof window === 'undefined') return false;
    const persisted = sessionStorage.getItem('shop_view_3d') === 'true';
    if (!persisted) return false;
    if (requireShiftOpenOn3DEntry && !shiftOpen) return false;
    return true;
  });
  const [loading3D, setLoading3D] = useState(false);
  const [tabletMenuOpen, setTabletMenuOpen] = useState(false);
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);

  const open3DWorld = useCallback(() => {
    setLoading3D(true);
    setShow3D(true);
    sessionStorage.setItem('shop_view_3d', 'true');
  }, []);

  const handleEnter3D = useCallback(() => {
    if (requireShiftOpenOn3DEntry && !shiftOpen) {
      setShowShiftPrompt(true);
      return;
    }
    open3DWorld();
  }, [open3DWorld, requireShiftOpenOn3DEntry, shiftOpen]);

  const handleExit3D = useCallback(() => {
    setShow3D(false);
    setLoading3D(false);
    sessionStorage.removeItem('shop_view_3d');
  }, []);

  const handleOpenTablet = useCallback(() => {
    setTabletMenuOpen(true);
  }, []);

  const handleConfirmOpenShift = useCallback(() => {
    onOpenShift?.();
    setShowShiftPrompt(false);
    open3DWorld();
  }, [onOpenShift, open3DWorld]);

  useEffect(() => {
    if (requireShiftOpenOn3DEntry && !shiftOpen && show3D) {
      handleExit3D();
    }
  }, [requireShiftOpenOn3DEntry, shiftOpen, show3D, handleExit3D]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 2D Phaser Exterior View - always the base layer (lazy chunk) */}
      <Suspense fallback={<BootScreen hint="Loading shop exterior…" />}>
        <ShopGame
          shopName={shopName}
          shopTheme={shopTheme}
          shopImageUrl={shopImageUrl}
          shopSceneImageUrl={shopSceneImageUrl}
          products={products}
          staff={staff}
          isShopLaunched={isShopLaunched}
          trafficMultiplier={trafficMultiplier}
          activeInfluencers={activeInfluencers as ShopGameProps['activeInfluencers']}
          activeAdSpaces={activeAdSpaces as ShopGameProps['activeAdSpaces']}
          activeInnovations={activeInnovations}
          onEnterShop={handleEnter3D}
          view="exterior"
        />
      </Suspense>

      {/* Block Phaser input when tablet menu is open */}
      {tabletMenuOpen && <div className="absolute inset-0 z-[10]" />}

      {/* Loading overlay when entering 3D */}
      <AnimatePresence>
        {loading3D && !show3D && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center"
          >
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
              <p className="text-white font-bold">Entering 3D World...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open shift gate - required after fresh login before entering 3D */}
      <AnimatePresence>
        {showShiftPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 16, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(10, 10, 26, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <h3 className="text-2xl font-black text-white mb-2">Open Shift?</h3>
              <p className="text-white/70 text-sm mb-6">
                Start your shift to run live shop simulation and earnings in 3D.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowShiftPrompt(false)}
                  className="px-4 py-2 rounded-xl text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleConfirmOpenShift}
                  className="px-5 py-2 rounded-xl font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(16, 185, 129, 0.85))',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                  }}
                >
                  Open Shift
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay */}
      <StatsOverlay userStats={userStats} initialStats={initialStats} />

      {/* Phone/Tablet button - opens TabletMenu from 2D view */}
      {!show3D && <PhoneButton onClick={handleOpenTablet} />}

      {/* 3D World - Fullscreen overlay when active */}
      <FullscreenModal isOpen={show3D} onClose={handleExit3D}>
        <div className="w-full h-full relative">
          <Suspense fallback={<BootScreen hint="Preparing your store…" />}>
            <ShopGame3D
              shopName={shopName}
              shopTheme={shopTheme}
              products={products}
              staff={staff}
              isShopLaunched={isShopLaunched}
              trafficMultiplier={trafficMultiplier}
              userStats={userStats}
              activeInfluencers={activeInfluencers}
              activeInnovations={activeInnovations}
              initialStats={initialStats}
              dailyRewardLastClaimDate={dailyRewardLastClaimDate}
              onClaimDailyReward={onClaimDailyReward}
              interiorFloorColor={interiorFloorColor}
              interiorFloorStyleId={interiorFloorStyleId as string | undefined}
              interiorWallColor={interiorWallColor as string | undefined}
              interiorWallStyleId={interiorWallStyleId as string | undefined}
              remainingDailyVisitors={remainingDailyVisitors}
              storageScopeId={storageScopeId}
              csrBadges={csrBadges}
              shelfStyle={shelfStyle}
              counterStyle={counterStyle}
              shopImageUrl={shopImageUrl}
              layoutPositions={layoutPositions}
              tvPosterUrl={tvPosterUrl as string | undefined}
              wallPosters={wallPosters as (string | null)[] | undefined}
              onWallPosterRemove={onWallPosterRemove as ((slotIndex: number) => void) | undefined}
              onInnovationMove={onInnovationMove as ((id: string, x: number, y: number) => void) | undefined}
              onLaunchShop={onLaunchShop as (() => void) | undefined}
            />
          </Suspense>
        </div>
      </FullscreenModal>

      {/* Tablet Menu - accessible from 2D view */}
      <TabletMenu
        isOpen={tabletMenuOpen}
        onClose={() => setTabletMenuOpen(false)}
      />
    </div>
  );
};

export default ShopSimulator;
