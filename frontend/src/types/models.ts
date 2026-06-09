import type { ChapterID } from '../utils/chapterUtils';

export type Role = 'student' | 'teacher' | 'parent' | 'master';

export type ChapterTag =
  | 'Ambition'
  | 'Innovation'
  | 'Exploration'
  | 'Green'
  | 'Space'
  | 'Heart'
  | 'Digital'
  | 'Creative'
  | 'Hero'
  | 'Lab'
  | 'Time'
  | 'Legacy';

export interface User {
  id: string;
  role: Role;
  email: string;
  passwordHash?: string;
  name: string;
  geniusId?: string;
  avatarUrl?: string;
  teacherId?: string;
  parentIds?: string[];
  createdAt: string;
}

export interface Chapter {
  id: ChapterID;
  code: string;
  number: number;
  title: string;
  tag: ChapterTag;
  description: string;
  coverTemplates: string[];
  icon: string;
  theme: string;
  focus: string[];
  activity: string;
  output: string;
  rewardBadge: string;
}

export interface GeneratedChapter {
  id: string;
  chapterId: ChapterID;
  studentId: string;
  title: string;
  subject: string;
  level: number;
  cover: {
    title: string;
    emoji: string;
    gradient: string[];
  };
  pages: PageItem[];
  currentPageIndex: number;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
}

export interface PageItem {
  pageNumber: number;
  index: number;
  title: string;
  text: string;
  activityPrompt?: string;
  artworkUrl?: string;
  interactiveQuestion?: InteractiveQuestion;
  status: 'locked' | 'unlocked' | 'done';
}

export interface InteractiveQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation?: string;
}

export interface Quiz {
  items: QuizItem[];
  passingScore: number;
}

export interface QuizItem {
  id: string;
  question: string;
  type: 'abcd-text' | 'abcd-image-grid';
  options: {
    label: 'A' | 'B' | 'C' | 'D';
    text?: string;
    spriteCell?: [number, number];
  }[];
  answer: 'A' | 'B' | 'C' | 'D';
  spriteImageUrl?: string;
}

export interface Rewards {
  studentId: string;
  coins: number;
  xp: number;
  streakDays: number;
  badges: string[];
  lastCheckIn?: string;
  level: number;
}

export interface StoreItem {
  id: string;
  name: string;
  type: 'ticket' | 'voucher' | 'merch';
  priceCoins: number;
  stock?: number;
  image?: string;
  description?: string;
}

export interface Redemption {
  id: string;
  studentId: string;
  itemId: string;
  code: string;
  status: 'reserved' | 'used';
  createdAt: string;
}

export interface CommissionTier {
  min: number;
  max: number | null;
  percent: number;
}

export interface CommissionSettings {
  tiers: CommissionTier[];
}

export interface TeacherEarnings {
  teacherId: string;
  month: string;
  studentCount: number;
  percent: number;
  totalFees: number;
  payout: number;
}

export interface TeacherInvite {
  id: string;
  teacherId: string;
  code: string;
  conversions: number;
  createdAt: string;
}
