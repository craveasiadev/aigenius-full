/**
 * Public-facing Privacy / Terms / Support pages.
 *
 * Three lightly-different pages share a `LegalLayout` wrapper so they
 * look consistent (top bar, starfield background, glass content card,
 * back-to-home pill). Routes:
 *   /privacy → PrivacyPage
 *   /terms   → TermsPage
 *   /support → SupportPage
 *
 * Editorial rules these pages follow:
 *   • Plain English. We're writing for parents of 9-12 year olds, not
 *     for lawyers — but the structure is still legally usable.
 *   • Every company-specific blank uses a `{{PLACEHOLDER}}` token so
 *     the operator can swap their legal name / email / address in one
 *     find-and-replace. None of these placeholder values should ship
 *     to production without being filled.
 *   • The "Last updated" date in each page is the ONLY date that needs
 *     to be revised whenever the policy is amended.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Mail,
  ShieldCheck,
  FileText,
  LifeBuoy,
  AlertTriangle,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { useState } from 'react';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE, GLASS, BTN_3D_PRIMARY, BTN_3D_SECONDARY } from '../lib/uiTokens';

// ─── Editable company values ─────────────────────────────────────────
// Swap these placeholders for your real business details before going
// live. They're collected here so a single edit updates every page.
const COMPANY = {
  legalName: 'AI Genius Sdn. Bhd.',
  productName: 'AI Genius AIpreneur',
  brandShort: 'AIpreneur',
  registrationNumber: '[Business Registration No.]',
  registeredAddress: '[Registered office address, Malaysia]',
  privacyEmail: 'privacy@aigenius.com.my',
  supportEmail: 'support@aigenius.com.my',
  legalEmail: 'legal@aigenius.com.my',
  parentDashboardPath: '/p/dashboard',
  lastUpdated: 'May 27, 2026',
} as const;

// ─── Shared layout ───────────────────────────────────────────────────

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function LegalLayout({ title, subtitle, icon, children }: LegalLayoutProps) {
  return (
    <div className={PAGE}>
      <StarfieldBackground />
      <DottedBackground />

      {/* Top bar — back to home */}
      <header
        className="relative z-10 px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <Link
          to="/"
          className={`${GLASS} inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors touch-manipulation`}
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <Link to="/" className="flex items-center gap-2" aria-label="AIpreneur home">
          <div className="w-8 h-8 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
            AIpreneur
          </span>
        </Link>
        <span className="w-[68px]" aria-hidden />
      </header>

      <main className="relative z-10 px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center mt-6 sm:mt-10 mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/20 mb-3">
              {icon}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last updated · {COMPANY.lastUpdated}
            </p>
          </motion.div>

          {/* Body card */}
          <div
            className={`${GLASS} rounded-3xl p-5 sm:p-8 md:p-10 prose-legal`}
          >
            {children}
          </div>

          {/* Footer nav */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm">
            <Link
              to="/privacy"
              className="px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              Privacy
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link
              to="/terms"
              className="px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              Terms
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link
              to="/support"
              className="px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </main>

      {/* Section text styling — keeps the body sections looking like
          a polished policy page without pulling in @tailwindcss/typography
          (would inflate the bundle). */}
      <style>{`
        .prose-legal h2 {
          font-size: 1.125rem;
          font-weight: 800;
          color: rgb(15 23 42);
          margin-top: 1.5rem;
          margin-bottom: 0.4rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dark .prose-legal h2 { color: rgb(241 245 249); }
        .prose-legal h2 .num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.5rem;
          background: rgb(237 233 254);
          color: rgb(109 40 217);
          font-size: 0.75rem;
          font-weight: 900;
        }
        .dark .prose-legal h2 .num {
          background: rgba(139, 92, 246, 0.2);
          color: rgb(196 181 253);
        }
        .prose-legal p {
          color: rgb(71 85 105);
          line-height: 1.6;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .dark .prose-legal p { color: rgb(203 213 225); }
        .prose-legal ul {
          margin: 0.5rem 0 0.75rem 0;
          padding-left: 1.2rem;
          list-style: disc;
          color: rgb(71 85 105);
          font-size: 0.95rem;
        }
        .dark .prose-legal ul { color: rgb(203 213 225); }
        .prose-legal li { margin: 0.3rem 0; line-height: 1.55; }
        .prose-legal a {
          color: rgb(124 58 237);
          font-weight: 600;
          text-decoration: underline;
        }
        .dark .prose-legal a { color: rgb(167 139 250); }
        .prose-legal strong { color: rgb(15 23 42); font-weight: 700; }
        .dark .prose-legal strong { color: rgb(248 250 252); }
      `}</style>
    </div>
  );
}

// ─── Section helper ──────────────────────────────────────────────────

function Section({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>
        <span className="num">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PRIVACY POLICY
// ════════════════════════════════════════════════════════════════════

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect data on AI Genius AIpreneur."
      icon={<ShieldCheck className="w-7 h-7 text-violet-600 dark:text-violet-300" />}
    >
      <p>
        This Privacy Policy explains how <strong>{COMPANY.legalName}</strong>{' '}
        (&quot;<strong>{COMPANY.brandShort}</strong>&quot;, &quot;we&quot;,
        &quot;our&quot;, or &quot;us&quot;) collects and uses personal data
        when children, parents, teachers, and schools use the{' '}
        <strong>{COMPANY.productName}</strong> platform (the
        &quot;Service&quot;).
      </p>
      <p>
        Because children use the Service, we keep data collection to what is
        actually needed for the educational experience to work, and we give
        parents and guardians clear controls over their child&apos;s data.
      </p>

      <Section num={1} title="Information We Collect">
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Student / child account info</strong> — display name,
            chosen avatar, date of birth (for age-appropriate content), unique
            Genius ID, and the username + password the child uses to sign in.
          </li>
          <li>
            <strong>Parent / guardian info</strong> — name, email address,
            phone number (optional), country, and the link between the parent
            and each child profile they create.
          </li>
          <li>
            <strong>Teacher / school info</strong> — name, school name, email,
            role, and the list of student profiles connected to the teacher
            account.
          </li>
          <li>
            <strong>Login &amp; profile data</strong> — authentication tokens,
            login timestamps, device type, and language preference. We
            don&apos;t store raw passwords; only salted hashes.
          </li>
          <li>
            <strong>Learning progress &amp; game activity</strong> — modules
            completed, quests served, XP / tokens / coins earned, badge
            unlocks, shop layouts saved, and similar in-app actions.
          </li>
          <li>
            <strong>AI-generated &amp; uploaded content</strong> — text,
            images, and audio created or uploaded inside the platform (e.g.
            product descriptions, marketing posters, shop artwork). We retain
            these to power features like Personal Persona analysis and
            achievement history.
          </li>
          <li>
            <strong>Payment / top-up info</strong> — when a parent purchases
            AI Tokens or class credits, we record the transaction reference,
            amount, and currency. Card details are handled entirely by our
            licensed payment processor; we never see or store full card
            numbers.
          </li>
        </ul>
      </Section>

      <Section num={2} title="How We Use This Information">
        <ul>
          <li>To provide and personalise the learning experience.</li>
          <li>
            To save your child&apos;s progress, achievements, and shop state
            across devices.
          </li>
          <li>
            To send parents weekly progress summaries and important account
            notices (you can opt out of marketing emails at any time).
          </li>
          <li>
            To improve the platform&apos;s curriculum and AI guidance
            (aggregated, never tied back to identifiable students).
          </li>
          <li>
            To prevent fraud, abuse, and unsafe content, and to comply with
            applicable laws.
          </li>
        </ul>
      </Section>

      <Section num={3} title="How Your Data Is Protected">
        <ul>
          <li>
            All traffic between your device and our servers is encrypted with
            HTTPS / TLS.
          </li>
          <li>
            Passwords are stored as one-way salted hashes, never as plain
            text.
          </li>
          <li>
            Access to production databases is limited to a small,
            named-individual operations team and is logged.
          </li>
          <li>
            We run regular automated backups and store them encrypted at
            rest.
          </li>
        </ul>
      </Section>

      <Section num={4} title="Sharing With Third Parties">
        <p>
          We do not sell student data. We share limited data with the
          following categories of trusted partners <em>only</em> as needed to
          deliver the Service:
        </p>
        <ul>
          <li>
            <strong>AI providers</strong> (Anthropic, OpenAI) for in-app AI
            features. We send the minimum prompt context required and operate
            under their education / enterprise terms where available.
          </li>
          <li>
            <strong>Cloud infrastructure</strong> (e.g. our hosting provider,
            CDN) to run the platform reliably.
          </li>
          <li>
            <strong>Payment processors</strong> for top-up transactions.
          </li>
          <li>
            <strong>Email / push notification providers</strong> for parent
            summaries and account notices.
          </li>
          <li>
            <strong>Law enforcement</strong> when required by a valid legal
            order in the jurisdiction where the request originates.
          </li>
        </ul>
      </Section>

      <Section num={5} title="Children's Privacy &amp; Parental Consent">
        <p>
          AIpreneur is designed for kids aged 9–12. Children must be added to
          the platform through a parent, guardian, or authorised teacher
          account. By creating a child profile, the parent / guardian:
        </p>
        <ul>
          <li>Confirms they have the right to do so.</li>
          <li>Consents to the data collection described above.</li>
          <li>
            Can view, edit, or delete the child&apos;s profile and any
            learning artefacts from the Parent Dashboard at any time.
          </li>
        </ul>
        <p>
          We do not knowingly collect personal data from children without
          parental consent. If you believe a child has been added without
          permission, contact us at{' '}
          <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>{' '}
          and we&apos;ll remove the profile immediately.
        </p>
      </Section>

      <Section num={6} title="Data Retention &amp; Deletion">
        <p>
          You can request export or deletion of your or your child&apos;s
          data at any time:
        </p>
        <ul>
          <li>
            From the <strong>Parent Dashboard</strong> at{' '}
            <Link to={COMPANY.parentDashboardPath}>
              {COMPANY.parentDashboardPath}
            </Link>{' '}
            → Settings → Data Controls.
          </li>
          <li>
            By emailing{' '}
            <a href={`mailto:${COMPANY.privacyEmail}`}>
              {COMPANY.privacyEmail}
            </a>{' '}
            from the address on file.
          </li>
        </ul>
        <p>
          We process deletion requests within 30 days. Some data may be
          retained longer where required by law (e.g. financial transaction
          records).
        </p>
      </Section>

      <Section num={7} title="Updates To This Policy">
        <p>
          We may update this Privacy Policy as the Service evolves. When we
          make material changes we&apos;ll notify account holders by email at
          least 14 days before the new version takes effect. The current
          version is always available at{' '}
          <Link to="/privacy">/privacy</Link>.
        </p>
      </Section>

      <Section num={8} title="Contact Us">
        <p>
          For privacy questions or to make a data request, email{' '}
          <a href={`mailto:${COMPANY.privacyEmail}`}>
            {COMPANY.privacyEmail}
          </a>
          .
        </p>
        <p>
          <strong>{COMPANY.legalName}</strong>
          <br />
          {COMPANY.registeredAddress}
          <br />
          Business Registration: {COMPANY.registrationNumber}
        </p>
      </Section>
    </LegalLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TERMS OF SERVICE
// ════════════════════════════════════════════════════════════════════

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The rules of using AI Genius AIpreneur — written in plain English."
      icon={<FileText className="w-7 h-7 text-violet-600 dark:text-violet-300" />}
    >
      <p>
        These Terms of Service (&quot;<strong>Terms</strong>&quot;) form a
        legal agreement between you and <strong>{COMPANY.legalName}</strong>{' '}
        (&quot;<strong>{COMPANY.brandShort}</strong>&quot;, &quot;we&quot;,
        &quot;us&quot;) covering your use of the{' '}
        <strong>{COMPANY.productName}</strong> platform. By creating an
        account or using the Service, you agree to these Terms.
      </p>

      <Section num={1} title="Who Can Use The Service">
        <ul>
          <li>
            Parents, guardians, and teachers must be at least 18 years old to
            create an account.
          </li>
          <li>
            Children may use the Service only when added by a parent,
            guardian, or authorised teacher / school account.
          </li>
          <li>
            You are responsible for keeping your login credentials safe and
            for any activity that happens under your account.
          </li>
        </ul>
      </Section>

      <Section num={2} title="Parent / Guardian Responsibility">
        <p>
          By creating a child profile, the parent or guardian agrees that:
        </p>
        <ul>
          <li>They have the legal right to manage the child&apos;s account.</li>
          <li>They supervise the child&apos;s use of the Service.</li>
          <li>
            They are the financial party of record for any purchases made
            from the account, including AI Token top-ups.
          </li>
        </ul>
      </Section>

      <Section num={3} title="Teacher / School Account Responsibility">
        <p>
          Teacher and school accounts agree to:
        </p>
        <ul>
          <li>
            Only enrol students with appropriate consent from their parents
            or institutional authority.
          </li>
          <li>
            Keep classroom rosters accurate and remove students who leave the
            class.
          </li>
          <li>
            Use the platform for legitimate educational purposes.
          </li>
        </ul>
      </Section>

      <Section num={4} title="AI-Generated Content Disclaimer">
        <p>
          Some content on the platform is generated by artificial
          intelligence (text, images, suggestions, etc.). AI outputs may
          occasionally be inaccurate, biased, or unsuitable. We:
        </p>
        <ul>
          <li>
            Make reasonable efforts to filter inappropriate content for kids
            aged 9–12.
          </li>
          <li>
            Provide tools for teachers and parents to flag and remove content.
          </li>
          <li>
            Do <strong>not</strong> guarantee that AI outputs are correct or
            free of errors. Use them as starting points for learning, not as
            authoritative answers.
          </li>
        </ul>
      </Section>

      <Section num={5} title="Tokens, Coins, &amp; In-App Items">
        <ul>
          <li>
            <strong>AI Tokens</strong> are a virtual currency used to power
            AI features inside the platform. They have no cash value and
            cannot be refunded for cash except where required by law.
          </li>
          <li>
            <strong>Coins / XP / Badges</strong> are in-game progress markers
            tied to a child&apos;s account. They are not transferable and have
            no real-world monetary value.
          </li>
          <li>
            AI Tokens purchased by a parent expire if the account is inactive
            for more than 24 months. The platform displays remaining balance
            in the Parent Dashboard.
          </li>
        </ul>
      </Section>

      <Section num={6} title="Learning &amp; Reward Disclaimer">
        <p>
          The Service offers educational content and gamified rewards but is
          not a regulated educational institution. Completing modules,
          earning badges, or reaching higher Genius levels does <strong>not</strong>{' '}
          constitute formal certification or course credit unless a school or
          program explicitly states otherwise.
        </p>
      </Section>

      <Section num={7} title="Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Upload harmful, abusive, or illegal content.</li>
          <li>
            Attempt to bypass authentication, scrape data, or reverse-engineer
            the platform.
          </li>
          <li>
            Use the platform to harass other users, including impersonating
            another student or teacher.
          </li>
          <li>
            Resell, share, or transfer your account credentials to third
            parties.
          </li>
        </ul>
      </Section>

      <Section num={8} title="Account Suspension &amp; Termination">
        <p>
          We may suspend or terminate accounts that violate these Terms,
          attempt to defraud the platform, or pose a risk to other users
          (especially minors). Where possible we&apos;ll notify the affected
          account holder by email before terminating. You may close your
          account at any time from the Parent Dashboard.
        </p>
      </Section>

      <Section num={9} title="Intellectual Property">
        <ul>
          <li>
            The AIpreneur platform, name, logos, course content, and code are
            owned by {COMPANY.legalName} and protected by copyright and
            trademark law.
          </li>
          <li>
            Content <strong>you create</strong> inside the platform (shop
            designs, products, posters, stories) remains yours. By using the
            platform you grant us a non-exclusive licence to host and display
            this content as part of operating the Service.
          </li>
        </ul>
      </Section>

      <Section num={10} title="Limitation Of Liability">
        <p>
          To the maximum extent permitted by law, our total liability for any
          claim arising out of or relating to the Service is limited to the
          amount the affected account paid us in the 12 months before the
          claim arose, or MYR 100, whichever is greater. We are not liable
          for indirect, incidental, or consequential damages.
        </p>
      </Section>

      <Section num={11} title="Updates To These Terms">
        <p>
          We may update these Terms from time to time. When we make material
          changes we&apos;ll notify account holders by email at least 14 days
          before the new version takes effect. The current version always
          lives at <Link to="/terms">/terms</Link>.
        </p>
      </Section>

      <Section num={12} title="Governing Law &amp; Contact">
        <p>
          These Terms are governed by the laws of Malaysia. For legal
          questions, email{' '}
          <a href={`mailto:${COMPANY.legalEmail}`}>{COMPANY.legalEmail}</a>.
        </p>
        <p>
          <strong>{COMPANY.legalName}</strong>
          <br />
          {COMPANY.registeredAddress}
          <br />
          Business Registration: {COMPANY.registrationNumber}
        </p>
      </Section>
    </LegalLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
//  SUPPORT
// ════════════════════════════════════════════════════════════════════

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: "I can't log in — what should I check?",
    a: 'Make sure you typed your Genius ID or email exactly. If your child uses a Genius ID, double-check the spelling — it\'s case-sensitive. Forgot password? Tap "Forgot password" on the sign-in screen to get a reset link by email.',
  },
  {
    q: 'Are my child\'s AI Tokens refundable?',
    a: 'AI Tokens are a virtual currency and aren\'t refundable for cash except where required by law. Unused tokens stay in the account for 24 months from purchase.',
  },
  {
    q: 'How do I add a second child to my parent account?',
    a: 'Open the Parent Dashboard → Genius Profiles → Add Profile. You can manage up to 3 child profiles under one parent account on the Family plan.',
  },
  {
    q: "My child's progress isn't saving — what now?",
    a: 'Progress saves automatically when the child finishes an action or quest. If a save seems missing, ask them to sign out and back in once — this triggers a fresh sync. If the issue persists, email us with the child\'s Genius ID and we\'ll investigate.',
  },
  {
    q: 'How do teachers add students?',
    a: 'In the Teacher Dashboard → My Students → Invite. You can either send an email invitation or share a one-time class code that the parent enters when creating the child profile.',
  },
  {
    q: 'A module or game won\'t load — what should I try?',
    a: 'First try a hard refresh (Cmd+Shift+R on Mac, Ctrl+F5 on Windows). If a module still won\'t load, check your internet connection, then update your browser to the latest version. Persistent issues? Send us the browser, device, and a screenshot.',
  },
  {
    q: 'How do I delete my account or my child\'s data?',
    a: 'Open the Parent Dashboard → Settings → Data Controls → Delete Account. We process deletions within 30 days. You\'ll receive an email confirmation when it\'s complete.',
  },
];

const HELP_TOPICS = [
  { icon: '🔐', label: 'Login & passwords' },
  { icon: '🪙', label: 'Tokens & top-ups' },
  { icon: '👨‍👩‍👧', label: 'Student accounts' },
  { icon: '👩‍🏫', label: 'Teacher dashboard' },
  { icon: '🎮', label: 'Games & modules' },
  { icon: '🏆', label: 'Rewards & badges' },
  { icon: '🛠️', label: 'Technical issues' },
  { icon: '💳', label: 'Billing & receipts' },
];

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: '', email: '', topic: 'Login & passwords', message: '' });
  const [sent, setSent] = useState(false);
  const supportMailto = `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(
    `[${COMPANY.brandShort} Support] ${form.topic}`,
  )}&body=${encodeURIComponent(`Hi support,\n\n${form.message}\n\n— ${form.name} (${form.email})`)}`;

  return (
    <LegalLayout
      title="Support"
      subtitle="We're here to help — parents, students, teachers, and schools."
      icon={<LifeBuoy className="w-7 h-7 text-violet-600 dark:text-violet-300" />}
    >
      {/* Safety callout */}
      <div className="not-prose flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-800 dark:text-amber-200 mb-0.5">
            Support is not for emergencies
          </p>
          <p className="text-amber-800/90 dark:text-amber-100/90 leading-snug">
            If your child is in danger or experiencing a safety emergency,
            please contact your local emergency services first. Our support
            channel responds within one business day.
          </p>
        </div>
      </div>

      <Section num={1} title="How To Reach Us">
        <p>
          The fastest way to get help is to email{' '}
          <a href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>
          . Please include:
        </p>
        <ul>
          <li>Your account email (the parent or teacher email on file).</li>
          <li>The child&apos;s Genius ID if the issue is about a student profile.</li>
          <li>What you tried, what happened, and a screenshot if possible.</li>
        </ul>
        <p>
          <strong>Response time:</strong> We aim to reply within{' '}
          <strong>1 business day</strong>. Complex billing issues may take up
          to 3 business days.
        </p>
      </Section>

      <Section num={2} title="Help Topics">
        <div className="not-prose grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
          {HELP_TOPICS.map((t) => (
            <button
              key={t.label}
              onClick={() => setForm((f) => ({ ...f, topic: t.label }))}
              className={`px-2 py-3 rounded-2xl text-center text-xs sm:text-sm font-bold border transition-all touch-manipulation ${
                form.topic === t.label
                  ? 'bg-violet-500 text-white border-violet-600 shadow-md shadow-violet-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/40'
              }`}
            >
              <span className="block text-xl sm:text-2xl mb-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section num={3} title="Send A Message">
        {sent ? (
          <div className="not-prose rounded-2xl p-5 bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/30 text-center">
            <div className="text-3xl mb-1">✅</div>
            <p className="font-bold text-lime-700 dark:text-lime-200">
              Your email client is opening — finish sending the message from there.
            </p>
            <p className="text-xs text-lime-700/80 dark:text-lime-200/80 mt-1">
              We&apos;ll reply to {form.email || 'the address you sent from'}{' '}
              within 1 business day.
            </p>
            <button
              onClick={() => setSent(false)}
              className={`${BTN_3D_SECONDARY} mt-4 px-5 py-2 text-sm`}
            >
              Send another
            </button>
          </div>
        ) : (
          <form
            className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = supportMailto;
              setSent(true);
            }}
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Your name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="Jane Parent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="you@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Topic
              </label>
              <select
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {HELP_TOPICS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Tell us what&apos;s up
              </label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
                placeholder="Describe the issue, what you tried, and any screenshots…"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                className={`${BTN_3D_PRIMARY} px-5 py-3 text-sm flex-1 sm:flex-none`}
              >
                <Mail className="w-4 h-4" />
                Send to support
              </button>
              <a
                href={`mailto:${COMPANY.supportEmail}`}
                className={`${BTN_3D_SECONDARY} px-5 py-3 text-sm flex-1 sm:flex-none`}
              >
                Just open my email app
              </a>
            </div>
          </form>
        )}
      </Section>

      <Section num={4} title="Frequently Asked Questions">
        <div className="not-prose divide-y divide-slate-200 dark:divide-white/10 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden mt-2">
          {FAQ.map((f, idx) => {
            const open = openFaq === idx;
            return (
              <div key={f.q} className="bg-white/60 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : idx)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors touch-manipulation"
                >
                  <span className="inline-flex items-start gap-2 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    <HelpCircle className="w-4 h-4 text-violet-500 dark:text-violet-300 mt-0.5 shrink-0" />
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 dark:text-slate-300 transition-transform shrink-0 ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-4 sm:px-5 pb-3 sm:pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section num={5} title="Other Ways To Get In Touch">
        <ul>
          <li>
            Privacy / data requests:{' '}
            <a href={`mailto:${COMPANY.privacyEmail}`}>
              {COMPANY.privacyEmail}
            </a>
          </li>
          <li>
            Legal / business questions:{' '}
            <a href={`mailto:${COMPANY.legalEmail}`}>{COMPANY.legalEmail}</a>
          </li>
          <li>
            General help: <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
          </li>
        </ul>
        <p>
          <strong>{COMPANY.legalName}</strong>
          <br />
          {COMPANY.registeredAddress}
        </p>
      </Section>
    </LegalLayout>
  );
}
