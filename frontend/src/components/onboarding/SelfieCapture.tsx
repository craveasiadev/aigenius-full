/**
 * Photo Capture — onboarding photo step (shop image OR boss selfie).
 *
 * Three states managed by `viewState`:
 *   1. `select` → choose Camera or Upload
 *   2. `camera` → live camera preview + capture button
 *   3. `review` → confirm or retake
 *
 * Design language matches the rest of the AIpreneur app:
 *   • Glass cards + 3D plastic-key buttons
 *   • Solid theme-aware backdrop (no gradients, no glow)
 *   • Safe-area-inset aware
 *   • ≥44-px tap targets, `touch-manipulation`
 *   • Body-scroll locked while the modal is open
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, RotateCcw, Check, ArrowLeft, Sparkles,
  X, FlipHorizontal, Upload, Loader2,
} from 'lucide-react';
import {
  GLASS, BTN_3D_PRIMARY, BTN_3D_SECONDARY,
} from '../../lib/uiTokens';

interface SelfieCaptureProps {
  onComplete: (base64Image: string) => void;
  onBack: () => void;
  captureType?: 'selfie' | 'shop';
}

type ViewState = 'select' | 'camera' | 'review';

export const SelfieCapture = ({ onComplete, onBack, captureType = 'selfie' }: SelfieCaptureProps) => {
  const isShopCapture = captureType === 'shop';
  const [viewState, setViewState] = useState<ViewState>('select');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    isShopCapture ? 'environment' : 'user',
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Copy ─────────────────────────────────────────────────────────
  const title = isShopCapture ? 'Snap your shop' : "Time for a selfie";
  const subtitle = isShopCapture
    ? 'Take or upload a photo of your current shop or building.'
    : 'Take a photo to become the boss of your new shop.';
  const captureLabel = isShopCapture ? 'Snap shop' : 'Take photo';
  const uploadLabel = isShopCapture ? 'Upload from gallery' : 'Upload from gallery';
  const reviewHeading = isShopCapture ? 'Nice shop shot!' : 'Looking great!';
  const cameraTip = isShopCapture
    ? 'Position your shop inside the frame'
    : 'Position your face inside the oval';
  const submittedImageAlt = isShopCapture ? 'Captured shop image' : 'Captured selfie';
  const submitButtonLabel = isShopCapture ? 'Use this image' : 'Use this photo';

  // Keep front cam for selfie, back cam for shop image.
  useEffect(() => {
    setFacingMode(isShopCapture ? 'environment' : 'user');
  }, [isShopCapture]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Camera lifecycle ────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      // Stop any existing stream first.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please allow camera access or upload a photo instead.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (viewState === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [viewState, startCamera, stopCamera]);

  useEffect(() => {
    if (viewState === 'camera') startCamera();
  }, [facingMode, viewState, startCamera]);

  // ── Capture / upload / review ───────────────────────────────────
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Mirror selfies so the captured image matches what the user saw
    // in the preview (which we also mirrored via CSS).
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    setCapturedImage(canvas.toDataURL('image/png'));
    stopCamera();
    setViewState('review');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setViewState('review');
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    setViewState('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    setIsSubmitting(true);
    try {
      await onComplete(capturedImage);
    } catch (err) {
      console.error('Failed to submit photo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Camera + review states need a black background to avoid white
      // bars around the photo. Select state uses the themed page bg.
      className={`fixed inset-0 z-[100] flex flex-col ${
        viewState === 'select'
          ? 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50'
          : 'bg-black text-white'
      }`}
    >
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {/* ════════════════════════════════════════════════════════════
            SELECT — choose camera or upload
            ════════════════════════════════════════════════════════════ */}
        {viewState === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {/* Faint dotted-grid texture, same as the app background */}
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 -z-10 opacity-[0.12] dark:opacity-[0.06]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(100,116,139,0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Top bar — back link */}
            <div
              className="px-3 sm:px-4 pt-3 sm:pt-4"
              style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
            >
              <button
                onClick={onBack}
                className={`${GLASS} min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 active:scale-95 transition-transform touch-manipulation`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-12">
              {/* Hero card */}
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`${GLASS} w-full max-w-md rounded-3xl p-6 sm:p-8 text-center`}
              >
                <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800">
                  <Camera className="w-8 h-8 text-white" />
                </span>
                <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  {subtitle}
                </p>

                {/* Action buttons */}
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setViewState('camera')}
                    className={`${BTN_3D_PRIMARY} min-h-[56px] px-6 text-base`}
                  >
                    <Camera className="w-5 h-5" />
                    {captureLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`${BTN_3D_SECONDARY} min-h-[56px] px-6 text-base`}
                  >
                    <Upload className="w-5 h-5" />
                    {uploadLabel}
                  </button>
                </div>
              </motion.div>

              {/* Helper text underneath */}
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 max-w-md text-center">
                {isShopCapture
                  ? 'Tip: A clear shot of the front of the shop works best.'
                  : 'Tip: Stand somewhere with good light and face the camera.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            CAMERA — live preview + capture
            ════════════════════════════════════════════════════════════ */}
        {viewState === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col bg-black"
          >
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Camera-error overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
                  <div className={`${GLASS} rounded-3xl p-6 text-center max-w-sm w-full`}>
                    <Camera className="w-12 h-12 text-slate-500 dark:text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 dark:text-slate-200 text-sm mb-4">{cameraError}</p>
                    <button
                      onClick={() => {
                        setViewState('select');
                        fileInputRef.current?.click();
                      }}
                      className={`${BTN_3D_PRIMARY} min-h-[48px] px-5 text-sm w-full`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload instead
                    </button>
                  </div>
                </div>
              )}

              {/* Frame guide overlay */}
              {!cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {isShopCapture ? (
                    <div className="w-[85%] h-[52%] md:w-[70%] md:h-[60%] border-[3px] border-dashed border-white/50 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  ) : (
                    <div className="w-64 h-72 md:w-96 md:h-[450px] border-[3px] border-dashed border-white/50 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                  )}
                </div>
              )}

              {/* Top controls — close + flip */}
              <div
                className="absolute top-0 left-0 right-0 px-4 pt-4 flex justify-between items-center z-20"
                style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
              >
                <button
                  onClick={() => setViewState('select')}
                  aria-label="Close camera"
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={toggleCamera}
                  aria-label="Flip camera"
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
                >
                  <FlipHorizontal className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Tip pill */}
              {!cameraError && (
                <div
                  className="absolute top-20 left-0 right-0 flex justify-center px-4 pointer-events-none z-10"
                  style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
                >
                  <p className="text-white/95 text-xs sm:text-sm bg-black/55 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full inline-block">
                    {cameraTip}
                  </p>
                </div>
              )}

              {/* Capture button — large, central, 3D feel */}
              <div
                className="absolute left-1/2 -translate-x-1/2 z-30"
                style={{ bottom: 'max(env(safe-area-inset-bottom), 28px)' }}
              >
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!!cameraError}
                  aria-label="Take photo"
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-b-[6px] border-slate-300 active:translate-y-[4px] active:border-b-[2px] transition-[transform,border-bottom-width] duration-100 touch-manipulation disabled:opacity-40 disabled:active:translate-y-0 disabled:active:border-b-[6px]"
                >
                  {/* Inner ring */}
                  <span className="absolute inset-2 rounded-full border-[3px] border-slate-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════
            REVIEW — confirm or retake
            ════════════════════════════════════════════════════════════ */}
        {viewState === 'review' && capturedImage && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black flex flex-col z-[60]"
          >
            {/* Photo */}
            <div className="absolute inset-0 z-0">
              <img
                src={capturedImage}
                alt={submittedImageAlt}
                className="w-full h-full object-contain md:object-cover bg-black"
              />
            </div>

            {/* Top-left status pill */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="absolute z-10 left-3 sm:left-4"
              style={{ top: 'max(env(safe-area-inset-top), 16px)' }}
            >
              <div className={`${GLASS} inline-flex items-center gap-2 px-3 py-1.5 rounded-full`}>
                <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {reviewHeading}
                </span>
              </div>
            </motion.div>

            {/* Top-right sparkle */}
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 18 }}
              className="absolute z-10 right-3 sm:right-4"
              style={{ top: 'max(env(safe-area-inset-top), 16px)' }}
            >
              <span className="w-10 h-10 rounded-full bg-amber-400 border-b-[3px] border-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </span>
            </motion.div>

            {/* Bottom action bar */}
            <div
              className="absolute bottom-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 pb-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 20px))' }}
            >
              <div className="flex gap-3 max-w-md mx-auto w-full">
                {/* Retake — dark variant of 3D secondary so it looks
                    right on a black photo backdrop. */}
                <button
                  type="button"
                  onClick={retake}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800/90 text-white text-base font-bold border border-white/10 border-b-[5px] border-b-slate-900 hover:bg-slate-700 active:translate-y-[3px] active:border-b-[2px] transition-[transform,border-bottom-width,background-color] duration-100 min-h-[56px] px-6 touch-manipulation backdrop-blur-md"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake
                </button>

                {/* Use this image — emerald 3D primary */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-white text-base font-bold border-b-[5px] border-emerald-700 hover:bg-emerald-400 hover:border-emerald-600 active:translate-y-[3px] active:border-b-[2px] disabled:opacity-60 disabled:hover:bg-emerald-500 disabled:active:translate-y-0 disabled:active:border-b-[5px] transition-[transform,border-bottom-width,background-color] duration-100 min-h-[56px] px-6 touch-manipulation"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {submitButtonLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SelfieCapture;
