import { motion } from 'framer-motion';
import { Star, X, ArrowRight, Store } from 'lucide-react';

/**
 * Read-only preview card for another player's shop, shown when you tap one
 * of the 8 surrounding buildings in a multi-user world. Lightweight by
 * design — shop image, name, owner, level + rating, and a "Visit Shop"
 * link to the existing public shop page (`/shop/:slug`). No interior
 * walkthrough.
 */
export interface WorldShopPreviewProps {
  shopName: string;
  ownerName?: string;
  level?: number;
  rating?: number;
  image?: string | null;
  /** Public slug — when present the "Visit Shop" button is enabled. */
  slug?: string;
  onClose: () => void;
  onVisit: () => void;
}

export function WorldShopPreview({
  shopName,
  ownerName,
  level,
  rating,
  image,
  slug,
  onClose,
  onVisit,
}: WorldShopPreviewProps) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />

      <motion.div
        className="relative w-full max-w-sm rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl overflow-hidden text-white"
        initial={{ y: 40, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-3 top-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Shop image / fallback */}
        <div className="h-40 w-full bg-gradient-to-br from-indigo-600/40 to-fuchsia-600/40 flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={shopName}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <Store className="w-14 h-14 text-white/50" />
          )}
        </div>

        <div className="p-5">
          <h3 className="text-xl font-extrabold leading-tight">{shopName}</h3>
          {ownerName ? (
            <p className="mt-0.5 text-sm text-white/60">by {ownerName}</p>
          ) : null}

          {/* Level + rating chips */}
          <div className="mt-3 flex items-center gap-2">
            {typeof level === 'number' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 text-xs font-bold">
                Lv {level}
              </span>
            )}
            {typeof rating === 'number' && rating > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Visit — disabled when the shop has no public slug yet. */}
          <button
            type="button"
            onClick={onVisit}
            disabled={!slug}
            className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-60 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            {slug ? 'Visit Shop' : 'Not open yet'}
            {slug ? <ArrowRight className="w-5 h-5" /> : null}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default WorldShopPreview;
