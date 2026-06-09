/**
 * Shop Name Generator
 * Generates personalized shop name suggestions based on student's name and passion
 */

type PassionCategory = 'ice_cream' | 'pets' | 'games' | 'bakery' | 'cars' | 'drinks' | 'art' | 'nature';

interface ShopNameSuggestion {
  name: string;
  emoji: string;
}

const passionThemes: Record<PassionCategory, string[]> = {
  ice_cream: [
    'Sweet Shop',
    'Ice Cream Palace',
    'Frozen Treats',
    'Scoop Station',
    'Cool Creations',
  ],
  pets: [
    'Pet Paradise',
    'Animal Haven',
    'Paw Palace',
    'Furry Friends',
    'Pet Kingdom',
  ],
  games: [
    'Game Hub',
    'Gaming Zone',
    'Play Palace',
    'Game Central',
    'Victory Arena',
  ],
  bakery: [
    'Sweet Bakery',
    'Cake Corner',
    'Baking Studio',
    'Treat Factory',
    'Pastry Palace',
  ],
  cars: [
    'Auto Shop',
    'Speed Garage',
    'Motor Works',
    'Race HQ',
    'Car Kingdom',
  ],
  drinks: [
    'Drink Station',
    'Beverage Bar',
    'Juice Junction',
    'Sip Shop',
    'Thirst Quenchers',
  ],
  art: [
    'Art Studio',
    'Creative Corner',
    'Paint Palace',
    'Masterpiece Maker',
    'Art Gallery',
  ],
  nature: [
    'Nature Nook',
    'Garden Grove',
    'Eco Station',
    'Green Haven',
    'Earth Shop',
  ],
};

const passionEmojis: Record<PassionCategory, string> = {
  ice_cream: '🍦',
  pets: '🐾',
  games: '🎮',
  bakery: '🧁',
  cars: '🚗',
  drinks: '🥤',
  art: '🎨',
  nature: '🌿',
};

/**
 * Generate personalized shop name suggestions
 * @param studentName - The student's first name
 * @param passion - The selected passion category
 * @param count - Number of suggestions to generate (default: 5)
 * @returns Array of shop name suggestions with emojis
 */
export function generateShopNames(
  studentName: string,
  passion: PassionCategory,
  count: number = 5
): ShopNameSuggestion[] {
  const firstName = studentName.split(' ')[0].trim();
  const themes = passionThemes[passion];
  const emoji = passionEmojis[passion];

  const suggestions: ShopNameSuggestion[] = [];

  // Generate personalized suggestions
  for (let i = 0; i < Math.min(count, themes.length); i++) {
    suggestions.push({
      name: `${firstName}'s ${themes[i]}`,
      emoji: emoji,
    });
  }

  return suggestions;
}

/**
 * Get the emoji for a passion category
 */
export function getPassionEmoji(passion: PassionCategory): string {
  return passionEmojis[passion];
}

/**
 * Format shop name for display with emoji
 */
export function formatShopName(shopName: string, passion?: PassionCategory): string {
  if (passion) {
    return `${passionEmojis[passion]} ${shopName}`;
  }
  return shopName;
}

/**
 * Validate shop name (basic validation)
 */
export function validateShopName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Shop name cannot be empty' };
  }

  if (name.trim().length < 3) {
    return { valid: false, error: 'Shop name must be at least 3 characters' };
  }

  if (name.trim().length > 50) {
    return { valid: false, error: 'Shop name must be less than 50 characters' };
  }

  return { valid: true };
}
