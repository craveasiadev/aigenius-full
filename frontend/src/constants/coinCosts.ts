export type CoinOperationType =
  | 'product_image'
  | 'product_regenerate'
  | 'interior_item'
  | 'marketing_asset'
  | 'marketing_content'
  | 'shop_exterior'
  | 'ai_chat';

// Coin-only economy (choice 1A)
export const COIN_COSTS: Record<CoinOperationType, number> = {
  product_image: 35,
  product_regenerate: 45,
  interior_item: 35,
  marketing_asset: 35,
  marketing_content: 5,
  shop_exterior: 70,
  ai_chat: 10,
};
