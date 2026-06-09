/**
 * Shop Questionnaire — onboarding stage 3.
 *
 * Four steps that personalise the shop:
 *   1. Passion       — pick a category (ice cream, pets, games, …)
 *   2. Theme         — pick a vibe (colourful, modern, cozy, …)
 *   3. Shop name     — type or pick a suggestion
 *   4. Summary       — confirm + submit
 *
 * Backend compatibility is preserved (`color_palette` + `unique_selling_point`
 * are auto-derived from the chosen theme). The flow now uses the
 * AIpreneur design language: glass cards, 3D plastic-key buttons,
 * solid theme-aware colours, dotted-grid backdrop. No gradients, no
 * coloured glow shadows. Fully responsive + PWA-friendly.
 */
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Sparkles, Store, Check, Loader2,
} from 'lucide-react';
import {
  GLASS, BTN_3D_PRIMARY, FIELD,
} from '../../lib/uiTokens';

interface ShopQuestionnaireProps {
  studentName: string;
  onComplete: (answers: {
    passion_category: string;
    shop_theme: string;
    color_palette: string[];
    unique_selling_point: string;
    shop_name: string;
  }) => void;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────
// Question data
// ─────────────────────────────────────────────────────────────────────

// 7 modern shop types kids actually recognise. Ids match the keys used
// throughout the app (PRODUCT_POOLS, NAME_TEMPLATES, preset layouts in
// interiorLayout.ts). Adding a type? Wire it in all three places.
const PASSIONS = [
  { id: 'cafe',        emoji: '☕', label: 'Cafe' },
  { id: 'factory',     emoji: '🏭', label: 'Factory' },
  { id: 'themepark',   emoji: '🎢', label: 'Themepark' },
  { id: 'fashion',     emoji: '👗', label: 'Fashion Retail' },
  { id: 'gym',         emoji: '🏋️', label: 'Gym' },
  { id: 'restaurant',  emoji: '🍽️', label: 'Restaurant' },
  { id: 'supermarket', emoji: '🛒', label: 'Supermarket' },
];

const THEMES = [
  { id: 'colorful', emoji: '🌈', label: 'Colourful & fun', description: 'Rainbow colours, playful vibes' },
  { id: 'modern', emoji: '🚀', label: 'Cool & modern', description: 'Sleek, techy, futuristic' },
  { id: 'cozy', emoji: '🪵', label: 'Natural & cozy', description: 'Plants, wood, warm feels' },
  { id: 'fancy', emoji: '✨', label: 'Fancy & sparkly', description: 'Elegant, gold accents' },
  { id: 'cute', emoji: '🧸', label: 'Playful & cute', description: 'Soft, sweet, adorable' },
];

const THEME_DEFAULTS: Record<string, { color_palette: string[]; unique_selling_point: string }> = {
  colorful: { color_palette: ['red', 'yellow', 'blue'], unique_selling_point: 'happy' },
  modern: { color_palette: ['blue', 'teal', 'purple'], unique_selling_point: 'quality' },
  cozy: { color_palette: ['green', 'orange', 'teal'], unique_selling_point: 'eco' },
  fancy: { color_palette: ['purple', 'pink', 'yellow'], unique_selling_point: 'quality' },
  cute: { color_palette: ['pink', 'purple', 'teal'], unique_selling_point: 'creative' },
};

const COLOR_DISPLAY: Record<string, { hex: string; name: string }> = {
  red: { hex: '#FF6B6B', name: 'Red' },
  orange: { hex: '#FF8C00', name: 'Orange' },
  yellow: { hex: '#FFD93D', name: 'Yellow' },
  green: { hex: '#6BCB77', name: 'Green' },
  teal: { hex: '#4ECDC4', name: 'Teal' },
  blue: { hex: '#45B7D1', name: 'Blue' },
  purple: { hex: '#9B59B6', name: 'Purple' },
  pink: { hex: '#FF69B4', name: 'Pink' },
};

const NAME_TEMPLATES: Record<string, string[]> = {
  cafe:        ['Cosy Cafe', 'Bean & Brew', 'Latte Corner', 'Sunny Cafe'],
  factory:     ['Make Works', 'Build Factory', 'Maker Shed', 'Tinker Plant'],
  themepark:   ['Wonder Park', 'Joyride Land', 'Adventure Park', 'Fun Kingdom'],
  fashion:     ['Style Studio', 'Trendy Threads', 'Wardrobe Hub', 'Outfit Corner'],
  gym:         ['Power Gym', 'Strong Studio', 'Active Club', 'Fit Zone'],
  restaurant:  ['Tasty Table', 'Family Diner', 'Yummy Eats', 'Happy Plate'],
  supermarket: ['Super Mart', 'Fresh Market', 'Daily Goods', 'Sunny Mart'],
};

const STEP_TITLES = [
  'What do you love the most?',
  "What's your dream shop vibe?",
  'Name your dream shop',
  "You're ready to go",
];

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export const ShopQuestionnaire = ({ studentName, onComplete, onBack }: ShopQuestionnaireProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    passion_category: '',
    shop_theme: '',
    color_palette: [] as string[],
    unique_selling_point: '',
    shop_name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const getThemeDefaults = useCallback((themeId: string) => {
    return THEME_DEFAULTS[themeId] ?? {
      color_palette: ['blue', 'yellow'],
      unique_selling_point: 'creative',
    };
  }, []);

  const getNameSuggestions = useCallback(() => {
    const templates = NAME_TEMPLATES[answers.passion_category] || NAME_TEMPLATES.art;
    return templates.map((template) => `${studentName}'s ${template}`);
  }, [answers.passion_category, studentName]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else onBack();
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 0: return !!answers.passion_category;
      case 1: return !!answers.shop_theme;
      case 2: return answers.shop_name.trim().length >= 3;
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const derivedDefaults = getThemeDefaults(answers.shop_theme);
      await onComplete({
        ...answers,
        color_palette: answers.color_palette.length > 0
          ? answers.color_palette
          : derivedDefaults.color_palette,
        unique_selling_point: answers.unique_selling_point || derivedDefaults.unique_selling_point,
      });
    } catch (err) {
      console.error('Failed to submit questionnaire:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    const defaults = getThemeDefaults(themeId);
    setAnswers((prev) => ({
      ...prev,
      shop_theme: themeId,
      color_palette: defaults.color_palette,
      unique_selling_point: defaults.unique_selling_point,
    }));
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto touch-manipulation"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      {/* Faint dotted texture, matches the rest of the app */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148,163,184,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className={`${GLASS} relative w-full max-w-lg rounded-3xl overflow-hidden my-4`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="questionnaire-title"
      >
        {/* ── Header — back arrow + step pill + progress bar ─────── */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Back"
              className="w-10 h-10 rounded-full inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              Step {currentStep + 1} of {totalSteps}
            </span>
            {/* Symmetry spacer */}
            <span className="w-10" aria-hidden />
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-violet-600 dark:bg-violet-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Step title */}
          <h2
            id="questionnaire-title"
            className="mt-4 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white text-center"
          >
            {STEP_TITLES[currentStep]}
          </h2>
        </div>

        {/* ── Step content ──────────────────────────────────────── */}
        <div className="px-5 sm:px-6 py-5 sm:py-6 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {PASSIONS.map((p) => {
                    const selected = answers.passion_category === p.id;
                    return (
                      <SelectableCard
                        key={p.id}
                        selected={selected}
                        onClick={() => setAnswers((prev) => ({ ...prev, passion_category: p.id }))}
                      >
                        <div className="text-3xl mb-1.5">{p.emoji}</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                          {p.label}
                        </div>
                      </SelectableCard>
                    );
                  })}
                </div>
              )}

              {currentStep === 1 && (
                <div className="flex flex-col gap-2.5">
                  {THEMES.map((t) => {
                    const selected = answers.shop_theme === t.id;
                    return (
                      <SelectableCard
                        key={t.id}
                        selected={selected}
                        onClick={() => handleThemeSelect(t.id)}
                        layout="row"
                      >
                        <span className="text-3xl flex-shrink-0">{t.emoji}</span>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            {t.label}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {t.description}
                          </div>
                        </div>
                        {selected && (
                          <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </SelectableCard>
                    );
                  })}
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex flex-col gap-4">
                  <label className="block">
                    <span className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      Shop name
                    </span>
                    <input
                      type="text"
                      value={answers.shop_name}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, shop_name: e.target.value }))}
                      placeholder="Type a name for your shop"
                      maxLength={50}
                      autoFocus
                      className={`${FIELD} min-h-[56px] px-4 text-base`}
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      At least 3 characters.
                    </p>
                  </label>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2">
                      Need ideas?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getNameSuggestions().map((name) => {
                        const active = answers.shop_name === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, shop_name: name }))}
                            className={`min-h-[40px] px-3 rounded-xl text-sm font-semibold border-b-[2px] transition-all active:translate-y-[1px] active:border-b-[1px] touch-manipulation ${
                              active
                                ? 'bg-violet-600 text-white border-violet-800'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col items-center text-center">
                  <span className="w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 flex items-center justify-center">
                    <Store className="w-8 h-8 text-white" />
                  </span>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    AI will create your shop using these answers.
                  </p>

                  {/* Summary card */}
                  <div className={`${GLASS} rounded-2xl w-full p-4 mt-4 space-y-2.5`}>
                    <SummaryRow
                      label="Shop name"
                      value={<span className="font-bold text-slate-900 dark:text-white">{answers.shop_name}</span>}
                    />
                    <SummaryRow
                      label="Passion"
                      value={
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span>{PASSIONS.find((p) => p.id === answers.passion_category)?.emoji}</span>
                          <span>{PASSIONS.find((p) => p.id === answers.passion_category)?.label}</span>
                        </span>
                      }
                    />
                    <SummaryRow
                      label="Vibe"
                      value={
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span>{THEMES.find((t) => t.id === answers.shop_theme)?.emoji}</span>
                          <span>{THEMES.find((t) => t.id === answers.shop_theme)?.label}</span>
                        </span>
                      }
                    />
                    <SummaryRow
                      label="Colours"
                      value={
                        <div className="flex gap-1.5">
                          {answers.color_palette.map((id) => {
                            const c = COLOR_DISPLAY[id];
                            if (!c) return null;
                            return (
                              <span
                                key={id}
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            );
                          })}
                        </div>
                      }
                    />
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-300 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">AI is ready to build your shop</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer — Next / Create ─────────────────────────────── */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepComplete()}
              className={`${BTN_3D_PRIMARY} w-full min-h-[56px] px-6 text-base`}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              // Emerald 3D variant for the "create" final step.
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white font-bold border-b-[5px] border-emerald-700 hover:bg-emerald-400 hover:border-emerald-600 active:translate-y-[3px] active:border-b-[2px] disabled:opacity-60 disabled:hover:bg-emerald-500 disabled:active:translate-y-0 disabled:active:border-b-[5px] transition-[transform,border-bottom-width,background-color] duration-100 min-h-[56px] px-6 text-base touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating your shop…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create my shop
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// SelectableCard — one source of truth for the "pickable tile" pattern
// used in steps 1 + 2. Solid 3D-button-styled border-bottom when selected
// so the user feels the tap.
// ─────────────────────────────────────────────────────────────────────

function SelectableCard({
  children,
  selected,
  onClick,
  layout = 'col',
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  layout?: 'col' | 'row';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`p-3 sm:p-4 rounded-2xl text-center border-2 border-b-[5px] transition-all touch-manipulation active:translate-y-[1px] ${
        selected
          ? 'bg-violet-50 dark:bg-violet-500/20 border-violet-500 border-b-violet-700'
          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10 border-b-slate-300 dark:border-b-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700/60'
      } ${
        layout === 'row' ? 'flex items-center gap-3' : 'flex flex-col items-center'
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SummaryRow — one row of the step-4 confirmation card.
// ─────────────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right min-w-0">{value}</span>
    </div>
  );
}

export default ShopQuestionnaire;
