/**
 * PracticeTeleprompter Component
 *
 * Full-screen camera recording with teleprompter overlay.
 * Records video in memory (never saved), max 60 seconds.
 * Shows preview after recording with try-again / done options.
 * Front/back camera toggle. Real scrolling teleprompter.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Square, RotateCcw, Check, SwitchCamera } from 'lucide-react';

interface PracticeTeleprompterProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  scriptHook: string;
  scriptScenes: string[];
  scriptCta: string;
}

type ViewState = 'camera' | 'preview';

const MAX_DURATION = 20; // seconds

export const PracticeTeleprompter = ({
  isOpen,
  onClose,
  onDone,
  scriptHook,
  scriptScenes,
  scriptCta,
}: PracticeTeleprompterProps) => {
  const [viewState, setViewState] = useState<ViewState>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please allow camera and microphone access.');
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      stopRecording();
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
      setViewState('camera');
      setIsRecording(false);
      setRecordingTime(0);
      setScrollProgress(0);
      return;
    }

    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart camera on facing mode change
  useEffect(() => {
    if (isOpen && viewState === 'camera' && !isRecording) {
      startCamera();
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get supported MIME type
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();

    try {
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setViewState('preview');
        stopCamera();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      setScrollProgress(0);

      // Timer for recording time + scroll progress
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
        // Scroll progress: 0 to 1 over MAX_DURATION
        setScrollProgress(Math.min(elapsed / MAX_DURATION, 1));

        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 200);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setCameraError('Recording is not supported on this browser.');
    }
  }, [stopCamera]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (scrollTimerRef.current) {
      clearInterval(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Try again
  const handleTryAgain = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setViewState('camera');
    setRecordingTime(0);
    setScrollProgress(0);
    startCamera();
  }, [videoUrl, startCamera]);

  // Toggle camera
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Build script lines for teleprompter
  const scriptLines = [
    { text: scriptHook, type: 'hook' as const },
    ...scriptScenes.map((s, i) => ({ text: `${i + 1}. ${s}`, type: 'scene' as const })),
    { text: scriptCta, type: 'cta' as const },
  ];

  // Calculate total teleprompter height and current offset
  // Each line is roughly 60px. We want the first line to start at the bottom of the window
  // and scroll up so the last line reaches the center by the end.
  const lineHeight = 64;
  const totalTextHeight = scriptLines.length * lineHeight;
  const teleprompterWindowHeight = 200; // visible area height in px
  // Start: text is below the window. End: text has scrolled through.
  const scrollOffset = scrollProgress * (totalTextHeight + teleprompterWindowHeight * 0.5);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black flex flex-col"
    >
      <AnimatePresence mode="wait">
        {/* ========== CAMERA VIEW ========== */}
        {viewState === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col bg-black relative"
          >
            {/* Camera preview */}
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Camera error */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-white text-lg mb-4">{cameraError}</p>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium border border-white/20"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              )}

              {/* Top controls */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
                <button
                  onClick={() => { stopRecording(); onClose(); }}
                  className="w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center"
                >
                  <X className="w-6 h-6 text-white" />
                </button>

                <div className="flex items-center gap-3">
                  {/* Recording timer */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full"
                    >
                      <motion.div
                        className="w-3 h-3 bg-red-500 rounded-full"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-white font-mono font-bold text-sm">
                        {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
                      </span>
                    </motion.div>
                  )}

                  {/* Camera flip - always visible */}
                  <button
                    onClick={toggleCamera}
                    disabled={isRecording}
                    className="w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center disabled:opacity-30"
                    title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                  >
                    <SwitchCamera className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Camera mode label */}
              {!isRecording && !cameraError && (
                <div className="absolute top-16 right-4 z-20">
                  <span className="text-white/50 text-[10px] font-bold bg-black/30 backdrop-blur px-2 py-1 rounded-full uppercase tracking-wider">
                    {facingMode === 'user' ? 'Front' : 'Back'}
                  </span>
                </div>
              )}

              {/* ===== TELEPROMPTER OVERLAY ===== */}
              <div className="absolute bottom-24 left-0 right-0 z-10 pointer-events-none" style={{ height: `${teleprompterWindowHeight}px` }}>
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

                {/* Center reading line indicator */}
                <div className="absolute top-1/2 left-4 right-4 h-px bg-white/20" />
                <div className="absolute top-1/2 left-2 -translate-y-1/2 text-white/30 text-lg">▶</div>

                {/* Scrolling text */}
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="px-8 transition-transform duration-200 ease-linear"
                    style={{
                      transform: `translateY(${teleprompterWindowHeight - scrollOffset}px)`,
                    }}
                  >
                    {scriptLines.map((line, i) => (
                      <div
                        key={i}
                        className="py-2"
                        style={{ height: `${lineHeight}px`, display: 'flex', alignItems: 'center' }}
                      >
                        {line.type === 'hook' && (
                          <p className="text-white text-xl md:text-2xl font-black leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {line.text}
                          </p>
                        )}
                        {line.type === 'scene' && (
                          <p className="text-white/90 text-base md:text-lg font-medium leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {line.text}
                          </p>
                        )}
                        {line.type === 'cta' && (
                          <p className="text-cyan-300 text-lg md:text-xl font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {line.text}
                          </p>
                        )}
                      </div>
                    ))}
                    {/* Extra padding so text fully scrolls out */}
                    <div style={{ height: `${teleprompterWindowHeight}px` }} />
                  </div>
                </div>
              </div>

              {/* Progress bar during recording */}
              {isRecording && (
                <div className="absolute bottom-[7.5rem] left-0 right-0 z-20 px-4">
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${scrollProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Record / Stop button */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6">
                {!isRecording ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={startRecording}
                    disabled={!!cameraError}
                    className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/30 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-white rounded-full" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={stopRecording}
                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-red-400/50 animate-pulse"
                  >
                    <Square className="w-8 h-8 text-white fill-white" />
                  </motion.button>
                )}
              </div>

              {/* Max duration hint */}
              {!isRecording && !cameraError && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
                  <span className="text-white/60 text-xs bg-black/40 backdrop-blur px-4 py-1.5 rounded-full">
                    Max 20 seconds — Tap to record
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ========== PREVIEW VIEW ========== */}
        {viewState === 'preview' && videoUrl && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col bg-black"
          >
            {/* Video playback - responsive */}
            <div className="flex-1 flex items-center justify-center bg-black p-4 md:p-8">
              <video
                ref={previewVideoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full max-w-4xl max-h-[70vh] rounded-xl md:rounded-2xl object-contain bg-black shadow-2xl"
              />
            </div>

            {/* Disclaimer + Actions */}
            <div className="bg-[#111] p-4 md:p-6 border-t border-white/10">
              {/* Disclaimer */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 mb-4 text-center max-w-lg mx-auto">
                <p className="text-yellow-300 text-xs font-bold">
                  This was just practice! Video is NOT saved anywhere.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 max-w-lg mx-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTryAgain}
                  className="flex-1 py-3 md:py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (videoUrl) URL.revokeObjectURL(videoUrl);
                    setVideoUrl(null);
                    onDone();
                  }}
                  className="flex-1 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <Check className="w-5 h-5" />
                  Done Practicing!
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PracticeTeleprompter;
