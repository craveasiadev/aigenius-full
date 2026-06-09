import type { AppData, GeneratedChapter } from '../types';

const STORAGE_KEY = 'ai-genius-data';
const AUTH_KEY = 'ai-genius-auth';

export const DEFAULT_DATA: AppData = {
  student: {
    name: 'Fitri',
    level: 2,
    coins: 120,
    streakDays: 3,
    badges: ['Dream Achiever', 'Quiz Whiz', 'Streak 3'],
  },
  currentChapter: {
    title: 'Ambition',
    pagesTotal: 10,
    pagesDone: 3,
    todayMission: 'Draw your dream job.',
  },
  chapters: ['Ambition', 'Innovation', 'Exploration', 'Green', 'Space'],
  store: [
    { name: 'Wonderpark Ticket (Child)', priceCoins: 800 },
    { name: 'Merch Pack', priceCoins: 450 },
  ],
};

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
  return DEFAULT_DATA;
};

export const saveData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
};

export const updateCoins = (amount: number): void => {
  const data = loadData();
  data.student.coins += amount;
  saveData(data);
};

export const updateProgress = (): void => {
  const data = loadData();
  if (data.currentChapter) {
    data.currentChapter.pagesDone = Math.min(
      data.currentChapter.pagesDone + 1,
      data.currentChapter.pagesTotal
    );
  }
  saveData(data);
};

export const generateChapter = (title: string): GeneratedChapter => {
  const pages = Array.from({ length: 10 }, (_, i) => ({
    pageNumber: i + 1,
    status: i === 0 ? ('unlocked' as const) : ('locked' as const),
  }));

  return {
    title,
    pagesTotal: 10,
    pagesDone: 0,
    pages,
  };
};

export const saveGeneratedChapter = (chapter: GeneratedChapter): void => {
  const data = loadData();
  data.generatedChapter = chapter;
  saveData(data);
};

export const setAuth = (isAuthenticated: boolean, role?: string, name?: string): void => {
  if (isAuthenticated && role && name) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ role, name }));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
};

export const getAuth = (): { role: string; name: string } | null => {
  try {
    const auth = localStorage.getItem(AUTH_KEY);
    return auth ? JSON.parse(auth) : null;
  } catch {
    return null;
  }
};

export const generateVoucherCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `WP-${code.substring(0, 4)}-${code.substring(4)}`;
};
