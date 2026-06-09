export interface Student {
  name: string;
  level: number;
  coins: number;
  streakDays: number;
  badges: string[];
}

export interface Chapter {
  title: string;
  pagesTotal: number;
  pagesDone: number;
  todayMission: string;
}

export interface GeneratedChapter {
  title: string;
  pagesTotal: number;
  pagesDone: number;
  pages: PageStatus[];
}

export interface PageStatus {
  pageNumber: number;
  status: 'locked' | 'unlocked' | 'done';
}

export interface StoreItem {
  name: string;
  priceCoins: number;
}

export interface AppData {
  student: Student;
  currentChapter: Chapter | null;
  chapters: string[];
  store: StoreItem[];
  generatedChapter?: GeneratedChapter;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}
