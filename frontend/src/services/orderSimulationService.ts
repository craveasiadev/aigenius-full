/**
 * Order Simulation Service
 *
 * Simulates orders for student shops using Laravel API.
 * Orders are generated server-side for better reliability.
 */

import { api } from '../lib/api';

interface CustomerPersona {
  name: string;
  age: number;
  buyingPower: 'low' | 'medium' | 'high';
  interests: string[];
}

const customerPersonas: CustomerPersona[] = [
  { name: 'Emma', age: 8, buyingPower: 'low', interests: ['toys', 'games', 'candy'] },
  { name: 'Liam', age: 10, buyingPower: 'medium', interests: ['sports', 'tech', 'books'] },
  { name: 'Sophia', age: 12, buyingPower: 'medium', interests: ['art', 'music', 'fashion'] },
  { name: 'Noah', age: 9, buyingPower: 'low', interests: ['animals', 'nature', 'science'] },
  { name: 'Olivia', age: 11, buyingPower: 'high', interests: ['books', 'crafts', 'tech'] },
  { name: 'Ava', age: 7, buyingPower: 'low', interests: ['dolls', 'drawing', 'candy'] },
  { name: 'Ethan', age: 13, buyingPower: 'high', interests: ['gaming', 'sports', 'tech'] },
  { name: 'Isabella', age: 10, buyingPower: 'medium', interests: ['dance', 'fashion', 'art'] },
  { name: 'Mason', age: 8, buyingPower: 'low', interests: ['lego', 'robots', 'cars'] },
  { name: 'Mia', age: 12, buyingPower: 'high', interests: ['photography', 'travel', 'books'] }
];

const positiveReviews = [
  'Amazing quality! Totally worth it!',
  'My kid absolutely loves it!',
  'Great value for money!',
  'Super fast delivery, thank you!',
  'Better than expected!',
  'Will definitely buy again!',
  'Perfect gift for my child!',
  'Exceeded my expectations!',
  'Great shop, friendly service!',
  'Highly recommend this!'
];

const neutralReviews = [
  'Pretty good overall.',
  "It's okay, does the job.",
  'As expected.',
  'Nothing special but decent.',
  'Fair price.',
  'Acceptable quality.',
  'It works fine.',
  'Standard product.',
  'Met expectations.',
  'Good enough.'
];

interface OrderSimulationResult {
  success: boolean;
  order?: {
    customer_name: string;
    product_name: string;
    quantity: number;
    order_total: number;
    satisfaction: number;
    review: string;
  };
  message?: string;
}

export class OrderSimulationService {
  /**
   * Request the server to generate an order for the current student
   * This is a client-side simulation helper that creates mock data
   * The actual order creation should be handled server-side
   */
  static async generateOrderLocally(): Promise<OrderSimulationResult> {
    try {
      // Get business data
      const businessResponse = await api.get<{ success: boolean; business: unknown }>('/aipreneur/business');
      if (!businessResponse.success) {
        return { success: false, message: 'Shop not found' };
      }

      // Get products
      const productsResponse = await api.get<{ success: boolean; products: Array<{ id: string; product_name: string; price: number }> }>('/aipreneur/products');
      if (!productsResponse.success || !productsResponse.products.length) {
        return { success: false, message: 'No products found' };
      }

      // Select random customer
      const customer = customerPersonas[Math.floor(Math.random() * customerPersonas.length)];

      // Filter products by customer buying power
      const affordableProducts = productsResponse.products.filter(p => {
        if (customer.buyingPower === 'low') return p.price <= 8;
        if (customer.buyingPower === 'medium') return p.price <= 12;
        return true;
      });

      if (affordableProducts.length === 0) {
        return { success: false, message: 'No affordable products for customer' };
      }

      const selectedProduct = affordableProducts[Math.floor(Math.random() * affordableProducts.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const orderTotal = selectedProduct.price * quantity;
      const satisfaction = Math.floor(Math.random() * 30) + 70; // 70-100

      const review = satisfaction >= 75
        ? positiveReviews[Math.floor(Math.random() * positiveReviews.length)]
        : neutralReviews[Math.floor(Math.random() * neutralReviews.length)];

      // In a real implementation, this would call a server endpoint
      // For now, we return the simulated data
      return {
        success: true,
        order: {
          customer_name: customer.name,
          product_name: selectedProduct.product_name,
          quantity,
          order_total: orderTotal,
          satisfaction,
          review
        }
      };
    } catch (error) {
      console.error('Error in order simulation:', error);
      return { success: false, message: 'Simulation error' };
    }
  }

  /**
   * Generate test orders for development
   */
  static async generateTestOrders(count: number = 5): Promise<OrderSimulationResult[]> {
    const results: OrderSimulationResult[] = [];
    for (let i = 0; i < count; i++) {
      const result = await this.generateOrderLocally();
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results;
  }

  /**
   * Get random customer for display purposes
   */
  static getRandomCustomer(): CustomerPersona {
    return customerPersonas[Math.floor(Math.random() * customerPersonas.length)];
  }

  /**
   * Get random review for display purposes
   */
  static getRandomReview(isPositive: boolean = true): string {
    const reviews = isPositive ? positiveReviews : neutralReviews;
    return reviews[Math.floor(Math.random() * reviews.length)];
  }
}

export default OrderSimulationService;
