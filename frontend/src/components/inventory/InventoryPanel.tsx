/**
 * InventoryPanel — Roblox-style inventory modal.
 *
 * One unified home for everything the kid has collected (Pets, Inventions,
 * Secrets) plus a Decor catalog tab for browsing furniture they can place.
 * Styled to match the reference Roblox UI: chunky sky-blue outer frame with
 * a thick darker bottom border for the "3D card" feel, glossy white inner
 * surface, big tab pills at the top, a search bar, and a responsive grid
 * of icon cards with count + rarity badges.
 *
 * All inventory data is read live from `useCollection()` — opening the
 * panel never blocks on a network call.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Search, Sparkles, PawPrint, Wand2, Eye, Sofa, Check, Lock,
} from 'lucide-react';
import { useCollection } from '../../lib/useCollection';
import { setActivePet } from '../../lib/collection';
import { PETS } from '../../data/pets';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, ALL_FURNITURE_IDS, type FurnitureMeta } from '../iso/interiorLayout';
import { getFurnitureThumbnail } from '../iso/furnitureThumbnails';
import { sfxTap, sfxWhoosh } from '../../lib/sfx';
import { SPRING_BOUNCY } from '../../lib/uiTokens';

type TabId = 'pets' | 'inventions' | 'secrets' | 'decor';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode; accent: string }> = [
  { id: 'pets',       label: 'Pets',       icon: <PawPrint className="w-4 h-4" />, accent: '#f59e0b' },
  { id: 'inventions', label: 'Inventions', icon: <Wand2 className="w-4 h-4" />,    accent: '#8b5cf6' },
  { id: 'secrets',    label: 'Secrets',    icon: <Eye className="w-4 h-4" />,      accent: '#10b981' },
  { id: 'decor',      label: 'Decor',      icon: <Sofa className="w-4 h-4" />,     accent: '#ec4899' },
];

const RARITY_CHIP: Record<string, string> = {
  common:    'bg-slate-200 text-slate-700',
  rare:      'bg-sky-200 text-sky-800',
  epic:      'bg-violet-200 text-violet-800',
  legendary: 'bg-gradient-to-r from-amber-200 to-rose-200 text-orange-800',
};

const SECRET_LABEL: Record<string, string> = {
  secret_corner_tl: 'Top-left whisper',
  secret_corner_tr: 'Top-right twinkle',
  secret_corner_br: 'Back-right hum',
};

interface InventoryPanelProps {
  open: boolean;
  onClose: () => void;
  initialTab?: TabId;
}

export function InventoryPanel({ open, onClose, initialTab = 'pets' }: InventoryPanelProps) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [q, setQ] = useState('');
  const { pets, activePet, inventions, secrets } = useCollection();

  useEffect(() => { if (open) sfxWhoosh(); }, [open]);

  // Counts shown next to each tab pill — instant scanning of "what's in here".
  const counts = useMemo(() => ({
    pets:       `${pets.length}/${PETS.length}`,
    inventions: `${inventions.length}`,
    secrets:    `${secrets.length}`,
    decor:      `${ALL_FURNITURE_IDS.length}`,
  }), [pets, inventions, secrets]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[55] flex items-center justify-center px-3 pointer-events-auto"
          role="dialog"
          aria-label="My Inventory"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close inventory"
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm cursor-default"
          />

          {/* ── Roblox-style 3D card frame ───────────────────────────────
              Outer wrapper carries the chunky 6-7px dark bottom border that
              gives the "stamped plastic" feeling. Inner panel is white with
              a soft inset highlight at the top. */}
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.94 }}
            transition={SPRING_BOUNCY}
            className="relative z-10 w-full max-w-3xl rounded-3xl bg-gradient-to-b from-sky-400 to-sky-500 border-b-[7px] border-sky-700 shadow-2xl"
          >
            {/* Header strip */}
            <div className="flex items-center gap-3 px-4 sm:px-5 pt-3 pb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/25 border-b-[3px] border-white/15">
                <Sparkles className="w-5 h-5 text-white drop-shadow" />
              </span>
              <h2 className="flex-1 text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm tracking-wide">
                My Inventory
              </h2>
              <button
                type="button"
                onClick={() => { sfxTap(); onClose(); }}
                aria-label="Close"
                className="w-10 h-10 rounded-xl bg-rose-500 hover:bg-rose-400 text-white border-b-[4px] border-rose-700 active:translate-y-[2px] active:border-b-[1px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab strip — pills with count badge per tab */}
            <div className="px-3 sm:px-4 pb-3 overflow-x-auto">
              <div className="flex gap-1.5 sm:gap-2 min-w-max">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { sfxTap(); setTab(t.id); }}
                      className={[
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-extrabold whitespace-nowrap border-b-[3px] active:translate-y-[2px] active:border-b-[1px] transition-colors',
                        active
                          ? 'bg-white text-sky-800 border-sky-300'
                          : 'bg-white/30 text-white hover:bg-white/45 border-white/20',
                      ].join(' ')}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                      <span className={[
                        'inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded-md text-[10px] font-extrabold',
                        active ? 'bg-sky-100 text-sky-700' : 'bg-white/40 text-white',
                      ].join(' ')}>
                        {counts[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Inner white panel ───────────────────────────────────── */}
            <div className="bg-white/95 dark:bg-slate-100/95 rounded-2xl mx-3 sm:mx-4 mb-3 sm:mb-4 ring-2 ring-white/60 shadow-inner relative overflow-hidden">
              {/* Glossy top highlight */}
              <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

              {/* Search */}
              <div className="px-3 sm:px-4 pt-3 pb-2">
                <label className="flex items-center gap-2 bg-sky-50 border-2 border-sky-200 rounded-xl px-3 py-1.5">
                  <Search className="w-4 h-4 text-sky-500" />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent placeholder:text-sky-400 text-sky-900 text-sm font-bold focus:outline-none"
                  />
                </label>
              </div>

              {/* Tab body */}
              <div className="px-3 sm:px-4 pb-4 max-h-[58vh] overflow-y-auto">
                {tab === 'pets'       && <PetsGrid query={q} owned={pets} active={activePet} />}
                {tab === 'inventions' && <InventionsGrid query={q} items={inventions} />}
                {tab === 'secrets'    && <SecretsGrid query={q} owned={secrets} />}
                {tab === 'decor'      && <DecorGrid query={q} />}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Tab grids ──────────────────────────────────────────────────────

function lowerIncludes(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function CardShell({ children, accent, locked, glow }: {
  children: React.ReactNode; accent: string; locked?: boolean; glow?: boolean;
}) {
  return (
    <div
      className={[
        'group relative rounded-2xl p-2.5 border-b-[4px] active:translate-y-[2px] active:border-b-[1px] transition-all',
        locked ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:-translate-y-[2px]',
        glow ? 'ring-4 ring-amber-400/60' : '',
      ].join(' ')}
      // Inline accent ring on hover — subtle but distinct per category.
      style={{ boxShadow: `inset 0 -3px 0 0 ${accent}33` }}
    >
      {children}
    </div>
  );
}

function PetsGrid({ query, owned, active }: { query: string; owned: string[]; active: string | null }) {
  const list = PETS.filter((p) => lowerIncludes(p.name, query));
  if (list.length === 0) return <EmptyState text="No pets match that search." />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {list.map((p) => {
        const isOwned = owned.includes(p.id);
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!isOwned}
            onClick={() => { if (!isOwned) return; sfxTap(); setActivePet(p.id); }}
            className="text-left"
          >
            <CardShell accent="#f59e0b" locked={!isOwned} glow={isActive}>
              <div className={`aspect-square rounded-xl bg-gradient-to-br ${isOwned ? p.gradient : 'from-slate-200 to-slate-300'} flex items-center justify-center mb-1.5 overflow-hidden`}>
                <span className="text-5xl drop-shadow-sm">{isOwned ? p.emoji : '❔'}</span>
              </div>
              <div className="flex items-start justify-between gap-1">
                <p className="text-[12px] font-extrabold text-slate-900 leading-tight truncate flex-1">
                  {isOwned ? p.name : '???'}
                </p>
                {isActive && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold">
                    <Check className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 min-h-[24px]">
                {isOwned ? p.blurb : 'Locked — earn a badge to unlock.'}
              </p>
              {!isOwned && <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-slate-400" />}
            </CardShell>
          </button>
        );
      })}
    </div>
  );
}

interface InventionItem { id: string; name: string; emoji: string; blurb: string; rarity: string; }
function InventionsGrid({ query, items }: { query: string; items: InventionItem[] }) {
  // Group identical-named inventions into stacks with a count badge — Roblox
  // inventory grids typically show "5x Apple" style counts, and this reflects
  // the kid having brewed the "same" idea more than once.
  type Stack = InventionItem & { count: number };
  const stacked: Stack[] = useMemo(() => {
    const byKey = new Map<string, Stack>();
    for (const c of items) {
      const key = `${c.name}|${c.rarity}`;
      const existing = byKey.get(key);
      if (existing) existing.count += 1;
      else byKey.set(key, { ...c, count: 1 });
    }
    return Array.from(byKey.values());
  }, [items]);

  const list = stacked.filter((c) => lowerIncludes(c.name, query) || lowerIncludes(c.blurb, query));
  if (list.length === 0) {
    return <EmptyState text={items.length === 0 ? 'Brew your first invention in the Lab ✨' : 'Nothing matches that search.'} />;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {list.map((c) => (
        <CardShell key={c.id} accent="#8b5cf6">
          <div className="aspect-square rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mb-1.5 relative">
            <span className="text-5xl drop-shadow-sm">{c.emoji}</span>
            {c.count > 1 && (
              <span className="absolute bottom-1 right-1 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-violet-600 text-white text-xs font-extrabold border-b-[3px] border-violet-800">
                {c.count}x
              </span>
            )}
          </div>
          <p className="text-[12px] font-extrabold text-slate-900 leading-tight truncate">{c.name}</p>
          <div className="flex items-center justify-between gap-1 mt-1">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${RARITY_CHIP[c.rarity] ?? RARITY_CHIP.common}`}>
              {c.rarity}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 min-h-[24px]">{c.blurb}</p>
        </CardShell>
      ))}
    </div>
  );
}

function SecretsGrid({ query, owned }: { query: string; owned: string[] }) {
  if (owned.length === 0) {
    return <EmptyState text="No secrets yet — try tapping the corners of the world…" />;
  }
  const list = owned
    .map((id) => ({ id, label: SECRET_LABEL[id] ?? id }))
    .filter((s) => lowerIncludes(s.label, query));
  if (list.length === 0) return <EmptyState text="Nothing matches that search." />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {list.map((s) => (
        <CardShell key={s.id} accent="#10b981">
          <div className="aspect-square rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-1.5">
            <Sparkles className="w-10 h-10 text-emerald-500" />
          </div>
          <p className="text-[12px] font-extrabold text-slate-900 leading-tight truncate">{s.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Discovered</p>
        </CardShell>
      ))}
    </div>
  );
}

function DecorGrid({ query }: { query: string }) {
  const [cat, setCat] = useState<string>('all');
  const all: FurnitureMeta[] = useMemo(
    () => ALL_FURNITURE_IDS.map((id) => FURNITURE_CATALOG[id]),
    [],
  );
  const list = all.filter((m) =>
    (cat === 'all' || m.category === cat) && lowerIncludes(m.name, query),
  );

  return (
    <div>
      {/* Category pills — local to this tab */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
        {([{ id: 'all', label: 'All' }, ...FURNITURE_CATEGORIES] as Array<{ id: string; label: string }>).map((c) => {
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { sfxTap(); setCat(c.id); }}
              className={[
                'px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap border-b-[2px]',
                active ? 'bg-sky-500 text-white border-sky-700' : 'bg-slate-100 text-slate-700 border-slate-200',
              ].join(' ')}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState text="Nothing matches that filter." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {list.map((m) => (
            <DecorCard key={m.id} meta={m} />
          ))}
        </div>
      )}
      <p className="text-[11px] italic text-slate-500 mt-3 px-1">
        Tap any piece to preview, then place it in <strong>Decorate</strong>.
      </p>
    </div>
  );
}

/** Mini wrapper that lazily loads the same 3D thumbnail the decorate palette
 *  uses, so the inventory grid shows true GLB previews for each piece. */
function DecorCard({ meta }: { meta: FurnitureMeta }) {
  const [src, setSrc] = useState<string | null>(null);
  const isFrame = meta.mount === 'wall' && !!meta.frameBorderHex;
  useEffect(() => {
    if (isFrame) return;
    let active = true;
    getFurnitureThumbnail(meta.path)
      .then((url) => { if (active) setSrc(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [meta.path, isFrame]);

  return (
    <CardShell accent="#ec4899">
      <div className="aspect-square rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-1.5 overflow-hidden">
        {isFrame ? (
          <span
            className="block w-3/5 h-3/5 rounded-sm border-[3px]"
            style={{ borderColor: meta.frameBorderHex, backgroundColor: meta.frameFillHex }}
          />
        ) : src ? (
          <img src={src} alt={meta.name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <Sofa className="w-10 h-10 text-pink-400" />
        )}
      </div>
      <p className="text-[12px] font-extrabold text-slate-900 leading-tight truncate">{meta.name}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{meta.category}</p>
    </CardShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <Sparkles className="w-8 h-8 text-sky-400 mx-auto mb-2" />
      <p className="text-sm font-extrabold text-slate-600">{text}</p>
    </div>
  );
}

export default InventoryPanel;
