/**
 * Floating QR pill that hangs over the WorldGlobeHub on /s/aipreneur.
 *
 * Tap → modal opens with the student's QR code. Workshop staff scans
 * the code with `/staff/scan` to add the workshop's shop to the
 * student's globe carousel.
 *
 * QR payload format is defined in `lib/workshopShops.ts` so the
 * scanner can validate the QR is one of ours before unlocking.
 */
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, X } from 'lucide-react';
import { buildStudentQRPayload } from '../lib/workshopShops';

interface StudentQRButtonProps {
  studentId: string;
  studentName?: string;
}

export function StudentQRButton({ studentId, studentName }: StudentQRButtonProps) {
  const [open, setOpen] = useState(false);
  // Regenerate on every modal open so the embedded `ts` is fresh —
  // discourages stale screenshots from being re-scanned.
  const [payload, setPayload] = useState('');

  const handleOpen = () => {
    setPayload(buildStudentQRPayload(studentId, studentName));
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Show my QR code"
        className="fixed z-40 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-violet-600 text-white text-xs font-bold shadow-lg border-b-[3px] border-violet-800 active:translate-y-[2px] active:border-b-[1px] transition-[transform,border-bottom-width] duration-100 touch-manipulation"
        style={{
          bottom: 'max(env(safe-area-inset-bottom), 130px)',
          right: 'max(env(safe-area-inset-right), 16px)',
        }}
      >
        <QrCode className="w-4 h-4" />
        My QR
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-slate-950/80 backdrop-blur"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>

              <div className="text-center mb-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-violet-600 mb-1">
                  Workshop pass
                </p>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {studentName || 'Your AIpreneur'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Show this to the workshop staff to unlock their shop on
                  your globe.
                </p>
              </div>

              <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-slate-200">
                <QRCodeSVG
                  value={payload}
                  size={240}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  marginSize={2}
                />
              </div>

              <p className="text-[10px] text-slate-400 mt-3 text-center font-mono break-all">
                ID: {studentId}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
