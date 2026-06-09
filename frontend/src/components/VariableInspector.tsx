import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Code, X } from 'lucide-react';

interface InspectedElement {
  variable: string;
  value: string;
  component: string;
  path: string;
  x: number;
  y: number;
}

export const VariableInspector = () => {
  const showVariable = useStore((state) => state.showVariable);
  const [hoveredVariable, setHoveredVariable] = useState<{ name: string; x: number; y: number } | null>(null);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);

  useEffect(() => {
    if (!showVariable) {
      setHoveredVariable(null);
      setInspectedElement(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('[data-debug-ignore]')) {
        return;
      }

      const variableName = target.getAttribute('data-variable');
      if (variableName) {
        setHoveredVariable({
          name: variableName,
          x: e.clientX,
          y: e.clientY - 40,
        });
      } else {
        setHoveredVariable(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('[data-debug-ignore]')) {
        return;
      }

      const variableName = target.getAttribute('data-variable');
      if (variableName) {
        e.preventDefault();
        e.stopPropagation();

        const value = target.textContent || '';
        const component = target.getAttribute('data-component') || 'Unknown';
        const path = target.getAttribute('data-path') || 'N/A';

        setInspectedElement({
          variable: variableName,
          value,
          component,
          path,
          x: e.clientX,
          y: e.clientY,
        });
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick, true);
    };
  }, [showVariable]);

  if (!showVariable) return null;

  return (
    <>
      <AnimatePresence>
        {hoveredVariable && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: `${hoveredVariable.x}px`,
              top: `${hoveredVariable.y}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-2xl border border-purple-400">
              <div className="flex items-center gap-1.5">
                <Code className="w-3 h-3" />
                <span className="font-mono text-xs font-semibold">{hoveredVariable.name}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectedElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999]"
            style={{
              left: `${Math.min(inspectedElement.x, window.innerWidth - 320)}px`,
              top: `${Math.min(inspectedElement.y, window.innerHeight - 200)}px`,
            }}
            data-debug-ignore
          >
            <div className="bg-gray-900 border-2 border-purple-500 rounded-xl shadow-2xl p-4 w-80 max-w-[calc(100vw-2rem)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-white text-sm">Variable Inspector</h3>
                </div>
                <button
                  onClick={() => setInspectedElement(null)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-purple-400 font-semibold mb-1">Variable:</div>
                  <div className="bg-black/50 rounded px-2 py-1.5 font-mono text-purple-300 break-all">
                    {inspectedElement.variable}
                  </div>
                </div>

                <div>
                  <div className="text-blue-400 font-semibold mb-1">Value:</div>
                  <div className="bg-black/50 rounded px-2 py-1.5 font-mono text-blue-300 break-all max-h-20 overflow-y-auto">
                    {inspectedElement.value}
                  </div>
                </div>

                <div>
                  <div className="text-green-400 font-semibold mb-1">Component:</div>
                  <div className="bg-black/50 rounded px-2 py-1.5 font-mono text-green-300">
                    {inspectedElement.component}
                  </div>
                </div>

                <div>
                  <div className="text-yellow-400 font-semibold mb-1">Path:</div>
                  <div className="bg-black/50 rounded px-2 py-1.5 font-mono text-yellow-300 text-[10px] break-all">
                    {inspectedElement.path}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-[10px] text-gray-500 italic">
                  Tip: Click on any value to inspect details
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showVariable && (
        <div
          className="fixed bottom-20 left-4 z-50 pointer-events-none"
          data-debug-ignore
        >
          <div className="bg-purple-900/90 border border-purple-500/50 px-3 py-2 rounded-lg shadow-xl backdrop-blur-sm">
            <p className="text-purple-200 text-xs font-mono">
              <span className="font-bold">Variable Mode:</span> Hover to see variables | Click to inspect
            </p>
          </div>
        </div>
      )}
    </>
  );
};
