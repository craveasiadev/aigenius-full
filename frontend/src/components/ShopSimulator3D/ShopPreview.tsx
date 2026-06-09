/**
 * ShopPreview - Simple 3D preview for decoration module
 * Shows exterior or interior view without game HUD
 */

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const ShopGame3D = lazy(() => import('./ShopGame3D'));

interface ShopPreviewProps {
  shopTheme: string;
  shopName: string;
  view: 'exterior' | 'interior';
}

// Simple loading spinner
const LoadingSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200">
    <div className="text-center">
      <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
      <p className="text-white font-semibold text-sm">Loading Preview...</p>
    </div>
  </div>
);

export const ShopPreview: React.FC<ShopPreviewProps> = ({
  shopTheme,
  shopName,
  view,
}) => {
  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<LoadingSpinner />}>
        <ShopGame3D
          shopTheme={shopTheme}
          shopName={shopName}
          products={[]}
          staff={[]}
          isShopLaunched={true}
          trafficMultiplier={1}
        />
      </Suspense>

      {/* View Label */}
      <div className="absolute top-4 left-4 z-30">
        <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
          <span className="text-white font-medium text-sm capitalize">
            {view} View
          </span>
        </div>
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-4 right-4 z-30 hidden sm:block">
        <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-white/70 text-xs">
          <p>Drag to rotate</p>
          <p>Scroll to zoom</p>
        </div>
      </div>
    </div>
  );
};

export default ShopPreview;
