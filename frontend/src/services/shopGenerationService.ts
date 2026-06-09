/**
 * Shop Generation Service
 *
 * Template-based shop image and configuration generation.
 * Uses pre-made templates with CSS filters for customization.
 *
 * Future: Can be extended to use AI generation when ready.
 */

// Types
export type BusinessType = 'food' | 'toys' | 'art' | 'pets' | 'fashion' | 'nature';
export type ShopVibe = 'colorful' | 'modern' | 'cozy' | 'fancy' | 'playful';
export type ShopSuperpower = 'happiness' | 'creativity' | 'eco' | 'quality';

export interface ShopGenerationConfig {
  businessType: BusinessType;
  shopVibe: ShopVibe;
  colors: string[];
  superpower: ShopSuperpower;
  shopName: string;
}

export interface GeneratedShop {
  imageUrl: string;
  exteriorConfig: ShopExteriorConfig;
  interiorConfig: ShopInteriorConfig;
  themeColors: ThemeColors;
}

export interface ShopExteriorConfig {
  signStyle: string;
  windowStyle: string;
  doorStyle: string;
  awningColor: string;
  decorations: string[];
}

export interface ShopInteriorConfig {
  floorStyle: string;
  wallStyle: string;
  counterStyle: string;
  shelfStyle: string;
  lighting: string;
  decorations: string[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

// Template mappings
const shopTemplates: Record<BusinessType, string> = {
  food: '/shop-templates/food-shop.png',
  toys: '/shop-templates/toys-shop.png',
  art: '/shop-templates/art-shop.png',
  pets: '/shop-templates/pets-shop.png',
  fashion: '/shop-templates/fashion-shop.png',
  nature: '/shop-templates/nature-shop.png',
};

// Fallback template if specific one doesn't exist
const defaultTemplate = '/shop-templates/default-shop.png';

// Color mappings for palette IDs
const colorHexMap: Record<string, string> = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  white: '#FFFFFF',
  black: '#1F2937',
};

// Vibe-based styling
const vibeStyles: Record<ShopVibe, { filter: string; lighting: string; mood: string }> = {
  colorful: { filter: 'saturate(1.3) brightness(1.1)', lighting: 'bright', mood: 'vibrant' },
  modern: { filter: 'contrast(1.1) saturate(0.9)', lighting: 'cool', mood: 'sleek' },
  cozy: { filter: 'sepia(0.2) brightness(1.05)', lighting: 'warm', mood: 'rustic' },
  fancy: { filter: 'contrast(1.15) brightness(1.05)', lighting: 'elegant', mood: 'luxurious' },
  playful: { filter: 'saturate(1.2) brightness(1.15)', lighting: 'soft', mood: 'whimsical' },
};

// Exterior styles based on business type
const exteriorStyles: Record<BusinessType, Partial<ShopExteriorConfig>> = {
  food: {
    signStyle: 'neon',
    windowStyle: 'large-display',
    doorStyle: 'glass-double',
    decorations: ['menu-board', 'food-stickers', 'outdoor-seating'],
  },
  toys: {
    signStyle: 'playful-3d',
    windowStyle: 'colorful-display',
    doorStyle: 'fun-entrance',
    decorations: ['balloons', 'toy-displays', 'cartoon-characters'],
  },
  art: {
    signStyle: 'artistic',
    windowStyle: 'gallery',
    doorStyle: 'modern-glass',
    decorations: ['art-frames', 'sculptures', 'creative-lighting'],
  },
  pets: {
    signStyle: 'cute-paw',
    windowStyle: 'pet-friendly',
    doorStyle: 'welcoming',
    decorations: ['paw-prints', 'pet-photos', 'grass-patch'],
  },
  fashion: {
    signStyle: 'elegant',
    windowStyle: 'boutique',
    doorStyle: 'glamorous',
    decorations: ['mannequins', 'fabric-drapes', 'spotlight'],
  },
  nature: {
    signStyle: 'organic',
    windowStyle: 'garden-view',
    doorStyle: 'rustic-wood',
    decorations: ['plants', 'flowers', 'natural-elements'],
  },
};

// Interior styles based on business type
const interiorStyles: Record<BusinessType, Partial<ShopInteriorConfig>> = {
  food: {
    floorStyle: 'checkered-tile',
    wallStyle: 'warm-brick',
    counterStyle: 'food-counter',
    shelfStyle: 'display-shelves',
    decorations: ['menu-signs', 'food-art', 'kitchen-visible'],
  },
  toys: {
    floorStyle: 'colorful-carpet',
    wallStyle: 'fun-wallpaper',
    counterStyle: 'kid-friendly',
    shelfStyle: 'toy-shelves',
    decorations: ['play-area', 'demo-stations', 'colorful-bins'],
  },
  art: {
    floorStyle: 'polished-concrete',
    wallStyle: 'white-gallery',
    counterStyle: 'minimalist',
    shelfStyle: 'art-displays',
    decorations: ['easels', 'art-supplies', 'creative-corner'],
  },
  pets: {
    floorStyle: 'easy-clean',
    wallStyle: 'paw-themed',
    counterStyle: 'rounded-friendly',
    shelfStyle: 'pet-product-shelves',
    decorations: ['pet-beds', 'toy-bins', 'grooming-station'],
  },
  fashion: {
    floorStyle: 'marble',
    wallStyle: 'elegant-neutral',
    counterStyle: 'boutique-counter',
    shelfStyle: 'clothing-racks',
    decorations: ['mirrors', 'fitting-rooms', 'accessories-display'],
  },
  nature: {
    floorStyle: 'wood-natural',
    wallStyle: 'earthy-tones',
    counterStyle: 'reclaimed-wood',
    shelfStyle: 'plant-shelves',
    decorations: ['indoor-plants', 'terrariums', 'water-feature'],
  },
};

/**
 * Generate a shop based on questionnaire answers
 */
export function generateShop(config: ShopGenerationConfig): GeneratedShop {
  const { businessType, shopVibe, colors, superpower } = config;

  // Get template image URL
  const imageUrl = shopTemplates[businessType] || defaultTemplate;

  // Generate theme colors from selected colors
  const themeColors = generateThemeColors(colors);

  // Get exterior config
  const exteriorConfig: ShopExteriorConfig = {
    signStyle: exteriorStyles[businessType]?.signStyle || 'standard',
    windowStyle: exteriorStyles[businessType]?.windowStyle || 'standard',
    doorStyle: exteriorStyles[businessType]?.doorStyle || 'standard',
    awningColor: themeColors.primary,
    decorations: exteriorStyles[businessType]?.decorations || [],
  };

  // Get interior config
  const interiorConfig: ShopInteriorConfig = {
    floorStyle: interiorStyles[businessType]?.floorStyle || 'wood',
    wallStyle: interiorStyles[businessType]?.wallStyle || 'painted',
    counterStyle: interiorStyles[businessType]?.counterStyle || 'standard',
    shelfStyle: interiorStyles[businessType]?.shelfStyle || 'standard',
    lighting: vibeStyles[shopVibe]?.lighting || 'neutral',
    decorations: interiorStyles[businessType]?.decorations || [],
  };

  // Apply superpower-based enhancements
  applySuperpowerEnhancements(exteriorConfig, interiorConfig, superpower);

  return {
    imageUrl,
    exteriorConfig,
    interiorConfig,
    themeColors,
  };
}

/**
 * Generate theme colors from selected color IDs
 */
function generateThemeColors(colorIds: string[]): ThemeColors {
  const colors = colorIds.map(id => colorHexMap[id] || '#3B82F6');

  return {
    primary: colors[0] || '#3B82F6',
    secondary: colors[1] || '#06B6D4',
    accent: colors[2] || colors[1] || '#8B5CF6',
    background: adjustColorBrightness(colors[0] || '#3B82F6', 0.9),
  };
}

/**
 * Apply superpower-based enhancements to shop config
 */
function applySuperpowerEnhancements(
  exterior: ShopExteriorConfig,
  interior: ShopInteriorConfig,
  superpower: ShopSuperpower
): void {
  switch (superpower) {
    case 'happiness':
      exterior.decorations.push('smiley-signs', 'welcome-mat');
      interior.decorations.push('happy-quotes', 'mood-lighting');
      break;
    case 'creativity':
      exterior.decorations.push('unique-art', 'creative-sign');
      interior.decorations.push('inspiration-board', 'creative-displays');
      break;
    case 'eco':
      exterior.decorations.push('plants', 'eco-badge');
      interior.decorations.push('recycled-materials', 'green-corner');
      break;
    case 'quality':
      exterior.decorations.push('premium-sign', 'award-display');
      interior.decorations.push('quality-certificates', 'premium-packaging');
      break;
  }
}

/**
 * Adjust color brightness
 */
function adjustColorBrightness(hex: string, factor: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const newR = Math.min(255, Math.round(r + (255 - r) * (1 - factor)));
  const newG = Math.min(255, Math.round(g + (255 - g) * (1 - factor)));
  const newB = Math.min(255, Math.round(b + (255 - b) * (1 - factor)));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Get CSS filter string for a shop vibe
 */
export function getVibeFilter(vibe: ShopVibe): string {
  return vibeStyles[vibe]?.filter || '';
}

/**
 * Get shop template URL for a business type
 */
export function getShopTemplateUrl(businessType: BusinessType): string {
  return shopTemplates[businessType] || defaultTemplate;
}

/**
 * Get all available business types with their display info
 */
export function getBusinessTypeInfo(): Array<{ id: BusinessType; label: string; icon: string }> {
  return [
    { id: 'food', label: 'Food & Treats', icon: '🍕' },
    { id: 'toys', label: 'Toys & Games', icon: '🎮' },
    { id: 'art', label: 'Art & Crafts', icon: '🎨' },
    { id: 'pets', label: 'Pets & Animals', icon: '🐾' },
    { id: 'fashion', label: 'Fashion & Clothes', icon: '👗' },
    { id: 'nature', label: 'Nature & Flowers', icon: '🌸' },
  ];
}

/**
 * Get all available shop vibes with their display info
 */
export function getShopVibeInfo(): Array<{ id: ShopVibe; label: string; icon: string; description: string }> {
  return [
    { id: 'colorful', label: 'Colorful & Fun', icon: '🌈', description: 'Rainbow colors everywhere' },
    { id: 'modern', label: 'Cool & Modern', icon: '✨', description: 'Sleek & techy vibes' },
    { id: 'cozy', label: 'Natural & Cozy', icon: '🏡', description: 'Plants & wood' },
    { id: 'fancy', label: 'Fancy & Sparkly', icon: '💎', description: 'Elegant & glamorous' },
    { id: 'playful', label: 'Playful & Cute', icon: '🧸', description: 'Soft & sweet' },
  ];
}

/**
 * Generate a placeholder shop image URL
 * This returns a gradient-based placeholder until real templates are available
 */
export function getPlaceholderShopImage(businessType: BusinessType, vibe: ShopVibe): string {
  // For now, return a path that can be handled by the app
  // In production, this would point to actual template images
  return `/shop-templates/${businessType}-${vibe}.png`;
}

/**
 * Check if shop templates exist (for feature flag)
 */
export function hasShopTemplates(): boolean {
  // Return false for now - templates are placeholders
  // Set to true when actual template images are added
  return false;
}
