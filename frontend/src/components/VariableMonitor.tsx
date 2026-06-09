import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Activity, Minimize2, Maximize2, RefreshCw, MoveLeft, MoveRight, Search, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface MonitoredVariable {
  name: string;
  value: string;
  type: string;
  updated: number;
}

export const VariableMonitor = () => {
  const showMonitor = useStore((state) => state.showMonitor);
  const currentUser = useStore((state) => state.currentUser);
  const location = useLocation();

  const [variables, setVariables] = useState<MonitoredVariable[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!showMonitor) return;

    const updateVariables = () => {
      const now = Date.now();
      const newVariables: MonitoredVariable[] = [];

      if (currentUser) {
        newVariables.push({
          name: 'currentUser.id',
          value: currentUser.id.toString(),
          type: 'string',
          updated: now,
        });
        newVariables.push({
          name: 'currentUser.name',
          value: currentUser.name,
          type: 'string',
          updated: now,
        });
        newVariables.push({
          name: 'currentUser.email',
          value: currentUser.email,
          type: 'string',
          updated: now,
        });
        newVariables.push({
          name: 'currentUser.role',
          value: currentUser.role,
          type: 'string',
          updated: now,
        });
      }

      newVariables.push({
        name: 'location.pathname',
        value: location.pathname,
        type: 'string',
        updated: now,
      });

      // Scan DOM for data-variable elements
      const elementsWithVariables = document.querySelectorAll('[data-variable]:not([data-debug-ignore] *)');
      const seenVariables = new Set<string>();

      elementsWithVariables.forEach((element) => {
        const variableName = element.getAttribute('data-variable');
        const component = element.getAttribute('data-component') || 'Unknown';
        const value = element.textContent?.trim() || '';

        if (variableName && !seenVariables.has(variableName) && value) {
          seenVariables.add(variableName);

          // Determine type based on value
          let type = 'string';
          if (!isNaN(Number(value)) && value !== '') {
            type = 'number';
          } else if (value === 'true' || value === 'false') {
            type = 'boolean';
          }

          newVariables.push({
            name: `${component}.${variableName}`,
            value: value,
            type: type,
            updated: now,
          });
        }
      });

      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          newVariables.push({
            name: 'localStorage.currentUser',
            value: parsed.name || 'N/A',
            type: 'object',
            updated: now,
          });
        } catch (e) {
          console.error('Failed to parse stored user');
        }
      }

      const sessionKeys = Object.keys(sessionStorage);
      if (sessionKeys.length > 0) {
        newVariables.push({
          name: 'sessionStorage.keys',
          value: sessionKeys.length.toString(),
          type: 'number',
          updated: now,
        });
      }

      const urlParams = new URLSearchParams(location.search);
      if (urlParams.toString()) {
        newVariables.push({
          name: 'url.params',
          value: urlParams.toString(),
          type: 'string',
          updated: now,
        });
      }

      // OpenAI debug data removed - no longer using localStorage

      setVariables(newVariables);
    };

    updateVariables();
    const interval = setInterval(updateVariables, 1000);

    return () => clearInterval(interval);
  }, [showMonitor, currentUser, location, refreshKey]);

  if (!showMonitor) return null;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Filter variables based on search query
  const filteredVariables = variables.filter((variable) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      variable.name.toLowerCase().includes(query) ||
      variable.value.toLowerCase().includes(query) ||
      variable.type.toLowerCase().includes(query)
    );
  });

  return (
    <AnimatePresence>
      {isMinimized ? (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsMinimized(false)}
          className={`fixed top-20 z-[9998] ${position === 'right' ? 'right-4' : 'left-4'}`}
          data-debug-ignore
          title="Open Variable Monitor"
        >
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-full shadow-2xl border-2 border-blue-400 hover:scale-110 transition-transform">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">{variables.length}</span>
          </div>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: position === 'right' ? 300 : -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: position === 'right' ? 300 : -300 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-20 bottom-4 z-[9998] w-80 max-w-[calc(100vw-2rem)] flex flex-col ${position === 'right' ? 'right-4' : 'left-4'}`}
          data-debug-ignore
        >
          <div className="bg-gray-900 border-2 border-blue-500 rounded-xl shadow-2xl overflow-hidden flex flex-col h-full">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white animate-pulse" />
                <h3 className="font-bold text-white text-sm">Variable Monitor</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPosition(position === 'right' ? 'left' : 'right')}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title={position === 'right' ? 'Move to Left' : 'Move to Right'}
                >
                  {position === 'right' ? (
                    <MoveLeft className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <MoveRight className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            <div className="px-3 pt-3 pb-2 border-b border-gray-700 bg-gray-800/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables..."
                  className="w-full bg-black/50 text-white text-xs rounded-lg pl-8 pr-8 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                <span>{filteredVariables.length} variables</span>
                {searchQuery && <span className="text-blue-400">Filtered</span>}
              </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
              {filteredVariables.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No matches found' : 'No variables detected'}</p>
                  <p className="text-xs mt-1">{searchQuery ? 'Try a different search' : 'Navigate to a page with data'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredVariables.map((variable, index) => (
                    <motion.div
                      key={`${variable.name}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="bg-black/30 rounded-lg p-2.5 border border-gray-700 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-blue-400 font-semibold break-all">
                          {variable.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 whitespace-nowrap flex-shrink-0">
                          {variable.type}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-white bg-black/50 rounded px-2 py-1.5 break-all">
                        {variable.value}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 px-3 py-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>Updates: Every 1s</span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
