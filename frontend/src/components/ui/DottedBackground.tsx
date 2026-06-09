/**
 * Faint dotted-grid background that every AIpreneur page sits on top of.
 *
 * Pure CSS, no JS, no animation — just a fixed-position layer painted
 * with a radial-dot pattern. Sits at z=-10 so it never blocks clicks or
 * interferes with the page content above.
 *
 * Opacity differs between light + dark mode to keep the dots subtly
 * visible without ever competing with the foreground:
 *   • Light: 12% (dots show as soft slate spots)
 *   • Dark : 6% (dots fade further into the slate-950 background)
 */
export function DottedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.12] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(100,116,139,0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
