import {
  Search, Sparkles, Brain, Zap, Heart, User, Eye, Shield,
  Users, MessageCircle, Monitor, CheckCircle, ShieldCheck
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DISCOVERY_ICONS: Record<string, LucideIcon> = {
  CURIOSITY: Search,
  CREATIVITY: Sparkles,
  LOGIC: Brain,
  DRIVE: Zap,
  EMPATHY: Heart,
  IDENTITY: User,
  REFLECTION: Eye,
  CONFIDENCE: Shield,
  COLLABORATION: Users,
  COMMUNICATION: MessageCircle,
  DIGITALITY: Monitor,
  RESPONSIBILITY: CheckCircle,
  RESILIENCE: ShieldCheck,
};

export interface DiscoveryInfo {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  position: number;
}

export const DISCOVERY_ORDER = [
  'CURIOSITY',
  'CREATIVITY',
  'LOGIC',
  'DRIVE',
  'EMPATHY',
  'IDENTITY',
  'REFLECTION',
  'CONFIDENCE',
  'COLLABORATION',
  'COMMUNICATION',
  'DIGITALITY',
  'RESPONSIBILITY',
  'RESILIENCE'
];

export function getDiscoveryIcon(key: string): LucideIcon {
  return DISCOVERY_ICONS[key] || Search;
}

export function getDiscoveryPosition(key: string): number {
  const index = DISCOVERY_ORDER.indexOf(key);
  return index >= 0 ? index + 1 : 99;
}
