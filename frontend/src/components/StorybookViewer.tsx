import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { FlipBook, FlipBookRef } from './FlipBook';
import type { GeneratedChapter } from '../types/models';

interface StorybookViewerProps {
  chapter: GeneratedChapter;
  onClose: () => void;
  userId?: string;
  geniusProfileId?: string;
}

export const StorybookViewer = ({ chapter, onClose, userId, geniusProfileId }: StorybookViewerProps) => {
  const flipBookRef = useRef<FlipBookRef>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);

  const totalPages = chapter.pages.length + 4;

  const handleNext = () => {
    if (!isFlipping && flipBookRef.current) {
      setIsFlipping(true);
      flipBookRef.current.next();
      setTimeout(() => setIsFlipping(false), 600);
    }
  };

  const handlePrev = () => {
    if (!isFlipping && flipBookRef.current) {
      setIsFlipping(true);
      flipBookRef.current.prev();
      setTimeout(() => setIsFlipping(false), 600);
    }
  };

  const handleTurning = (pageNumber: number) => {
    return true;
  };

  const handleTurned = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    const handleResize = () => {
      if (flipBookRef.current && window.$) {
        const container = document.querySelector('.flipbook');
        if (container) {
          const maxWidth = Math.min(window.innerWidth - 200, 900);
          const maxHeight = Math.min(window.innerHeight - 200, 600);
          window.$(container).turn('size', maxWidth, maxHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages - 1;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm">
        <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
          {chapter.cover.title}
        </h1>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="h-full flex items-center justify-center px-4 py-20">
        <div className="relative w-full max-w-7xl h-full flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.1, x: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrev}
            disabled={isFirstPage || isFlipping}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all z-10 ${
              isFirstPage || isFlipping
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-white text-purple-600 hover:shadow-purple-500/50'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex-1 flex items-center justify-center">
            <FlipBook
              ref={flipBookRef}
              chapter={chapter}
              onTurning={handleTurning}
              onTurned={handleTurned}
              width={Math.min(window.innerWidth - 200, 900)}
              height={Math.min(window.innerHeight - 200, 600)}
              userId={userId}
              geniusProfileId={geniusProfileId}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.1, x: 3 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNext}
            disabled={isLastPage || isFlipping}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all z-10 ${
              isLastPage || isFlipping
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-white text-purple-600 hover:shadow-purple-500/50'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-white text-sm font-semibold">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
};
