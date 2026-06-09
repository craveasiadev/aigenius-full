import { logDecision } from '../services/personaEvolutionService';

export type DecisionType =
  | 'pricing'
  | 'positioning'
  | 'product_type'
  | 'staff_salary'
  | 'marketing_channel'
  | 'innovation_choice'
  | 'charity_selection'
  | 'donation_amount'
  | 'decoration_theme'
  | 'business_hours'
  | 'customer_service'
  | 'quality_standard';

export interface DecisionContext {
  productId?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  staffCount?: number;
  marketingBudget?: number;
  [key: string]: any;
}

export class AIpreneurDecisionTracker {
  private geniusProfileId: string;
  private moduleName: string;

  constructor(geniusProfileId: string, moduleName: string) {
    this.geniusProfileId = geniusProfileId;
    this.moduleName = moduleName;
  }

  async track(
    decisionType: DecisionType,
    decisionValue: string,
    context: DecisionContext = {}
  ): Promise<void> {
    try {
      await logDecision(
        this.geniusProfileId,
        decisionType,
        decisionValue,
        context,
        this.moduleName
      );
    } catch (error) {
      console.error(`Error tracking ${decisionType} decision:`, error);
    }
  }

  async trackPricing(strategy: 'premium' | 'volume' | 'balanced', price: number, productName: string): Promise<void> {
    await this.track('pricing', strategy, { price, productName });
  }

  async trackPositioning(position: string, productName: string): Promise<void> {
    await this.track('positioning', position, { productName });
  }

  async trackStaffDecision(salaryLevel: 'high' | 'medium' | 'low', staffCount: number): Promise<void> {
    await this.track('staff_salary', salaryLevel, { staffCount });
  }

  async trackMarketingChannel(channel: string, budget: number): Promise<void> {
    await this.track('marketing_channel', channel, { marketingBudget: budget });
  }

  async trackInnovation(innovationType: string, adoptionReason: string): Promise<void> {
    await this.track('innovation_choice', innovationType, { reason: adoptionReason });
  }

  async trackCSR(charityName: string, donationAmount: number): Promise<void> {
    await this.track('charity_selection', charityName, { donationAmount });
  }

  async trackDecoration(theme: string, cost: number): Promise<void> {
    await this.track('decoration_theme', theme, { cost });
  }

  async trackProductCreation(productType: string, productName: string, price: number): Promise<void> {
    await this.track('product_type', productType, { productName, price });
  }
}

export function createDecisionTracker(geniusProfileId: string, moduleName: string): AIpreneurDecisionTracker {
  return new AIpreneurDecisionTracker(geniusProfileId, moduleName);
}
