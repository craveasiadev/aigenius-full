export type ChapterCode =
  | 'CH_AMBITION_01'
  | 'CH_INNOVATION_01'
  | 'CH_WORLD_01'
  | 'CH_ECO_01'
  | 'CH_SPACE_01'
  | 'CH_FRIENDSHIP_01'
  | 'CH_DIGITAL_01'
  | 'CH_CREATIVITY_01'
  | 'CH_LEADERSHIP_01'
  | 'CH_SCIENCE_01'
  | 'CH_HISTORY_01'
  | 'CH_LEGACY_01';

export interface Chapter {
  id: string;
  chapter_code: ChapterCode;
  title: string;
  theme_key: string;
  primary_discovery_key: string | null;
  age_min: number | null;
  age_max: number | null;
  ch_orderno: number;
  is_active: boolean;
  version: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const CHAPTER_CODE_PATTERN = /^CH_[A-Z]+_[0-9]{2}$/;

export function isValidChapterCode(code: string): code is ChapterCode {
  return CHAPTER_CODE_PATTERN.test(code);
}

export function extractThemeFromCode(code: ChapterCode): string {
  const match = code.match(/^CH_([A-Z]+)_[0-9]{2}$/);
  return match ? match[1] : '';
}

export function getChapterNumberFromCode(code: ChapterCode): string {
  const match = code.match(/^CH_[A-Z]+_([0-9]{2})$/);
  return match ? match[1] : '00';
}

export function sortChaptersByOrder(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.ch_orderno - b.ch_orderno);
}

export const DISCOVERY_TO_CHAPTER_MAP: Record<string, ChapterCode[]> = {
  CONFIDENCE: ['CH_AMBITION_01', 'CH_LEADERSHIP_01'],
  CREATIVITY: ['CH_INNOVATION_01', 'CH_CREATIVITY_01'],
  CURIOSITY: ['CH_WORLD_01', 'CH_SPACE_01', 'CH_HISTORY_01'],
  RESPONSIBILITY: ['CH_ECO_01'],
  EMPATHY: ['CH_FRIENDSHIP_01'],
  DIGITALITY: ['CH_DIGITAL_01'],
  LOGIC: ['CH_SCIENCE_01'],
  REFLECTION: ['CH_LEGACY_01'],
};

export function getChaptersByDiscovery(discoveryKey: string): ChapterCode[] {
  return DISCOVERY_TO_CHAPTER_MAP[discoveryKey] || [];
}

export function getDiscoveryByChapter(chapterCode: ChapterCode): string | null {
  for (const [discovery, chapters] of Object.entries(DISCOVERY_TO_CHAPTER_MAP)) {
    if (chapters.includes(chapterCode)) {
      return discovery;
    }
  }
  return null;
}

export const LEGACY_CHAPTER_MAPPING: Record<string, ChapterCode> = {
  'Ch1': 'CH_AMBITION_01',
  'Ch2': 'CH_INNOVATION_01',
  'Ch3': 'CH_WORLD_01',
  'Ch4': 'CH_ECO_01',
  'Ch5': 'CH_SPACE_01',
  'Ch6': 'CH_FRIENDSHIP_01',
  'Ch7': 'CH_DIGITAL_01',
  'Ch8': 'CH_CREATIVITY_01',
  'Ch9': 'CH_LEADERSHIP_01',
  'Ch10': 'CH_SCIENCE_01',
  'Ch11': 'CH_HISTORY_01',
  'Ch12': 'CH_LEGACY_01',
};

export function convertLegacyChapterCode(legacyCode: string): ChapterCode | null {
  return LEGACY_CHAPTER_MAPPING[legacyCode] || null;
}
