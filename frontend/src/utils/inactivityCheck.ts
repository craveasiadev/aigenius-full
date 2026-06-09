/**
 * Client-side inactivity penalty calculator.
 * Checks days missed since last activity and applies consequences.
 */

export interface InactivityConsequence {
  type: 'staff_quit' | 'popularity_drop' | 'mood_drop';
  title: string;
  description: string;
  icon: string;
  amount?: number;
  staffName?: string;
}

export interface InactivityResult {
  daysMissed: number;
  consequences: InactivityConsequence[];
  businessUpdates: Record<string, any>;
}

export function checkInactivity(
  business: any,
  staff: any[],
  rewards: any
): InactivityResult | null {
  const lastActivity = rewards?.last_activity_date || rewards?.last_daily_claim_date || business?.updated_at;
  if (!lastActivity) return null;

  const lastDate = new Date(lastActivity);
  const now = new Date();
  const daysMissed = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Only apply penalties for 2+ days missed
  if (daysMissed < 2) return null;

  const consequences: InactivityConsequence[] = [];
  const businessUpdates: Record<string, any> = {};

  // Seeded random for deterministic consequences
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const rand = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Consequence 1: Popularity decrease (-3 per day missed, min 0)
  const currentPop = business?.popularity_level || 0;
  const popDecrease = Math.min(daysMissed * 3, currentPop);
  if (popDecrease > 0) {
    businessUpdates.popularity_level = Math.max(0, currentPop - popDecrease);
    consequences.push({
      type: 'popularity_drop',
      title: 'People Forgot Your Shop!',
      description: `Your shop lost ${popDecrease} popularity because nobody was around to welcome customers.`,
      icon: '📉',
      amount: popDecrease,
    });
  }

  // Consequence 2: Staff mood drop (all staff lose mood)
  if (staff && staff.length > 0) {
    const moodDrop = Math.min(daysMissed * 10, 100);
    const currentMood = business?.staff_overall_mood ?? 50;
    businessUpdates.staff_overall_mood = Math.max(0, currentMood - moodDrop);
    consequences.push({
      type: 'mood_drop',
      title: 'Your Team is Sad!',
      description: `Your staff missed you! Everyone's mood dropped because you weren't there to say hello.`,
      icon: '😢',
      amount: moodDrop,
    });
  }

  // Consequence 3: Staff warning (only if 5+ days missed and have staff)
  if (daysMissed >= 5 && staff && staff.length > 0) {
    const randomIndex = Math.floor(rand(seed + 42) * staff.length);
    const unhappyStaff = staff[randomIndex];
    if (unhappyStaff) {
      consequences.push({
        type: 'staff_quit',
        title: `${unhappyStaff.staff_name || 'A staff member'} wants to leave!`,
        description: `${unhappyStaff.staff_name || 'Your employee'} is very unhappy. Visit your shop and cheer them up before they quit!`,
        icon: '🚶',
        staffName: unhappyStaff.staff_name,
      });
    }
  }

  if (consequences.length === 0) return null;

  return { daysMissed, consequences, businessUpdates };
}
