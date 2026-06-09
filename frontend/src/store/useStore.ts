import { create } from 'zustand';
import type {
  User,
  Chapter,
  GeneratedChapter,
  Rewards,
  StoreItem,
  Redemption,
  CommissionSettings,
  TeacherInvite,
  TeacherEarnings,
} from '../types/models';

interface AppState {
  currentUser: User | null;
  users: User[];
  chapters: Chapter[];
  generatedChapters: GeneratedChapter[];
  rewards: Record<string, Rewards>;
  storeItems: StoreItem[];
  redemptions: Redemption[];
  commissionSettings: CommissionSettings;
  teacherInvites: TeacherInvite[];
  teacherEarnings: TeacherEarnings[];
  showFilename: boolean;
  showVariable: boolean;
  showMonitor: boolean;

  setCurrentUser: (user: User | null) => void;
  setShowFilename: (show: boolean) => void;
  setShowVariable: (show: boolean) => void;
  setShowMonitor: (show: boolean) => void;
  login: (email: string, password: string) => User | null;
  register: (user: Omit<User, 'id' | 'createdAt'>) => User;
  logout: () => void;

  addGeneratedChapter: (chapter: GeneratedChapter) => void;
  updateGeneratedChapter: (id: string, updates: Partial<GeneratedChapter>) => void;
  getStudentChapters: (studentId: string) => GeneratedChapter[];
  getCurrentChapter: (studentId: string) => GeneratedChapter | null;

  updateRewards: (studentId: string, updates: Partial<Rewards>) => void;
  getRewards: (studentId: string) => Rewards;
  addCoins: (studentId: string, amount: number) => void;
  addXP: (studentId: string, amount: number) => void;
  addBadge: (studentId: string, badge: string) => void;
  updateStreak: (studentId: string) => void;

  redeemItem: (studentId: string, itemId: string) => Redemption | null;
  getRedemptions: (studentId: string) => Redemption[];

  createInvite: (teacherId: string) => TeacherInvite;
  getTeacherInvites: (teacherId: string) => TeacherInvite[];
  useInvite: (code: string) => string | null;

  updateCommissionSettings: (settings: CommissionSettings) => void;
  calculateTeacherEarnings: (teacherId: string, month: string) => TeacherEarnings;

  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getTeacherStudents: (teacherId: string) => User[];
  getParentChildren: (parentId: string) => User[];

  setChapters: (chapters: Chapter[]) => void;
  setStoreItems: (items: StoreItem[]) => void;
  initializeRewards: (studentId: string, rewards: Rewards) => void;
}

const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  tiers: [
    { min: 0, max: 10, percent: 12 },
    { min: 11, max: 50, percent: 15 },
    { min: 51, max: 100, percent: 18 },
    { min: 101, max: null, percent: 21 },
  ],
};

export const useStore = create<AppState>()((set, get) => ({
      currentUser: null,
      users: [],
      chapters: [],
      generatedChapters: [],
      rewards: {},
      storeItems: [],
      redemptions: [],
      commissionSettings: DEFAULT_COMMISSION_SETTINGS,
      teacherInvites: [],
      teacherEarnings: [],
      showFilename: true,
      showVariable: false,
      showMonitor: true,

      setCurrentUser: (user) => set({ currentUser: user }),
      setShowFilename: (show) => set({ showFilename: show }),
      setShowVariable: (show) => set({ showVariable: show }),
      setShowMonitor: (show) => set({ showMonitor: show }),

      login: (email, password) => {
        const user = get().users.find(
          (u) => u.email === email && u.passwordHash === password
        );
        if (user) {
          set({ currentUser: user });
          return user;
        }
        return null;
      },

      register: (userData) => {
        const newUser: User = {
          ...userData,
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, newUser] }));
        return newUser;
      },

      logout: () => {
        console.log('[useStore] Logout - clearing currentUser and related data');
        localStorage.removeItem('currentUser');
        set({
          currentUser: null,
          generatedChapters: [], // Clear chapters on logout
          rewards: {}, // Clear rewards on logout
        });
        console.log('[useStore] Logout complete');
      },

      addGeneratedChapter: (chapter) =>
        set((state) => {
          // Check if chapter already exists
          const existingIndex = state.generatedChapters.findIndex(ch => ch.id === chapter.id);

          if (existingIndex !== -1) {
            // Update existing chapter with new data (especially progress)
            const updatedChapters = [...state.generatedChapters];
            updatedChapters[existingIndex] = chapter;
            return { generatedChapters: updatedChapters };
          }

          // Add new chapter
          return {
            generatedChapters: [...state.generatedChapters, chapter],
          };
        }),

      updateGeneratedChapter: (id, updates) =>
        set((state) => ({
          generatedChapters: state.generatedChapters.map((ch) =>
            ch.id === id ? { ...ch, ...updates } : ch
          ),
        })),

      getStudentChapters: (studentId) =>
        get().generatedChapters.filter((ch) => ch.studentId === studentId),

      getCurrentChapter: (studentId) => {
        const chapters = get().getStudentChapters(studentId);
        return chapters.find((ch) => ch.status === 'in_progress') || chapters[chapters.length - 1] || null;
      },

      updateRewards: (studentId, updates) =>
        set((state) => ({
          rewards: {
            ...state.rewards,
            [studentId]: { ...state.rewards[studentId], ...updates },
          },
        })),

      getRewards: (studentId) => {
        const rewards = get().rewards[studentId];
        if (!rewards) {
          const defaultRewards: Rewards = {
            studentId,
            coins: 0,
            xp: 0,
            streakDays: 0,
            badges: [],
            level: 1,
          };
          set((state) => ({
            rewards: { ...state.rewards, [studentId]: defaultRewards },
          }));
          return defaultRewards;
        }
        return rewards;
      },

      addCoins: (studentId, amount) => {
        const rewards = get().getRewards(studentId);
        get().updateRewards(studentId, { coins: rewards.coins + amount });
      },

      addXP: (studentId, amount) => {
        const rewards = get().getRewards(studentId);
        const newXP = rewards.xp + amount;
        let newLevel = 1;
        if (newXP >= 900) newLevel = 5;
        else if (newXP >= 500) newLevel = 4;
        else if (newXP >= 250) newLevel = 3;
        else if (newXP >= 100) newLevel = 2;

        get().updateRewards(studentId, { xp: newXP, level: newLevel });
      },

      addBadge: (studentId, badge) => {
        const rewards = get().getRewards(studentId);
        if (!rewards.badges.includes(badge)) {
          get().updateRewards(studentId, {
            badges: [...rewards.badges, badge],
          });
        }
      },

      updateStreak: (studentId) => {
        const rewards = get().getRewards(studentId);
        const today = new Date().toDateString();
        const lastCheckIn = rewards.lastCheckIn
          ? new Date(rewards.lastCheckIn).toDateString()
          : null;

        if (lastCheckIn === today) return;

        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = lastCheckIn === yesterday ? rewards.streakDays + 1 : 1;

        get().updateRewards(studentId, {
          streakDays: newStreak,
          lastCheckIn: new Date().toISOString(),
        });

        get().addXP(studentId, 2);
      },

      redeemItem: (studentId, itemId) => {
        const rewards = get().getRewards(studentId);
        const item = get().storeItems.find((i) => i.id === itemId);

        if (!item || rewards.coins < item.priceCoins) return null;

        const redemption: Redemption = {
          id: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          studentId,
          itemId,
          code: Math.random().toString(36).substr(2, 8).toUpperCase(),
          status: 'reserved',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          redemptions: [...state.redemptions, redemption],
        }));

        get().addCoins(studentId, -item.priceCoins);

        return redemption;
      },

      getRedemptions: (studentId) =>
        get().redemptions.filter((r) => r.studentId === studentId),

      createInvite: (teacherId) => {
        const invite: TeacherInvite = {
          id: `invite_${Date.now()}`,
          teacherId,
          code: Math.random().toString(36).substr(2, 8).toUpperCase(),
          conversions: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          teacherInvites: [...state.teacherInvites, invite],
        }));
        return invite;
      },

      getTeacherInvites: (teacherId) =>
        get().teacherInvites.filter((i) => i.teacherId === teacherId),

      useInvite: (code) => {
        const invite = get().teacherInvites.find((i) => i.code === code);
        if (!invite) return null;

        set((state) => ({
          teacherInvites: state.teacherInvites.map((i) =>
            i.code === code ? { ...i, conversions: i.conversions + 1 } : i
          ),
        }));

        return invite.teacherId;
      },

      updateCommissionSettings: (settings) =>
        set({ commissionSettings: settings }),

      calculateTeacherEarnings: (teacherId, month) => {
        const students = get().getTeacherStudents(teacherId).length;
        const tiers = get().commissionSettings.tiers;
        const tier = tiers.find(
          (t) => students >= t.min && (t.max === null || students <= t.max)
        );
        const percent = tier?.percent || 12;
        const totalFees = students * 29;
        const payout = (totalFees * percent) / 100;

        const earnings: TeacherEarnings = {
          teacherId,
          month,
          studentCount: students,
          percent,
          totalFees,
          payout,
        };

        return earnings;
      },

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),

      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
          currentUser:
            state.currentUser?.id === id
              ? { ...state.currentUser, ...updates }
              : state.currentUser,
        })),

      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        })),

      getTeacherStudents: (teacherId) =>
        get().users.filter((u) => u.role === 'student' && u.teacherId === teacherId),

      getParentChildren: (parentId) =>
        get().users.filter(
          (u) => u.role === 'student' && u.parentIds?.includes(parentId)
        ),

      setChapters: (chapters) => set({ chapters }),

      setStoreItems: (items) => set({ storeItems: items }),

      initializeRewards: (studentId, rewards) =>
        set((state) => ({
          rewards: { ...state.rewards, [studentId]: rewards },
        })),
    }));
