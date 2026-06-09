/**
 * Persona Evolution Service
 *
 * Tracks and analyzes student decisions to build their entrepreneurial persona.
 * Now uses Laravel API instead of direct Supabase access.
 */



export interface InsightData {
  insightId: string;
  insightName: string;
  description: string;
  discoveredFrom: string;
  relatedDecisions: string[];
  confidenceScore: number;
}

export interface MilestoneAnalysis {
  insights: InsightData[];
  entrepreneurialStyle?: string;
  leadershipTraits: string[];
  innovationAffinity?: string;
  socialValues: string[];
}

const INSIGHT_DEFINITIONS = {
  entrepreneurial_style: {
    name: 'Entrepreneurial Style',
    description: 'How you approach building and growing your business',
  },
  creative_expression: {
    name: 'Creative Expression',
    description: 'Your unique creative vision and aesthetic choices',
  },
  leadership_approach: {
    name: 'Leadership Approach',
    description: 'How you manage and motivate your team',
  },
  communication_style: {
    name: 'Communication Style',
    description: 'How you connect with customers and share your message',
  },
  innovation_mindset: {
    name: 'Innovation Mindset',
    description: 'Your approach to technology and new ideas',
  },
  social_responsibility: {
    name: 'Social Responsibility',
    description: 'Your commitment to making a positive impact',
  },
  risk_tolerance: {
    name: 'Risk Tolerance',
    description: 'How you handle uncertainty and business risks',
  },
  strategic_thinking: {
    name: 'Strategic Thinking',
    description: 'Your ability to plan and position your business',
  },
  resilience: {
    name: 'Resilience',
    description: 'How you bounce back from challenges',
  },
  work_ethic: {
    name: 'Work Ethic',
    description: 'Your dedication and consistency in building your business',
  },
};

/**
 * Log a decision made by the student (stored locally until API endpoint is available)
 */
export async function logDecision(
  _geniusProfileId: string,
  decisionType: string,
  decisionValue: string,
  context: Record<string, unknown> = {},
  moduleName?: string
): Promise<void> {
  try {
    // Store locally for now - will be synced when API endpoint is available
    const decisions = JSON.parse(localStorage.getItem('aipreneur_decisions') || '[]');
    decisions.push({
      decision_type: decisionType,
      decision_value: decisionValue,
      context,
      module_name: moduleName,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('aipreneur_decisions', JSON.stringify(decisions));
  } catch (error) {
    console.error('Error logging decision:', error);
  }
}

/**
 * Analyze first product creation milestone
 */
export async function analyzeFirstProduct(_geniusProfileId: string): Promise<MilestoneAnalysis> {
  const decisions = JSON.parse(localStorage.getItem('aipreneur_decisions') || '[]');

  const insights: InsightData[] = [];
  let entrepreneurialStyle = 'Balanced Value Creator';
  const relatedDecisions: string[] = [];

  const pricingDecision = decisions.find((d: { decision_type: string }) => d.decision_type === 'pricing');
  const positioningDecision = decisions.find((d: { decision_type: string }) => d.decision_type === 'positioning');

  if (pricingDecision) {
    relatedDecisions.push(`Chose ${pricingDecision.decision_value} pricing strategy`);

    if (pricingDecision.decision_value.toLowerCase().includes('premium')) {
      entrepreneurialStyle = 'Quality-Focused Premium Builder';
    } else if (pricingDecision.decision_value.toLowerCase().includes('volume')) {
      entrepreneurialStyle = 'Growth-Minded Scale Builder';
    }
  }

  if (positioningDecision) {
    relatedDecisions.push(`Positioned as ${positioningDecision.decision_value}`);
  }

  if (relatedDecisions.length > 0) {
    insights.push({
      insightId: 'entrepreneurial_style',
      insightName: INSIGHT_DEFINITIONS.entrepreneurial_style.name,
      description: INSIGHT_DEFINITIONS.entrepreneurial_style.description,
      discoveredFrom: 'First Product Creation',
      relatedDecisions,
      confidenceScore: 40,
    });
  }

  return {
    insights,
    entrepreneurialStyle,
    leadershipTraits: [],
    socialValues: [],
  };
}

/**
 * Analyze shop launch milestone
 */
export async function analyzeShopLaunch(_geniusProfileId: string): Promise<MilestoneAnalysis> {
  const decisions = JSON.parse(localStorage.getItem('aipreneur_decisions') || '[]');

  const insights: InsightData[] = [];
  const leadershipTraits: string[] = [];

  if (decisions.length > 0) {
    const allDecisions = decisions.map((d: { decision_type: string; decision_value: string }) =>
      `${d.decision_type}: ${d.decision_value}`
    );

    insights.push({
      insightId: 'strategic_thinking',
      insightName: INSIGHT_DEFINITIONS.strategic_thinking.name,
      description: INSIGHT_DEFINITIONS.strategic_thinking.description,
      discoveredFrom: 'Shop Launch',
      relatedDecisions: allDecisions.slice(0, 3),
      confidenceScore: 60,
    });

    const decorationDecisions = decisions.filter((d: { decision_type: string }) =>
      d.decision_type === 'decoration_theme'
    );
    if (decorationDecisions.length > 0) {
      insights.push({
        insightId: 'creative_expression',
        insightName: INSIGHT_DEFINITIONS.creative_expression.name,
        description: INSIGHT_DEFINITIONS.creative_expression.description,
        discoveredFrom: 'Shop Decoration',
        relatedDecisions: decorationDecisions.map((d: { decision_value: string }) =>
          `Chose ${d.decision_value} theme`
        ),
        confidenceScore: 60,
      });
    }
  }

  return {
    insights,
    entrepreneurialStyle: '',
    leadershipTraits,
    socialValues: [],
  };
}

/**
 * Analyze module completion
 */
export async function analyzeModuleCompletion(
  _geniusProfileId: string,
  moduleName: string
): Promise<MilestoneAnalysis> {
  const decisions = JSON.parse(localStorage.getItem('aipreneur_decisions') || '[]');
  const moduleDecisions = decisions.filter((d: { module_name?: string }) => d.module_name === moduleName);

  const insights: InsightData[] = [];
  const leadershipTraits: string[] = [];
  const socialValues: string[] = [];
  let innovationAffinity = '';

  if (moduleDecisions.length > 0) {
    if (moduleName === 'operations') {
      const staffDecisions = moduleDecisions.filter((d: { decision_type: string }) =>
        d.decision_type === 'staff_salary'
      );
      if (staffDecisions.length > 0) {
        const highWages = staffDecisions.some((d: { decision_value: string }) =>
          d.decision_value.toLowerCase().includes('high') ||
          d.decision_value.toLowerCase().includes('generous')
        );

        if (highWages) {
          leadershipTraits.push('People-First Leader', 'Empathetic Manager');
        }

        insights.push({
          insightId: 'leadership_approach',
          insightName: INSIGHT_DEFINITIONS.leadership_approach.name,
          description: INSIGHT_DEFINITIONS.leadership_approach.description,
          discoveredFrom: 'Operations Module',
          relatedDecisions: staffDecisions.map((d: { decision_value: string }) =>
            `${d.decision_value} salary approach`
          ),
          confidenceScore: 70,
        });
      }
    }

    if (moduleName === 'marketing') {
      insights.push({
        insightId: 'communication_style',
        insightName: INSIGHT_DEFINITIONS.communication_style.name,
        description: INSIGHT_DEFINITIONS.communication_style.description,
        discoveredFrom: 'Marketing Module',
        relatedDecisions: moduleDecisions.map((d: { decision_type: string; decision_value: string }) =>
          `${d.decision_type}: ${d.decision_value}`
        ),
        confidenceScore: 70,
      });
    }

    if (moduleName === 'innovation') {
      const innovationChoices = moduleDecisions.filter((d: { decision_type: string }) =>
        d.decision_type === 'innovation_choice'
      );
      if (innovationChoices.length > 0) {
        const ecoFocus = innovationChoices.some((d: { decision_value: string }) =>
          d.decision_value.toLowerCase().includes('eco') ||
          d.decision_value.toLowerCase().includes('sustain')
        );

        innovationAffinity = ecoFocus ? 'Eco-Innovation Pioneer' : 'Tech-Forward Innovator';

        insights.push({
          insightId: 'innovation_mindset',
          insightName: INSIGHT_DEFINITIONS.innovation_mindset.name,
          description: INSIGHT_DEFINITIONS.innovation_mindset.description,
          discoveredFrom: 'Innovation Module',
          relatedDecisions: innovationChoices.map((d: { decision_value: string }) => d.decision_value),
          confidenceScore: 70,
        });
      }
    }

    if (moduleName === 'csr') {
      const csrDecisions = moduleDecisions.filter((d: { decision_type: string }) =>
        d.decision_type === 'charity_selection' || d.decision_type === 'donation_amount'
      );

      if (csrDecisions.length > 0) {
        socialValues.push('Socially Conscious', 'Community Builder');

        insights.push({
          insightId: 'social_responsibility',
          insightName: INSIGHT_DEFINITIONS.social_responsibility.name,
          description: INSIGHT_DEFINITIONS.social_responsibility.description,
          discoveredFrom: 'CSR Module',
          relatedDecisions: csrDecisions.map((d: { decision_type: string; decision_value: string }) =>
            `${d.decision_type}: ${d.decision_value}`
          ),
          confidenceScore: 70,
        });
      }
    }
  }

  return {
    insights,
    leadershipTraits,
    innovationAffinity,
    socialValues,
  };
}

/**
 * Analyze weekly activity pattern
 */
export async function analyzeWeeklyPattern(_geniusProfileId: string): Promise<MilestoneAnalysis> {
  const decisions = JSON.parse(localStorage.getItem('aipreneur_decisions') || '[]');
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentDecisions = decisions.filter((d: { created_at: string }) =>
    new Date(d.created_at) >= oneWeekAgo
  );

  const insights: InsightData[] = [];

  if (recentDecisions.length >= 5) {
    insights.push({
      insightId: 'work_ethic',
      insightName: INSIGHT_DEFINITIONS.work_ethic.name,
      description: INSIGHT_DEFINITIONS.work_ethic.description,
      discoveredFrom: 'Consistent Activity Pattern',
      relatedDecisions: [`${recentDecisions.length} business decisions this week`],
      confidenceScore: 85,
    });
  }

  return {
    insights,
    leadershipTraits: [],
    socialValues: [],
  };
}

/**
 * Get all persona insights for display
 */
export async function getPersonaInsights(_geniusProfileId: string): Promise<{
  unlockedInsights: InsightData[];
  totalInsights: number;
  progressPercentage: number;
}> {
  // Local analysis (backend endpoint not available yet)
  const allInsights: InsightData[] = [];

  const productAnalysis = await analyzeFirstProduct(_geniusProfileId);
  allInsights.push(...productAnalysis.insights);

  const shopAnalysis = await analyzeShopLaunch(_geniusProfileId);
  allInsights.push(...shopAnalysis.insights);

  const uniqueInsights = allInsights.reduce((acc, insight) => {
    if (!acc.find(i => i.insightId === insight.insightId)) {
      acc.push(insight);
    }
    return acc;
  }, [] as InsightData[]);

  const totalInsights = Object.keys(INSIGHT_DEFINITIONS).length;
  const progressPercentage = Math.round((uniqueInsights.length / totalInsights) * 100);

  return {
    unlockedInsights: uniqueInsights,
    totalInsights,
    progressPercentage,
  };
}

/**
 * Get the entrepreneurial profile summary
 */
export async function getEntrepreneurialProfile(_geniusProfileId: string): Promise<{
  entrepreneurialStyle?: string;
  leadershipTraits: string[];
  innovationAffinity?: string;
  socialValues: string[];
  insightsUnlocked: string[];
}> {
  // Build from local data (backend endpoint not available yet)
  const productAnalysis = await analyzeFirstProduct(_geniusProfileId);

  return {
    entrepreneurialStyle: productAnalysis.entrepreneurialStyle,
    leadershipTraits: productAnalysis.leadershipTraits,
    socialValues: productAnalysis.socialValues,
    insightsUnlocked: productAnalysis.insights.map(i => i.insightId),
  };
}

export default {
  logDecision,
  analyzeFirstProduct,
  analyzeShopLaunch,
  analyzeModuleCompletion,
  analyzeWeeklyPattern,
  getPersonaInsights,
  getEntrepreneurialProfile,
};
