import { useEffect, useRef, useState, useMemo, memo } from 'react';
import Phaser from 'phaser';
import { getAssetUrl } from '../../lib/api';

// Marketing data types
interface ActiveInfluencer {
  id: string;
  name: string;
  tier: 'Nano' | 'Micro' | 'Macro' | 'Mega';
  avatar?: string;
  avatarUrl?: string;
  reach: number;
}

interface ActiveAdSpace {
  id: string;
  name: string;
  type: 'Banner' | 'Billboard' | 'Digital' | 'TV';
  imageUrl?: string;
}

// Innovation data types
interface ActiveInnovation {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  x?: number; // Saved position
  y?: number;
}

type SelectionItem = {
  type: 'add';
} | {
  type: 'asset';
  index: number;
  textureKey: string;
  isCustom?: boolean;
};

export interface ShopGameProps {
  shopTheme: string;
  shopName: string;
  products: Array<{
    id: string;
    product_name: string;
    price: number;
    image_url?: string | null;
    image_status?: string | null;
  }>;
  staff: Array<{
    id: string;
    staff_role: string;
    staff_name?: string;
    mood: number;
    speed_modifier?: number;
    efficiency_modifier?: number;
    behavior_traits?: string[] | null;
  }>;
  decorations?: {
    furniture: boolean;
    art: boolean;
    lights: boolean;
  };
  onCustomerServed?: (earnings: number, productId?: string) => void;
  onEnterShop?: () => void;
  config?: any;
  onObjectClick?: (category: string) => void;
  interactive?: boolean;
  view?: 'exterior' | 'interior';
  shopImageUrl?: string;
  shopSceneImageUrl?: string;

  // Customization callbacks
  onShelfChange?: (side: 'left' | 'right', shelfIndex: number) => void;
  onCashierChange?: (cashierIndex: number) => void;
  onPlantAdd?: (plantData: { x: number; y: number; plantIndex: number }) => void;
  onPlantMove?: (id: string, x: number, y: number) => void;
  onRequestCustomAsset?: (category: 'plant' | 'floor' | 'wall') => void;

  savedShelfLeft?: number;
  savedShelfRight?: number;
  savedCashier?: number;
  savedFloor?: number;
  savedWall?: number;
  savedPlants?: Array<{ id: string; x: number; y: number; plantIndex: number }>;
  customAssets?: { floor: string[]; wall: string[]; plant: string[] };
  // External Control
  onViewModeChange?: (mode: 'exterior' | 'interior') => void;
  onCustomizationOpen?: (type: string, index: number) => void;
  externalCommand?: string | null;
  // Interior boards
  onOpenProductsBoard?: () => void;
  onOpenStaffBoard?: () => void;
  // Shop launch status
  isShopLaunched?: boolean;
  // Interior state save callback
  onInteriorStateChange?: (state: { shelfLeft: number; shelfRight: number; cashier: number; floor: number; wall: number }) => void;
  // Time update callback for UI
  onTimeUpdate?: (data: { hour: number; minute: number; isOpen: boolean; isNight: boolean }) => void;
  // Traffic multiplier (0.5 to 5.0) - affects visitor spawn rate
  trafficMultiplier?: number;
  // Callback when a visitor enters the shop (separate from purchase)
  onVisitorEnter?: () => void;
  // Active marketing campaigns (influencers and ad spaces)
  activeInfluencers?: ActiveInfluencer[];
  activeAdSpaces?: ActiveAdSpace[];
  // Active innovations for interior display
  activeInnovations?: ActiveInnovation[];
  onInnovationMove?: (id: string, x: number, y: number) => void;
  // Callback when toolbar (item selection bar) visibility changes - to hide external UI
  onToolbarVisibilityChange?: (visible: boolean) => void;
}

// ... (ASSET_PATHS, THEME_CONFIGS remain)



const ASSET_PATHS = {
  trees: [

  ],
  // Exterior decorations (benches, lamps, plants, sidewalk, etc.)
  exterior: {
    bench: '/assets/exterior/bench_1.png',
    lamps: [
      '/assets/exterior/Lamp_1.png',
      '/assets/exterior/Lamp_2.png',
    ],
    plants: [
      '/assets/exterior/plant_1.png',
      '/assets/exterior/Plant_2.png',
    ],
    waters: [
      '/assets/exterior/water_3.jpg',
    ],
    sidewalk: '/assets/exterior/Sidewalk_2.png',
    grass: '/assets/exterior/Grassonly.png',
    road: '/assets/exterior/road.jpg',
  },
  cars: [
    '/assets/car/car-2.png',   // 0: facing LEFT
    '/assets/car/car-3.png',   // 1: facing LEFT
    '/assets/car/car-4.png',   // 2: facing RIGHT
    '/assets/car/car-5.png',   // 3: facing LEFT
    '/assets/car/car-6.png',   // 4: facing LEFT
    '/assets/car/car-7.png',   // 5: facing RIGHT
    '/assets/car/car-8.png',   // 6: facing RIGHT
    '/assets/car/car-9.png',   // 7: facing RIGHT
    '/assets/car/car-10.png',  // 8: facing LEFT
  ],
  // Cars that face RIGHT in their image (go left to right)
  // Indices: 2 (car 4), 5 (car 7), 6 (car 8), 7 (car 9)
  carsGoingRight: [2, 5, 6, 7],
  shops: [
    '/assets/shops/shop1.png',
    '/assets/shops/shop2.png',
    '/assets/shops/shop3.png',
    '/assets/shops/shop4.png',
  ],
  // Day and night background views
  dayViews: [
    '/assets/game view/day view/1.jpg',
    '/assets/game view/day view/2.jpg',
    '/assets/game view/day view/3.jpg',
    '/assets/game view/day view/4.jpg',
    '/assets/game view/day view/5.jpg',
  ],
  nightViews: [
    '/assets/game view/night view/1.jpg',
    '/assets/game view/night view/2.jpg',
    '/assets/game view/night view/3.jpg',
    '/assets/game view/night view/4.jpg',
    '/assets/game view/night view/5.jpg',
    '/assets/game view/night view/6.jpg',
    '/assets/game view/night view/7.jpg',
  ],
  shelves: [
    '/assets/shelf/1.png',
    '/assets/shelf/2.png',
    '/assets/shelf/3.png',
    '/assets/shelf/4.png',
    '/assets/shelf/5.png',
    '/assets/shelf/6.png',
    '/assets/shelf/7.png',
  ],
  cashiers: [
    '/assets/cashier table/1.png',
    '/assets/cashier table/2.png',
    '/assets/cashier table/3.png',
    '/assets/cashier table/4.png',
    '/assets/cashier table/5.png',
  ],
  plants: [
    '/assets/potted plants/1.png',
    '/assets/potted plants/2.png',
    '/assets/potted plants/3.png',
    '/assets/potted plants/4.png',
    '/assets/potted plants/5.png',
    '/assets/potted plants/6.png',
  ],
  floors: [
    '/assets/Floor New/1---Floor.jpg',
    '/assets/Floor New/2---Floor.jpg',
    '/assets/Floor New/3---Floor.jpg',
    '/assets/Floor New/4---Floor.jpg',
    '/assets/Floor New/5---Floor.jpg',
  ],
  walls: [
    '/assets/Wall New/1---Wall.jpg',
    '/assets/Wall New/3---Wall.jpg',
    '/assets/Wall New/4---Wall.jpg',
    '/assets/Wall New/5---Wall.jpg',
    '/assets/Wall New/6---Wall.jpg',
  ],
  characters: [
    '/assets/character/chinese-man-shopping.png',
    '/assets/character/CHINESE-MAN.png',
    '/assets/character/chinese-woman-shopping.png',
    '/assets/character/indian-man.png',
    '/assets/character/indian-woman.png',
    '/assets/character/malay-man.png',
    '/assets/character/malay-woman.png',
  ],
};

export const INTERIOR_ASSET_COUNTS = {
  floor: ASSET_PATHS.floors.length,
  wall: ASSET_PATHS.walls.length,
  plant: ASSET_PATHS.plants.length,
};

// Theme configurations with exterior and interior colors
const THEME_CONFIGS: Record<string, {
  exterior: { wall: number; roof: number; door: number; window: number; sign: number };
  interior: { floor: number; walls: number; accent: number };
  sky: number;
  ground: number;
}> = {
  fun_colorful: {
    exterior: { wall: 0xFFB6C1, roof: 0xFF69B4, door: 0x8B4513, window: 0x87CEEB, sign: 0xFF1493 },
    interior: { floor: 0xFFE4E1, walls: 0xFFF0F5, accent: 0xFF69B4 },
    sky: 0x87CEEB,
    ground: 0x90EE90
  },
  eco_natural: {
    exterior: { wall: 0xDEB887, roof: 0x228B22, door: 0x8B4513, window: 0x87CEEB, sign: 0x2E8B57 },
    interior: { floor: 0xF5DEB3, walls: 0xFAF0E6, accent: 0x228B22 },
    sky: 0x87CEEB,
    ground: 0x7CFC00
  },
  modern_clean: {
    exterior: { wall: 0xF5F5F5, roof: 0x708090, door: 0x2F4F4F, window: 0xADD8E6, sign: 0x4169E1 },
    interior: { floor: 0xE8E8E8, walls: 0xFFFFFF, accent: 0x4169E1 },
    sky: 0xB0E0E6,
    ground: 0x98FB98
  },
  cute_cozy: {
    exterior: { wall: 0xFFE4B5, roof: 0xCD853F, door: 0x8B4513, window: 0xFFE4C4, sign: 0xD2691E },
    interior: { floor: 0xFFF8DC, walls: 0xFFFAF0, accent: 0xDEB887 },
    sky: 0xFFE4B5,
    ground: 0x9ACD32
  },
  futuristic_techy: {
    exterior: { wall: 0x2F2F4F, roof: 0x191970, door: 0x00CED1, window: 0x00FFFF, sign: 0x00FF00 },
    interior: { floor: 0x1a1a2e, walls: 0x16213e, accent: 0x00FFFF },
    sky: 0x191970,
    ground: 0x2F4F4F
  },
  holiday_travel: {
    exterior: { wall: 0xFFA07A, roof: 0xFF4500, door: 0x8B4513, window: 0xFFD700, sign: 0xFF6347 },
    interior: { floor: 0xFFDAB9, walls: 0xFFF5EE, accent: 0xFF4500 },
    sky: 0x00BFFF,
    ground: 0xF4A460
  },
  luxury_premium: {
    exterior: { wall: 0x2F2F2F, roof: 0x1a1a1a, door: 0xFFD700, window: 0xB8860B, sign: 0xFFD700 },
    interior: { floor: 0x1a1a1a, walls: 0x2F2F2F, accent: 0xFFD700 },
    sky: 0x4169E1,
    ground: 0x228B22
  },
  retro_vintage: {
    exterior: { wall: 0xDDA0DD, roof: 0x9370DB, door: 0x8B4513, window: 0xE6E6FA, sign: 0x9932CC },
    interior: { floor: 0xE6E6FA, walls: 0xFFF0F5, accent: 0x9370DB },
    sky: 0xFFB6C1,
    ground: 0x98FB98
  },
};

// Customer appearances
const CUSTOMER_STYLES = [
  { skin: 0xFFDBB4, hair: 0x1a1a1a, shirt: 0xFF6B6B, pants: 0x4169E1 },
  { skin: 0xD2B48C, hair: 0x2F1B0C, shirt: 0x4ECDC4, pants: 0x2F2F2F },
  { skin: 0x8B7355, hair: 0x1a1a1a, shirt: 0x45B7D1, pants: 0x696969 },
  { skin: 0xFFE4C4, hair: 0xFFD700, shirt: 0x96CEB4, pants: 0x8B4513 },
  { skin: 0xF5DEB3, hair: 0xA0522D, shirt: 0xFECEA8, pants: 0x4169E1 },
  { skin: 0xCD853F, hair: 0x1a1a1a, shirt: 0xA8D8EA, pants: 0x2F4F4F },
  { skin: 0xFFCBA4, hair: 0x8B4513, shirt: 0xFFB6C1, pants: 0x708090 },
  { skin: 0xD2691E, hair: 0x1a1a1a, shirt: 0x98FB98, pants: 0x1a1a1a },
];

export class ShopWorldScene extends Phaser.Scene {
  private shopTheme: string = 'modern_clean';
  private shopName: string = 'My Shop';
  private products: ShopGameProps['products'] = [];
  private staff: ShopGameProps['staff'] = [];
  // Decorations stored for potential use in interior customization
  public decorations: ShopGameProps['decorations'] = { furniture: false, art: false, lights: false };
  private onCustomerServed?: (earnings: number, productId?: string) => void;
  private onEnterShop?: () => void;
  private onViewModeChange?: (mode: 'exterior' | 'interior') => void;

  // World settings
  private worldWidth = 4000;
  private worldHeight = 1300;
  public isInside = false;

  // Interior bounds (calculated in createInteriorWorld)
  private interiorWidth = 1800;
  private interiorLeftBound = 0;
  private interiorRightBound = 0;

  // Game objects
  private view?: 'exterior' | 'interior'; // Track active view mode
  private customers: Phaser.GameObjects.Container[] = [];
  private interiorCustomers: Phaser.GameObjects.Container[] = [];
  private clouds: Phaser.GameObjects.Container[] = [];
  private trees: Phaser.GameObjects.Container[] = [];
  private birds: Phaser.GameObjects.Container[] = [];
  private cars: Phaser.GameObjects.Container[] = [];
  private shopBuilding?: Phaser.GameObjects.Container;
  private interiorContainer?: Phaser.GameObjects.Container;
  private exteriorContainer?: Phaser.GameObjects.Container;
  private buildingSprite?: Phaser.GameObjects.Image;
  private plantSprite?: Phaser.GameObjects.Image;

  // Interior customizable elements
  private leftShelfSprite?: Phaser.GameObjects.Image;
  private rightShelfSprite?: Phaser.GameObjects.Image;
  private cashierSprite?: Phaser.GameObjects.Image;
  private pottedPlants: Array<{ container: Phaser.GameObjects.Container; id: string; plantIndex: number }> = [];
  private productBoardContainer?: Phaser.GameObjects.Container;
  private staffBoardContainer?: Phaser.GameObjects.Container;
  private productBoardLines: Phaser.GameObjects.Text[] = [];
  private staffBoardLines: Phaser.GameObjects.Text[] = [];
  private currentLeftShelf: number = 0;
  private currentRightShelf: number = 0;
  private currentCashier: number = 0;
  private currentFloorStyle: number = 0;
  private currentWallStyle: number = 0;
  private defaultFloorCount: number = ASSET_PATHS.floors.length;
  private defaultWallCount: number = ASSET_PATHS.walls.length;
  private defaultPlantCount: number = ASSET_PATHS.plants.length;
  private floorTextureKeys: string[] = [];
  private wallTextureKeys: string[] = [];
  private plantTextureKeys: string[] = [];
  private customAssets: { floor: string[]; wall: string[]; plant: string[] } = { floor: [], wall: [], plant: [] };

  // Floor and wall graphics references for updates
  private floorGraphics?: Phaser.GameObjects.Graphics;
  private wallGraphics?: Phaser.GameObjects.Graphics;
  // Floor and wall tiled image containers
  private floorTileContainer?: Phaser.GameObjects.Container;
  private wallTileContainer?: Phaser.GameObjects.Container;
  private backWallSprite?: Phaser.GameObjects.TileSprite;
  private leftWallSprite?: Phaser.GameObjects.TileSprite;
  private rightWallSprite?: Phaser.GameObjects.TileSprite;

  // Item selection bar state
  private itemBarContainer?: Phaser.GameObjects.Container;
  private itemBarVisible: boolean = false;
  private currentItemCategory: 'shelf' | 'cashier' | 'plant' | 'floor' | 'wall' | null = null;
  private selectedShelfSide: 'left' | 'right' = 'left';

  // Callbacks for customization
  private onShelfChange?: (side: 'left' | 'right', shelfIndex: number) => void;
  private onCashierChange?: (cashierIndex: number) => void;
  private onPlantAdd?: (plantData: { x: number; y: number; plantIndex: number }) => void;
  private onPlantMove?: (plantId: string, x: number, y: number) => void;
  private onRequestCustomAsset?: (category: 'plant' | 'floor' | 'wall') => void;
  private onOpenProductsBoard?: () => void;
  private onOpenStaffBoard?: () => void;
  private savedPlants?: Array<{ id: string; x: number; y: number; plantIndex: number }>;

  // Camera drag
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Plant drag state - to prevent camera drag when dragging plants
  private isPlantDragging = false;

  // UI camera for fixed elements
  private uiCamera?: Phaser.Cameras.Scene2D.Camera;

  // Recenter button for interior free panning
  private recenterButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'ShopWorldScene' });
  }

  private config: any = {};
  private onObjectClick?: (category: string) => void;
  private interactive: boolean = false;
  private shopImageUrl?: string; // Generated AI shop image URL
  private shopSceneImageUrl?: string; // Shop scene image URL (interior photo frame)
  private photoFrameContainer?: Phaser.GameObjects.Container;
  private photoModal?: Phaser.GameObjects.Container;
  private interiorFloorTop: number = 280;
  private interiorFloorHeight: number = 0;
  private externalCommand?: string | null;
  private isShopLaunched: boolean = false; // Whether shop has completed ribbon cutting

  // Day/Night cycle
  private isNightTime: boolean = false;
  private currentHour: number = 9; // Start at 9am
  private dayNightOverlay?: Phaser.GameObjects.Graphics;
  private backgroundImage?: Phaser.GameObjects.Image;
  private selectedDayBgIndex: number = 0;
  private selectedNightBgIndex: number = 0;
  private selectedWaterIndex: number = 0;
  private debugModeActive: boolean = false; // When true, prevents auto time sync

  // Callback for saving interior state
  private onInteriorStateChange?: (state: { shelfLeft: number; shelfRight: number; cashier: number; floor: number; wall: number }) => void;
  // Callback for time updates to UI
  private onTimeUpdate?: (data: { hour: number; minute: number; isOpen: boolean; isNight: boolean }) => void;
  // Traffic multiplier (affects customer spawn rate)
  private trafficMultiplier: number = 1.0;
  // Callback when a visitor enters the shop
  private onVisitorEnter?: () => void;
  // Active marketing campaigns
  private activeInfluencers: ActiveInfluencer[] = [];
  private activeAdSpaces: ActiveAdSpace[] = [];
  // Influencer NPC containers in exterior
  private influencerNPCs: Phaser.GameObjects.Container[] = [];
  private adSpaceContainers: Phaser.GameObjects.Container[] = [];
  private activeInnovations: ActiveInnovation[] = [];
  private innovationItems: Array<{ container: Phaser.GameObjects.Container; id: string }> = [];
  private onInnovationMove?: (id: string, x: number, y: number) => void;
  private onToolbarVisibilityChange?: (visible: boolean) => void;
  private queuedTextureKeys = new Set<string>();
  private floatingButtonsSizeCategory: 'xs' | 'sm' | 'md' | 'lg' | null = null;
  private safeLoadImage(key: string, path: string) {
    this.queueImage(key, path);
  }

  private queueImage(key: string, path: string, force: boolean = false): boolean {
    if (force) {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.queuedTextureKeys.delete(key);
    }
    if (this.textures.exists(key) || this.queuedTextureKeys.has(key)) {
      return false;
    }
    this.load.image(key, path);
    this.queuedTextureKeys.add(key);
    return true;
  }

  private queueSpritesheet(
    key: string,
    path: string,
    config: Phaser.Types.Loader.FileTypes.SpriteSheetFileConfig,
    force: boolean = false
  ): boolean {
    if (force) {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.queuedTextureKeys.delete(key);
    }
    if (this.textures.exists(key) || this.queuedTextureKeys.has(key)) {
      return false;
    }
    this.load.spritesheet(key, path, config);
    this.queuedTextureKeys.add(key);
    return true;
  }

  private startLoaderIfNeeded() {
    const loader: any = this.load as any;
    const isLoading = typeof loader.isLoading === 'function' ? loader.isLoading() : loader.isLoading;
    if (!isLoading) {
      this.load.start();
    }
  }

  private buildTextureKeys() {
    this.floorTextureKeys = ASSET_PATHS.floors.map((_, index) => `floor_${index}`);
    this.wallTextureKeys = ASSET_PATHS.walls.map((_, index) => `wall_${index}`);
    this.plantTextureKeys = ASSET_PATHS.plants.map((_, index) => `potted_plant_${index}`);

    this.customAssets.floor.forEach((_asset, index) => {
      this.floorTextureKeys.push(`custom_floor_${index}`);
    });
    this.customAssets.wall.forEach((_asset, index) => {
      this.wallTextureKeys.push(`custom_wall_${index}`);
    });
    this.customAssets.plant.forEach((_asset, index) => {
      this.plantTextureKeys.push(`custom_plant_${index}`);
    });
  }

  private getFloorTextureKey(index: number) {
    return this.floorTextureKeys[index] || `floor_${index}`;
  }

  private getWallTextureKey(index: number) {
    return this.wallTextureKeys[index] || `wall_${index}`;
  }

  private getPlantTextureKey(index: number) {
    return this.plantTextureKeys[index] || `potted_plant_${index}`;
  }

  // Mobile responsiveness
  private isMobileDevice: boolean = false;
  private screenSizeCategory: 'xs' | 'sm' | 'md' | 'lg' = 'lg';
  private isLowPowerMode: boolean = false;
  private isUltraLowPower: boolean = false;
  private carIndices: number[] = [];
  private characterIndices: number[] = [];
  private dayViewIndices: number[] = [];
  private nightViewIndices: number[] = [];
  private waterIndices: number[] = [];

  // Helper to check if on mobile and determine screen size
  private checkMobileAndScreenSize() {
    const width = this.scale.width;
    const userAgent = navigator.userAgent.toLowerCase();

    // Check if mobile device
    this.isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
      (width <= 1024 && 'ontouchstart' in window);

    // Determine screen size category
    if (width < 480) {
      this.screenSizeCategory = 'xs';
    } else if (width < 768) {
      this.screenSizeCategory = 'sm';
    } else if (width < 1024) {
      this.screenSizeCategory = 'md';
    } else {
      this.screenSizeCategory = 'lg';
    }

    const deviceMemory = (navigator as any).deviceMemory || 0;
    this.isUltraLowPower = this.isMobileDevice && (this.screenSizeCategory === 'xs' || (deviceMemory > 0 && deviceMemory <= 2));
  }

  init(data: ShopGameProps) {
    this.checkMobileAndScreenSize();
    this.isLowPowerMode = this.isMobileDevice || this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';
    // Performance: use only 1 fixed day background, no night backgrounds, 1 water
    this.dayViewIndices = [0];
    this.nightViewIndices = [];
    this.waterIndices = [0];
    // Fewer car and character textures for performance
    this.carIndices = this.getIndexSubset(ASSET_PATHS.cars.length, this.isUltraLowPower ? 1 : (this.isLowPowerMode ? 1 : 2));
    this.characterIndices = this.getIndexSubset(ASSET_PATHS.characters.length, this.isUltraLowPower ? 1 : (this.isLowPowerMode ? 1 : 2));

    this.shopTheme = data.shopTheme || 'modern_clean';
    this.shopName = data.shopName || 'My Shop';
    this.products = data.products || [];
    this.staff = data.staff || [];
    this.decorations = data.decorations || { furniture: false, art: false, lights: false };
    this.onCustomerServed = data.onCustomerServed;
    this.onEnterShop = data.onEnterShop;

    // New Props
    this.config = data.config || {};
    this.onObjectClick = data.onObjectClick;
    this.interactive = !!data.interactive;
    this.view = data.view;
    this.shopImageUrl = data.shopImageUrl; // Store the generated shop image URL
    this.shopSceneImageUrl = (data as any).shopSceneImageUrl;
    this.onViewModeChange = data.onViewModeChange;
    this.externalCommand = data.externalCommand;
    this.isShopLaunched = (data as any).isShopLaunched ?? false;

    // Customization callbacks
    this.onShelfChange = data.onShelfChange;
    this.onCashierChange = data.onCashierChange;
    this.onPlantAdd = data.onPlantAdd;
    this.onPlantMove = data.onPlantMove;
    this.onRequestCustomAsset = data.onRequestCustomAsset;
    this.onOpenProductsBoard = (data as any).onOpenProductsBoard;
    this.onOpenStaffBoard = (data as any).onOpenStaffBoard;

    this.customAssets = data.customAssets || { floor: [], wall: [], plant: [] };
    this.buildTextureKeys();

    // Saved state
    this.currentLeftShelf = data.savedShelfLeft ?? 0;
    this.currentRightShelf = data.savedShelfRight ?? 0;
    this.currentCashier = data.savedCashier ?? 0;
    const maxFloorIndex = Math.max(0, this.floorTextureKeys.length - 1);
    const maxWallIndex = Math.max(0, this.wallTextureKeys.length - 1);
    this.currentFloorStyle = Math.min(data.savedFloor ?? 0, maxFloorIndex);
    this.currentWallStyle = Math.min(data.savedWall ?? 0, maxWallIndex);
    this.savedPlants = (data.savedPlants || []).map(plant => ({
      ...plant,
      plantIndex: Math.min(plant.plantIndex, Math.max(0, this.plantTextureKeys.length - 1))
    }));
    this.onInteriorStateChange = (data as any).onInteriorStateChange;
    this.onTimeUpdate = (data as any).onTimeUpdate;
    this.trafficMultiplier = (data as any).trafficMultiplier ?? 1.0;
    this.onVisitorEnter = (data as any).onVisitorEnter;
    this.activeInfluencers = (data as any).activeInfluencers ?? [];
    this.activeAdSpaces = (data as any).activeAdSpaces ?? [];
    this.activeInnovations = (data as any).activeInnovations ?? [];
    this.onInnovationMove = (data as any).onInnovationMove;
    this.onToolbarVisibilityChange = (data as any).onToolbarVisibilityChange;

    this.isInside = false;
    this.pottedPlants = [];
    this.influencerNPCs = [];
    this.adSpaceContainers = [];
    this.innovationItems = [];

    // Fixed background - always day, index 0, no randomness
    this.selectedDayBgIndex = 0;
    this.selectedNightBgIndex = 0;
    this.selectedWaterIndex = 0;

    // Always daytime for performance (no day/night switching)
    this.currentHour = 12;
    this.isNightTime = false;
  }



  preload() {
    this.load.crossOrigin = 'anonymous';
    this.queuedTextureKeys.clear();
    this.checkMobileAndScreenSize();
    this.isLowPowerMode = this.isMobileDevice || this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';

    if (this.shopImageUrl) {
      this.queueImage('ai_building', this.shopImageUrl, true);
      console.log('[ShopGame Phaser] Loading AI-generated shop image:', this.shopImageUrl);
    }
    if (this.shopSceneImageUrl) {
      this.queueImage('shop_scene', this.shopSceneImageUrl, true);
    }

    // Handle load errors - fallback to default building
    this.load.on('loaderror', (file: any) => {
      console.error('[ShopGame Phaser] Failed to load image:', file.key, file.url);
      if (file.key === 'ai_building' && this.shopImageUrl) {
        console.log('[ShopGame Phaser] Falling back to default shop asset due to load error');
        this.shopImageUrl = undefined;
      }
      if (file.key === 'shop_scene' && this.shopSceneImageUrl) {
        this.shopSceneImageUrl = undefined;
      }
      if (file?.key) {
        this.queuedTextureKeys.delete(file.key);
      }
    });

    // Load static assets (skip non-essential on ultra low power)
    if (!this.isUltraLowPower) {
      this.safeLoadImage('plant', '/plant.png');
      this.safeLoadImage('npc', '/uman1.png'); // 1.56 MB - skip on ultra low
    }
    this.safeLoadImage('frame', '/frame.png');

    // Load tree assets (reduced on low power)
    const treeIndices = this.isLowPowerMode
      ? [0]
      : [0, 8];
    treeIndices.forEach((index) => {
      const path = ASSET_PATHS.trees[index];
      if (path) this.safeLoadImage(`tree_${index}`, path);
    });

    // Load car assets
    const carPool = this.carIndices.length > 0 ? this.carIndices : ASSET_PATHS.cars.map((_p, i) => i);
    carPool.forEach((index) => {
      const path = ASSET_PATHS.cars[index];
      if (path) this.safeLoadImage(`car_${index}`, path);
    });

    // Load shop building assets (for background buildings)
    const shopIndices = this.isLowPowerMode ? [0, 1] : ASSET_PATHS.shops.map((_p, i) => i);
    shopIndices.forEach((index) => {
      const path = ASSET_PATHS.shops[index];
      if (path) this.safeLoadImage(`shop_building_${index}`, path);
    });

    // Load shelf assets (reduced on low power - load 3 instead of all 7)
    const shelfCount = this.isUltraLowPower ? 2 : (this.isLowPowerMode ? 3 : ASSET_PATHS.shelves.length);
    const shelfIndices = this.getIndexSubset(ASSET_PATHS.shelves.length, shelfCount);
    shelfIndices.forEach((index) => {
      const path = ASSET_PATHS.shelves[index];
      if (path) this.safeLoadImage(`shelf_${index}`, path);
    });

    // Load cashier table assets (reduced on low power - load 2 instead of all 5)
    const cashierCount = this.isUltraLowPower ? 1 : (this.isLowPowerMode ? 2 : ASSET_PATHS.cashiers.length);
    const cashierIndices = this.getIndexSubset(ASSET_PATHS.cashiers.length, cashierCount);
    cashierIndices.forEach((index) => {
      const path = ASSET_PATHS.cashiers[index];
      if (path) this.safeLoadImage(`cashier_${index}`, path);
    });

    // Load potted plant assets (reduced on low power - load 3 instead of all 6)
    const plantCount = this.isUltraLowPower ? 2 : (this.isLowPowerMode ? 3 : ASSET_PATHS.plants.length);
    const plantIndices = this.getIndexSubset(ASSET_PATHS.plants.length, plantCount);
    plantIndices.forEach((index) => {
      const path = ASSET_PATHS.plants[index];
      if (path) this.safeLoadImage(`potted_plant_${index}`, path);
    });
    this.customAssets.plant.forEach((dataUrl, index) => {
      this.safeLoadImage(`custom_plant_${index}`, dataUrl);
    });

    // Load character assets for NPCs (reduced on low power)
    const characterPool = this.characterIndices.length > 0 ? this.characterIndices : ASSET_PATHS.characters.map((_p, i) => i);
    characterPool.forEach((index) => {
      const path = ASSET_PATHS.characters[index];
      if (path) this.safeLoadImage(`character_${index}`, path);
    });

    // Load walking character sprite sheet (2 columns x 1 row = 2 frames)
    // Load as both image and spritesheet - actual frame size detected in create()
    this.queueImage('walking_char_as_image', '/assets/walking_char.png');
    this.queueSpritesheet('walking_char', '/assets/walking_char.png', {
      frameWidth: 224,
      frameHeight: 382,
      startFrame: 0,
      endFrame: 1
    });

    // Load only 1 fixed day view background (no night views for performance)
    const dayPath = ASSET_PATHS.dayViews[0];
    if (dayPath) this.safeLoadImage('day_view_0', dayPath);

    // Load exterior decoration assets (reduced on ultra low power)
    if (!this.isUltraLowPower) {
      this.safeLoadImage('ext_bench', ASSET_PATHS.exterior.bench);
    }

    // Load only 1 lamp on mobile, all on desktop
    const lampCount = this.isUltraLowPower ? 0 : (this.isLowPowerMode ? 1 : ASSET_PATHS.exterior.lamps.length);
    ASSET_PATHS.exterior.lamps.slice(0, lampCount).forEach((path, index) => {
      this.safeLoadImage(`ext_lamp_${index}`, path);
    });
    // Load only 1 ext plant on mobile
    const extPlantCount = this.isUltraLowPower ? 0 : (this.isLowPowerMode ? 1 : ASSET_PATHS.exterior.plants.length);
    ASSET_PATHS.exterior.plants.slice(0, extPlantCount).forEach((path, index) => {
      this.safeLoadImage(`ext_plant_${index}`, path);
    });
    // Load water textures for ocean (reduced on low power)
    const waterPool = this.waterIndices.length > 0 ? this.waterIndices : ASSET_PATHS.exterior.waters.map((_p, i) => i);
    waterPool.forEach((index) => {
      const path = ASSET_PATHS.exterior.waters[index];
      if (path) this.safeLoadImage(`ext_water_${index}`, path);
    });

    this.safeLoadImage('ext_sidewalk', ASSET_PATHS.exterior.sidewalk);
    this.safeLoadImage('ext_grass', ASSET_PATHS.exterior.grass);
    this.safeLoadImage('ext_road', ASSET_PATHS.exterior.road);

    // Load floor texture assets (reduced on low power - load 2 instead of all 5)
    const floorCount = this.isUltraLowPower ? 1 : (this.isLowPowerMode ? 2 : ASSET_PATHS.floors.length);
    const floorIndices = this.getIndexSubset(ASSET_PATHS.floors.length, floorCount);
    floorIndices.forEach((index) => {
      const path = ASSET_PATHS.floors[index];
      if (path) this.safeLoadImage(`floor_${index}`, path);
    });
    this.customAssets.floor.forEach((dataUrl, index) => {
      this.safeLoadImage(`custom_floor_${index}`, dataUrl);
    });

    // Load wall texture assets (reduced on low power - load 2 instead of all 5)
    const wallCount = this.isUltraLowPower ? 1 : (this.isLowPowerMode ? 2 : ASSET_PATHS.walls.length);
    const wallIndices = this.getIndexSubset(ASSET_PATHS.walls.length, wallCount);
    wallIndices.forEach((index) => {
      const path = ASSET_PATHS.walls[index];
      if (path) this.safeLoadImage(`wall_${index}`, path);
    });
    this.customAssets.wall.forEach((dataUrl, index) => {
      this.safeLoadImage(`custom_wall_${index}`, dataUrl);
    });
  }

  create() {
    // Clone theme and Apply Config Overrides
    const theme = JSON.parse(JSON.stringify(THEME_CONFIGS[this.shopTheme] || THEME_CONFIGS.modern_clean));

    if (this.config) {
      if (this.config.exterior?.wall) {
        const map: Record<string, number> = {
          'wall_brick': 0xB22222,
          'wall_glass': 0xAEC6CF,
          'wall_wood': 0x8B4513,
          'wall_paint_pink': 0xFFB6C1
        };
        if (map[this.config.exterior.wall]) theme.exterior.wall = map[this.config.exterior.wall];
      }
      if (this.config.interior?.floor) {
        const map: Record<string, number> = {
          'floor_wood': 0xDEB887,
          'floor_marble': 0xF5F5F5,
          'floor_check': 0xCCCCCC,
          'floor_carpet': 0xDA70D6
        };
        if (map[this.config.interior.floor]) theme.interior.floor = map[this.config.interior.floor];
      }
    }

    // Create walking animation from sprite sheet
    // Auto-detect frame size from actual image dimensions for accuracy
    if (this.textures.exists('walking_char_as_image')) {
      const texture = this.textures.get('walking_char_as_image');
      const source = texture.source[0];
      const width = source.width;
      const height = source.height;

      if (width && height) {
        const frameW = Math.floor(width / 2);  // 2 columns
        const frameH = height;                  // 1 row

        // Recreate spritesheet with correct dimensions
        if (frameW > 0 && frameH > 0) {
          if (this.textures.exists('walking_char')) {
            this.textures.remove('walking_char');
          }
          this.textures.addSpriteSheet('walking_char', source.image as HTMLImageElement, {
            frameWidth: frameW,
            frameHeight: frameH,
            startFrame: 0,
            endFrame: 1
          });
        }
      }
    }

    // Create smooth walking animation
    if (this.textures.exists('walking_char') && !this.anims.exists('walk')) {
      this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('walking_char', { start: 0, end: 1 }),
        frameRate: 6, // Slower frame rate for 2-frame walk cycle
        repeat: -1 // Loop forever
      });
    } else if (!this.textures.exists('walking_char')) {
      console.warn('[ShopGame] walking_char texture not loaded!');
    }

    // Set world bounds - extend height to include ocean area below road
    const extendedWorldHeight = this.worldHeight + 600;
    this.cameras.main.setBounds(0, 0, this.worldWidth, extendedWorldHeight);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Create a separate UI camera for fixed UI elements
    // This prevents duplicate rendering of UI at both world and screen positions
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCamera.setScroll(0, 0); // UI camera never scrolls
    this.uiCamera.setZoom(1); // UI camera never zooms

    // Create exterior world
    this.createExteriorWorld(theme);

    // Create interior (hidden initially)
    this.createInteriorWorld(theme);

    // Setup camera controls
    this.setupCameraControls();

    // Set initial camera zoomed in on the shop building - user can freely scroll/zoom from here
    this.cameras.main.setZoom(1.3);
    this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight * 0.75);

    // Handle resize events (only for UI camera, not main camera position)
    this.scale.on('resize', this.handleResize, this);

    // Start ambient animations
    this.startAmbientLife(theme);

    // Add UI overlay
    this.createUIOverlay();

    // Create the game-style item selection bar (fixed at bottom of screen, only for interior)
    this.createItemSelectionBar();

    // Create floating action button for adding plants (fixed to camera, only for interior)
    this.createFloatingActionButtons();

    // Setup UI camera to ignore game world objects
    // This ensures UI elements are only rendered by the UI camera at screen coordinates
    if (this.uiCamera) {
      // UI camera ignores game world containers - only renders UI elements
      if (this.exteriorContainer) this.uiCamera.ignore(this.exteriorContainer);
      if (this.interiorContainer) this.uiCamera.ignore(this.interiorContainer);
    }

    // Exterior-only mode - no interior view restore needed

    // Day/night cycle disabled for performance - always daytime
  }

  startDayNightCycle() {
    // Track last displayed minute to avoid unnecessary callbacks
    let lastDisplayedMinute = -1;
    let lastDisplayedHour = -1;

    // Sync time with real-world time periodically
    // This keeps the simulator aligned with actual time instead of accelerating
    const timeCheckDelay = this.isLowPowerMode ? 30000 : 10000; // Less frequent on mobile
    this.time.addEvent({
      delay: timeCheckDelay,
      callback: () => {
        // Skip auto-sync when debug mode is active
        if (this.debugModeActive) {
          return;
        }

        // Get actual current time
        const now = new Date();
        this.currentHour = now.getHours() + (now.getMinutes() / 60);

        // Check if we need to switch day/night (day 7am-7pm, night 7pm-7am)
        const wasNight = this.isNightTime;
        this.isNightTime = this.currentHour < 7 || this.currentHour >= 19;

        // If night status changed, update visuals
        if (wasNight !== this.isNightTime) {
          this.updateDayNightVisuals();
        }

        // Only update time display if minute or hour changed
        const currentMinute = Math.floor((this.currentHour % 1) * 60);
        const currentFullHour = Math.floor(this.currentHour);
        if (currentMinute !== lastDisplayedMinute || currentFullHour !== lastDisplayedHour) {
          lastDisplayedMinute = currentMinute;
          lastDisplayedHour = currentFullHour;
          this.updateTimeDisplay();
        }
      },
      loop: true
    });

    // Initial setup
    this.updateDayNightVisuals();
    this.updateTimeDisplay();
  }

  updateDayNightVisuals() {
    // Update background image based on time
    const textureKey = this.isNightTime
      ? `night_view_${this.selectedNightBgIndex}`
      : `day_view_${this.selectedDayBgIndex}`;

    if (this.backgroundImage && this.textures.exists(textureKey)) {
      this.tweens.add({
        targets: this.backgroundImage,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          this.backgroundImage?.setTexture(textureKey);
          this.tweens.add({
            targets: this.backgroundImage,
            alpha: 1,
            duration: 1000
          });
        }
      });
    }

    // Update overlay darkness for night
    if (this.dayNightOverlay) {
      this.tweens.add({
        targets: this.dayNightOverlay,
        alpha: this.isNightTime ? 0.4 : 0,
        duration: 2000
      });
    }
  }

  updateTimeDisplay() {
    const hour = Math.floor(this.currentHour);
    const minute = Math.floor((this.currentHour % 1) * 60);
    const isOpen = this.currentHour >= 9 && this.currentHour < 22;

    // Call the callback to update React UI
    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        hour,
        minute,
        isOpen,
        isNight: this.isNightTime
      });
    }
  }

  isShopOpen(): boolean {
    return this.currentHour >= 9 && this.currentHour < 22;
  }

  createExteriorWorld(theme: typeof THEME_CONFIGS[string]) {
    this.exteriorContainer = this.add.container(0, 0);

    // Background image from assets (day or night based on current time)
    const bgTextureKey = this.isNightTime
      ? `night_view_${this.selectedNightBgIndex}`
      : `day_view_${this.selectedDayBgIndex}`;

    if (this.textures.exists(bgTextureKey)) {
      this.backgroundImage = this.add.image(this.worldWidth / 2, this.worldHeight * 0.4, bgTextureKey);
      this.backgroundImage.setOrigin(0.5, 0.5);
      // Scale to cover the sky area
      const bgTexture = this.textures.get(bgTextureKey);
      const frame = bgTexture.get();
      const scaleX = this.worldWidth / frame.width;
      const scaleY = (this.worldHeight * 0.6) / frame.height;
      const scale = Math.max(scaleX, scaleY) * 1.2;
      this.backgroundImage.setScale(scale);
      this.exteriorContainer.add(this.backgroundImage);
    } else {
      // Fallback: Sky gradient
      const skyGradient = this.add.graphics();
      skyGradient.fillGradientStyle(theme.sky, theme.sky, 0xFFFFFF, 0xFFFFFF, 1);
      skyGradient.fillRect(0, 0, this.worldWidth, this.worldHeight * 0.6);
      this.exteriorContainer.add(skyGradient);

      // Sun (only if no background image)
      const sun = this.add.graphics();
      sun.fillStyle(0xFFD700, 1);
      sun.fillCircle(this.worldWidth - 200, 150, 60);
      sun.fillStyle(0xFFF8DC, 0.3);
      sun.fillCircle(this.worldWidth - 200, 150, 80);
      this.exteriorContainer.add(sun);
    }

    // Clouds (subtle, on top of background)
    this.createClouds();

    // Ground with realistic grass texture
    this.createRealisticGround(theme);

    // Road
    this.createRoad();

    // Sidewalk
    this.createSidewalk();

    // Trees
    this.createTrees(theme);

    // Street lamps
    this.createStreetLamps();

    // Other buildings (background)
    this.createBackgroundBuildings(theme);

    // Main shop building
    this.createShopBuilding(theme);

    // Benches
    this.createBenches();

    // Flower beds
    this.createFlowerBeds();

    // Create animated ocean BELOW the grass area (skip on ultra low power mobile)
    if (!this.isUltraLowPower) {
      this.createOceanScene();
    }

    // Create marketing influencer NPCs and ad space visuals if any are active
    this.refreshMarketingVisuals();
  }

  createClouds() {
    if (this.isUltraLowPower) {
      return;
    }
    // Reduced cloud count for performance
    const cloudCount = this.isLowPowerMode ? 2 : 4;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.createCloud(
        Phaser.Math.Between(100, this.worldWidth - 100),
        Phaser.Math.Between(50, 250)
      );
      this.clouds.push(cloud);
      this.exteriorContainer?.add(cloud);

      // Animate clouds
      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(100, 300),
        duration: Phaser.Math.Between(20000, 40000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createCloud(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();

    graphics.fillStyle(0xFFFFFF, 0.9);
    graphics.fillCircle(0, 0, 30);
    graphics.fillCircle(25, -5, 25);
    graphics.fillCircle(-25, 5, 22);
    graphics.fillCircle(15, 10, 20);
    graphics.fillCircle(-15, 8, 18);

    container.add(graphics);
    return container;
  }

  // Create ocean scene below the grass (works on all devices including low-end)
  createOceanScene() {
    const oceanStartY = this.worldHeight;
    const oceanHeight = 400;

    const oceanContainer = this.add.container(0, 0);
    oceanContainer.setDepth(5);

    const waterKey = `ext_water_${this.selectedWaterIndex}`;

    if (this.textures.exists(waterKey)) {
      const waterTexture = this.textures.get(waterKey);
      const waterFrame = waterTexture.getSourceImage();
      const waterWidth = waterFrame.width;
      const waterHeight = waterFrame.height;

      const tilesX = Math.ceil((this.worldWidth + 200) / waterWidth) + 1;
      const tilesY = Math.ceil(oceanHeight / waterHeight) + 1;

      // Single layer on low-power, 2 layers on desktop
      const layerCount = this.isLowPowerMode ? 1 : 2;
      for (let layer = 0; layer < layerCount; layer++) {
        const layerContainer = this.add.container(0, 0);
        const layerAlpha = layer === 0 ? 1.0 : 0.6;
        const layerOffset = layer * 50;

        for (let y = 0; y < tilesY; y++) {
          for (let x = 0; x < tilesX; x++) {
            const waterTile = this.add.image(
              x * waterWidth - 100,
              oceanStartY + y * waterHeight + layerOffset,
              waterKey
            );
            waterTile.setOrigin(0, 0);
            waterTile.setAlpha(layerAlpha);
            layerContainer.add(waterTile);
          }
        }

        // Gentle wave animation (slower on mobile for performance)
        this.tweens.add({
          targets: layerContainer,
          x: layer === 0 ? -30 : 30,
          y: { from: 0, to: layer === 0 ? -8 : 8 },
          duration: this.isLowPowerMode ? 5000 : (layer === 0 ? 3000 : 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        oceanContainer.add(layerContainer);
      }
    } else {
      // Fallback to programmatic waves (2 layers on all devices)
      this.createWaveLayer(oceanStartY, 0x4169e1, 1.0, 3000, 15, oceanContainer);
      this.createWaveLayer(oceanStartY + 40, 0x1e90ff, 1.0, 2500, 20, oceanContainer);
    }

    // Add floating elements only on non-low-power devices
    if (!this.isLowPowerMode) {
      this.createOceanDetails(oceanStartY, oceanContainer);
    }

    this.exteriorContainer?.add(oceanContainer);
  }

  // Create a single animated wave layer
  createWaveLayer(baseY: number, color: number, alpha: number, _duration: number, amplitude: number, container: Phaser.GameObjects.Container) {
    const waveGraphics = this.add.graphics();

    // Use larger step size on mobile to reduce path complexity
    const stepSize = this.isLowPowerMode ? 60 : 20;

    const drawWave = (offset: number) => {
      waveGraphics.clear();
      waveGraphics.fillStyle(color, alpha);
      waveGraphics.beginPath();
      waveGraphics.moveTo(-100, baseY + 500);

      // Draw wave curve
      for (let x = -100; x <= this.worldWidth + 100; x += stepSize) {
        const waveY = baseY + Math.sin((x + offset) * 0.01) * amplitude + Math.sin((x + offset) * 0.005) * (amplitude * 0.5);
        waveGraphics.lineTo(x, waveY);
      }

      waveGraphics.lineTo(this.worldWidth + 100, baseY + 500);
      waveGraphics.closePath();
      waveGraphics.fillPath();
    };

    // Initial draw
    drawWave(0);
    container.add(waveGraphics);

    // Skip wave animation entirely on ultra low power (static waves)
    if (this.isUltraLowPower) return;

    // Animate the wave - much slower on mobile (200ms vs 50ms)
    let waveOffset = 0;
    const waveDelay = this.isLowPowerMode ? 200 : 50;
    this.time.addEvent({
      delay: waveDelay,
      callback: () => {
        waveOffset += 5;
        drawWave(waveOffset);
      },
      loop: true
    });
  }

  // Add details to the ocean (boats, birds flying over water)
  createOceanDetails(oceanStartY: number, container: Phaser.GameObjects.Container) {
    // Skip ocean details entirely on ultra low power
    if (this.isUltraLowPower) return;

    // Create a few small boats
    const boatCount = this.isLowPowerMode ? 1 : 3;
    for (let i = 0; i < boatCount; i++) {
      const boatX = Phaser.Math.Between(200, this.worldWidth - 200);
      const boatY = oceanStartY + Phaser.Math.Between(80, 200);
      const boat = this.createBoat(boatX, boatY);
      container.add(boat);

      // Animate boat bobbing and drifting
      this.tweens.add({
        targets: boat,
        y: boat.y + Phaser.Math.Between(-8, 8),
        x: boat.x + Phaser.Math.Between(50, 150),
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Add some seagulls flying over the ocean
    const birdCount = this.isLowPowerMode ? 2 : 4;
    for (let i = 0; i < birdCount; i++) {
      const birdY = oceanStartY - Phaser.Math.Between(20, 100);
      const bird = this.createSeagull(Phaser.Math.Between(-100, this.worldWidth), birdY);
      container.add(bird);

      // Animate bird flying across
      this.tweens.add({
        targets: bird,
        x: bird.x + this.worldWidth + 200,
        y: birdY + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(15000, 25000),
        repeat: -1,
        onRepeat: () => {
          bird.x = -100;
          bird.y = oceanStartY - Phaser.Math.Between(20, 100);
        }
      });
    }

    // Add sun reflection on water
    const reflection = this.add.graphics();
    reflection.fillStyle(0xffd700, 0.2);
    for (let i = 0; i < 5; i++) {
      const sparkleX = this.worldWidth / 2 + Phaser.Math.Between(-300, 300);
      const sparkleY = oceanStartY + Phaser.Math.Between(50, 150);
      reflection.fillCircle(sparkleX, sparkleY, Phaser.Math.Between(3, 8));
    }
    container.add(reflection);

    // Animate sparkles
    this.tweens.add({
      targets: reflection,
      alpha: { from: 0.1, to: 0.4 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // Create a simple boat shape
  createBoat(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();

    // Boat hull
    graphics.fillStyle(0x8b4513, 1); // Brown
    graphics.beginPath();
    graphics.moveTo(-20, 0);
    graphics.lineTo(20, 0);
    graphics.lineTo(15, 12);
    graphics.lineTo(-15, 12);
    graphics.closePath();
    graphics.fillPath();

    // Sail
    graphics.fillStyle(0xffffff, 0.9);
    graphics.beginPath();
    graphics.moveTo(0, -25);
    graphics.lineTo(0, 0);
    graphics.lineTo(12, -5);
    graphics.closePath();
    graphics.fillPath();

    // Mast
    graphics.lineStyle(2, 0x4a3728);
    graphics.lineBetween(0, -25, 0, 5);

    container.add(graphics);
    container.setScale(0.8);
    container.setDepth(1);
    return container;
  }

  // Create a simple seagull shape
  createSeagull(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();

    // Wings (simple V shape)
    graphics.lineStyle(2, 0xffffff);
    graphics.beginPath();
    graphics.moveTo(-10, 3);
    graphics.lineTo(0, 0);
    graphics.lineTo(10, 3);
    graphics.strokePath();

    // Body dot
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(0, 1, 2);

    container.add(graphics);
    container.setDepth(3);

    // Wing flap animation (skip on mobile)
    if (!this.isLowPowerMode) {
      this.tweens.add({
        targets: container,
        scaleY: { from: 1, to: 0.7 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return container;
  }

  createHills(theme: typeof THEME_CONFIGS[string]) {
    const hills = this.add.graphics();

    // Far hills
    hills.fillStyle(this.darkenColor(theme.ground, 0.2), 1);
    hills.beginPath();
    hills.moveTo(0, this.worldHeight * 0.6);
    for (let x = 0; x <= this.worldWidth; x += 100) {
      const y = this.worldHeight * 0.55 + Math.sin(x * 0.005) * 50 + Math.sin(x * 0.002) * 30;
      hills.lineTo(x, y);
    }
    hills.lineTo(this.worldWidth, this.worldHeight * 0.6);
    hills.closePath();
    hills.fillPath();

    this.exteriorContainer?.add(hills);
  }

  createRealisticGround(_theme: typeof THEME_CONFIGS[string]) {
    const groundY = this.worldHeight * 0.55;
    const groundHeight = this.worldHeight * 0.45;

    // Use grass asset if available, tile it across the world
    if (this.textures.exists('ext_grass')) {
      const grassTexture = this.textures.get('ext_grass');
      const frame = grassTexture.get();
      const grassScale = 0.5; // Adjust scale as needed
      const tileWidth = frame.width * grassScale;

      // Tile the grass image across the ground area
      for (let x = 0; x < this.worldWidth; x += tileWidth) {
        const grassSprite = this.add.image(x, groundY, 'ext_grass');
        grassSprite.setOrigin(0, 0);
        grassSprite.setScale(grassScale);
        // Scale height to cover from groundY to bottom
        const heightScale = groundHeight / frame.height;
        grassSprite.setScale(grassScale, Math.max(grassScale, heightScale));
        this.exteriorContainer?.add(grassSprite);
      }
    } else {
      // Fallback: Base ground layer with gradient
      const ground = this.add.graphics();

      // Multi-layer grass for realistic effect
      ground.fillStyle(0x2D5016, 1);
      ground.fillRect(0, groundY, this.worldWidth, groundHeight);

      ground.fillStyle(0x4A7023, 1);
      ground.fillRect(0, groundY, this.worldWidth, groundHeight * 0.9);

      ground.fillStyle(0x5C8A2F, 1);
      ground.fillRect(0, groundY, this.worldWidth, groundHeight * 0.7);

      this.exteriorContainer?.add(ground);
    }

    // Add subtle shadow/depth near sidewalk
    const shadowGraphics = this.add.graphics();
    shadowGraphics.fillStyle(0x3D5020, 0.3);
    shadowGraphics.fillRect(0, this.worldHeight * 0.85 - 15, this.worldWidth, 15);
    this.exteriorContainer?.add(shadowGraphics);

    // Day/night overlay (covers everything, starts transparent)
    this.dayNightOverlay = this.add.graphics();
    this.dayNightOverlay.fillStyle(0x000033, 1);
    this.dayNightOverlay.fillRect(0, 0, this.worldWidth, this.worldHeight);
    this.dayNightOverlay.setAlpha(this.isNightTime ? 0.4 : 0);
    this.dayNightOverlay.setDepth(100); // Above most things but below UI
    this.exteriorContainer?.add(this.dayNightOverlay);

    // Time display (top of screen, fixed)
    // Time display and closed indicator now handled in React UI
  }

  createRoad() {
    const roadY = this.worldHeight * 0.85;
    const roadHeight = 100;

    // Use road asset if available, tile it across the world
    if (this.textures.exists('ext_road')) {
      const roadTexture = this.textures.get('ext_road');
      const frame = roadTexture.get();
      const roadScale = 0.5; // Adjust scale for proper road look
      const tileWidth = frame.width * roadScale;

      // Tile the road image across
      for (let x = 0; x < this.worldWidth; x += tileWidth) {
        const roadSprite = this.add.image(x, roadY, 'ext_road');
        roadSprite.setOrigin(0, 0);
        // Scale to fit the road area
        const heightScale = roadHeight / frame.height;
        roadSprite.setScale(roadScale, heightScale);
        this.exteriorContainer?.add(roadSprite);
      }
    } else {
      // Fallback to graphics-based road
      const road = this.add.graphics();

      // Main road
      road.fillStyle(0x4A4A4A, 1);
      road.fillRect(0, roadY, this.worldWidth, roadHeight);

      // Road lines
      road.fillStyle(0xFFFFFF, 1);
      for (let x = 0; x < this.worldWidth; x += 80) {
        road.fillRect(x, roadY + 47, 40, 6);
      }

      // Road edges
      road.fillStyle(0xFFFF00, 1);
      road.fillRect(0, roadY, this.worldWidth, 4);
      road.fillRect(0, roadY + 96, this.worldWidth, 4);

      this.exteriorContainer?.add(road);
    }
  }

  createSidewalk() {
    const sidewalkY = this.worldHeight * 0.75;
    const sidewalkHeight = this.worldHeight * 0.1;

    // Use sidewalk asset if available, tile it across the world
    if (this.textures.exists('ext_sidewalk')) {
      const sidewalkTexture = this.textures.get('ext_sidewalk');
      const frame = sidewalkTexture.get();
      const sidewalkScale = 0.3; // Adjust scale for proper sidewalk look
      const tileWidth = frame.width * sidewalkScale;

      // Tile the sidewalk image across
      for (let x = 0; x < this.worldWidth; x += tileWidth) {
        const sidewalkSprite = this.add.image(x, sidewalkY, 'ext_sidewalk');
        sidewalkSprite.setOrigin(0, 0);
        // Scale to fit the sidewalk area
        const heightScale = sidewalkHeight / frame.height;
        sidewalkSprite.setScale(sidewalkScale, heightScale);
        this.exteriorContainer?.add(sidewalkSprite);
      }
    } else {
      // Fallback to graphics-based sidewalk
      const sidewalk = this.add.graphics();
      sidewalk.fillStyle(0xD3D3D3, 1);
      sidewalk.fillRect(0, sidewalkY, this.worldWidth, sidewalkHeight);

      // Sidewalk tiles
      sidewalk.lineStyle(1, 0xA9A9A9, 0.5);
      for (let x = 0; x < this.worldWidth; x += 60) {
        sidewalk.lineBetween(x, sidewalkY, x, sidewalkY + sidewalkHeight);
      }

      this.exteriorContainer?.add(sidewalk);
    }
  }

  createTrees(_theme: typeof THEME_CONFIGS[string]) {
    // Place trees at various positions with different tree types across the wider world
    const treePositions = this.isLowPowerMode
      ? [
        { x: 1400, treeIndex: 0 },
      ]
      : [
        { x: 1800, treeIndex: 8 },
      ];

    treePositions.forEach(({ x, treeIndex }) => {
      // Position trees at sidewalk bottom (where sidewalk meets road)
      const tree = this.createTree(x, this.worldHeight * 0.85, treeIndex);
      this.trees.push(tree);
      this.exteriorContainer?.add(tree);
    });
  }

  createTree(x: number, y: number, treeIndex?: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Use random tree index if not specified
    const index = treeIndex ?? Math.floor(Math.random() * ASSET_PATHS.trees.length);
    const textureKey = `tree_${index}`;

    // Check if texture exists
    if (this.textures.exists(textureKey)) {
      const treeSprite = this.add.image(0, 0, textureKey);
      treeSprite.setOrigin(0.5, 1); // Bottom center origin so tree sits on ground
      treeSprite.setScale(0.15); // Scale reduced from 0.25
      container.add(treeSprite);

      if (!this.isLowPowerMode) {
        // Gentle sway animation
        this.tweens.add({
          targets: container,
          angle: { from: -1.5, to: 1.5 },
          duration: 2500 + Math.random() * 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else {
      // Fallback to graphics-based tree if texture not loaded
      const graphics = this.add.graphics();
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRect(-10, -80, 20, 80);
      graphics.fillStyle(0x228B22, 1);
      graphics.fillCircle(0, -100, 45);
      graphics.fillCircle(-30, -80, 35);
      graphics.fillCircle(30, -80, 35);
      container.add(graphics);
    }

    return container;
  }

  createStreetLamps() {
    // Distribute lamps across the wider world (reduced for performance)
    const lampPositions: number[] = [];

    lampPositions.forEach(x => {
      // Position lamps at sidewalk bottom (where sidewalk meets road)
      const lamp = this.createStreetLamp(x, this.worldHeight * 0.85);
      this.exteriorContainer?.add(lamp);
    });
  }

  createStreetLamp(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Use lamp asset if available (randomly choose between lamp styles)
    const lampIndex = Math.floor(Math.random() * 2);
    const lampKey = `ext_lamp_${lampIndex}`;

    if (this.textures.exists(lampKey)) {
      const lampSprite = this.add.image(0, 0, lampKey);
      lampSprite.setOrigin(0.5, 1); // Bottom center origin so lamp sits on ground
      lampSprite.setScale(0.06); // Scale down the lamp image (smaller)
      container.add(lampSprite);

      // Add glow effect at night (will be controlled by day/night cycle)
      const glow = this.add.graphics();
      glow.fillStyle(0xFFFF99, 0.15);
      glow.fillCircle(0, -lampSprite.displayHeight * 0.8, 25);
      glow.setAlpha(this.isNightTime ? 0.4 : 0);
      container.add(glow);
      container.setData('glow', glow);
    } else {
      // Fallback to graphics-based lamp
      const graphics = this.add.graphics();

      // Pole
      graphics.fillStyle(0x2F2F2F, 1);
      graphics.fillRect(-4, -120, 8, 120);

      // Lamp arm
      graphics.fillRect(-4, -120, 30, 6);

      // Lamp
      graphics.fillStyle(0xFFFFE0, 1);
      graphics.fillRect(20, -118, 20, 15);

      // Light glow
      graphics.fillStyle(0xFFFF99, 0.2);
      graphics.fillCircle(30, -100, 40);

      container.add(graphics);
    }

    return container;
  }

  createBackgroundBuildings(_theme: typeof THEME_CONFIGS[string]) {
    // Only 2 NPC shops - one on each side of the main shop (center ~2000)
    // Left side shop
    this.createBackgroundBuilding(800, 0, 1.0); // Shop 1

    // Right side shop
    if (!this.isLowPowerMode) {
      this.createBackgroundBuilding(3200, 1, 1.0); // Shop 2
    }
  }

  createBackgroundBuilding(x: number, shopIndex: number, scale: number = 0.18) {
    // Position buildings at sidewalk bottom (where sidewalk meets road)
    const baseY = this.worldHeight * 0.87;
    const textureKey = `shop_building_${shopIndex}`;

    if (this.textures.exists(textureKey)) {
      const buildingSprite = this.add.image(x, baseY, textureKey);
      buildingSprite.setOrigin(0.5, 1); // Bottom center
      buildingSprite.setScale(scale);

      // No shadow for cleaner look
      this.exteriorContainer?.add(buildingSprite);
    } else {
      // Fallback to graphics-based building
      const building = this.add.graphics();
      const width = 150;
      const height = 200;

      building.fillStyle(0xA0522D, 1);
      building.fillRect(x - width / 2, baseY - height, width, height);
      building.fillStyle(0x8B4513, 1);
      building.beginPath();
      building.moveTo(x - width / 2 - 10, baseY - height);
      building.lineTo(x, baseY - height - 40);
      building.lineTo(x + width / 2 + 10, baseY - height);
      building.closePath();
      building.fillPath();

      // Windows
      building.fillStyle(0x87CEEB, 0.8);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const wx = x - 45 + col * 35;
          const wy = baseY - height + 30 + row * 50;
          building.fillRect(wx, wy, 25, 30);
        }
      }

      building.fillStyle(0x8B4513, 1);
      building.fillRect(x - 20, baseY - 60, 40, 60);

      this.exteriorContainer?.add(building);
    }
  }

  createShopBuilding(_theme: typeof THEME_CONFIGS[string]) {
    // Position main shop at sidewalk bottom (where sidewalk meets road)
    this.shopBuilding = this.add.container(this.worldWidth / 2, this.worldHeight * 0.85);

    // Use AI-generated image if available, otherwise fallback to asset shop building
    const buildingTextureKey = this.shopImageUrl && this.textures.exists('ai_building')
      ? 'ai_building'
      : 'shop_building_0';
    this.buildingSprite = this.add.image(0, 0, buildingTextureKey);

    // Calculate appropriate scale based on image dimensions
    // AI-generated images are typically 1024x1024, we want the building to be ~350px tall
    const targetHeight = 350;
    const texture = this.textures.get(buildingTextureKey);
    const frame = texture.get();
    const imageHeight = frame.height || 1024; // Fallback to 1024 if undefined

    // Scale to fit nicely in the scene
    const scale = targetHeight / imageHeight;
    this.buildingSprite.setScale(scale);

    // Position the building so its bottom sits on the ground
    // Origin at bottom center for proper placement
    this.buildingSprite.setOrigin(0.5, 1);
    this.buildingSprite.setY(0); // Bottom of container is at ground level

    // Make the entire building image interactive
    this.buildingSprite.setInteractive({ useHandCursor: true });

    this.buildingSprite.on('pointerover', () => {
      this.tweens.add({
        targets: this.shopBuilding,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 200
      });
    });

    this.buildingSprite.on('pointerout', () => {
      this.tweens.add({
        targets: this.shopBuilding,
        scaleX: 1,
        scaleY: 1,
        duration: 200
      });
    });

    this.buildingSprite.on('pointerdown', () => {
      if (this.interactive && this.onObjectClick) {
        this.onObjectClick('exterior_wall');
        this.tweens.add({
          targets: this.buildingSprite,
          scaleX: scale * 1.05,
          scaleY: scale * 1.05,
          yoyo: true,
          duration: 100
        });
        return;
      }
      this.enterShop();
    });

    this.shopBuilding.add(this.buildingSprite);

    // Only add banner/lights if NOT using AI-generated image (AI image already has these)
    if (!this.shopImageUrl) {
      this.createBanner(this.shopBuilding, this.shopName, this.config.exterior?.banner || 'banner_plain');
      this.createExteriorLights(this.shopBuilding, this.config.exterior?.lights || 'lights_none');
    }

    this.exteriorContainer?.add(this.shopBuilding);

    // Entrance hint - cleaner style
    const hintY = this.worldHeight * 0.85 - targetHeight - 30;
    const arrowHint = this.add.text(this.worldWidth / 2, hintY, '👆 Tap to enter 3D World!', {
      fontSize: '16px',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: arrowHint,
      y: hintY - 8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.exteriorContainer?.add(arrowHint);
  }

  createShopWindow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, theme: typeof THEME_CONFIGS[string]) {
    // Window frame
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillRect(x - 5, y - 5, w + 10, h + 10);

    // Window glass
    graphics.fillStyle(theme.exterior.window, 0.7);
    graphics.fillRect(x, y, w, h);

    // Window reflection
    graphics.fillStyle(0xFFFFFF, 0.3);
    graphics.fillRect(x + 5, y + 5, 20, h - 10);

    // Display items inside window
    graphics.fillStyle(0xFFD700, 0.8);
    graphics.fillRect(x + 10, y + h - 40, 30, 30);
    graphics.fillStyle(0xFF69B4, 0.8);
    graphics.fillRect(x + 50, y + h - 50, 35, 40);
  }

  createFlowerBox(graphics: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Box
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(x, y, 100, 25);

    // Flowers
    const flowerColors = [0xFF69B4, 0xFFD700, 0xFF6347, 0x9370DB];
    for (let i = 0; i < 5; i++) {
      graphics.fillStyle(0x228B22, 1);
      graphics.fillRect(x + 10 + i * 18, y - 20, 4, 25);
      graphics.fillStyle(flowerColors[i % flowerColors.length], 1);
      graphics.fillCircle(x + 12 + i * 18, y - 25, 8);
    }
  }

  createBenches() {
    const benchPositions = this.isLowPowerMode ? [800] : [600, 1300];

    benchPositions.forEach(x => {
      // Position benches at sidewalk bottom (where sidewalk meets road)
      const bench = this.createBench(x, this.worldHeight * 0.85);
      this.exteriorContainer?.add(bench);
    });
  }

  createBench(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Use bench asset if available
    if (this.textures.exists('ext_bench')) {
      const benchSprite = this.add.image(0, 0, 'ext_bench');
      benchSprite.setOrigin(0.5, 1); // Bottom center origin so bench sits on ground
      benchSprite.setScale(0.05); // Scale down the bench image (smaller)
      container.add(benchSprite);
    } else {
      // Fallback to graphics-based bench
      const graphics = this.add.graphics();

      // Legs
      graphics.fillStyle(0x2F2F2F, 1);
      graphics.fillRect(-35, 0, 8, 25);
      graphics.fillRect(27, 0, 8, 25);

      // Seat
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRect(-40, -8, 80, 12);

      // Back
      graphics.fillRect(-40, -35, 80, 8);

      // Slats
      graphics.fillStyle(0xA0522D, 1);
      graphics.fillRect(-38, -33, 76, 4);
      graphics.fillRect(-38, -6, 76, 4);

      container.add(graphics);
    }

    return container;
  }

  createFlowerBeds() {
    const bedPositions = this.isLowPowerMode ? [1100] : [450, 1450];

    bedPositions.forEach(x => {
      // Position flower beds at sidewalk bottom (where sidewalk meets road)
      const flowerBed = this.createFlowerBed(x, this.worldHeight * 0.85);
      this.exteriorContainer?.add(flowerBed);
    });
  }

  createFlowerBed(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Use exterior plant assets if available
    const plantIndex = Math.floor(Math.random() * 2);
    const plantKey = `ext_plant_${plantIndex}`;

    if (this.textures.exists(plantKey)) {
      const plantSprite = this.add.image(0, 0, plantKey);
      plantSprite.setOrigin(0.5, 1); // Bottom center origin so plant sits on ground
      plantSprite.setScale(0.1); // Scale down the plant image
      container.add(plantSprite);

      // Gentle sway animation like trees
      this.tweens.add({
        targets: container,
        angle: { from: -1, to: 1 },
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Fallback to graphics-based flower bed
      const graphics = this.add.graphics();

      // Bed border
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRect(-50, 0, 100, 20);

      // Soil
      graphics.fillStyle(0x3D2817, 1);
      graphics.fillRect(-45, -5, 90, 10);

      // Flowers
      const colors = [0xFF69B4, 0xFFD700, 0xFF6347, 0x9370DB, 0x00CED1];
      for (let i = 0; i < 7; i++) {
        const fx = -40 + i * 13;
        // Stem
        graphics.fillStyle(0x228B22, 1);
        graphics.fillRect(fx, -25, 3, 25);
        // Flower
        graphics.fillStyle(colors[i % colors.length], 1);
        graphics.fillCircle(fx + 1, -28, 7);
        // Center
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillCircle(fx + 1, -28, 3);
      }

      container.add(graphics);
    }

    return container;
  }

  private getInfluencerTextureKey(id: string) {
    return `influencer_avatar_${id}`;
  }

  private getIndexSubset(total: number, maxCount: number): number[] {
    const count = Math.min(total, maxCount);
    if (count <= 0) return [];
    if (count === total) return Array.from({ length: total }, (_, i) => i);
    const step = total / count;
    const indices = new Set<number>();
    for (let i = 0; i < count; i++) {
      indices.add(Math.floor(i * step));
    }
    return Array.from(indices);
  }

  private getAdSpaceTextureKey(id: string) {
    return `ad_space_${id}`;
  }

  private getInnovationTextureKey(id: string) {
    return `innovation_${id}`;
  }

  private isTextureReady(key: string): boolean {
    if (!key || !this.textures.exists(key)) return false;
    const texture = this.textures.get(key);
    const source = texture?.source?.[0];
    const image = source?.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!source || !image) {
      this.textures.remove(key);
      return false;
    }
    if (image instanceof HTMLImageElement && !image.complete) {
      return false;
    }
    return true;
  }

  private refreshMarketingVisuals() {
    let hasQueued = false;

    this.activeInfluencers.forEach((influencer) => {
      if (influencer.avatarUrl) {
        const key = this.getInfluencerTextureKey(influencer.id);
        hasQueued = this.queueImage(key, influencer.avatarUrl) || hasQueued;
      }
    });

    this.activeAdSpaces.forEach((adSpace) => {
      if (adSpace.imageUrl) {
        const key = this.getAdSpaceTextureKey(adSpace.id);
        hasQueued = this.queueImage(key, adSpace.imageUrl) || hasQueued;
      }
    });

    if (hasQueued) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.createInfluencerNPCs();
        this.createAdSpaceVisuals();
      });
      this.startLoaderIfNeeded();
      return;
    }

    this.createInfluencerNPCs();
    this.createAdSpaceVisuals();
  }

  private refreshInnovationVisuals() {
    let hasQueued = false;

    this.activeInnovations.forEach((innovation) => {
      if (innovation.imageUrl) {
        const key = this.getInnovationTextureKey(innovation.id);
        hasQueued = this.queueImage(key, innovation.imageUrl) || hasQueued;
      }
    });

    if (hasQueued) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.createInnovationItems();
      });
      this.startLoaderIfNeeded();
      return;
    }

    this.createInnovationItems();
  }

  public updateMarketingData(activeInfluencers: ActiveInfluencer[], activeAdSpaces: ActiveAdSpace[]) {
    this.activeInfluencers = activeInfluencers || [];
    this.activeAdSpaces = activeAdSpaces || [];
    this.refreshMarketingVisuals();
  }

  public updateInnovationsData(activeInnovations: ActiveInnovation[]) {
    this.activeInnovations = activeInnovations || [];
    this.refreshInnovationVisuals();
  }

  // Create influencer NPCs outside the shop with speech bubbles
  createInfluencerNPCs() {
    // Clear existing influencer NPCs
    this.influencerNPCs.forEach(npc => {
      const speechEvent = npc.getData('speechEvent') as Phaser.Time.TimerEvent | undefined;
      if (speechEvent) {
        speechEvent.remove(false);
      }
      this.tweens.killTweensOf(npc);
      const children = (npc as unknown as Phaser.GameObjects.Container).list;
      if (Array.isArray(children)) {
        children.forEach(child => this.tweens.killTweensOf(child));
      }
      npc.destroy();
    });
    this.influencerNPCs = [];

    if (!this.activeInfluencers || this.activeInfluencers.length === 0) return;

    // Position influencers near the shop entrance
    const shopCenterX = this.worldWidth / 2;
    const baseY = this.worldHeight * 0.85; // Sidewalk level

    // Influencer speech bubble messages based on tier
    const speechMessages: Record<string, string[]> = {
      'Nano': ['🍜 Try this place!', '⭐ Hidden gem!', '👍 So good!', '📸 Must visit!'],
      'Micro': ['🔥 Trending now!', '💯 Highly rated!', '🎯 Best in town!', '✨ Amazing shop!'],
      'Macro': ['🌟 Featured spot!', '🏆 Top rated!', '💎 Premium quality!', '🚀 Going viral!'],
      'Mega': ['👑 Celebrity pick!', '🎬 As seen on TV!', '💫 Superstar approved!', '🔔 Don\'t miss this!']
    };

    this.activeInfluencers.forEach((influencer, index) => {
      // Position influencers on alternating sides of shop
      const side = index % 2 === 0 ? -1 : 1;
      const xOffset = 200 + (Math.floor(index / 2) * 120);
      const x = shopCenterX + (side * xOffset);

      // Create influencer container
      const container = this.add.container(x, baseY);

      // Create influencer person sprite with unique style based on tier
      const tierStyles: Record<string, { skin: number; hair: number; shirt: number; pants: number }> = {
        'Nano': { skin: 0xFFDBB4, hair: 0x8B4513, shirt: 0x32CD32, pants: 0x4169E1 },
        'Micro': { skin: 0xD2B48C, hair: 0x1a1a1a, shirt: 0x00CED1, pants: 0x2F2F2F },
        'Macro': { skin: 0xFFCBA4, hair: 0xFFD700, shirt: 0xFF69B4, pants: 0x8B4513 },
        'Mega': { skin: 0xF5DEB3, hair: 0xC0C0C0, shirt: 0xFFD700, pants: 0x1a1a1a }
      };
      const style = tierStyles[influencer.tier] || tierStyles['Nano'];

      // Create person graphics
      const personGraphics = this.add.graphics();

      // Legs
      personGraphics.fillStyle(style.pants, 1);
      personGraphics.fillRect(-12, -40, 10, 40);
      personGraphics.fillRect(2, -40, 10, 40);

      // Body
      personGraphics.fillStyle(style.shirt, 1);
      personGraphics.fillRoundedRect(-15, -80, 30, 45, 5);

      // Head
      personGraphics.fillStyle(style.skin, 1);
      personGraphics.fillCircle(0, -95, 18);

      // Hair
      personGraphics.fillStyle(style.hair, 1);
      personGraphics.fillEllipse(0, -105, 20, 12);

      // Eyes
      personGraphics.fillStyle(0x000000, 1);
      personGraphics.fillCircle(-6, -98, 3);
      personGraphics.fillCircle(6, -98, 3);

      // Smile
      personGraphics.lineStyle(2, 0x000000);
      personGraphics.beginPath();
      personGraphics.arc(0, -90, 8, 0.2, Math.PI - 0.2);
      personGraphics.strokePath();

      // Phone in hand (they're promoting!)
      personGraphics.fillStyle(0x2F2F2F, 1);
      personGraphics.fillRect(18, -75, 12, 20);
      personGraphics.fillStyle(0x4169E1, 0.8);
      personGraphics.fillRect(19, -74, 10, 16);

      container.add(personGraphics);

      // Influencer tier badge
      const badgeColors: Record<string, number> = {
        'Nano': 0x32CD32,
        'Micro': 0x00CED1,
        'Macro': 0xFF69B4,
        'Mega': 0xFFD700
      };

      const badge = this.add.graphics();
      badge.fillStyle(badgeColors[influencer.tier] || 0x32CD32, 1);
      badge.fillCircle(0, -125, 15);
      badge.lineStyle(2, 0xFFFFFF);
      badge.strokeCircle(0, -125, 15);
      container.add(badge);

      // Badge avatar (image or emoji fallback)
      if (influencer.avatarUrl) {
        const avatarKey = this.getInfluencerTextureKey(influencer.id);
        if (this.isTextureReady(avatarKey)) {
          const avatarImage = this.add.image(0, -125, avatarKey);
          avatarImage.setDisplaySize(28, 28);
          container.add(avatarImage);
        }
      }

      if (!influencer.avatarUrl || !this.isTextureReady(this.getInfluencerTextureKey(influencer.id))) {
        const badgeText = this.add.text(0, -125, influencer.avatar || '🙂', {
          fontSize: '16px'
        }).setOrigin(0.5);
        container.add(badgeText);
      }

      // Influencer name tag
      const nameTagBg = this.add.graphics();
      nameTagBg.fillStyle(0x000000, 0.7);
      nameTagBg.fillRoundedRect(-50, 5, 100, 22, 8);
      container.add(nameTagBg);

      const nameTag = this.add.text(0, 16, influencer.name, {
        fontSize: '11px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(nameTag);

      // Create animated speech bubble
      const bubbleContainer = this.add.container(side * -40, -150);

      // Speech bubble background
      const bubble = this.add.graphics();
      bubble.fillStyle(0xFFFFFF, 0.95);
      bubble.fillRoundedRect(-70, -35, 140, 50, 12);
      // Speech bubble tail
      bubble.fillTriangle(side > 0 ? 50 : -50, 15, side > 0 ? 30 : -30, 15, side > 0 ? 40 : -40, 30);
      bubble.lineStyle(2, badgeColors[influencer.tier] || 0x32CD32);
      bubble.strokeRoundedRect(-70, -35, 140, 50, 12);
      bubbleContainer.add(bubble);

      // Speech bubble text
      const messages = speechMessages[influencer.tier] || speechMessages['Nano'];
      const bubbleText = this.add.text(0, -10, messages[0], {
        fontSize: '13px',
        color: '#1a1a1a',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);
      bubbleContainer.add(bubbleText);

      container.add(bubbleContainer);

      // Animate speech bubble - bob up and down
      this.tweens.add({
        targets: bubbleContainer,
        y: bubbleContainer.y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Cycle through speech messages
      let messageIndex = 0;
      let speechEvent: Phaser.Time.TimerEvent | null = null;
      speechEvent = this.time.addEvent({
        delay: 3000 + (index * 500), // Stagger message changes
        callback: () => {
          const textAny = bubbleText as unknown as {
            active?: boolean;
            scene?: Phaser.Scene;
            canvas?: HTMLCanvasElement | null;
            context?: CanvasRenderingContext2D | null;
          };
          if (!textAny?.active || !textAny?.scene || !textAny?.canvas || !textAny?.context) {
            speechEvent?.remove(false);
            return;
          }
          messageIndex = (messageIndex + 1) % messages.length;
          bubbleText.setText(messages[messageIndex]);
        },
        loop: true
      });
      container.setData('speechEvent', speechEvent);

      // Idle animation for the influencer (single tween on mobile instead of 2)
      if (!this.isUltraLowPower) {
        this.tweens.add({
          targets: container,
          y: baseY - 3,
          duration: 1200 + (index * 100),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Wave animation (skip on low power - just use idle bob)
        if (!this.isLowPowerMode) {
          this.tweens.add({
            targets: container,
            angle: { from: -2, to: 2 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }

      this.exteriorContainer?.add(container);
      this.influencerNPCs.push(container);
    });
  }

  // Create ad space visuals (billboards, banners) — disabled, only used in 3D world
  createAdSpaceVisuals() {
    // Clear existing ad space visuals
    this.adSpaceContainers.forEach(container => container.destroy());
    this.adSpaceContainers = [];
    return; // Ad spaces removed from 2D view

    if (!this.activeAdSpaces || this.activeAdSpaces.length === 0) return;

    const shopCenterX = this.worldWidth / 2;
    const billboardOffsets = [-700, 700, -920, 920];
    const bannerOffsets = [430, -430, 620, -620];
    const digitalOffsets = [220, -220, 340, -340];
    let billboardIndex = 0;
    let bannerIndex = 0;
    let digitalIndex = 0;

    this.activeAdSpaces.forEach((adSpace) => {
      if (adSpace.type === 'Billboard') {
        // Highway billboard — tall structure along the road, posts reach down to road level
        const x = shopCenterX + billboardOffsets[billboardIndex % billboardOffsets.length];
        billboardIndex += 1;
        this.createBillboard(x, this.worldHeight * 0.72, adSpace);
      } else if (adSpace.type === 'Banner') {
        // Stand-up banner sign on the sidewalk in front of the shop
        const x = shopCenterX + bannerOffsets[bannerIndex % bannerOffsets.length];
        bannerIndex += 1;
        this.createWebBanner(x, this.worldHeight * 0.745, adSpace);
      } else if (adSpace.type === 'Digital') {
        // Digital sign near the shop entrance
        const x = shopCenterX + digitalOffsets[digitalIndex % digitalOffsets.length];
        digitalIndex += 1;
        this.createSocialMediaIndicator(x, this.worldHeight * 0.7, adSpace);
      }
    });
  }

  createBillboard(x: number, y: number, adSpace: ActiveAdSpace) {
    const container = this.add.container(x, y);

    // Billboard posts
    const postGraphics = this.add.graphics();
    postGraphics.fillStyle(0x4A4A4A, 1);
    postGraphics.fillRect(-8, 0, 16, 150);
    postGraphics.fillRect(180 - 8, 0, 16, 150);
    container.add(postGraphics);

    // Billboard panel
    const panel = this.add.graphics();
    panel.fillStyle(0x2F2F2F, 1);
    panel.fillRect(-20, -100, 220, 110);
    panel.fillStyle(0xFFFFFF, 1);
    panel.fillRect(-15, -95, 210, 100);
    container.add(panel);

    // Ad content - custom creative if available
    const adTextureKey = adSpace.imageUrl ? this.getAdSpaceTextureKey(adSpace.id) : '';
    if (adTextureKey && this.isTextureReady(adTextureKey)) {
      const adImage = this.add.image(90, -45, adTextureKey);
      adImage.setDisplaySize(190, 80);
      container.add(adImage);
    } else {
      const adBg = this.add.graphics();
      adBg.fillGradientStyle(0xFF6B6B, 0xFF8E53, 0xFF6B6B, 0xFF8E53, 1);
      adBg.fillRect(-10, -90, 200, 90);
      container.add(adBg);

      const adTitle = this.add.text(90, -70, '🏪 VISIT US!', {
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(adTitle);

      const adSubtext = this.add.text(90, -40, adSpace.name, {
        fontSize: '12px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      container.add(adSubtext);

      const adCta = this.add.text(90, -15, '⭐ Special Offers!', {
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(adCta);
    }

    // Billboard lights (small dots on top)
    const lights = this.add.graphics();
    for (let i = 0; i < 5; i++) {
      lights.fillStyle(0xFFFF00, this.isNightTime ? 0.8 : 0.3);
      lights.fillCircle(-10 + i * 50, -105, 4);
    }
    container.add(lights);
    container.setData('lights', lights);

    // Slight glow animation at night
    if (this.isNightTime) {
      this.tweens.add({
        targets: lights,
        alpha: { from: 0.5, to: 1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }

    container.setScale(0.8);
    this.exteriorContainer?.add(container);
    this.adSpaceContainers.push(container);
  }

  createWebBanner(x: number, y: number, adSpace: ActiveAdSpace) {
    const container = this.add.container(x, y);
    const panelWidth = 300;
    const panelHeight = 110;
    const panelHalfW = panelWidth / 2;
    const panelHalfH = panelHeight / 2;
    const legTopY = panelHalfH + 2;
    const legHeight = 85;

    // Keep a physical sign stand so custom banners don't look like floating strips.
    const stand = this.add.graphics();
    stand.fillStyle(0x2F2F2F, 1);
    stand.fillRect(-55, legTopY, 10, legHeight);
    stand.fillRect(45, legTopY, 10, legHeight);
    stand.fillRect(-65, legTopY + 42, 130, 6);
    container.add(stand);

    const frame = this.add.graphics();
    frame.fillStyle(0x111827, 0.92);
    frame.fillRoundedRect(-panelHalfW, -panelHalfH, panelWidth, panelHeight, 12);
    frame.lineStyle(3, 0xFFFFFF, 0.8);
    frame.strokeRoundedRect(-panelHalfW, -panelHalfH, panelWidth, panelHeight, 12);
    container.add(frame);

    const bannerTextureKey = adSpace.imageUrl ? this.getAdSpaceTextureKey(adSpace.id) : '';
    if (bannerTextureKey && this.isTextureReady(bannerTextureKey)) {
      const bannerImage = this.add.image(0, 0, bannerTextureKey);
      const sourceW = Math.max(1, bannerImage.width);
      const sourceH = Math.max(1, bannerImage.height);
      const maxW = panelWidth - 14;
      const maxH = panelHeight - 14;
      const fitScale = Math.min(maxW / sourceW, maxH / sourceH);
      bannerImage.setDisplaySize(sourceW * fitScale, sourceH * fitScale);
      container.add(bannerImage);
    } else {
      // Stand/legs for the sign
      const legs = this.add.graphics();
      legs.fillStyle(0x2F2F2F, 1);
      legs.fillRect(-4, 25, 8, 80);
      legs.fillRect(-30, 25, 60, 4); // crossbar
      container.add(legs);

      // Sign background (banner effect)
      const banner = this.add.graphics();
      banner.fillStyle(0x4169E1, 0.9);
      banner.fillRoundedRect(-120, -25, 240, 50, 10);
      banner.lineStyle(3, 0xFFFFFF, 0.8);
      banner.strokeRoundedRect(-120, -25, 240, 50, 10);
      container.add(banner);

      // Banner text
      const bannerText = this.add.text(0, 0, '🌐 Now Online! Visit our website', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(bannerText);
    }

    // Floating animation
    this.tweens.add({
      targets: container,
      y: container.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.exteriorContainer?.add(container);
    this.adSpaceContainers.push(container);
  }

  createSocialMediaIndicator(x: number, y: number, adSpace: ActiveAdSpace) {
    const container = this.add.container(x, y - 100);

    const digitalTextureKey = adSpace.imageUrl ? this.getAdSpaceTextureKey(adSpace.id) : '';
    if (digitalTextureKey && this.isTextureReady(digitalTextureKey)) {
      const screen = this.add.graphics();
      screen.fillStyle(0x0f172a, 0.9);
      screen.fillRoundedRect(-70, -40, 140, 80, 10);
      screen.lineStyle(2, 0x38BDF8, 0.9);
      screen.strokeRoundedRect(-70, -40, 140, 80, 10);
      container.add(screen);

      const adImage = this.add.image(0, 0, digitalTextureKey);
      adImage.setDisplaySize(120, 60);
      container.add(adImage);

      this.exteriorContainer?.add(container);
      this.adSpaceContainers.push(container);
      return;
    }

    // Social media icons floating
    const icons = ['📱', '💬', '❤️', '🔔'];
    icons.forEach((icon, i) => {
      const iconContainer = this.add.container((i - 1.5) * 40, 0);

      const bg = this.add.graphics();
      bg.fillStyle(0x1DA1F2, 0.9);
      bg.fillCircle(0, 0, 20);
      iconContainer.add(bg);

      const iconText = this.add.text(0, 0, icon, {
        fontSize: '18px'
      }).setOrigin(0.5);
      iconContainer.add(iconText);

      container.add(iconContainer);

      // Staggered bounce animation
      this.tweens.add({
        targets: iconContainer,
        y: -10,
        duration: 800,
        delay: i * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Bounce.easeOut'
      });
    });

    // "Trending" text below
    const trendingText = this.add.text(0, 35, '📈 Trending!', {
      fontSize: '12px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(trendingText);

    this.exteriorContainer?.add(container);
    this.adSpaceContainers.push(container);
  }

  createInteriorWorld(theme: typeof THEME_CONFIGS[string]) {
    this.interiorContainer = this.add.container(0, 0);
    this.interiorContainer.setVisible(false);

    const centerX = this.worldWidth / 2;
    const graphics = this.add.graphics();

    // Define interior margins - fixed width for consistent layout
    const sideMargin = (this.worldWidth - this.interiorWidth) / 2; // Center the interior
    const floorTop = 280; // Floor start position
    const floorWidth = this.worldWidth - (sideMargin * 2);
    const floorHeight = this.worldHeight - floorTop - 170;
    this.interiorFloorTop = floorTop;
    this.interiorFloorHeight = floorHeight;

    // Store interior bounds for NPC movement
    this.interiorLeftBound = sideMargin + 100;
    this.interiorRightBound = this.worldWidth - sideMargin - 100;

    // Create floor using tiled image
    this.floorTileContainer = this.add.container(0, 0);
    const floorTextureKey = this.getFloorTextureKey(this.currentFloorStyle);
    if (this.textures.exists(floorTextureKey)) {
      // Use TileSprite for seamless tiling
      const floorTile = this.add.tileSprite(sideMargin + floorWidth / 2, floorTop + floorHeight / 2, floorWidth, floorHeight, floorTextureKey);
      floorTile.setOrigin(0.5, 0.5);
      // Scale the tile texture for nice appearance
      floorTile.setTileScale(0.3, 0.3);
      this.floorTileContainer.add(floorTile);

      // Glossy floor effect overlay
      const glossOverlay = this.add.graphics();
      glossOverlay.fillStyle(0xFFFFFF, 0.08);
      glossOverlay.fillRect(sideMargin, floorTop, floorWidth, 100);
      this.floorTileContainer.add(glossOverlay);
    } else {
      // Fallback to solid color if texture not loaded
      const fallbackGraphics = this.add.graphics();
      fallbackGraphics.fillStyle(theme.interior.floor, 1);
      fallbackGraphics.fillRect(sideMargin, floorTop, floorWidth, floorHeight);
      fallbackGraphics.fillStyle(0xFFFFFF, 0.1);
      fallbackGraphics.fillRect(sideMargin, floorTop, floorWidth, 100);
      this.floorTileContainer.add(fallbackGraphics);
    }

    // Make floor interactive
    const floorHitArea = this.add.rectangle(sideMargin + floorWidth / 2, floorTop + floorHeight / 2, floorWidth, floorHeight, 0x000000, 0);
    floorHitArea.setInteractive({ useHandCursor: true });
    floorHitArea.on('pointerdown', () => {
      if (this.interactive && this.onObjectClick) {
        this.onObjectClick('interior_floor');
      }
    });
    this.floorTileContainer.add(floorHitArea);
    this.interiorContainer.add(this.floorTileContainer);

    // Create walls using tiled images
    this.wallTileContainer = this.add.container(0, 0);
    const wallTextureKey = this.getWallTextureKey(this.currentWallStyle);
    const backWallWidth = this.worldWidth - (sideMargin * 2);
    const backWallHeight = 190;
    const sideWallWidth = 60;
    const sideWallHeight = this.worldHeight - 250;

    if (this.textures.exists(wallTextureKey)) {
      // Back wall
      this.backWallSprite = this.add.tileSprite(sideMargin + backWallWidth / 2, 60 + backWallHeight / 2, backWallWidth, backWallHeight, wallTextureKey);
      this.backWallSprite.setOrigin(0.5, 0.5);
      this.backWallSprite.setTileScale(0.25, 0.25);
      this.wallTileContainer.add(this.backWallSprite);

      // Left side wall
      this.leftWallSprite = this.add.tileSprite(sideMargin - 30, 80 + sideWallHeight / 2, sideWallWidth, sideWallHeight, wallTextureKey);
      this.leftWallSprite.setOrigin(0.5, 0.5);
      this.leftWallSprite.setTileScale(0.25, 0.25);
      this.leftWallSprite.setAlpha(0.85); // Slightly darker
      this.wallTileContainer.add(this.leftWallSprite);

      // Right side wall
      this.rightWallSprite = this.add.tileSprite(this.worldWidth - sideMargin + 30, 80 + sideWallHeight / 2, sideWallWidth, sideWallHeight, wallTextureKey);
      this.rightWallSprite.setOrigin(0.5, 0.5);
      this.rightWallSprite.setTileScale(0.25, 0.25);
      this.rightWallSprite.setAlpha(0.85); // Slightly darker
      this.wallTileContainer.add(this.rightWallSprite);
    } else {
      // Fallback to solid color
      const wallFallback = this.add.graphics();
      wallFallback.fillStyle(theme.interior.walls, 1);
      wallFallback.fillRect(sideMargin, 60, backWallWidth, backWallHeight);
      wallFallback.fillStyle(this.darkenColor(theme.interior.walls, 0.03), 1);
      wallFallback.fillRect(sideMargin - 60, 80, sideWallWidth, sideWallHeight);
      wallFallback.fillRect(this.worldWidth - sideMargin, 80, sideWallWidth, sideWallHeight);
      this.wallTileContainer.add(wallFallback);
    }
    this.interiorContainer.add(this.wallTileContainer);

    // Accent stripe on wall (on main graphics - static)
    graphics.fillStyle(theme.interior.accent, 1);
    graphics.fillRect(sideMargin, 160, this.worldWidth - (sideMargin * 2), 8);

    // Modern ceiling lights
    this.createCeilingLights(graphics, theme);

    // Add base interior graphics before any interactive furniture/boards
    this.interiorContainer.add(graphics);

    // Modern checkout counter
    this.createModernCounter(graphics, theme, centerX);

    // Modern display shelves
    this.createModernShelves(graphics, theme);

    // Product & Staff boards
    this.createInfoBoards(centerX);

    // Photo frame for shop scene image
    this.createInteriorPhotoFrame();

    // Decorative plants
    this.createIndoorPlants();

    // Shop name display
    const shopSign = this.add.text(centerX, 120, this.shopName, {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.interiorContainer.add(shopSign);

    // Staff inside
    this.createInteriorStaff(theme);

    // Innovation items (AI kiosk, etc.) - draggable
    this.refreshInnovationVisuals();

    // Start interior customer spawning
    this.startInteriorCustomerFlow();
  }

  createCeilingLights(graphics: Phaser.GameObjects.Graphics, _theme: typeof THEME_CONFIGS[string]) {
    // Calculate light positions relative to interior bounds
    const sideMargin = (this.worldWidth - this.interiorWidth) / 2;
    const interiorStart = sideMargin;
    const interiorEnd = this.worldWidth - sideMargin;
    const interiorSpan = interiorEnd - interiorStart;

    // Place 5 lights evenly across the interior ceiling
    const lightCount = this.isLowPowerMode ? 3 : 5;
    const lightSpacing = interiorSpan / (lightCount + 1);

    for (let i = 1; i <= lightCount; i++) {
      const x = interiorStart + (i * lightSpacing);

      // Modern track light fixture
      graphics.fillStyle(0x2F2F2F, 1);
      graphics.fillRect(x - 35, 82, 70, 10);
      graphics.fillStyle(0x1a1a1a, 1);
      graphics.fillRect(x - 30, 88, 60, 6);

      // Light bulb housing
      graphics.fillStyle(0x3a3a3a, 1);
      graphics.fillRoundedRect(x - 15, 94, 30, 20, 5);

      // Light glow (warm yellow)
      graphics.fillStyle(0xFFFACD, 0.4);
      graphics.fillCircle(x, 130, 60);
      graphics.fillStyle(0xFFFFFF, 0.25);
      graphics.fillCircle(x, 125, 35);

      // Beam effect
      graphics.fillStyle(0xFFFACD, 0.08);
      graphics.beginPath();
      graphics.moveTo(x - 20, 114);
      graphics.lineTo(x - 80, 280);
      graphics.lineTo(x + 80, 280);
      graphics.lineTo(x + 20, 114);
      graphics.closePath();
      graphics.fillPath();
    }
  }

  createModernCounter(graphics: Phaser.GameObjects.Graphics, theme: typeof THEME_CONFIGS[string], centerX: number) {
    const cashierY = 420;

    // Create cashier table using PNG asset
    const cashierTextureKey = `cashier_${this.currentCashier}`;
    if (this.textures.exists(cashierTextureKey)) {
      this.cashierSprite = this.add.image(centerX, cashierY, cashierTextureKey);
      this.cashierSprite.setOrigin(0.5, 0.5);
      this.cashierSprite.setScale(0.18); // Smaller scale

      // Make cashier clickable - opens item selection bar
      this.cashierSprite.setInteractive({ useHandCursor: true });

      this.cashierSprite.on('pointerover', () => {
        this.tweens.add({
          targets: this.cashierSprite,
          scale: 0.19,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      this.cashierSprite.on('pointerout', () => {
        if (!this.itemBarVisible || this.currentItemCategory !== 'cashier') {
          this.tweens.add({
            targets: this.cashierSprite,
            scale: 0.18,
            duration: 150,
            ease: 'Sine.easeOut'
          });
        }
      });

      this.cashierSprite.on('pointerdown', () => {
        this.showItemSelectionBar('cashier');
      });

      this.interiorContainer?.add(this.cashierSprite);
    } else {
      // Fallback to graphics-based counter
      graphics.fillStyle(theme.interior.accent, 1);
      graphics.fillRoundedRect(centerX - 120, cashierY - 40, 240, 80, 10);
    }
  }

  selectCashier(index: number) {
    this.currentCashier = index;
    const newTexture = `cashier_${this.currentCashier}`;

    if (this.cashierSprite && this.textures.exists(newTexture)) {
      this.tweens.add({
        targets: this.cashierSprite,
        scale: 0.15,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        onYoyo: () => {
          this.cashierSprite?.setTexture(newTexture);
        },
        onComplete: () => {
          this.cashierSprite?.setScale(0.18);
          this.cashierSprite?.setAlpha(1);
        }
      });
    }

    if (this.onCashierChange) {
      this.onCashierChange(this.currentCashier);
    }

    // Save interior state
    this.saveInteriorState();
  }

  selectFloorStyle(index: number) {
    this.currentFloorStyle = index;
    const floorTextureKey = this.getFloorTextureKey(index);

    // Update the floor tile texture
    if (this.floorTileContainer && this.interiorContainer) {
      const sideMargin = (this.worldWidth - this.interiorWidth) / 2;
      const floorTop = 280;
      const floorWidth = this.worldWidth - (sideMargin * 2);
      const floorHeight = this.worldHeight - floorTop - 170;

      // Animate floor change
      this.tweens.add({
        targets: this.floorTileContainer,
        alpha: 0.5,
        duration: 150,
        yoyo: true,
        onYoyo: () => {
          // Destroy old container contents
          this.floorTileContainer?.removeAll(true);

          if (this.textures.exists(floorTextureKey)) {
            // Create new tiled floor
            const floorTile = this.add.tileSprite(sideMargin + floorWidth / 2, floorTop + floorHeight / 2, floorWidth, floorHeight, floorTextureKey);
            floorTile.setOrigin(0.5, 0.5);
            floorTile.setTileScale(0.3, 0.3);
            this.floorTileContainer?.add(floorTile);

            // Glossy overlay
            const glossOverlay = this.add.graphics();
            glossOverlay.fillStyle(0xFFFFFF, 0.08);
            glossOverlay.fillRect(sideMargin, floorTop, floorWidth, 100);
            this.floorTileContainer?.add(glossOverlay);
          }

          // Re-add hit area for interactivity
          const floorHitArea = this.add.rectangle(sideMargin + floorWidth / 2, floorTop + floorHeight / 2, floorWidth, floorHeight, 0x000000, 0);
          floorHitArea.setInteractive({ useHandCursor: true });
          floorHitArea.on('pointerdown', () => {
            if (this.interactive && this.onObjectClick) {
              this.onObjectClick('interior_floor');
            }
          });
          this.floorTileContainer?.add(floorHitArea);
        }
      });
    }

    // Save interior state
    this.saveInteriorState();
    console.log('[Shop] Floor style changed to:', index);
  }

  selectWallStyle(index: number) {
    this.currentWallStyle = index;
    const wallTextureKey = this.getWallTextureKey(index);

    // Update the wall tile textures
    if (this.wallTileContainer && this.interiorContainer) {
      const sideMargin = (this.worldWidth - this.interiorWidth) / 2;
      const backWallWidth = this.worldWidth - (sideMargin * 2);
      const backWallHeight = 190;
      const sideWallWidth = 60;
      const sideWallHeight = this.worldHeight - 250;

      // Animate wall change
      this.tweens.add({
        targets: this.wallTileContainer,
        alpha: 0.5,
        duration: 150,
        yoyo: true,
        onYoyo: () => {
          // Destroy old container contents
          this.wallTileContainer?.removeAll(true);

          if (this.textures.exists(wallTextureKey)) {
            // Back wall
            this.backWallSprite = this.add.tileSprite(sideMargin + backWallWidth / 2, 60 + backWallHeight / 2, backWallWidth, backWallHeight, wallTextureKey);
            this.backWallSprite.setOrigin(0.5, 0.5);
            this.backWallSprite.setTileScale(0.25, 0.25);
            this.wallTileContainer?.add(this.backWallSprite);

            // Left side wall
            this.leftWallSprite = this.add.tileSprite(sideMargin - 30, 80 + sideWallHeight / 2, sideWallWidth, sideWallHeight, wallTextureKey);
            this.leftWallSprite.setOrigin(0.5, 0.5);
            this.leftWallSprite.setTileScale(0.25, 0.25);
            this.leftWallSprite.setAlpha(0.85);
            this.wallTileContainer?.add(this.leftWallSprite);

            // Right side wall
            this.rightWallSprite = this.add.tileSprite(this.worldWidth - sideMargin + 30, 80 + sideWallHeight / 2, sideWallWidth, sideWallHeight, wallTextureKey);
            this.rightWallSprite.setOrigin(0.5, 0.5);
            this.rightWallSprite.setTileScale(0.25, 0.25);
            this.rightWallSprite.setAlpha(0.85);
            this.wallTileContainer?.add(this.rightWallSprite);
          }
        }
      });
    }

    // Save interior state
    this.saveInteriorState();
    console.log('[Shop] Wall style changed to:', index);
  }

  saveInteriorState() {
    if (this.onInteriorStateChange) {
      this.onInteriorStateChange({
        shelfLeft: this.currentLeftShelf,
        shelfRight: this.currentRightShelf,
        cashier: this.currentCashier,
        floor: this.currentFloorStyle,
        wall: this.currentWallStyle
      });
    }
  }

  createModernShelves(_graphics: Phaser.GameObjects.Graphics, _theme: typeof THEME_CONFIGS[string]) {
    // Position shelves relative to center of world (within 900px interior)
    const centerX = this.worldWidth / 2;
    const leftShelfX = centerX - 720; // Move further to make room for boards
    const rightShelfX = centerX + 720; // Move further to make room for boards
    const shelfY = 520;

    // Create left shelf using PNG asset
    const leftTextureKey = `shelf_${this.currentLeftShelf}`;
    if (this.textures.exists(leftTextureKey)) {
      this.leftShelfSprite = this.add.image(leftShelfX, shelfY, leftTextureKey);
      this.leftShelfSprite.setOrigin(0.5, 0.5);
      this.leftShelfSprite.setScale(0.22); // Smaller scale

      // Make left shelf clickable - opens item selection bar
      this.leftShelfSprite.setInteractive({ useHandCursor: true });

      this.leftShelfSprite.on('pointerover', () => {
        this.tweens.add({
          targets: this.leftShelfSprite,
          scale: 0.24,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      this.leftShelfSprite.on('pointerout', () => {
        if (!this.itemBarVisible || this.currentItemCategory !== 'shelf') {
          this.tweens.add({
            targets: this.leftShelfSprite,
            scale: 0.22,
            duration: 150,
            ease: 'Sine.easeOut'
          });
        }
      });

      this.leftShelfSprite.on('pointerdown', () => {
        this.selectedShelfSide = 'left';
        this.showItemSelectionBar('shelf');
      });

      this.interiorContainer?.add(this.leftShelfSprite);
    }

    // Create right shelf using PNG asset
    const rightTextureKey = `shelf_${this.currentRightShelf}`;
    if (this.textures.exists(rightTextureKey)) {
      this.rightShelfSprite = this.add.image(rightShelfX, shelfY, rightTextureKey);
      this.rightShelfSprite.setOrigin(0.5, 0.5);
      this.rightShelfSprite.setScale(0.22); // Smaller scale

      // Make right shelf clickable - opens item selection bar
      this.rightShelfSprite.setInteractive({ useHandCursor: true });

      this.rightShelfSprite.on('pointerover', () => {
        this.tweens.add({
          targets: this.rightShelfSprite,
          scale: 0.24,
          duration: 150,
          ease: 'Sine.easeOut'
        });
      });

      this.rightShelfSprite.on('pointerout', () => {
        if (!this.itemBarVisible || this.currentItemCategory !== 'shelf') {
          this.tweens.add({
            targets: this.rightShelfSprite,
            scale: 0.22,
            duration: 150,
            ease: 'Sine.easeOut'
          });
        }
      });

      this.rightShelfSprite.on('pointerdown', () => {
        this.selectedShelfSide = 'right';
        this.showItemSelectionBar('shelf');
      });

      this.interiorContainer?.add(this.rightShelfSprite);
    }
  }

  createInfoBoards(centerX: number) {
    const boardY = 360;
    const boardWidth = 260;
    const boardHeight = 180;
    const offset = 360; // Keep near cashier but avoid overlap

    const createBoard = (
      x: number,
      title: string,
      accentColor: number,
      onClick?: () => void
    ): { container: Phaser.GameObjects.Container; lines: Phaser.GameObjects.Text[] } => {
      const container = this.add.container(x, boardY);

      const bg = this.add.graphics();
      bg.fillStyle(0x111827, 0.85);
      bg.lineStyle(2, accentColor, 0.8);
      bg.fillRoundedRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight, 12);
      bg.strokeRoundedRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight, 12);
      container.add(bg);

      const header = this.add.text(0, -boardHeight / 2 + 16, title, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0);
      container.add(header);

      const lines: Phaser.GameObjects.Text[] = [];
      for (let i = 0; i < 3; i++) {
        const line = this.add.text(-boardWidth / 2 + 14, -boardHeight / 2 + 44 + (i * 30), '-', {
          fontSize: '13px',
          color: '#E5E7EB',
        }).setOrigin(0, 0);
        lines.push(line);
        container.add(line);
      }

      const hint = this.add.text(0, boardHeight / 2 - 20, 'Tap to view all', {
        fontSize: '11px',
        color: '#9CA3AF'
      }).setOrigin(0.5, 0);
      container.add(hint);

      container.setSize(boardWidth, boardHeight);
      container.setInteractive(new Phaser.Geom.Rectangle(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight), Phaser.Geom.Rectangle.Contains);

      container.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scale: 1.02,
          duration: 120,
          ease: 'Sine.easeOut'
        });
      });

      container.on('pointerout', () => {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 120,
          ease: 'Sine.easeOut'
        });
      });

      container.on('pointerdown', () => {
        onClick?.();
      });

      container.setDepth(20);
      this.interiorContainer?.add(container);
      return { container, lines };
    };

    const productBoard = createBoard(centerX - offset, 'Products', 0x8B5CF6, this.onOpenProductsBoard);
    const staffBoard = createBoard(centerX + offset, 'Staff', 0x22C55E, this.onOpenStaffBoard);

    this.productBoardContainer = productBoard.container;
    this.staffBoardContainer = staffBoard.container;
    this.productBoardLines = productBoard.lines;
    this.staffBoardLines = staffBoard.lines;

    this.updateBoardContent();
  }

  private createInteriorPhotoFrame() {
    if (!this.interiorContainer) return;

    const frameWidth = this.isLowPowerMode ? 150 : 180;
    const frameHeight = this.isLowPowerMode ? 105 : 130;
    // Place near left-bottom corner for a cozy look
    const frameX = this.interiorLeftBound + (this.isLowPowerMode ? 120 : 150);
    const frameY = this.interiorFloorTop + this.interiorFloorHeight - (frameHeight / 2) - (this.isLowPowerMode ? 25 : 35);

    const container = this.add.container(frameX, frameY);

    // Always draw a frame border so the photo stays visible (frame.png is opaque)
    const frameBorder = this.add.graphics();
    frameBorder.fillStyle(0x0f172a, 0.9);
    frameBorder.fillRoundedRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, 10);
    frameBorder.lineStyle(2, 0xFBBF24, 0.9);
    frameBorder.strokeRoundedRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, 10);
    container.add(frameBorder);

    const imageKey = this.textures.exists('shop_scene')
      ? 'shop_scene'
      : (this.textures.exists('ai_building') ? 'ai_building' : null);

    if (imageKey) {
      const texture = this.textures.get(imageKey);
      const frame = texture.get();
      const inset = 10;
      const maxPhotoWidth = frameWidth - inset * 2;
      const maxPhotoHeight = frameHeight - inset * 2;
      const scale = Math.min(maxPhotoWidth / frame.width, maxPhotoHeight / frame.height);

      const photo = this.add.image(0, 0, imageKey);
      photo.setOrigin(0.5, 0.5);
      photo.setScale(scale);
      container.add(photo);
    } else {
      const placeholder = this.add.text(0, 0, 'Scene image\nnot ready', {
        fontSize: '12px',
        color: '#E5E7EB',
        align: 'center'
      }).setOrigin(0.5);
      container.add(placeholder);
    }

    // Top outline to keep the frame visible over the photo
    const outline = this.add.graphics();
    outline.lineStyle(2, 0xFBBF24, 0.9);
    outline.strokeRoundedRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, 10);
    container.add(outline);

    const label = this.add.text(0, frameHeight / 2 + 6, 'Scene Photo', {
      fontSize: '11px',
      color: '#F3F4F6'
    }).setOrigin(0.5, 0);
    container.add(label);

    container.setSize(frameWidth, frameHeight);
    container.setInteractive(new Phaser.Geom.Rectangle(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.showPhotoModal());
    container.setDepth(12);

    this.interiorContainer.add(container);
    this.photoFrameContainer = container;
  }

  private showPhotoModal() {
    if (!this.textures.exists('shop_scene') && !this.textures.exists('ai_building')) {
      return;
    }
    const imageKey = this.textures.exists('shop_scene') ? 'shop_scene' : 'ai_building';

    if (this.photoModal) {
      this.photoModal.destroy(true);
      this.photoModal = undefined;
    }

    const width = this.scale.width;
    const height = this.scale.height;

    const modal = this.add.container(0, 0);
    modal.setDepth(2000);

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    backdrop.setOrigin(0, 0);
    backdrop.setScrollFactor(0);
    backdrop.setInteractive({ useHandCursor: true });

    const texture = this.textures.get(imageKey);
    const frame = texture.get();
    const maxWidth = width * 0.85;
    const maxHeight = height * 0.7;
    const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);

    const image = this.add.image(width / 2, height / 2, imageKey);
    image.setOrigin(0.5, 0.5);
    image.setScale(scale);
    image.setScrollFactor(0);

    const closeText = this.add.text(width / 2, height * 0.85, 'Close', {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: '#111827',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5, 0.5);
    closeText.setScrollFactor(0);
    closeText.setInteractive({ useHandCursor: true });

    const closeModal = () => {
      this.photoModal?.destroy(true);
      this.photoModal = undefined;
    };

    backdrop.on('pointerdown', closeModal);
    closeText.on('pointerdown', closeModal);

    modal.add([backdrop, image, closeText]);
    this.photoModal = modal;
  }

  private updateBoardContent() {
    if (!this.productBoardLines.length || !this.staffBoardLines.length) return;

    const topProducts = (this.products || []).slice(0, 3);
    const topStaff = (this.staff || []).slice(0, 3);

    const productLines = topProducts.length > 0
      ? topProducts.map((product, index) => `${index + 1}. ${product.product_name} - RM${Number(product.price || 0).toFixed(0)}`)
      : ['No products yet', 'Create your first', 'product to sell'];

    const staffLines = topStaff.length > 0
      ? topStaff.map((member, index) => `${index + 1}. ${member.staff_name} (${member.staff_role})`)
      : ['No staff yet', 'Hire a teammate', 'to help out'];

    this.productBoardLines.forEach((line, index) => {
      line.setText(productLines[index] || '');
    });

    this.staffBoardLines.forEach((line, index) => {
      line.setText(staffLines[index] || '');
    });
  }

  public updateDynamicData(products: ShopGameProps['products'], staff: ShopGameProps['staff']) {
    this.products = products || [];
    this.staff = staff || [];
    this.updateBoardContent();
  }

  selectShelf(index: number) {
    const newTexture = `shelf_${index}`;

    if (this.selectedShelfSide === 'left') {
      this.currentLeftShelf = index;
      if (this.leftShelfSprite && this.textures.exists(newTexture)) {
        this.tweens.add({
          targets: this.leftShelfSprite,
          scale: 0.18,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          onYoyo: () => {
            this.leftShelfSprite?.setTexture(newTexture);
          },
          onComplete: () => {
            this.leftShelfSprite?.setScale(0.22);
            this.leftShelfSprite?.setAlpha(1);
          }
        });
      }

      // Callback to parent
      if (this.onShelfChange) {
        this.onShelfChange('left', this.currentLeftShelf);
      }
    } else {
      this.currentRightShelf = index;
      if (this.rightShelfSprite && this.textures.exists(newTexture)) {
        this.tweens.add({
          targets: this.rightShelfSprite,
          scale: 0.18,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          onYoyo: () => {
            this.rightShelfSprite?.setTexture(newTexture);
          },
          onComplete: () => {
            this.rightShelfSprite?.setScale(0.22);
            this.rightShelfSprite?.setAlpha(1);
          }
        });
      }

      // Callback to parent
      if (this.onShelfChange) {
        this.onShelfChange('right', this.currentRightShelf);
      }
    }

    // Save interior state
    this.saveInteriorState();
  }

  // ============================================
  // GAME-STYLE ITEM SELECTION BAR
  // ============================================

  createItemSelectionBar() {
    // This creates an empty container - the bar will be populated when shown
    // The bar is added to a separate UI layer that doesn't scroll with the world
  }

  createFloatingActionButtons() {
    // Check mobile/screen size for responsive sizing
    this.checkMobileAndScreenSize();

    // Responsive sizing based on screen size
    const isSmallScreen = this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';
    // On small screens, we rely on React overlay buttons instead of Phaser FABs
    if (isSmallScreen) {
      if (this.floatingButtons) {
        this.floatingButtons.destroy();
        this.floatingButtons = undefined;
      }
      return;
    }
    const btnWidth = isSmallScreen ? 48 : 54;
    const btnHeight = isSmallScreen ? 48 : 54;
    const btnSpacing = isSmallScreen ? 58 : 64;
    const fontSize = isSmallScreen ? '20px' : '22px';
    const cornerRadius = isSmallScreen ? 12 : 14;

    const fabContainer = this.add.container(0, 0);
    fabContainer.setScrollFactor(0); // Fixed to camera - doesn't move with zoom/scroll
    fabContainer.setDepth(900); // Below item bar but above game
    fabContainer.setVisible(false); // Start hidden, show when entering interior

    // Helper function to create a floating button
    const createFloatingButton = (
      offsetX: number,
      icon: string,
      accentColor: number,
      onClick: () => void
    ) => {
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x0a0a14, 0.9);
      btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
      btnBg.lineStyle(1, 0xFFFFFF, 0.1);
      btnBg.strokeRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
      btnBg.fillStyle(accentColor, 0.15);
      btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);

      const iconText = this.add.text(offsetX + btnWidth / 2, btnHeight / 2, icon, {
        fontSize: fontSize
      }).setOrigin(0.5);

      const hitArea = this.add.rectangle(offsetX + btnWidth / 2, btnHeight / 2, btnWidth, btnHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.setScrollFactor(0);

      hitArea.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x151525, 0.95);
        btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
        btnBg.lineStyle(1, accentColor, 0.5);
        btnBg.strokeRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
        btnBg.fillStyle(accentColor, 0.25);
        btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
      });

      hitArea.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x0a0a14, 0.9);
        btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
        btnBg.lineStyle(1, 0xFFFFFF, 0.1);
        btnBg.strokeRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
        btnBg.fillStyle(accentColor, 0.15);
        btnBg.fillRoundedRect(offsetX, 0, btnWidth, btnHeight, cornerRadius);
      });

      hitArea.on('pointerdown', onClick);

      fabContainer.add(btnBg);
      fabContainer.add(iconText);
      fabContainer.add(hitArea);
    };

    // Plant button (green accent)
    createFloatingButton(0, '🌱', 0x4ADE80, () => {
      this.showItemSelectionBar('plant');
    });

    // Floor texture button (brown/wood accent)
    createFloatingButton(btnSpacing, '🪵', 0xD2691E, () => {
      this.showItemSelectionBar('floor');
    });

    // Wall texture button (blue/paint accent)
    createFloatingButton(btnSpacing * 2, '🎨', 0x6366F1, () => {
      this.showItemSelectionBar('wall');
    });

    // Store reference so we can show/hide based on view
    this.floatingButtons = fabContainer;
    this.floatingButtonsSizeCategory = this.screenSizeCategory;
    this.positionFloatingButtons();

    // Main camera ignores this - only UI camera renders it
    this.cameras.main.ignore(fabContainer);
  }

  private floatingButtons?: Phaser.GameObjects.Container;

  private positionFloatingButtons() {
    if (!this.floatingButtons) return;
    const isSmallScreen = this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';
    const margin = isSmallScreen ? 12 : 20;
    // Push higher on mobile so it doesn't hide under the Open Menu bar (which is quite tall)
    const bottomOffset = isSmallScreen ? 200 : 90;
    this.floatingButtons.setPosition(margin, this.scale.height - bottomOffset);
  }

  private refreshFloatingButtons() {
    const isSmallScreen = this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';
    if (isSmallScreen) {
      if (this.floatingButtons) {
        this.floatingButtons.destroy();
        this.floatingButtons = undefined;
      }
      return;
    }

    if (!this.floatingButtons) {
      this.createFloatingActionButtons();
      this.floatingButtons!.setVisible(this.isInside);
      return;
    }

    if (this.floatingButtonsSizeCategory !== this.screenSizeCategory) {
      this.floatingButtons.destroy();
      this.floatingButtons = undefined;
      this.createFloatingActionButtons();
      this.floatingButtons!.setVisible(this.isInside);
      return;
    }

    this.positionFloatingButtons();
  }

  showItemSelectionBar(category: 'shelf' | 'cashier' | 'plant' | 'floor' | 'wall') {
    // Hide existing bar if showing different category
    if (this.itemBarContainer) {
      this.itemBarContainer.destroy();
      this.itemBarContainer = undefined;
    }

    this.currentItemCategory = category;
    this.itemBarVisible = true;

    // Notify parent to hide external UI
    if (this.onToolbarVisibilityChange) {
      this.onToolbarVisibilityChange(true);
    }

    // Check mobile/screen size for responsive sizing
    this.checkMobileAndScreenSize();

    // Use game dimensions for consistent sizing
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    // Responsive bar dimensions based on screen size - improved mobile support
    const isExtraSmall = this.screenSizeCategory === 'xs' || gameWidth < 400;
    const isSmallScreen = this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';

    // Mobile-first sizing: use percentage of screen width
    const barPadding = isExtraSmall ? 10 : (isSmallScreen ? 16 : 40);
    const barWidth = Math.min(gameWidth - barPadding, isExtraSmall ? gameWidth - 10 : (isSmallScreen ? gameWidth - 16 : 600));
    // Make the bar taller to accommodate larger icons
    const barHeight = isExtraSmall ? 140 : (isSmallScreen ? 150 : 160);
    const barX = (gameWidth - barWidth) / 2; // Center horizontally

    // SIGNIFICANTLY increased bottom offset to avoid overlap with "Open Menu" / "Persona Quiz" buttons
    // These buttons take up the bottom ~160px-200px on mobile
    const barBottomOffset = isExtraSmall ? 200 : (isSmallScreen ? 220 : 100);

    const barY = gameHeight - barHeight - barBottomOffset;

    // Create container fixed to screen viewport (not world coordinates)
    this.itemBarContainer = this.add.container(barX, barY);
    this.itemBarContainer.setScrollFactor(0); // Fixed to camera - doesn't move with zoom/scroll
    this.itemBarContainer.setDepth(2000); // Increased depth to ensure it's on top of other Phaser UI

    // IMPORTANT: Make main camera ignore this container to prevent duplicate rendering
    this.cameras.main.ignore(this.itemBarContainer);

    // Modern floating card background with rounded corners effect
    const barBg = this.add.graphics();
    const cornerRadius = isSmallScreen ? 16 : 20;

    // Main background - dark with transparency (matching React UI style)
    // Make it more opaque to clearly separate from game
    barBg.fillStyle(0x0a0a14, 0.98);
    barBg.fillRoundedRect(0, 0, barWidth, barHeight, cornerRadius);

    // Subtle border
    barBg.lineStyle(2, 0x22D3EE, 0.3); // Thicker, clearer border
    barBg.strokeRoundedRect(0, 0, barWidth, barHeight, cornerRadius);

    this.itemBarContainer.add(barBg);

    // Category title with icon - modern style (responsive font size)
    const categoryInfo: Record<string, { title: string; shortTitle: string; icon: string; color: string }> = {
      shelf: { title: 'Select Shelf Style', shortTitle: 'Shelf', icon: '🗄️', color: '#22D3EE' },
      cashier: { title: 'Select Counter', shortTitle: 'Counter', icon: '💰', color: '#A78BFA' },
      plant: { title: 'Add Plant', shortTitle: 'Plant', icon: '🌱', color: '#4ADE80' },
      floor: { title: 'Select Floor Style', shortTitle: 'Floor', icon: '🪵', color: '#D2691E' },
      wall: { title: 'Select Wall Color', shortTitle: 'Wall', icon: '🎨', color: '#6366F1' }
    };

    // Larger font for better readability
    const titleFontSize = isExtraSmall ? '16px' : (isSmallScreen ? '18px' : '20px');
    const titleToShow = isSmallScreen ? categoryInfo[category].shortTitle : categoryInfo[category].title;
    const titleText = this.add.text(isExtraSmall ? 16 : (isSmallScreen ? 20 : 20), isExtraSmall ? 12 : (isSmallScreen ? 15 : 15), `${categoryInfo[category].icon}  ${titleToShow}`, {
      fontSize: titleFontSize,
      color: categoryInfo[category].color,
      fontStyle: 'bold'
    });
    this.itemBarContainer.add(titleText);

    // Close button - modern X style (responsive size)
    // Larger close button for easier tapping
    const closeBtnSize = isExtraSmall ? 14 : (isSmallScreen ? 16 : 14);
    const closeBtn = this.add.container(barWidth - (isExtraSmall ? 25 : (isSmallScreen ? 30 : 30)), isExtraSmall ? 20 : (isSmallScreen ? 25 : 20));
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xFFFFFF, 0.1);
    closeBg.fillCircle(0, 0, closeBtnSize);
    const closeX = this.add.text(0, 0, '✕', {
      fontSize: isExtraSmall ? '14px' : (isSmallScreen ? '16px' : '18px'),
      color: '#FFFFFF'
    }).setOrigin(0.5);
    closeBtn.add(closeBg);
    closeBtn.add(closeX);

    // Make close button interactive
    const closeHitArea = this.add.circle(0, 0, closeBtnSize, 0x000000, 0).setInteractive({ useHandCursor: true });
    closeBtn.add(closeHitArea);
    closeHitArea.on('pointerdown', () => this.hideItemSelectionBar());
    closeHitArea.on('pointerover', () => {
      closeBg.clear();
      closeBg.fillStyle(0xFFFFFF, 0.2);
      closeBg.fillCircle(0, 0, closeBtnSize);
    });
    closeHitArea.on('pointerout', () => {
      closeBg.clear();
      closeBg.fillStyle(0xFFFFFF, 0.1);
      closeBg.fillCircle(0, 0, closeBtnSize);
    });

    this.itemBarContainer.add(closeBtn);

    // Scrollable items area (responsive sizing) - improved mobile support
    const itemsAreaX = isExtraSmall ? 10 : (isSmallScreen ? 16 : 20);
    // Push down slightly to clear larger title
    const itemsAreaY = isExtraSmall ? 40 : (isSmallScreen ? 45 : 50);
    const itemsAreaWidth = barWidth - (isExtraSmall ? 20 : (isSmallScreen ? 32 : 40));
    // Taller area for larger items
    const itemsAreaHeight = isExtraSmall ? 90 : (isSmallScreen ? 95 : 100);
    // Larger item slots for "Big and Clear" requirement
    const itemSize = isExtraSmall ? 80 : (isSmallScreen ? 85 : 85);
    const itemSpacing = isExtraSmall ? 16 : (isSmallScreen ? 16 : 14);

    // Build item definitions based on category
    let items: SelectionItem[] = [];
    if (category === 'shelf') {
      items = ASSET_PATHS.shelves.map((_, index) => ({
        type: 'asset',
        index,
        textureKey: `shelf_${index}`,
      }));
    } else if (category === 'cashier') {
      items = ASSET_PATHS.cashiers.map((_, index) => ({
        type: 'asset',
        index,
        textureKey: `cashier_${index}`,
      }));
    } else if (category === 'plant') {
      const plantItems = this.plantTextureKeys.map((key, index) => ({
        type: 'asset' as const,
        index,
        textureKey: key,
        isCustom: index >= this.defaultPlantCount,
      }));
      items = [{ type: 'add' }, ...plantItems];
    } else if (category === 'floor') {
      const floorItems = this.floorTextureKeys.map((key, index) => ({
        type: 'asset' as const,
        index,
        textureKey: key,
        isCustom: index >= this.defaultFloorCount,
      }));
      items = [{ type: 'add' }, ...floorItems];
    } else if (category === 'wall') {
      const wallItems = this.wallTextureKeys.map((key, index) => ({
        type: 'asset' as const,
        index,
        textureKey: key,
        isCustom: index >= this.defaultWallCount,
      }));
      items = [{ type: 'add' }, ...wallItems];
    }

    // Calculate total content width
    // Add extra padding at the end to ensure it's fully scrollable and not cut off
    const totalContentWidth = items.length * (itemSize + itemSpacing) + 50;
    const needsScroll = totalContentWidth > itemsAreaWidth;

    // Create items container (will be scrollable)
    const itemsContainer = this.add.container(itemsAreaX, itemsAreaY);

    // Create item slots
    items.forEach((item, index) => {
      const x = index * (itemSize + itemSpacing);
      const itemSlot = this.createItemSlot(x, 0, category, item, itemSize);
      itemsContainer.add(itemSlot);
    });

    // Create mask for scrolling area (invisible - just for masking)
    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(barX + itemsAreaX, barY + itemsAreaY, itemsAreaWidth, itemsAreaHeight);
    maskShape.setVisible(false); // Hide the mask shape - it's only used for masking
    const mask = maskShape.createGeometryMask();
    itemsContainer.setMask(mask);

    this.itemBarContainer.add(itemsContainer);

    // Store for scrolling
    let scrollX = 0;
    const maxScroll = Math.max(0, totalContentWidth - itemsAreaWidth);

    // Scroll indicator (only if needed) - improved mobile sizing
    if (needsScroll) {
      const indicatorY = itemsAreaY + itemsAreaHeight + (isExtraSmall ? 4 : (isSmallScreen ? 5 : 8));
      const indicatorWidth = isExtraSmall ? 30 : (isSmallScreen ? 40 : 60);
      const indicatorTrackWidth = barWidth - (isExtraSmall ? 16 : (isSmallScreen ? 24 : 40));
      const indicatorHeight = isExtraSmall ? 3 : (isSmallScreen ? 3 : 4);
      const indicatorX = isExtraSmall ? 8 : (isSmallScreen ? 12 : 20);

      // Track
      const indicatorTrack = this.add.graphics();
      indicatorTrack.fillStyle(0xFFFFFF, 0.1);
      indicatorTrack.fillRoundedRect(indicatorX, indicatorY, indicatorTrackWidth, indicatorHeight, 2);
      this.itemBarContainer.add(indicatorTrack);

      // Thumb (indicator)
      const indicatorThumb = this.add.graphics();
      indicatorThumb.fillStyle(0x22D3EE, 0.8);
      indicatorThumb.fillRoundedRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight, 2);
      this.itemBarContainer.add(indicatorThumb);

      // Update indicator position based on scroll
      const updateIndicator = () => {
        const scrollPercent = maxScroll > 0 ? scrollX / maxScroll : 0;
        const thumbX = indicatorX + scrollPercent * (indicatorTrackWidth - indicatorWidth);
        indicatorThumb.clear();
        indicatorThumb.fillStyle(0x22D3EE, 0.8);
        indicatorThumb.fillRoundedRect(thumbX, indicatorY, indicatorWidth, indicatorHeight, 2);
      };

      // Mouse wheel scroll
      const wheelHandler = (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
        if (this.itemBarVisible) {
          scrollX = Phaser.Math.Clamp(scrollX + deltaY * 0.5, 0, maxScroll);
          itemsContainer.x = itemsAreaX - scrollX;
          updateIndicator();
        }
      };
      this.input.on('wheel', wheelHandler);

      // Touch/Mouse drag support for scrolling
      let touchStartX = 0;
      let touchScrollStart = 0;
      let isDraggingScroll = false;

      const pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
        if (this.itemBarVisible && pointer.y > barY && pointer.y < barY + barHeight) {
          touchStartX = pointer.x;
          touchScrollStart = scrollX;
          isDraggingScroll = true;
        }
      };

      const pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
        if (this.itemBarVisible && isDraggingScroll) {
          const deltaX = touchStartX - pointer.x;
          scrollX = Phaser.Math.Clamp(touchScrollStart + deltaX, 0, maxScroll);
          itemsContainer.x = itemsAreaX - scrollX;
          updateIndicator();
        }
      };

      const pointerUpHandler = () => {
        isDraggingScroll = false;
      };

      this.input.on('pointerdown', pointerDownHandler);
      this.input.on('pointermove', pointerMoveHandler);
      this.input.on('pointerup', pointerUpHandler);
      this.input.on('pointerupoutside', pointerUpHandler);

      // Clean up event listeners when container is destroyed
      this.itemBarContainer.on('destroy', () => {
        this.input.off('wheel', wheelHandler);
        this.input.off('pointerdown', pointerDownHandler);
        this.input.off('pointermove', pointerMoveHandler);
        this.input.off('pointerup', pointerUpHandler);
        this.input.off('pointerupoutside', pointerUpHandler);
      });
    }

    // Slide up animation (screen coordinates since scrollFactor is 0)
    this.itemBarContainer.y = gameHeight; // Start from bottom (off screen)
    this.tweens.add({
      targets: this.itemBarContainer,
      y: barY, // Animate to final position
      duration: 200,
      ease: 'Back.out'
    });
  }

  createItemSlot(x: number, y: number, category: 'shelf' | 'cashier' | 'plant' | 'floor' | 'wall', item: SelectionItem, size: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isAddSlot = item.type === 'add';
    const itemIndex = item.type === 'asset' ? item.index : -1;

    // Highlight for currently selected
    let isSelected = false;
    if (!isAddSlot) {
      if (category === 'shelf') {
        isSelected = (this.selectedShelfSide === 'left' && this.currentLeftShelf === itemIndex) ||
          (this.selectedShelfSide === 'right' && this.currentRightShelf === itemIndex);
      } else if (category === 'cashier') {
        isSelected = this.currentCashier === itemIndex;
      } else if (category === 'floor') {
        isSelected = this.currentFloorStyle === itemIndex;
      } else if (category === 'wall') {
        isSelected = this.currentWallStyle === itemIndex;
      }
    }

    // Modern slot background - darker with subtle border (responsive corner radius)
    const cornerRadius = size < 45 ? 8 : 12;
    const slotBg = this.add.graphics();
    slotBg.fillStyle(0x1a1a2e, 1);
    slotBg.fillRoundedRect(0, 0, size, size, cornerRadius);
    slotBg.lineStyle(size < 45 ? 1 : 2, isSelected ? 0x22D3EE : 0x333355, 1);
    slotBg.strokeRoundedRect(0, 0, size, size, cornerRadius);

    // Selected glow effect
    if (isSelected) {
      slotBg.fillStyle(0x22D3EE, 0.15);
      slotBg.fillRoundedRect(0, 0, size, size, cornerRadius);
    }

    container.add(slotBg);

    // Responsive font sizes based on slot size - scaled for larger mobile slots
    const plusFontSize = size < 45 ? '20px' : (size < 60 ? '24px' : '32px');
    const labelFontSize = size < 45 ? '8px' : (size < 60 ? '10px' : '12px');
    const numLabelFontSize = size < 45 ? '8px' : (size < 60 ? '10px' : '14px');
    const previewPadding = size < 45 ? 10 : (size < 60 ? 12 : 16);

    if (isAddSlot) {
      const plusIcon = this.add.text(size / 2, size / 2 - 2, '+', {
        fontSize: plusFontSize,
        color: '#22D3EE',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(plusIcon);

      const label = this.add.text(size / 2, size - 8, 'Create', {
        fontSize: labelFontSize,
        color: '#A5B4FC',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(label);
    } else if (item.type === 'asset' && this.textures.exists(item.textureKey)) {
      const preview = this.add.image(size / 2, size / 2, item.textureKey);
      preview.setDisplaySize(size - previewPadding, size - previewPadding);
      // Ensure aspect ratio is preserved if needed, or fill the box nicely
      if (category === 'plant') {
        // Plants might be tall, let's scale carefully
        const scale = (size - previewPadding) / Math.max(preview.width, preview.height);
        preview.setScale(scale);
      }
      container.add(preview);

      // Add label for floor/wall items
      if (category === 'floor' || category === 'wall') {
        const labelText = item.isCustom ? 'C' : `${item.index + 1}`;
        const label = this.add.text(size / 2, size - 8, labelText, {
          fontSize: numLabelFontSize,
          color: '#FFFFFF',
          fontStyle: 'bold',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        container.add(label);
      }
    } else {
      // Fallback placeholder
      const placeholder = this.add.graphics();
      placeholder.fillStyle(0x333355, 1);
      placeholder.fillRoundedRect(4, 4, size - 8, size - 8, cornerRadius - 2);
      container.add(placeholder);

      const questionMark = this.add.text(size / 2, size / 2, '?', {
        fontSize: size < 45 ? '12px' : '24px',
        color: '#666688'
      }).setOrigin(0.5);
      container.add(questionMark);
    }

    // Interactive hit area
    const hitArea = this.add.rectangle(size / 2, size / 2, size, size, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover effects - modern style
    hitArea.on('pointerover', () => {
      slotBg.clear();
      slotBg.fillStyle(0x252545, 1);
      slotBg.fillRoundedRect(0, 0, size, size, 12);
      slotBg.lineStyle(2, isSelected ? 0x22D3EE : 0x555577, 1);
      slotBg.strokeRoundedRect(0, 0, size, size, 12);
      if (isSelected) {
        slotBg.fillStyle(0x22D3EE, 0.2);
        slotBg.fillRoundedRect(0, 0, size, size, 12);
      }
    });

    hitArea.on('pointerout', () => {
      slotBg.clear();
      slotBg.fillStyle(0x1a1a2e, 1);
      slotBg.fillRoundedRect(0, 0, size, size, 12);
      slotBg.lineStyle(2, isSelected ? 0x22D3EE : 0x333355, 1);
      slotBg.strokeRoundedRect(0, 0, size, size, 12);
      if (isSelected) {
        slotBg.fillStyle(0x22D3EE, 0.15);
        slotBg.fillRoundedRect(0, 0, size, size, 12);
      }
    });

    // Click to select
    hitArea.on('pointerdown', () => {
      if (isAddSlot) {
        this.onRequestCustomAsset?.(category as 'floor' | 'wall' | 'plant');
        this.hideItemSelectionBar();
        return;
      }

      if (category === 'shelf') {
        this.selectShelf(itemIndex);
        this.showItemSelectionBar(category);
      } else if (category === 'cashier') {
        this.selectCashier(itemIndex);
        this.showItemSelectionBar(category);
      } else if (category === 'plant') {
        this.addPlantFromBar(itemIndex);
        this.hideItemSelectionBar();
      } else if (category === 'floor') {
        this.selectFloorStyle(itemIndex);
        this.showItemSelectionBar(category);
      } else if (category === 'wall') {
        this.selectWallStyle(itemIndex);
        this.showItemSelectionBar(category);
      }
    });

    return container;
  }

  hideItemSelectionBar() {
    if (this.itemBarContainer) {
      const gameHeight = this.scale.height;
      this.tweens.add({
        targets: this.itemBarContainer,
        y: gameHeight + 20, // Slide down off screen
        alpha: 0,
        duration: 150,
        ease: 'Sine.in',
        onComplete: () => {
          this.itemBarContainer?.destroy();
          this.itemBarContainer = undefined;
        }
      });
    }
    this.itemBarVisible = false;
    this.currentItemCategory = null;

    // Notify parent to show external UI again
    if (this.onToolbarVisibilityChange) {
      this.onToolbarVisibilityChange(false);
    }
  }

  addPlantFromBar(plantIndex: number) {
    // Add plant at a random position in the interior (centered)
    const centerX = this.worldWidth / 2;
    const x = centerX - 300 + Math.random() * 600; // Random within visible area
    const y = 550 + Math.random() * 150;
    this.addPottedPlant(x, y, plantIndex);
  }

  createIndoorPlants() {
    // If there are saved plants, restore them
    if (this.savedPlants && this.savedPlants.length > 0) {
      this.savedPlants.forEach(plant => {
        this.addPottedPlant(plant.x, plant.y, plant.plantIndex, plant.id);
      });
    } else {
      // Create 3 default random plants (positioned relative to center)
      const centerX = this.worldWidth / 2;
      const defaultPositions = [
        { x: centerX - 350, y: 650 },
        { x: centerX + 350, y: 650 },
        { x: centerX + 150, y: 680 }
      ];

      defaultPositions.forEach((pos) => {
        const randomPlantIndex = Math.floor(Math.random() * ASSET_PATHS.plants.length);
        this.addPottedPlant(pos.x, pos.y, randomPlantIndex);
      });
    }
    // Note: Plants can be added via the bottom item selection bar (click floor or use shelf/cashier bar)
  }

  addPottedPlant(x: number, y: number, plantIndex: number, existingId?: string) {
    const textureKey = this.getPlantTextureKey(plantIndex);
    const plantId = existingId || `plant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const container = this.add.container(x, y);

    if (this.textures.exists(textureKey)) {
      const plantSprite = this.add.image(0, 0, textureKey);
      plantSprite.setOrigin(0.5, 1);
      plantSprite.setScale(0.045); // Small scale for interior plants
      container.add(plantSprite);

      // Add shadow
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.15);
      shadow.fillEllipse(0, 3, 25, 6);
      container.addAt(shadow, 0);

      // Make draggable
      plantSprite.setInteractive({ useHandCursor: true, draggable: true });

      // Drag handlers
      this.input.setDraggable(plantSprite);

      let isDragging = false;

      plantSprite.on('dragstart', () => {
        isDragging = true;
        this.isPlantDragging = true; // Prevent camera drag
      });

      plantSprite.on('drag', (pointer: Phaser.Input.Pointer) => {
        // Convert screen coordinates to world coordinates, then to local coordinates relative to interiorContainer
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // If plant is inside interiorContainer, convert to local coordinates
        if (this.interiorContainer) {
          // Get the interiorContainer's world position
          const containerX = this.interiorContainer.x;
          const containerY = this.interiorContainer.y;

          // Set position relative to the container
          container.x = worldPoint.x - containerX;
          container.y = worldPoint.y - containerY;
        } else {
          container.x = worldPoint.x;
          container.y = worldPoint.y;
        }
      });

      plantSprite.on('dragend', () => {
        isDragging = false;
        this.isPlantDragging = false; // Re-enable camera drag
        // Callback to parent to save position
        if (this.onPlantMove) {
          this.onPlantMove(plantId, container.x, container.y);
        }
      });

      // Double-tap to remove (only if not dragging)
      let lastTap = 0;
      let tapCount = 0;
      plantSprite.on('pointerup', () => {
        // Only process taps if not dragging
        if (isDragging) return;

        const now = Date.now();
        if (now - lastTap < 400) {
          tapCount++;
          if (tapCount >= 2) {
            // Double tap confirmed - remove plant
            this.removePottedPlant(plantId);
            tapCount = 0;
          }
        } else {
          tapCount = 1;
        }
        lastTap = now;
      });

      // Hover effect
      plantSprite.on('pointerover', () => {
        this.tweens.add({
          targets: plantSprite,
          scale: 0.055,
          duration: 100
        });
      });

      plantSprite.on('pointerout', () => {
        this.tweens.add({
          targets: plantSprite,
          scale: 0.045,
          duration: 100
        });
      });
    } else {
      // Fallback to graphics-based plant
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4A4A4A, 1);
      graphics.fillRect(-25, 0, 50, 40);
      graphics.fillStyle(0x228B22, 1);
      graphics.fillEllipse(0, -40, 30, 50);
      container.add(graphics);
    }

    this.interiorContainer?.add(container);
    this.pottedPlants.push({ container, id: plantId, plantIndex });

    // Callback to parent
    if (this.onPlantAdd && !existingId) {
      this.onPlantAdd({ x, y, plantIndex });
    }
  }

  removePottedPlant(plantId: string) {
    const index = this.pottedPlants.findIndex(p => p.id === plantId);
    if (index > -1) {
      const plant = this.pottedPlants[index];

      // Animate removal
      this.tweens.add({
        targets: plant.container,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          plant.container.destroy();
        }
      });

      this.pottedPlants.splice(index, 1);
    }
  }

  createModernPlant(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();

    // Modern pot
    graphics.fillStyle(0x4A4A4A, 1);
    graphics.fillRect(-25, 0, 50, 40);
    graphics.fillStyle(0x3A3A3A, 1);
    graphics.fillRect(-30, -5, 60, 10);

    // Soil
    graphics.fillStyle(0x4A3728, 1);
    graphics.fillEllipse(0, -5, 45, 12);

    // Plant leaves
    graphics.fillStyle(0x228B22, 1);
    graphics.fillEllipse(-15, -40, 20, 35);
    graphics.fillEllipse(15, -45, 18, 40);
    graphics.fillEllipse(0, -55, 15, 45);
    graphics.fillStyle(0x2ECC71, 1);
    graphics.fillEllipse(-8, -35, 12, 25);
    graphics.fillEllipse(10, -50, 10, 30);

    container.add(graphics);
    return container;
  }

  createInteriorStaff(_theme: typeof THEME_CONFIGS[string]) {
    const staffColors = [
      { skin: 0xFFDBB4, hair: 0x1a1a1a, shirt: 0x4169E1, pants: 0x2F2F2F },
      { skin: 0xD2B48C, hair: 0x2F1B0C, shirt: 0x4169E1, pants: 0x2F2F2F },
      { skin: 0xFFCBA4, hair: 0x8B4513, shirt: 0x4169E1, pants: 0x2F2F2F }
    ];

    this.staff.forEach((staffMember, index) => {
      const style = staffColors[index % staffColors.length];
      const xPos = this.worldWidth / 2 - 80 + index * 100;

      // Pass scale 0.10 for interior staff so they match furniture size
      const staffContainer = this.createPerson(xPos, 450, style, true, undefined, 0.50);
      this.interiorContainer?.add(staffContainer);

      // Modern name tag
      const tagBg = this.add.graphics();
      tagBg.fillStyle(0x4169E1, 0.9);
      tagBg.fillRoundedRect(xPos - 40, 510, 80, 25, 12);
      this.interiorContainer?.add(tagBg);

      const label = this.add.text(xPos, 522, staffMember.staff_role, {
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.interiorContainer?.add(label);

      // Idle animation (skip on ultra low power)
      if (!this.isUltraLowPower) {
        this.tweens.add({
          targets: staffContainer,
          y: staffContainer.y - 3,
          duration: 1500 + index * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  // Create draggable innovation items in the interior
  createInnovationItems() {
    if (!this.activeInnovations || this.activeInnovations.length === 0) return;

    // Clear existing innovation items
    this.innovationItems.forEach(item => item.container.destroy());
    this.innovationItems = [];

    const centerX = this.worldWidth / 2;
    const defaultY = 550; // Default floor level

    // Innovation item visuals based on ID
    const innovationVisuals: Record<string, { color: number; icon: string; glowColor: number }> = {
      'ai_kiosk': { color: 0x00CED1, icon: '🤖', glowColor: 0x00FFFF },
      'smart_qds': { color: 0x32CD32, icon: '📺', glowColor: 0x00FF00 },
      'targeting_ai': { color: 0x9370DB, icon: '📱', glowColor: 0xFF00FF },
      'robotic_cleaner': { color: 0xFFD700, icon: '🧹', glowColor: 0xFFFF00 },
      'analytics_hub': { color: 0x4169E1, icon: '📊', glowColor: 0x0000FF },
    };

    this.activeInnovations.forEach((innovation, index) => {
      // Use saved position or calculate default position
      const x = innovation.x ?? (centerX - 300 + (index * 200));
      const y = innovation.y ?? defaultY;

      const visual = innovationVisuals[innovation.id] || { color: 0x808080, icon: '⚙️', glowColor: 0xFFFFFF };

      // Create innovation container
      const container = this.add.container(x, y);

      // Base/pedestal
      const base = this.add.graphics();
      base.fillStyle(0x2F2F2F, 1);
      base.fillRoundedRect(-40, 20, 80, 15, 5);
      base.fillStyle(0x1a1a1a, 1);
      base.fillRoundedRect(-35, 25, 70, 10, 3);
      container.add(base);

      const innovationTextureKey = innovation.imageUrl ? this.getInnovationTextureKey(innovation.id) : '';
      const hasCustomImage = innovationTextureKey && this.isTextureReady(innovationTextureKey);

      if (hasCustomImage) {
        const designImage = this.add.image(0, -20, innovationTextureKey);
        designImage.setDisplaySize(90, 90);
        designImage.setOrigin(0.5, 0.5);
        container.add(designImage);

        const glow = this.add.graphics();
        glow.fillStyle(visual.glowColor, 0.2);
        glow.fillRoundedRect(-45, -65, 90, 90, 12);
        container.add(glow);
      } else {
        // Main body of the innovation
        const body = this.add.graphics();
        body.fillStyle(visual.color, 0.9);
        body.fillRoundedRect(-35, -60, 70, 80, 10);
        // Screen/display area
        body.fillStyle(0x1a1a1a, 1);
        body.fillRoundedRect(-30, -55, 60, 50, 5);
        // Glowing screen
        body.fillStyle(visual.glowColor, 0.3);
        body.fillRoundedRect(-28, -53, 56, 46, 4);
        container.add(body);

        // Icon on screen
        const icon = this.add.text(0, -30, visual.icon, {
          fontSize: '28px'
        }).setOrigin(0.5);
        container.add(icon);

        // Status LED
        const led = this.add.graphics();
        led.fillStyle(0x00FF00, 1);
        led.fillCircle(25, 10, 4);
        container.add(led);

        // Pulsing LED animation (skip on mobile)
        if (!this.isLowPowerMode) {
          this.tweens.add({
            targets: led,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1
          });
        }
      }

      // Name label
      const labelBg = this.add.graphics();
      labelBg.fillStyle(0x000000, 0.7);
      labelBg.fillRoundedRect(-50, 40, 100, 20, 6);
      container.add(labelBg);

      const label = this.add.text(0, 50, innovation.name.substring(0, 15), {
        fontSize: '10px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(label);

      // Make the innovation item interactive (draggable)
      container.setSize(80, 120);
      container.setInteractive({ useHandCursor: true, draggable: true });

      // Drag events
      container.on('dragstart', () => {
        this.isPlantDragging = true; // Reuse the plant drag flag to prevent camera drag
        container.setDepth(1000); // Bring to front while dragging
        // Scale up slightly when picked up
        this.tweens.add({
          targets: container,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100
        });
      });

      container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        // Constrain to interior bounds
        const minX = this.interiorLeftBound + 50;
        const maxX = this.interiorRightBound - 50;
        const minY = 350;
        const maxY = 650;

        container.x = Phaser.Math.Clamp(dragX, minX, maxX);
        container.y = Phaser.Math.Clamp(dragY, minY, maxY);
      });

      container.on('dragend', () => {
        this.isPlantDragging = false;
        container.setDepth(10); // Reset depth
        // Scale back to normal
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100
        });

        // Save position via callback
        if (this.onInnovationMove) {
          this.onInnovationMove(innovation.id, container.x, container.y);
        }
      });

      // Hover effects
      container.on('pointerover', () => {
        if (!this.isPlantDragging) {
          this.tweens.add({
            targets: container,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150
          });
        }
      });

      container.on('pointerout', () => {
        if (!this.isPlantDragging) {
          this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            duration: 150
          });
        }
      });

      // Subtle idle animation (skip glow on mobile to save GPU)
      if (!this.isUltraLowPower) {
        this.tweens.add({
          targets: container,
          y: container.y - 2,
          duration: 2000 + (index * 300),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      // Glow effect for high-tech feel (skip on mobile)
      if (!this.isLowPowerMode) {
        const glow = this.add.graphics();
        glow.fillStyle(visual.glowColor, 0.1);
        glow.fillCircle(0, -20, 50);
        container.addAt(glow, 0);

        this.tweens.add({
          targets: glow,
          alpha: { from: 0.1, to: 0.3 },
          scaleX: { from: 1, to: 1.2 },
          scaleY: { from: 1, to: 1.2 },
          duration: 1500,
          yoyo: true,
          repeat: -1
        });
      }

      container.setDepth(10);
      this.interiorContainer?.add(container);
      this.innovationItems.push({ container, id: innovation.id });
    });
  }

  startInteriorCustomerFlow() {
    // Spawn interior customers when inside (only if shop is launched AND open)
    this.time.addEvent({
      delay: this.isUltraLowPower ? 6000 : 4000,
      callback: () => {
        const maxInteriorCustomers = this.isUltraLowPower ? 2 : (this.isLowPowerMode ? 3 : 5);
        if (this.isInside && this.interiorCustomers.length < maxInteriorCustomers && this.isShopLaunched && this.isShopOpen()) {
          this.spawnInteriorCustomer();
        }
      },
      loop: true
    });
  }

  spawnInteriorCustomer() {
    // Don't spawn if shop is closed (not launched OR outside operating hours)
    if (!this.isShopLaunched || !this.isShopOpen()) return;
    const style = CUSTOMER_STYLES[Math.floor(Math.random() * CUSTOMER_STYLES.length)];

    // Use class properties for interior bounds (set in createInteriorWorld)
    const leftBound = this.interiorLeftBound;
    const rightBound = this.interiorRightBound;
    const centerX = this.worldWidth / 2;

    // Start from left or right edge of interior
    const startX = Math.random() > 0.5 ? leftBound : rightBound;
    // Pass scale 0.10 for interior customers
    const customer = this.createPerson(startX, 700, style, false, undefined, 0.60);

    this.interiorContainer?.add(customer);
    this.interiorCustomers.push(customer);

    // Customer shopping behavior - stay within interior bounds
    const shelfX = Math.random() > 0.5 ? leftBound + 150 : rightBound - 150;
    const shelfY = 400 + Math.random() * 200;

    // Walk to shelf
    this.tweens.add({
      targets: customer,
      x: shelfX,
      y: shelfY,
      duration: 2000,
      ease: 'Power1',
      onComplete: () => {
        // Browse animation
        this.tweens.add({
          targets: customer,
          scaleX: customer.scaleX === 1 ? -1 : 1,
          duration: 500,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            // Walk to counter (center of interior)
            this.tweens.add({
              targets: customer,
              x: centerX - 50 + Math.random() * 100,
              y: 500,
              duration: 1500,
              onComplete: () => {
                // Purchase animation - Staff mood affects purchase probability
                const avgStaffMood = this.calculateAverageStaffMood();
                const purchaseProbability = Math.min(0.95, 0.5 + (avgStaffMood / 200)); // 50% base + up to 45% from mood

                if (this.onCustomerServed && this.products.length > 0 && Math.random() < purchaseProbability) {
                  const product = this.products[Math.floor(Math.random() * this.products.length)];

                  // Staff mood can give bonus to sale price
                  const moodBonus = avgStaffMood > 80 ? 1.1 : avgStaffMood > 60 ? 1.0 : 0.9;
                  const finalPrice = product.price * moodBonus;

                  this.onCustomerServed(finalPrice, product.id);

                  // Show purchase with modern popup (including mood indicator)
                  this.showPurchasePopup(customer.x, customer.y - 80, finalPrice, product.product_name, avgStaffMood);
                } else if (this.products.length > 0) {
                  // Customer didn't buy - show browse popup
                  this.showBrowsePopup(customer.x, customer.y - 60);
                }

                // Wait then leave - exit through interior edges, not outside world
                this.time.delayedCall(1500, () => {
                  this.tweens.add({
                    targets: customer,
                    x: Math.random() > 0.5 ? leftBound - 50 : rightBound + 50,
                    y: 700,
                    duration: 2500,
                    onComplete: () => {
                      const idx = this.interiorCustomers.indexOf(customer);
                      if (idx > -1) this.interiorCustomers.splice(idx, 1);
                      customer.destroy();
                    }
                  });
                });
              }
            });
          }
        });
      }
    });

    // Walking bob animation (slower on mobile, skip on ultra-low)
    if (!this.isUltraLowPower) {
      this.tweens.add({
        targets: customer,
        y: customer.y - 4,
        duration: this.isLowPowerMode ? 800 : 250,
        yoyo: true,
        repeat: -1
      });
    }
  }

  calculateAverageStaffMood(): number {
    if (this.staff.length === 0) return 70; // Default mood if no staff
    const totalMood = this.staff.reduce((sum, s) => sum + (s.mood || 70), 0);
    return totalMood / this.staff.length;
  }

  showBrowsePopup(x: number, y: number) {
    // Skip browse popups entirely on low power mobile - they're cosmetic only
    if (this.isLowPowerMode) return;

    // Show "Just browsing" popup
    const popupBg = this.add.graphics();
    popupBg.fillStyle(0x333333, 0.8);
    popupBg.fillRoundedRect(x - 50, y - 15, 100, 30, 8);
    this.interiorContainer?.add(popupBg);

    const browseText = this.add.text(x, y, '👀 Browsing...', {
      fontSize: '12px',
      color: '#AAAAAA'
    }).setOrigin(0.5);
    this.interiorContainer?.add(browseText);

    // Animate and remove
    this.tweens.add({
      targets: [popupBg, browseText],
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        popupBg.destroy();
        browseText.destroy();
      }
    });
  }

  showPurchasePopup(x: number, y: number, price: number, productName: string, staffMood?: number) {
    // On mobile low power: show simplified single-text popup (1 object instead of 5)
    if (this.isLowPowerMode) {
      const simpleText = this.add.text(x, y - 20, `💰 +RM${price.toFixed(2)}`, {
        fontSize: '16px',
        color: '#00FF00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      this.interiorContainer?.add(simpleText);

      this.tweens.add({
        targets: simpleText,
        y: simpleText.y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => simpleText.destroy()
      });
      return;
    }

    // Background popup
    const popupBg = this.add.graphics();
    popupBg.fillStyle(0x000000, 0.8);
    popupBg.fillRoundedRect(x - 70, y - 35, 140, 70, 10);
    this.interiorContainer?.add(popupBg);

    // Money icon
    const moneyIcon = this.add.text(x - 55, y - 10, '💰', { fontSize: '20px' }).setOrigin(0.5);
    this.interiorContainer?.add(moneyIcon);

    // Price text
    const priceText = this.add.text(x + 10, y - 18, `+RM${price.toFixed(2)}`, {
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.interiorContainer?.add(priceText);

    // Product name
    const nameText = this.add.text(x + 10, y + 2, productName.substring(0, 12), {
      fontSize: '11px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.interiorContainer?.add(nameText);

    // Staff mood indicator (shows bonus/penalty)
    let moodEmoji = '😐';
    let moodColor = '#FFFFFF';
    if (staffMood !== undefined) {
      if (staffMood > 80) {
        moodEmoji = '😊 +10%';
        moodColor = '#00FF00';
      } else if (staffMood > 60) {
        moodEmoji = '🙂';
        moodColor = '#FFFFFF';
      } else {
        moodEmoji = '😔 -10%';
        moodColor = '#FF6B6B';
      }
    }

    const moodText = this.add.text(x, y + 18, moodEmoji, {
      fontSize: '10px',
      color: moodColor
    }).setOrigin(0.5);
    this.interiorContainer?.add(moodText);

    // Animate and remove
    this.tweens.add({
      targets: [popupBg, moneyIcon, priceText, nameText, moodText],
      y: y - 80,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        popupBg.destroy();
        moneyIcon.destroy();
        priceText.destroy();
        nameText.destroy();
        moodText.destroy();
      }
    });
  }

  setupCameraControls() {
    // Enable drag to scroll - with minimum distance to avoid blocking clicks
    let dragStarted = false;
    const minDragDistance = 5; // Minimum pixels before drag activates

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragStartX = pointer.position.x;
      this.dragStartY = pointer.position.y;
      this.isDragging = false; // Don't start dragging immediately
      dragStarted = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        // Don't drag camera when item selection bar is visible or when dragging a plant
        if (this.itemBarVisible || this.isPlantDragging) {
          return;
        }

        const deltaX = this.dragStartX - pointer.position.x;
        const deltaY = this.dragStartY - pointer.position.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Only start dragging after minimum distance (to allow clicks)
        if (!dragStarted && distance > minDragDistance) {
          dragStarted = true;
          this.isDragging = true;
        }

        if (this.isDragging) {
          // Adjust for zoom level to make drag feel 1:1 with screen
          const zoom = this.cameras.main.zoom;
          this.cameras.main.scrollX += deltaX / zoom;
          this.cameras.main.scrollY += deltaY / zoom;

          this.dragStartX = pointer.position.x;
          this.dragStartY = pointer.position.y;
        }
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      dragStarted = false;
    });

    // Mouse wheel zoom - but not when item bar is open (it uses scroll for items)
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      // Don't zoom when selection bar is visible - wheel is used for scrolling items
      if (this.itemBarVisible) {
        return;
      }
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 1.5);
      this.cameras.main.setZoom(newZoom);
    });
  }

  startAmbientLife(_theme: typeof THEME_CONFIGS[string]) {
    // Customer spawn timing based on traffic multiplier
    const baseDelay = 10000; // 10 seconds base
    const performanceFactor = this.isUltraLowPower ? 3.5 : (this.isLowPowerMode ? 2.5 : 1);
    const minDelay = this.isUltraLowPower ? 10000 : (this.isLowPowerMode ? 7000 : 3000);
    const customerSpawnDelay = Math.max(minDelay, (baseDelay / this.trafficMultiplier) * performanceFactor);

    // Spawn customers periodically based on traffic multiplier
    this.time.addEvent({
      delay: customerSpawnDelay,
      callback: () => this.spawnCustomer(),
      loop: true
    });

    // Spawn cars (not affected by traffic multiplier) - optimized delays
    if (!this.isUltraLowPower) {
      this.time.addEvent({
        delay: this.isLowPowerMode ? 25000 : 12000,
        callback: () => this.spawnCar(),
        loop: true
      });
    }

    // Spawn birds (skip on low power)
    if (!this.isLowPowerMode) {
      this.time.addEvent({
        delay: 12000,
        callback: () => this.spawnBird(),
        loop: true
      });
    }

    // Initial spawns - for new shops, delay first customer more
    // Only spawn initial customer if shop has some products (traffic > 0.5)
    if (this.trafficMultiplier >= 0.5) {
      const initialDelay = this.trafficMultiplier >= 1.0 ? 2000 : 5000;
      this.time.delayedCall(initialDelay, () => this.spawnCustomer());
    }
    if (!this.isUltraLowPower) {
      this.time.delayedCall(1000, () => this.spawnCar());
    }
  }

  spawnCustomer() {
    // Max customers based on traffic - optimized limits for performance
    const maxCustomers = this.isUltraLowPower
      ? 1 // Ultra low: just 1 customer at a time
      : this.isLowPowerMode
        ? Math.min(3, Math.max(1, Math.floor(1 + this.trafficMultiplier * 0.5))) // Low power: 1-3 max
        : Math.max(2, Math.floor(2 + this.trafficMultiplier * 1.5)); // Desktop: 2-8 max
    if (this.customers.length >= maxCustomers || this.isInside) {
      return;
    }

    // During night hours (closed), fewer people walk by
    if (!this.isShopOpen() && Math.random() > 0.3) return;

    // For low traffic shops, sometimes skip spawning entirely
    if (this.trafficMultiplier < 1.0 && Math.random() > this.trafficMultiplier) return;

    const style = CUSTOMER_STYLES[Math.floor(Math.random() * CUSTOMER_STYLES.length)];
    // Always spawn from left side, walk to right
    const startX = -50;

    // Position NPCs on sidewalk - walking in front of shop
    const customer = this.createPerson(
      startX,
      this.worldHeight * 0.82,
      style,
      false,
      undefined,
      undefined,
      !this.isLowPowerMode
    );

    // Set depth to ensure customer appears above background elements
    customer.setDepth(100);

    // Flip sprite to face RIGHT (sprite sheet shows character walking LEFT by default)
    const walkingSprite = (customer as any).walkingSprite as Phaser.GameObjects.Sprite | undefined;
    if (walkingSprite) {
      // Flip horizontally so character faces right while walking right
      walkingSprite.setFlipX(true);
    }

    this.exteriorContainer?.add(customer);
    this.customers.push(customer);

    // Walk across or visit shop - ONLY allow visits if shop is launched AND open!
    // Chance to enter increases with products (shop attractiveness):
    // - 0 products: 20% chance (window shopping only)
    // - 1-2 products: 35% chance
    // - 3-5 products: 50% chance
    // - 6-10 products: 65% chance
    // - 10+ products: 80% chance
    const productCount = this.products.length;
    const baseVisitChance = Math.min(0.8, 0.2 + (productCount * 0.06));
    const visitShop = this.isShopLaunched && this.isShopOpen() && Math.random() < baseVisitChance;
    // Always walk to the right (from left to right)
    const targetX = visitShop ? this.worldWidth / 2 : this.worldWidth + 50;

    this.tweens.add({
      targets: customer,
      x: targetX,
      duration: visitShop ? 4000 : 8000,
      ease: 'Linear',
      onComplete: () => {
        if (visitShop) {
          // Enter Shop Animation (Fade Out)
          this.tweens.add({
            targets: customer,
            alpha: 0,
            scale: 0.06, // Slight shrink as they enter
            duration: 800,
            onComplete: () => {
              // Customer entered the shop - track as visitor
              console.log('[ShopGame Phaser] Customer entered shop, calling onVisitorEnter. Callback exists:', !!this.onVisitorEnter);
              this.onVisitorEnter?.();

              // Wait inside (Shopping time)
              this.time.delayedCall(2000, () => {
                // Purchase logic - only if shop is launched
                if (this.isShopLaunched && this.onCustomerServed && this.products.length > 0) {
                  // Staff capacity affects customer satisfaction
                  // Each staff can effectively serve ~3 customers at a time
                  // If too crowded, some customers get frustrated and leave without buying
                  const staffCount = this.staff.length;
                  const activeVisitors = this.customers.filter(c => c.alpha < 0.5).length; // Customers inside (faded out)
                  const staffCapacity = Math.max(1, staffCount * 3); // Each staff handles 3 customers
                  const isOverCapacity = activeVisitors > staffCapacity;

                  // Calculate purchase probability based on staff satisfaction
                  // - Well-staffed shop: 90% purchase rate
                  // - Slightly busy: 70% purchase rate
                  // - Overcrowded (no staff): 30% purchase rate
                  let purchaseProbability = 0.9;
                  if (staffCount === 0) {
                    purchaseProbability = 0.3; // Self-service only - low conversion
                  } else if (isOverCapacity) {
                    // Crowded - satisfaction drops
                    const overloadRatio = activeVisitors / staffCapacity;
                    purchaseProbability = Math.max(0.3, 0.9 - (overloadRatio - 1) * 0.2);
                  }

                  // Average staff mood also affects sales
                  const avgMood = staffCount > 0
                    ? this.staff.reduce((sum, s) => sum + (s.mood || 70), 0) / staffCount
                    : 50;
                  const moodModifier = avgMood / 100; // 0.5 to 1.0
                  purchaseProbability *= moodModifier;

                  if (Math.random() < purchaseProbability) {
                    // Customer makes a purchase!
                    const product = this.products[Math.floor(Math.random() * this.products.length)];
                    this.onCustomerServed(product.price, product.id);

                    // Show purchase floating text (simplified on mobile)
                    if (!this.isUltraLowPower) {
                      const purchaseText = this.add.text(customer.x, customer.y - 80, `+RM${product.price}`, {
                        fontSize: this.isLowPowerMode ? '18px' : '24px',
                        color: '#00FF00',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 3
                      }).setOrigin(0.5);
                      this.exteriorContainer?.add(purchaseText);

                      this.tweens.add({
                        targets: purchaseText,
                        y: purchaseText.y - 60,
                        alpha: 0,
                        duration: 1500,
                        onComplete: () => purchaseText.destroy()
                      });
                    }
                  } else {
                    // Customer leaves without buying - skip floating text on mobile
                    if (!this.isLowPowerMode) {
                      const noSaleText = this.add.text(customer.x, customer.y - 80, isOverCapacity ? '😤 Too busy!' : '😕', {
                        fontSize: '20px',
                      }).setOrigin(0.5);
                      this.exteriorContainer?.add(noSaleText);

                      this.tweens.add({
                        targets: noSaleText,
                        y: noSaleText.y - 60,
                        alpha: 0,
                        duration: 1500,
                        onComplete: () => noSaleText.destroy()
                      });
                    }
                  }
                }

                // Exit Shop Animation (Fade In)
                this.tweens.add({
                  targets: customer,
                  alpha: 1,
                  scale: 0.08,
                  duration: 800,
                  onComplete: () => {
                    // Keep sprite facing right (same direction as entry)
                    const exitSprite = (customer as any).walkingSprite as Phaser.GameObjects.Sprite | undefined;
                    if (exitSprite) {
                      // Keep facing right to continue walking right
                      exitSprite.setFlipX(true);
                    }

                    // Walk away to the right
                    this.tweens.add({
                      targets: customer,
                      x: this.worldWidth + 50,
                      duration: 5000,
                      onComplete: () => {
                        const idx = this.customers.indexOf(customer);
                        if (idx > -1) this.customers.splice(idx, 1);
                        customer.destroy();
                      }
                    });
                  }
                });
              });
            }
          });
        } else {
          // Just walking by
          const idx = this.customers.indexOf(customer);
          if (idx > -1) this.customers.splice(idx, 1);
          customer.destroy();
        }
      }
    });

    // Walking bob animation - only for non-animated sprites (slower on mobile)
    if (!(customer as any).walkingSprite && !this.isUltraLowPower) {
      this.tweens.add({
        targets: customer,
        y: customer.y - 3,
        duration: this.isLowPowerMode ? 800 : 300,
        yoyo: true,
        repeat: -1
      });
    }
  }

  createPerson(x: number, y: number, _style: typeof CUSTOMER_STYLES[0], isStaff: boolean, characterIndex?: number, scale?: number, useWalkingAnimation?: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Default scale 0.06 (exterior) if not provided
    const npcScale = scale ?? 0.06;

    // Use walking animation for exterior customers (not staff)
    const canUseWalking = useWalkingAnimation && this.textures.exists('walking_char') && this.anims.exists('walk');

    if (canUseWalking) {
      // Create animated sprite for walking character
      const walkingSprite = this.add.sprite(0, 0, 'walking_char');
      walkingSprite.setScale(0.35); // Adjusted for larger sprite (224x382)
      walkingSprite.setOrigin(0.5, 0.8); // Origin near bottom for proper ground alignment
      walkingSprite.play('walk'); // Start walking animation
      container.add(walkingSprite);

      // Store reference for direction flipping
      (container as any).walkingSprite = walkingSprite;
    } else {
      // Randomly select a character from the assets if not specified
      const charPool = this.characterIndices.length > 0 ? this.characterIndices : ASSET_PATHS.characters.map((_p, i) => i);
      const charIndex = characterIndex ?? (charPool[Math.floor(Math.random() * charPool.length)] ?? 0);
      const textureKey = `character_${charIndex}`;

      if (this.textures.exists(textureKey)) {
        const npcSprite = this.add.image(0, 0, textureKey);
        npcSprite.setScale(npcScale);
        npcSprite.setOrigin(0.5, 1); // Origin at bottom center
        container.add(npcSprite);
        // No shadow - cleaner look
      } else {
        // Fallback to original npc image
        const npcSprite = this.add.image(0, 0, 'npc');
        npcSprite.setScale(0.05);
        npcSprite.setOrigin(0.5, 1);
        container.add(npcSprite);
        // No shadow - cleaner look
      }
    }

    // Staff badge (golden circle) if this is a staff member
    if (isStaff) {
      const badge = this.add.graphics();
      badge.fillStyle(0xFFD700, 1);
      badge.fillCircle(-15, -70, 8);
      badge.lineStyle(2, 0xFFFFFF, 1);
      badge.strokeCircle(-15, -70, 8);
      container.add(badge);
    }

    return container;
  }

  spawnCar() {
    // Mobile optimization: limit max cars on screen
    const MAX_CARS = this.isUltraLowPower ? 2 : (this.isLowPowerMode ? 3 : 5);
    if (this.cars.length >= MAX_CARS) {
      return;
    }
    if (this.isLowPowerMode && Math.random() < 0.4) {
      return;
    }
    if (this.isInside) return;

    // Randomly select a car from the assets
    const carPool = this.carIndices.length > 0 ? this.carIndices : ASSET_PATHS.cars.map((_p, i) => i);
    const carIndex = carPool[Math.floor(Math.random() * carPool.length)] ?? 0;

    // All cars go from LEFT to RIGHT only (one-way traffic)
    const startX = -150;
    const endX = this.worldWidth + 150;

    // Check if car faces right in its original image
    // If not, we'll flip it so all cars face right (going left to right)
    const facesRight = ASSET_PATHS.carsGoingRight.includes(carIndex);

    // Position cars on the road - road is at 0.85 to 0.95 of worldHeight
    const roadY = this.worldHeight * 0.92;
    // Slight vertical variation for visual interest
    const y = roadY + 50 + Math.random() * 30;

    const car = this.createCar(startX, y, carIndex, facesRight ? 1 : -1);
    this.exteriorContainer?.add(car);
    this.cars.push(car);

    this.tweens.add({
      targets: car,
      x: endX,
      duration: 4000 + Math.random() * 3000,
      onComplete: () => {
        const idx = this.cars.indexOf(car);
        if (idx > -1) this.cars.splice(idx, 1);
        car.destroy();
      }
    });
  }

  createCar(x: number, y: number, carIndex: number, direction: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const textureKey = `car_${carIndex}`;

    if (this.textures.exists(textureKey)) {
      const carSprite = this.add.image(0, 0, textureKey);
      carSprite.setOrigin(0.5, 1); // Bottom center
      carSprite.setScale(0.6);
      // Flip cars that originally face left so all cars face right (going left to right)
      if (direction === -1) {
        carSprite.setFlipX(true);
      }
      container.add(carSprite);
    } else {
      // Fallback to graphics-based car (always facing right)
      const graphics = this.add.graphics();
      const color = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00][carIndex % 4];

      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(-50, -10, 100, 30, 8);
      graphics.fillStyle(this.darkenColor(color, 0.1), 1);
      graphics.fillRoundedRect(-30, -30, 60, 25, 8);
      graphics.fillStyle(0x87CEEB, 0.8);
      graphics.fillRoundedRect(-25, -28, 25, 18, 5);
      graphics.fillRoundedRect(5, -28, 25, 18, 5);
      graphics.fillStyle(0x1a1a1a, 1);
      graphics.fillCircle(-30, 20, 12);
      graphics.fillCircle(30, 20, 12);

      container.add(graphics);
    }

    return container;
  }

  spawnBird() {
    if (this.isInside) return;

    const startX = Math.random() > 0.5 ? -50 : this.worldWidth + 50;
    const bird = this.createBird(startX, Phaser.Math.Between(80, 200));
    this.exteriorContainer?.add(bird);
    this.birds.push(bird);

    this.tweens.add({
      targets: bird,
      x: startX < 0 ? this.worldWidth + 50 : -50,
      y: bird.y + Phaser.Math.Between(-50, 50),
      duration: 6000,
      onComplete: () => {
        const idx = this.birds.indexOf(bird);
        if (idx > -1) this.birds.splice(idx, 1);
        bird.destroy();
      }
    });

    // Wing flap animation (skip on mobile - 200ms is too fast for low power)
    if (!this.isLowPowerMode) {
      const wing = bird.getAt(1) as Phaser.GameObjects.Graphics;
      this.tweens.add({
        targets: wing,
        angle: { from: -20, to: 20 },
        duration: 200,
        yoyo: true,
        repeat: -1
      });
    }
  }

  createBird(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Body
    const body = this.add.graphics();
    body.fillStyle(0x1a1a1a, 1);
    body.fillEllipse(0, 0, 20, 12);
    container.add(body);

    // Wing
    const wing = this.add.graphics();
    wing.fillStyle(0x2F2F2F, 1);
    wing.fillTriangle(-5, -5, 5, -5, 0, -15);
    container.add(wing);

    // Beak
    const beak = this.add.graphics();
    beak.fillStyle(0xFFA500, 1);
    beak.fillTriangle(10, 0, 18, -2, 10, -4);
    container.add(beak);

    return container;
  }

  createUIOverlay() {
    // UI elements (title, exit button, controls) are handled by React overlay (index.tsx)
    // This method only sets up camera ignore for game world on UI camera
    if (this.uiCamera) {
      if (this.exteriorContainer) this.uiCamera.ignore(this.exteriorContainer);
      if (this.interiorContainer) this.uiCamera.ignore(this.interiorContainer);
    }
  }

  enterShop() {
    // Instead of switching to interior, notify React to open the 3D world
    if (this.onEnterShop) {
      this.onEnterShop();
    }
  }

  exitShop() {
    this.isInside = false;
    this.interiorContainer?.setVisible(false);
    this.exteriorContainer?.setVisible(true);

    // Restore camera bounds for exterior view
    const extendedWorldHeight = this.worldHeight + 600;
    this.cameras.main.setBounds(0, 0, this.worldWidth, extendedWorldHeight);

    this.updateCameraPosition();

    // Hide floating action buttons, item bar, and recenter button
    this.floatingButtons?.setVisible(false);
    this.hideItemSelectionBar();
    this.hideRecenterButton();

    // Hide interior closed indicator
    if (this.interiorClosedIndicator) {
      this.interiorClosedIndicator.setVisible(false);
    }
    if (this.photoModal) {
      this.photoModal.destroy(true);
      this.photoModal = undefined;
    }

    // Notify React of view mode change
    if (this.onViewModeChange) {
      this.onViewModeChange('exterior');
    }

    // Clean up interior customers
    this.interiorCustomers.forEach(customer => customer.destroy());
    this.interiorCustomers = [];
  }

  // Debug method to toggle night mode for testing
  setDebugNightMode(isNight: boolean) {
    // Enable debug mode to prevent auto time sync from overriding
    this.debugModeActive = true;

    // Stop any running background tweens to prevent conflicts
    if (this.backgroundImage) {
      this.tweens.killTweensOf(this.backgroundImage);
      this.backgroundImage.setAlpha(1); // Ensure visible
    }
    if (this.dayNightOverlay) {
      this.tweens.killTweensOf(this.dayNightOverlay);
    }

    this.isNightTime = isNight;
    // Update the current hour to match (for consistency with shop open/closed logic)
    this.currentHour = isNight ? 21 : 12; // 9pm for night, 12pm for day

    // Directly update visuals without animation for immediate feedback
    const textureKey = this.isNightTime
      ? `night_view_${this.selectedNightBgIndex}`
      : `day_view_${this.selectedDayBgIndex}`;

    if (this.backgroundImage && this.textures.exists(textureKey)) {
      this.backgroundImage.setTexture(textureKey);
    }

    if (this.dayNightOverlay) {
      this.dayNightOverlay.setAlpha(this.isNightTime ? 0.4 : 0);
    }

    // Update interior closed status based on new time
    this.updateInteriorClosedStatus();
    // Notify UI of time change
    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        hour: this.currentHour,
        minute: 0,
        isOpen: this.isShopOpen(),
        isNight: this.isNightTime
      });
    }
  }

  // Handle resize events - only update UI camera, don't reset main camera position
  // Handle resize events
  handleResize(gameSize: Phaser.Structs.Size) {
    // Update UI camera size
    if (this.uiCamera) {
      this.uiCamera.setSize(gameSize.width, gameSize.height);
    }

    this.checkMobileAndScreenSize();
    this.isLowPowerMode = this.isMobileDevice || this.screenSizeCategory === 'xs' || this.screenSizeCategory === 'sm';
    this.refreshFloatingButtons();

    // If inside the shop, re-center the view to keep the room centered
    if (this.isInside) {
      this.updateCameraPosition();
    }
  }

  // Update camera position - only used when entering/exiting shop
  updateCameraPosition() {
    if (this.isInside) {
      // Interior view - center on the visible room content
      // The room content needs to appear centered/lower in the view, not at the top
      // World height is 1300, viewport is smaller
      // We want to center the camera lower to push content toward bottom-center
      // The interior room spans roughly y=60 (ceiling) to y=1130 (floor)
      // Using 0.55 of world height positions the room in bottom-center
      const targetY = this.worldHeight * 0.55;

      this.cameras.main.centerOn(this.worldWidth / 2, targetY);
    } else {
      // Exterior view - center on shop with slight offset down to show more ground
      this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight / 2 + 100);
    }
  }

  // Show recenter button for interior view (fixed to screen)
  showRecenterButton() {
    if (this.recenterButton) {
      this.recenterButton.setVisible(true);
      return;
    }

    // Create the recenter button container (fixed to screen with scrollFactor 0)
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.recenterButton = this.add.container(screenWidth / 2, screenHeight - 80);
    this.recenterButton.setScrollFactor(0);
    this.recenterButton.setDepth(999);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-60, -20, 120, 40, 20);
    bg.lineStyle(2, 0x00FFFF, 0.8);
    bg.strokeRoundedRect(-60, -20, 120, 40, 20);
    this.recenterButton.add(bg);

    // Arrow icon (↻)
    const icon = this.add.text(-45, -12, '⟲', {
      fontSize: '24px',
      color: '#00FFFF'
    });
    this.recenterButton.add(icon);

    // Label
    const label = this.add.text(-20, -10, 'Center', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.recenterButton.add(label);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 120, 40, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    this.recenterButton.add(hitArea);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x00FFFF, 0.3);
      bg.fillRoundedRect(-60, -20, 120, 40, 20);
      bg.lineStyle(2, 0x00FFFF, 1);
      bg.strokeRoundedRect(-60, -20, 120, 40, 20);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x000000, 0.7);
      bg.fillRoundedRect(-60, -20, 120, 40, 20);
      bg.lineStyle(2, 0x00FFFF, 0.8);
      bg.strokeRoundedRect(-60, -20, 120, 40, 20);
    });

    hitArea.on('pointerdown', () => {
      // Smoothly animate back to center
      const targetY = this.worldHeight * 0.55;
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: this.worldWidth / 2 - this.scale.width / 2,
        scrollY: targetY - this.scale.height / 2,
        duration: 300,
        ease: 'Power2'
      });
    });

    // Make sure UI camera renders this
    if (this.uiCamera) {
      // Main camera should ignore this button
      this.cameras.main.ignore(this.recenterButton);
    }
  }

  hideRecenterButton() {
    if (this.recenterButton) {
      this.recenterButton.setVisible(false);
    }
  }

  private interiorClosedIndicator?: Phaser.GameObjects.Container;

  updateInteriorClosedStatus() {
    const isOpen = this.isShopLaunched && this.isShopOpen();

    // Create indicator if it doesn't exist
    if (!this.interiorClosedIndicator) {
      this.interiorClosedIndicator = this.add.container(this.worldWidth / 2, 200);

      // Semi-transparent banner
      const bannerBg = this.add.graphics();
      bannerBg.fillStyle(0x8B0000, 0.9);
      bannerBg.fillRoundedRect(-200, -50, 400, 100, 20);
      bannerBg.lineStyle(4, 0xFFFFFF, 1);
      bannerBg.strokeRoundedRect(-200, -50, 400, 100, 20);
      this.interiorClosedIndicator.add(bannerBg);

      // Closed text
      const closedText = this.add.text(0, -15, '🔒 SHOP CLOSED', {
        fontSize: '32px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.interiorClosedIndicator.add(closedText);

      // Sub text
      let subMessage = 'Complete tasks to open your shop!';
      if (this.isShopLaunched && !this.isShopOpen()) {
        subMessage = 'Open hours: 9AM - 10PM';
      }

      const subText = this.add.text(0, 25, subMessage, {
        fontSize: '16px',
        color: '#FFCCCC'
      }).setOrigin(0.5);
      this.interiorClosedIndicator.add(subText);

      this.interiorClosedIndicator.setDepth(500);
      this.interiorContainer?.add(this.interiorClosedIndicator);
    }

    // Update visibility
    this.interiorClosedIndicator.setVisible(!isOpen);

    // Update sub text based on reason
    if (!isOpen && this.interiorClosedIndicator) {
      const subText = this.interiorClosedIndicator.getAt(2) as Phaser.GameObjects.Text;
      if (subText) {
        if (!this.isShopLaunched) {
          subText.setText('Complete tasks to open your shop!');
        } else if (!this.isShopOpen()) {
          subText.setText('Open hours: 9AM - 10PM');
        }
      }
    }
  }

  darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount));
    const b = Math.max(0, (color & 0xFF) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xFF) * (1 + amount));
    const g = Math.min(255, ((color >> 8) & 0xFF) * (1 + amount));
    const b = Math.min(255, (color & 0xFF) * (1 + amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  update() {
    // Game loop
  }

  createBanner(container: Phaser.GameObjects.Container, name: string, type: string) {
    const graphics = this.add.graphics();
    let yPos = -320;

    // Visual Styles
    if (type === 'banner_neon') {
      graphics.fillStyle(0xFF00FF, 0.2);
      graphics.fillCircle(0, yPos, 60);
      graphics.lineStyle(4, 0x00FFFF, 1);
      graphics.strokeRoundedRect(-140, yPos - 30, 280, 60, 15);
    } else if (type === 'banner_wood') {
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRoundedRect(-140, yPos - 35, 280, 70, 5);
      graphics.lineStyle(2, 0xDEB887, 1);
      graphics.strokeRoundedRect(-135, yPos - 30, 270, 60, 5);
    } else if (type === 'banner_tech') {
      graphics.fillStyle(0x000000, 0.8);
      graphics.fillRect(-150, yPos - 30, 300, 60);
      graphics.lineStyle(2, 0x00FF00, 1);
      graphics.strokeRect(-152, yPos - 32, 304, 64);
    }
    // 'banner_plain' uses default text bg

    container.add(graphics);

    // Text Object
    const style: any = {
      fontSize: '28px',
      fontFamily: type === 'banner_tech' ? 'Courier New' : 'Arial Black',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
      padding: { x: 15, y: 8 }
    };

    if (type === 'banner_plain') style.backgroundColor = '#2F2F2F';

    const nameText = this.add.text(0, yPos, name.toUpperCase(), style).setOrigin(0.5);

    // Make Banner Interactive
    nameText.setInteractive({ useHandCursor: true });
    nameText.on('pointerdown', () => {
      if (this.interactive && this.onObjectClick) {
        this.onObjectClick('exterior_banner');
      }
    });

    container.add(nameText);
  }

  createExteriorLights(container: Phaser.GameObjects.Container, type: string) {
    if (type === 'lights_none') return;

    const graphics = this.add.graphics();
    const roofY = -150; // Top of building wall approx

    if (type === 'lights_string') {
      // String lights hanging across
      graphics.lineStyle(2, 0x2F2F2F, 1);

      const start = new Phaser.Math.Vector2(-200, roofY);
      const control = new Phaser.Math.Vector2(0, roofY + 50);
      const end = new Phaser.Math.Vector2(200, roofY);
      const curve = new Phaser.Curves.QuadraticBezier(start, control, end);

      curve.draw(graphics);

      // Bulbs
      const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const p = curve.getPoint(t);
        graphics.fillStyle(colors[i % 4], 1);
        graphics.fillCircle(p.x, p.y + 5, 5);
        graphics.fillStyle(0xFFFFFF, 0.5);
        graphics.fillCircle(p.x, p.y + 5, 2);
      }
    } else if (type === 'lights_spot') {
      // Spotlights
      for (let i = -1; i <= 1; i++) {
        graphics.fillStyle(0xFFFFE0, 0.3); // Light Beam
        graphics.beginPath();
        graphics.moveTo(i * 100, roofY);
        graphics.lineTo(i * 100 - 30, roofY + 150);
        graphics.lineTo(i * 100 + 30, roofY + 150);
        graphics.closePath();
        graphics.fillPath();

        // Fixture
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(i * 100, roofY, 8);
      }
    }

    container.add(graphics);
  }
}

export const ShopGame: React.FC<ShopGameProps> = ({
  shopTheme,
  shopName,
  products,
  staff,
  decorations,
  onCustomerServed,
  onEnterShop,
  config,
  onObjectClick,
  interactive,
  view,
  shopImageUrl,
  shopSceneImageUrl,
  onShelfChange,
  onCashierChange,
  onPlantAdd,
  onPlantMove,
  onRequestCustomAsset,
  savedShelfLeft,
  savedShelfRight,
  savedCashier,
  savedFloor,
  savedWall,
  savedPlants,
  customAssets,
  onViewModeChange,
  onCustomizationOpen,
  externalCommand,
  isShopLaunched = false,
  onInteriorStateChange,
  onTimeUpdate,
  trafficMultiplier = 1.0,
  onVisitorEnter,
  activeInfluencers = [],
  activeAdSpaces = [],
  activeInnovations = [],
  onInnovationMove,
  onToolbarVisibilityChange,
  onOpenProductsBoard,
  onOpenStaffBoard
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | undefined>(undefined);
  const [processedSceneImageUrl, setProcessedSceneImageUrl] = useState<string | undefined>(undefined);
  const customAssetsKey = useMemo(() => JSON.stringify(customAssets || {}), [customAssets]);
  const lastContainerSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Store callbacks in refs to prevent re-renders from causing game restarts
  const callbackRefs = useRef({
    onCustomerServed,
    onEnterShop,
    onObjectClick,
    onShelfChange,
    onCashierChange,
    onPlantAdd,
    onPlantMove,
    onRequestCustomAsset,
    onViewModeChange,
    onCustomizationOpen,
    onInteriorStateChange,
    onTimeUpdate,
    onVisitorEnter,
    onInnovationMove,
    onToolbarVisibilityChange,
    onOpenProductsBoard,
    onOpenStaffBoard
  });

  // Update refs when callbacks change (without triggering re-render)
  useEffect(() => {
    callbackRefs.current = {
      onCustomerServed,
      onEnterShop,
      onObjectClick,
      onShelfChange,
      onCashierChange,
      onPlantAdd,
      onPlantMove,
      onRequestCustomAsset,
      onViewModeChange,
      onCustomizationOpen,
      onInteriorStateChange,
      onTimeUpdate,
      onVisitorEnter,
      onInnovationMove,
      onToolbarVisibilityChange,
      onOpenProductsBoard,
      onOpenStaffBoard
    };
  });

  // Process the shop image URL - handle CORS by using API proxy for local dev
  useEffect(() => {
    if (!shopImageUrl) {
      setProcessedImageUrl(undefined);
      return;
    }

    console.log('[ShopGame React] shopImageUrl prop received:', shopImageUrl);

    // Always proxy storage URLs to avoid CORS (production and local)
    if (shopImageUrl.includes('/storage/shops/')) {
      // Extract the filename from the storage URL and use web proxy instead
      // URL format: https://app.aigenius.com.my/storage/shops/filename.png
      const filename = shopImageUrl.split('/storage/shops/').pop();
      if (filename) {
        // Use getAssetUrl to handle both local dev (Vite proxy) and ngrok deployment
        const proxyUrl = getAssetUrl(`/aipreneur/shop-image/${filename}`);
        console.log('[ShopGame React] Using proxy URL:', proxyUrl);
        setProcessedImageUrl(proxyUrl);
      } else {
        setProcessedImageUrl(shopImageUrl);
      }
    } else {
      // For production URLs (S3, CloudFront, etc.), use directly
      setProcessedImageUrl(shopImageUrl);
    }

    // Cleanup blob URL on unmount
    return () => {
      if (processedImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(processedImageUrl);
      }
    };
  }, [shopImageUrl]);

  // Process the shop scene image URL for interior photo frame
  useEffect(() => {
    if (!shopSceneImageUrl) {
      setProcessedSceneImageUrl(undefined);
      return;
    }

    if (shopSceneImageUrl.includes('/storage/shops/')) {
      const filename = shopSceneImageUrl.split('/storage/shops/').pop();
      if (filename) {
        const proxyUrl = getAssetUrl(`/aipreneur/shop-image/${filename}`);
        setProcessedSceneImageUrl(proxyUrl);
      } else {
        setProcessedSceneImageUrl(shopSceneImageUrl);
      }
    } else {
      setProcessedSceneImageUrl(shopSceneImageUrl);
    }

    return () => {
      if (processedSceneImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(processedSceneImageUrl);
      }
    };
  }, [shopSceneImageUrl]);

  // Exterior-only mode - no view sync needed

  useEffect(() => {
    // Don't initialize until we have the container
    if (!gameContainerRef.current) return;

    // Wait for processedImageUrl if shopImageUrl was provided
    if (shopImageUrl && processedImageUrl === undefined) {
      console.log('[ShopGame] Waiting for processedImageUrl to be ready...');
      return;
    }
    if (shopSceneImageUrl && processedSceneImageUrl === undefined) {
      console.log('[ShopGame] Waiting for processedSceneImageUrl to be ready...');
      return;
    }

    // On mobile, skip recreation if container size hasn't meaningfully changed
    // This prevents the refresh loop caused by mobile browser chrome showing/hiding
    const rect = gameContainerRef.current.getBoundingClientRect();
    const newW = Math.round(rect.width);
    const newH = Math.round(rect.height);
    if (gameRef.current && lastContainerSize.current.w > 0) {
      const dw = Math.abs(newW - lastContainerSize.current.w);
      const dh = Math.abs(newH - lastContainerSize.current.h);
      // If the size change is small (< 60px), don't recreate – Phaser RESIZE handles it
      if (dw < 60 && dh < 60) {
        return;
      }
    }
    lastContainerSize.current = { w: newW, h: newH };

    // If game already exists and image URL changed, destroy and recreate
    if (gameRef.current) {
      console.log('[ShopGame] Destroying existing game to reload with new image');
      gameRef.current.destroy(true);
      gameRef.current = null;
      setIsLoaded(false);
    }

    console.log('[ShopGame] Creating Phaser game with processedImageUrl:', processedImageUrl);

    const isLowPower =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));
    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: isLowPower ? Phaser.CANVAS : Phaser.AUTO, // Canvas is lighter than WebGL on low-end devices
      parent: gameContainerRef.current,
      backgroundColor: '#87CEEB',
      scene: ShopWorldScene,
      // @ts-ignore
      resolution: isLowPower ? 1 : Math.min(devicePixelRatio, 2),
      render: {
        antialias: !isLowPower,
        roundPixels: isLowPower,
        pixelArt: false,
        // @ts-ignore - Phaser supports this for WebGL
        powerPreference: 'low-power',
        batchSize: isLowPower ? 1024 : 4096,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
          // Reduce physics updates on mobile
          fps: isLowPower ? 30 : 60,
        }
      },
      // Cap FPS on mobile to reduce CPU usage
      fps: isLowPower ? {
        target: 24, // Lower from 30 to 24 for smoother battery experience
        forceSetTimeOut: true,
      } : {
        target: 60,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: gameContainerRef.current,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      input: {
        activePointers: isLowPower ? 1 : 3
      },
      // Disable audio context by default to save resources
      audio: {
        noAudio: true,
      },
    };

    gameRef.current = new Phaser.Game({
      ...gameConfig,
      scene: [],
    });

    const sceneData = {
      shopTheme,
      shopName,
      products,
      staff,
      decorations,
      onCustomerServed: (earnings: number, productId?: string) => callbackRefs.current.onCustomerServed?.(earnings, productId),
      onEnterShop: () => callbackRefs.current.onEnterShop?.(),
      config,
      onObjectClick: (category: string) => callbackRefs.current.onObjectClick?.(category),
      interactive,
      shopImageUrl: processedImageUrl,
      shopSceneImageUrl: processedSceneImageUrl,
      onShelfChange: (side: 'left' | 'right', shelfIndex: number) => callbackRefs.current.onShelfChange?.(side, shelfIndex),
      onCashierChange: (cashierIndex: number) => callbackRefs.current.onCashierChange?.(cashierIndex),
      onPlantAdd: (plantData: { x: number; y: number; plantIndex: number }) => callbackRefs.current.onPlantAdd?.(plantData),
      onPlantMove: (id: string, x: number, y: number) => callbackRefs.current.onPlantMove?.(id, x, y),
      savedShelfLeft,
      savedShelfRight,
      savedCashier,
      savedFloor,
      savedWall,
      savedPlants,
      customAssets,
      onRequestCustomAsset: (category: 'plant' | 'floor' | 'wall') => callbackRefs.current.onRequestCustomAsset?.(category),
      onViewModeChange: (mode: 'exterior' | 'interior') => callbackRefs.current.onViewModeChange?.(mode),
      onCustomizationOpen: (type: string, index: number) => callbackRefs.current.onCustomizationOpen?.(type, index),
      onOpenProductsBoard: () => callbackRefs.current.onOpenProductsBoard?.(),
      onOpenStaffBoard: () => callbackRefs.current.onOpenStaffBoard?.(),
      externalCommand,
      isShopLaunched,
      onInteriorStateChange: (state: { shelfLeft: number; shelfRight: number; cashier: number; floor: number; wall: number }) => callbackRefs.current.onInteriorStateChange?.(state),
      onTimeUpdate: (data: { hour: number; minute: number; isOpen: boolean; isNight: boolean }) => callbackRefs.current.onTimeUpdate?.(data),
      trafficMultiplier,
      onVisitorEnter: () => callbackRefs.current.onVisitorEnter?.(),
      activeInfluencers,
      activeAdSpaces,
      activeInnovations,
      onInnovationMove: (id: string, x: number, y: number) => callbackRefs.current.onInnovationMove?.(id, x, y),
      onToolbarVisibilityChange: (visible: boolean) => callbackRefs.current.onToolbarVisibilityChange?.(visible)
    };

    gameRef.current.events.once('ready', () => {
      gameRef.current?.scene.add('ShopWorldScene', ShopWorldScene, true, sceneData);
      setIsLoaded(true);
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [processedImageUrl, processedSceneImageUrl, customAssetsKey]); // Recreate game when image or custom assets change

  // Update scene callbacks without restarting (prevents refresh loop)
  useEffect(() => {
    if (!gameRef.current || !isLoaded) return;

    const scene = gameRef.current.scene.getScene('ShopWorldScene') as ShopWorldScene;
    if (scene && scene.scene.isActive()) {
      // Only restart if theme or name changes - not for callback changes
      // This prevents the refresh loop when entering/exiting shop
    }
  }, [shopTheme, shopName, isLoaded, config, interactive]); // Removed view, onViewModeChange, onCustomizationOpen to prevent refresh loop

  // Handle external commands (like EXIT_SHOP, DEBUG_NIGHT_ON, DEBUG_NIGHT_OFF from React UI)
  useEffect(() => {
    if (externalCommand && isLoaded && gameRef.current) {
      const scene = gameRef.current.scene.getScene('ShopWorldScene') as ShopWorldScene;
      if (scene) {
        if (externalCommand === 'EXIT_SHOP') {
          scene.exitShop();
        } else if (externalCommand === 'DEBUG_NIGHT_ON') {
          scene.setDebugNightMode(true);
        } else if (externalCommand === 'DEBUG_NIGHT_OFF') {
          scene.setDebugNightMode(false);
        } else if (externalCommand === 'OPEN_PLANT_BAR') {
          scene.showItemSelectionBar('plant');
        } else if (externalCommand === 'OPEN_FLOOR_BAR') {
          scene.showItemSelectionBar('floor');
        } else if (externalCommand === 'OPEN_WALL_BAR') {
          scene.showItemSelectionBar('wall');
        }
      }
    }
  }, [externalCommand, isLoaded]);

  // Update product/staff boards without restarting the scene
  useEffect(() => {
    if (!gameRef.current || !isLoaded) return;
    const scene = gameRef.current.scene.getScene('ShopWorldScene') as ShopWorldScene;
    if (scene && typeof scene.updateDynamicData === 'function') {
      scene.updateDynamicData(products, staff);
    }
  }, [products, staff, isLoaded]);

  // Update marketing visuals without restarting the scene
  useEffect(() => {
    if (!gameRef.current || !isLoaded) return;
    const scene = gameRef.current.scene.getScene('ShopWorldScene') as ShopWorldScene;
    if (scene && typeof scene.updateMarketingData === 'function') {
      scene.updateMarketingData(activeInfluencers, activeAdSpaces);
    }
  }, [activeInfluencers, activeAdSpaces, isLoaded]);

  // Update innovations without restarting the scene
  useEffect(() => {
    if (!gameRef.current || !isLoaded) return;
    const scene = gameRef.current.scene.getScene('ShopWorldScene') as ShopWorldScene;
    if (scene && typeof scene.updateInnovationsData === 'function') {
      scene.updateInnovationsData(activeInnovations);
    }
  }, [activeInnovations, isLoaded]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
      <div
        ref={gameContainerRef}
        className="w-full h-full absolute inset-0"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-xl font-bold">Loading Your World...</p>
            <p className="text-white/80 text-sm mt-2">Preparing your shop exterior</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ShopGame);
