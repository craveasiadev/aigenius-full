/**
 * Landing page — parent-facing.
 *
 * Visual language:
 *   • Glassmorphism cards (frosted, subtle borders) sit over a calm
 *     solid background. Gradients are reserved for ONE accent — the
 *     primary CTA + the AI orb's lighting — so the page reads as clean
 *     SaaS, not a candy-colour mood board.
 *   • A small Three.js scene (`HeroOrb`) provides the AI motif: a
 *     glowing icosahedron with orbiting neural-node spheres + sparkle
 *     dust. Theme-aware colours.
 *   • Dark/light toggle persists to localStorage and honours the user's
 *     `prefers-color-scheme` on first visit. Tailwind's `darkMode: 'class'`
 *     handles the variant switching.
 *
 * Constraints:
 *   • Mobile-first. Hero stacks vertically below md; orb sits above copy.
 *   • Safe-area aware so the nav doesn't slide under an iPhone notch.
 *   • No 3D game scene here — the simulator stays behind login.
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Store,
  Megaphone,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  Brain,
  Lightbulb,
  Paintbrush,
  Cog,
  Heart,
  Coins,
  Zap,
  Users,
  Sun,
  Moon,
  Maximize,
  Minimize,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { HeroOrb } from './landing/HeroOrb';
import { HowItWorksScroll } from './landing/HowItWorksScroll';
import { useTheme } from '../contexts/ThemeContext';
import {
  GLASS,
  GLASS_HOVER,
  ICON_TILE,
  BTN_3D_PRIMARY,
  BTN_3D_SECONDARY,
  BTN_3D_PRIMARY_SM,
  BTN_3D_ON_DARK,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

// ─────────────────────────────────────────────────────────────────────
// Static content — copy edits stay out of the JSX.
// ─────────────────────────────────────────────────────────────────────

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#features', label: 'Skills they build' },
  { href: '#how', label: 'How it works' },
  { href: '#inside', label: 'The curriculum' },
  { href: '#program', label: 'The journey' },
  { href: '#faq', label: 'For parents' },
];

const FEATURES: Array<{
  icon: typeof Store;
  title: string;
  body: string;
  bullets: string[];
  accent: string; // text colour token used on the icon
}> = [
  {
    icon: Coins,
    title: 'Money & numeracy',
    body:
      'The single best head-start a child can get with money — practised through real choices, never worksheets.',
    bullets: [
      'Counts coins, sets prices, and reads a simple profit & loss',
      'Budgeting and saving, where every decision has a real consequence',
      'Percentages, margins, and mental maths — used, not memorised',
    ],
    accent: 'text-amber-500',
  },
  {
    icon: Paintbrush,
    title: 'Creativity & design',
    body:
      'Turns a blank idea into something finished, branded, and proudly theirs — the heart of design thinking.',
    bullets: [
      'Invents products and gives them a name, colour, logo, and story',
      'Designs a shop interior — spatial reasoning and a sense of style',
      'Learns that good design is a tool, not just decoration',
    ],
    accent: 'text-pink-500',
  },
  {
    icon: Megaphone,
    title: 'Communication & literacy',
    body:
      'Writing and speaking with a real purpose: getting an audience to care about their idea.',
    bullets: [
      'Writes product names, descriptions, and adverts that persuade',
      'Pitches ideas and learns to read what an audience wants',
      'Builds vocabulary and reading confidence in a real-world context',
    ],
    accent: 'text-sky-500',
  },
  {
    icon: Users,
    title: 'Leadership & kindness',
    body:
      'Responsibility, teamwork, and empathy: the people skills schools rarely have time for.',
    bullets: [
      'Hires and leads a team; learns fairness and follow-through',
      'Manages time, stock, and priorities like a real shopkeeper',
      'Runs community & kindness projects that build real empathy',
    ],
    accent: 'text-emerald-500',
  },
  {
    icon: Sparkles,
    title: 'Digital & AI literacy',
    body:
      'A safe, guided first relationship with the technology that will shape their working life.',
    bullets: [
      'Works with an AI mentor: directing it, not just consuming it',
      'Learns to judge, edit, and improve what the AI suggests',
      'Grows confident with technology inside a walled, kid-safe world',
    ],
    accent: 'text-fuchsia-500',
  },
];

const HOW_STEPS: Array<{
  step: string;
  title: string;
  body: string;
  bullets: string[];
}> = [
  {
    step: '01',
    title: 'Set up a shop in five minutes',
    body:
      'No coding, no tutorial slog. Your child picks an idea they actually care about, and the AI generates the shop around it.',
    bullets: [
      'Choose from sample shops or describe their own idea in one sentence',
      'AI generates the storefront, signage, and starter products instantly',
      'They name the business + pick a colour scheme that feels like theirs',
    ],
  },
  {
    step: '02',
    title: 'Create products and launch marketing',
    body:
      'Each session, they craft one or two products and a promo. Both decisions cost AI Tokens and earn coins when the campaign lands.',
    bullets: [
      'AI helps draft product names, descriptions, and prices — they edit',
      'Marketing campaigns spend tokens, raise popularity, attract visitors',
      'Each decision is a tiny lesson in trade-offs (cost vs. reward)',
    ],
  },
  {
    step: '03',
    title: 'Run the shop and watch it grow',
    body:
      'They pan around their isometric city, tap their shop to step inside, serve customers, and watch the dashboard update in real time.',
    bullets: [
      'Live crowd density on the streets reflects current popularity',
      'Interior view shows the shopkeeper at the counter + customers seated',
      'Daily quests unlock new modules: Operations, Innovation, CSR',
    ],
  },
];

const MODULES_INSIDE: Array<{
  icon: typeof Store;
  name: string;
  skill: string;
  body: string;
  accent: string;
}> = [
  {
    icon: Lightbulb,
    name: 'Product Lab',
    skill: 'Creativity & value',
    body:
      'Brainstorm, name, and launch products with an AI mentor, then set a price and choose what to sell. The first feel for ideas, value, and what a customer actually wants.',
    accent: 'text-blue-500',
  },
  {
    icon: Paintbrush,
    name: 'Design Studio',
    skill: 'Design thinking',
    body:
      'Lay out the shop with drag-and-drop furniture, colours, and signage. Spatial reasoning, a sense of style, and proof that good design changes how people feel.',
    accent: 'text-pink-500',
  },
  {
    icon: Megaphone,
    name: 'Marketing Studio',
    skill: 'Communication',
    body:
      'Write posters, social posts, and promos, set a budget, and watch the crowd respond. Writing, persuasion, and a first lesson in audiences and cause-and-effect.',
    accent: 'text-orange-500',
  },
  {
    icon: Cog,
    name: 'Operations & Team',
    skill: 'Leadership',
    body:
      'Hire staff, manage stock, and keep service smooth. Responsibility, time management, and what it takes to lead a happy, productive team.',
    accent: 'text-emerald-500',
  },
  {
    icon: Sparkles,
    name: 'Innovation Lab',
    skill: 'STEM & strategy',
    body:
      'Invest in research to unlock new technology, bigger shops, and rare products. Planning ahead, reinvestment, and the mindset of always improving.',
    accent: 'text-violet-500',
  },
  {
    icon: Coins,
    name: 'Finance Office',
    skill: 'Money & maths',
    body:
      'Track takings, costs, and profit on a kid-friendly dashboard, then decide how to reinvest. Real numeracy and money confidence, made tangible.',
    accent: 'text-amber-500',
  },
];

const PROGRAM: Array<{
  term: string;
  months: string;
  brand: string;
  industry: string;
  emoji: string;
  image: string;
  tone: string;
  body: string;
  skills: string[];
}> = [
  {
    term: 'Term 1',
    months: 'Months 1–4',
    brand: 'Zus Coffee',
    industry: 'Café & Beverage',
    emoji: '☕',
    image: '/assets/World/Zus.png',
    tone: 'from-amber-400 to-orange-500 border-orange-700',
    body:
      'Run a specialty coffee café. Children craft a drinks menu, price each cup, master fast and friendly service, and build a loyalty programme that keeps customers coming back.',
    skills: ['Menu & pricing', 'Customer service', 'Loyalty & branding'],
  },
  {
    term: 'Term 2',
    months: 'Months 5–8',
    brand: 'Mamee',
    industry: 'Snacks & Manufacturing',
    emoji: '🍜',
    image: '/assets/World/Mamee.png',
    tone: 'from-rose-400 to-red-500 border-red-700',
    body:
      'Step inside a snack factory. Kids see how products are made on a production line, how brands use mascots, and how a snack travels from factory to shop shelf.',
    skills: ['Production lines', 'Brand & mascots', 'Distribution'],
  },
  {
    term: 'Term 3',
    months: 'Months 9–12',
    brand: 'Jungle Gym',
    industry: 'Services & Fitness',
    emoji: '🤸',
    image: '/assets/World/junglegym.png',
    tone: 'from-lime-400 to-emerald-500 border-emerald-700',
    body:
      'Manage a kids’ fitness centre. Children schedule classes, coach instructors, and grow memberships — learning how service businesses keep people happy, active, and loyal.',
    skills: ['Scheduling', 'Coaching a team', 'Memberships'],
  },
  {
    term: 'Term 4',
    months: 'Months 13–16',
    brand: 'AirAsia',
    industry: 'Travel & Logistics',
    emoji: '✈️',
    image: '/assets/World/airport.png',
    tone: 'from-sky-400 to-blue-500 border-blue-700',
    body:
      'Take to the skies with a budget airline. Kids handle flight operations, customer service, and smart pricing — a first taste of logistics and running things at real scale.',
    skills: ['Operations & logistics', 'Smart pricing', 'Service at scale'],
  },
];

const PROGRAM_NEXT: string[] = [
  'Retail & Shopping',
  'Technology & Apps',
  'Hospitality & Hotels',
  'Health & Wellness',
  'Media & Creative',
  'Banking & Finance',
];

const HUD_HIGHLIGHTS: Array<{
  icon: typeof Store;
  label: string;
  body: string;
  accent: string;
}> = [
  {
    icon: Zap,
    label: 'AI Tokens',
    body:
      'The effort meter. Every AI action — a new product, a poster — spends a little energy, so children learn that good work has a cost and a plan.',
    accent: 'text-amber-500',
  },
  {
    icon: Heart,
    label: 'Popularity',
    body:
      'Their shop’s reputation. Smart marketing and kindness make the streets busier — a clear, visual reward for doing the right things well.',
    accent: 'text-pink-500',
  },
  {
    icon: Coins,
    label: 'Coins',
    body:
      'Money earned from sales. Children decide how to reinvest — products, marketing, decor, or staff — practising real financial choices in miniature.',
    accent: 'text-yellow-500',
  },
  {
    icon: Users,
    label: 'Live customers',
    body:
      'Animated visitors fill the street based on popularity. Busy shops draw a crowd, quiet ones a trickle — instant, honest feedback on every decision.',
    accent: 'text-sky-500',
  },
];

const STATS: Array<{ value: string; label: string }> = [
  { value: '5–12', label: 'years old — all welcome' },
  { value: '6', label: 'hands-on learning worlds' },
  { value: 'New brand', label: 'to master every 4 months' },
  { value: '4.9/5', label: 'parent rating' },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What ages is this for?',
    a: 'Designed for children aged 5 to 12, with the experience tuned to each stage. Ages 5–7 get a simpler tutorial, bigger buttons, and picture-led tasks; 8–10 work through the core curriculum; 11–12 unlock more advanced mechanics like profit & loss and pitching. The same programme grows with your child.',
  },
  {
    q: 'Is this a real learning programme, or just a game?',
    a: 'It is a structured 12-month curriculum delivered through play. Every world maps to a real learning outcome — numeracy, literacy, design, communication, critical thinking, and digital skills — and every four months your child takes on a real brand from their world — starting with Zus Coffee, then Mamee, Jungle Gym, and AirAsia. The fun is the delivery; the skills are the point.',
  },
  {
    q: 'What will my child actually learn?',
    a: 'Money and numeracy (pricing, budgeting, profit), creativity and design, communication and persuasive writing, leadership and teamwork, kindness and community responsibility, and a safe first experience working alongside AI — skills schools rarely have time to teach in depth.',
  },
  {
    q: 'Is it safe? What about screen time?',
    a: 'No open chat with strangers, no ads, and no surprise charges. Parents can set daily session limits, and we email a weekly progress summary so you always know what your child has been learning.',
  },
  {
    q: 'How much time does it take each week?',
    a: 'Most families do two or three short sessions a week — around 20 to 30 minutes each. The curriculum is built around small, satisfying wins, so it fits after school without becoming another chore.',
  },
  {
    q: 'How much does it cost?',
    a: 'Free to start with the first worlds and quests. Premium is monthly, cancel any time, and a single family plan covers up to 3 children.',
  },
  {
    q: 'Does it work on my child’s tablet or phone?',
    a: 'Yes. It runs in any modern browser and installs as an app with its own icon. Android and iOS apps release on the same schedule as the web version.',
  },
  {
    q: 'How is my child’s data handled?',
    a: 'We never sell student data. AI features run under education-tier privacy terms, and full data export and deletion are one click in the parent dashboard.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Component — uses the global ThemeProvider (src/contexts/ThemeContext)
// so the dark/light choice carries over to every other page in the app.
// Design tokens live in src/lib/uiTokens.ts so Login + future pages can
// share the exact same look.
// ─────────────────────────────────────────────────────────────────────

export function Landing() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const toggle = toggleTheme;
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track fullscreen state — the user can also exit with Esc / system
  // gestures, so we listen rather than only tracking our own click.
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  const toggleFullscreen = async () => {
    // Vendor-prefixed fallback for older WebKit (iOS Safari < 16.4 still
    // ships the prefixed methods; iOS < 16 lacks Fullscreen API entirely
    // — in that case the button is a no-op, which we accept silently).
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      webkitFullscreenElement?: Element | null;
    };
    try {
      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) await docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      }
    } catch {
      /* user-gesture/permission errors are non-fatal — silently ignore */
    }
  };

  // Memoise so the orb's Canvas doesn't tear down on every theme switch —
  // we pass `dark` as a prop and let the materials swap colour internally.
  const orb = useMemo(() => <HeroOrb dark={dark} />, [dark]);

  return (
    <div className="min-h-screen relative isolate bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 antialiased transition-colors duration-300">
      {/* Interactive starfield — twinkling stars, occasional shooting
          stars, and mouse-driven parallax. Sits above the page bg colour
          but below all content. Dotted grid layers a faint texture on top. */}
      <StarfieldBackground />
      <DottedBackground />

      {/* ──────────────────────────────────────────────────────────────
          STICKY NAV
          ────────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
          scrolled
            ? `${GLASS} border-b border-slate-200/70 dark:border-white/10`
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 touch-manipulation" aria-label="AIpreneur home">
            <div className="w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">AIpreneur</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Fullscreen toggle — uses the standard Fullscreen API
                so it works in browsers; on iOS Safari < 16.4 it falls
                back to the webkit-prefixed methods; on iOS where the
                API is unavailable it's a silent no-op. */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isFullscreen ? 'min' : 'max'}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dark ? 'moon' : 'sun'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex min-h-[40px] px-4 items-center text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors touch-manipulation"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`${BTN_3D_PRIMARY_SM} min-h-[40px] px-4 sm:px-5`}
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 inline-flex items-center justify-center rounded-md text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-white/10 touch-manipulation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className={`${GLASS} rounded-b-3xl border-t-0`}
              style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 h-14">
                <span className="font-bold text-base">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-md text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-white/10 touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="px-2 pb-4 flex flex-col">
                {NAV_LINKS.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[48px] flex items-center px-3 text-base font-medium text-slate-800 dark:text-slate-100 active:bg-slate-100 dark:active:bg-white/10 rounded-lg touch-manipulation"
                  >
                    {label}
                  </a>
                ))}
                <div className="border-t border-slate-200 dark:border-white/10 mt-2 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[48px] flex items-center px-3 text-base font-semibold text-slate-700 dark:text-slate-200 rounded-lg touch-manipulation"
                  >
                    Sign in
                  </Link>
                </div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────
          HERO
          ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-16 items-center">
          {/* Copy column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            // Order matters on mobile: orb appears BELOW copy on mobile,
            // BESIDE it on md+.
            className="md:order-1 order-2"
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${GLASS} text-violet-700 dark:text-violet-200 text-xs font-semibold mb-5`}>
              <Sparkles className="w-3.5 h-3.5" />
              A guided learning programme · Ages 5–12
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-slate-900 dark:text-white">
              Real-world skills, learned by{' '}
              <span className="relative inline-block text-violet-600 dark:text-violet-400">
                running a business
                {/* Solid underline accent — replaces the gradient bg-clip
                    text effect with a single coloured stroke. */}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-1 h-1 sm:h-1.5 rounded-full bg-violet-200 dark:bg-violet-900"
                />
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              AIpreneur is a world-class learning centre for ages 5–12 —
              part tuition, part adventure. Across hands-on worlds and a
              term-by-term journey through real brands, your child builds money, creativity,
              communication, and problem-solving skills, guided every step
              by a friendly AI mentor.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/register"
                className={`${BTN_3D_PRIMARY} min-h-[56px] px-6 sm:px-7 text-base`}
              >
                Start your child&apos;s journey
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className={`${BTN_3D_SECONDARY} min-h-[56px] px-6 sm:px-7 text-base`}
              >
                Sign in
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No ads, no microtransactions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Cancel anytime
              </span>
            </div>
          </motion.div>

          {/* Orb column — Three.js AI scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:order-2 order-1 relative w-full"
          >
            <div className={`relative rounded-3xl ${GLASS} overflow-hidden aspect-square sm:aspect-[5/4] md:aspect-square w-full max-w-md mx-auto md:max-w-none`}>
              {/* Three.js canvas — full bleed inside the glass card. */}
              <div className="absolute inset-0">
                <Suspense fallback={null}>{orb}</Suspense>
              </div>
              {/* Floating stat bubble overlay — pure DOM, lives above
                  the canvas with a glass treatment so it reads as part
                  of the same composition. */}
              <div className={`absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto ${GLASS} rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 max-w-xs`}>
                <span className={`${ICON_TILE} w-10 h-10`}>
                  <GraduationCap className="w-5 h-5 text-emerald-500" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">12 skills practised this week</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Across 6 learning worlds</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          WHAT THEY LEARN (features)
          ────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            chipColor="violet"
            chipLabel="What they build"
            title="Six skills your child carries for life"
            subtitle="This isn\u2019t screen time — every world is designed around a real learning outcome parents can name."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`${GLASS} ${GLASS_HOVER} rounded-3xl p-6`}
              >
                <div className={ICON_TILE}>
                  <f.icon className={`w-6 h-6 ${f.accent}`} />
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">{f.body}</p>
                <ul className="mt-4 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          HOW IT WORKS — scroll-driven 3D walkthrough.
          The character walks the globe as the user scrolls; each
          building they reach pops out a glass step bubble. See
          HowItWorksScroll.tsx for the implementation details.
          ────────────────────────────────────────────────────────────── */}
      <div id="how" className="scroll-mt-20">
        <HowItWorksScroll dark={dark} />
      </div>

      {/* ──────────────────────────────────────────────────────────────
          WHAT'S INSIDE — 6 modules + HUD highlights
          ────────────────────────────────────────────────────────────── */}
      <section id="inside" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            chipColor="fuchsia"
            chipLabel="The curriculum"
            title="Six learning worlds, one connected adventure"
            subtitle="Each world is a hands-on module that turns a real-life skill into play."
          />

          {/* Modules grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14">
            {MODULES_INSIDE.map((m, idx) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`${GLASS} ${GLASS_HOVER} rounded-3xl p-5 sm:p-6`}
              >
                <div className={ICON_TILE}>
                  <m.icon className={`w-5 h-5 ${m.accent}`} />
                </div>
                <h3 className="mt-3 font-bold text-base text-slate-900 dark:text-white">{m.name}</h3>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wider">
                  {m.skill}
                </span>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{m.body}</p>
              </motion.div>
            ))}
          </div>

          {/* HUD highlights */}
          <div className={`${GLASS} rounded-3xl p-5 sm:p-8`}>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
              What you&apos;ll see on screen
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              These four cards live at the top of every play session, so a glance
              tells you how the business is going.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {HUD_HIGHLIGHTS.map((h) => (
                <div
                  key={h.label}
                  className={`${GLASS} rounded-2xl p-4 flex flex-col gap-2`}
                >
                  <div className={`${ICON_TILE} w-10 h-10`}>
                    <h.icon className={`w-5 h-5 ${h.accent}`} />
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{h.label}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          12-MONTH PROGRAM — a new industry every four months.
          ────────────────────────────────────────────────────────────── */}
      <section id="program" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            chipColor="amber"
            chipLabel="The learning journey"
            title="A real brand to master every four months"
            subtitle="Your child’s journey follows the real businesses in their world — starting with Zus Coffee, then unlocking the next brand each term until they’ve run every kind of business."
          />

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-7">
            {PROGRAM.map((t, idx) => (
              <motion.div
                key={t.term}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className={`${GLASS} ${GLASS_HOVER} rounded-3xl p-6 flex flex-col`}
              >
                {/* Big brand image banner — the real shop art from the world */}
                <div className={`relative -mx-6 -mt-6 mb-4 rounded-t-3xl overflow-hidden bg-gradient-to-br ${t.tone}`}>
                  <img
                    src={t.image}
                    alt={`${t.brand} shop`}
                    loading="lazy"
                    className="w-full h-56 sm:h-72 object-contain drop-shadow-2xl select-none pointer-events-none"
                  />
                  {/* Term badge floating on the image */}
                  <div className="absolute top-3 right-3 rounded-2xl bg-slate-900/70 backdrop-blur-md px-3 py-1.5 text-right border border-white/10">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-white">{t.term}</div>
                    <div className="text-[11px] text-white/70">{t.months}</div>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">{t.brand}</h3>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.industry}</div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">{t.body}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.skills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coming-next industries — shows the journey keeps going */}
          <div className={`${GLASS} rounded-3xl p-5 sm:p-6 mt-6 sm:mt-8`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`${ICON_TILE} w-9 h-9`}>
                <Sparkles className="w-4 h-4 text-fuchsia-500" />
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">More brands keep joining the world</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              New partner brands are added to your child’s world over time, each
              opening a fresh industry to master — so the journey keeps growing.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROGRAM_NEXT.map((n) => (
                <span
                  key={n}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          STATS STRIP — solid slate card, no gradient, no glow.
          ────────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 border-b-[6px] border-b-slate-950 text-white p-6 sm:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          FAQ
          ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            chipColor="slate"
            chipLabel="FAQ"
            title="Common parent questions"
          />
          <div className={`${GLASS} rounded-3xl divide-y divide-slate-200/60 dark:divide-white/10`}>
            {FAQ.map((f, idx) => {
              const open = openFaq === idx;
              return (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left active:bg-white/40 dark:active:bg-white/10 transition-colors touch-manipulation"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg">
                      {f.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 dark:text-slate-300 flex-shrink-0 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-4 sm:pb-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                          {f.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          CTA FOOTER — solid dark card, no gradient, no radial glow.
          ────────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 border-b-[6px] border-b-slate-950 text-white p-8 sm:p-12 md:p-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold mb-4">
            <Brain className="w-3.5 h-3.5" />
            Free to start · ages 5–12
          </div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Give your child a head start that compounds for life
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Most parents start with the free tier and decide within the first weekend.
            No credit card required.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/register"
              className={`${BTN_3D_ON_DARK} min-h-[56px] px-7 text-base`}
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 text-white text-base font-semibold border border-slate-700 border-b-[5px] border-b-slate-950 hover:bg-slate-700 active:translate-y-[3px] active:border-b-[2px] transition-[transform,border-bottom-width,background-color] duration-100 min-h-[56px] px-7 touch-manipulation"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          FOOTER
          ────────────────────────────────────────────────────────────── */}
      <footer className={`${GLASS} border-t border-x-0 rounded-none py-8 px-4 sm:px-6`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 border-b-2 border-violet-800 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">AIpreneur</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
            <Link to="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section header — eyebrow chip + h2 + optional subtitle. One shared
// component so every section's intro lines up visually.
// ─────────────────────────────────────────────────────────────────────

function SectionHeader({
  chipColor,
  chipLabel,
  title,
  subtitle,
}: {
  chipColor: 'violet' | 'emerald' | 'fuchsia' | 'slate' | 'amber';
  chipLabel: string;
  title: string;
  subtitle?: string;
}) {
  const chipClass: Record<typeof chipColor, string> = {
    violet: 'text-violet-700 dark:text-violet-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    fuchsia: 'text-fuchsia-700 dark:text-fuchsia-300',
    slate: 'text-slate-700 dark:text-slate-300',
    amber: 'text-amber-700 dark:text-amber-300',
  };
  return (
    <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
      <span className={`inline-block px-3 py-1 rounded-full ${GLASS} text-xs font-bold uppercase tracking-wider mb-3 ${chipClass[chipColor]}`}>
        {chipLabel}
      </span>
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">{subtitle}</p>
      )}
    </div>
  );
}

export default Landing;
