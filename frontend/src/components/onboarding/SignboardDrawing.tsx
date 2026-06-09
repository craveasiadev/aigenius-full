/**
 * Signboard Drawing Component
 *
 * Stage 3 of onboarding: Draw or upload a signboard for the shop.
 * Features a simple canvas drawing tool with colors and brush sizes.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Paintbrush, Upload, RotateCcw, Check, ArrowLeft, Eraser, Trash2 } from 'lucide-react';

interface SignboardDrawingProps {
  onComplete: (base64Image: string) => void;
  onBack: () => void;
}

type DrawMode = 'draw' | 'upload';

const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FF8C00', // Orange
  '#000000', // Black
];

const BRUSH_SIZES = [
  { size: 4, label: 'S' },
  { size: 8, label: 'M' },
  { size: 16, label: 'L' },
];

export const SignboardDrawing = ({ onComplete, onBack }: SignboardDrawingProps) => {
  const [mode, setMode] = useState<DrawMode>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1].size);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  useEffect(() => {
    if (mode !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Setup context
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;

    // Fill with white background
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    contextRef.current = context;
  }, [mode]);

  // Update brush settings
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = isEraser ? '#FFFFFF' : currentColor;
    contextRef.current.lineWidth = brushSize;
  }, [currentColor, brushSize, isEraser]);

  // Get coordinates from event
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Drawing handlers
  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (!contextRef.current) return;

    const { x, y } = getCoordinates(event);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (!isDrawing || !contextRef.current) return;

    const { x, y } = getCoordinates(event);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    setHasDrawn(false);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Get canvas as base64
  const getCanvasImage = useCallback(() => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, []);

  // Reset
  const reset = () => {
    if (mode === 'draw') {
      clearCanvas();
    } else {
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Submit
  const handleSubmit = async () => {
    let imageData: string | null = null;

    if (mode === 'draw') {
      imageData = getCanvasImage();
    } else {
      imageData = uploadedImage;
    }

    if (!imageData) return;

    setIsSubmitting(true);
    try {
      await onComplete(imageData);
    } catch (err) {
      console.error('Failed to submit signboard:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = mode === 'draw' ? hasDrawn : !!uploadedImage;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center p-4"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="max-w-xl w-full">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Paintbrush className="w-6 h-6 text-white" />
              <h2 className="text-white font-bold text-xl">Design Your Signboard!</h2>
            </div>
            <p className="text-white/80 text-sm">
              Draw your shop's name - be creative!
            </p>
          </div>

          <div className="p-6">
            {/* Mode toggle */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setMode('draw')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  mode === 'draw'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Paintbrush className="w-4 h-4" />
                Draw
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  mode === 'upload'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>

            {mode === 'draw' ? (
              <>
                {/* Drawing tools */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                  {/* Colors */}
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setCurrentColor(color);
                          setIsEraser(false);
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          currentColor === color && !isEraser
                            ? 'border-gray-800 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-gray-200" />

                  {/* Brush sizes */}
                  <div className="flex gap-2">
                    {BRUSH_SIZES.map(({ size, label }) => (
                      <button
                        key={size}
                        onClick={() => setBrushSize(size)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                          brushSize === size
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-gray-200" />

                  {/* Eraser */}
                  <button
                    onClick={() => setIsEraser(!isEraser)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isEraser
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  {/* Clear */}
                  <button
                    onClick={clearCanvas}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Canvas */}
                <div className="border-4 border-dashed border-orange-200 rounded-2xl overflow-hidden mb-4">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full aspect-[2/1] cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </>
            ) : (
              /* Upload area */
              <div className="mb-4">
                {uploadedImage ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Uploaded signboard"
                      className="w-full aspect-[2/1] object-contain bg-gray-100"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[2/1] border-4 border-dashed border-orange-200 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-orange-50 transition-colors"
                  >
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 font-medium">Click to upload your signboard</p>
                      <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
              {canSubmit && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={reset}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {mode === 'draw' ? 'Clear' : 'Change'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        I Love It!
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>

            {/* Tip */}
            {mode === 'draw' && !hasDrawn && (
              <p className="text-center text-gray-500 text-sm mt-4">
                Draw your shop's name or logo - this will appear on your shop!
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SignboardDrawing;
