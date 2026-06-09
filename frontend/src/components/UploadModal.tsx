import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera } from 'lucide-react';
import { useState, useRef } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  onFileSelected?: (file: File, previewUrl: string) => void;
}

export const UploadModal = ({ isOpen, onClose, onUpload, onFileSelected }: UploadModalProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        setPreview(previewUrl);
        // Notify parent component if callback provided
        if (onFileSelected) {
          onFileSelected(file, previewUrl);
          handleClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      onUpload(file);
      setPreview(null);
      onClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card rounded-2xl p-6 max-w-lg w-full mx-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                  AI Generate Your Art
                </h3>
                <button onClick={handleClose}>
                  <X className="w-6 h-6" style={{ color: 'var(--text)' }} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {preview && !onFileSelected ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex-1 min-h-[56px] rounded-xl glass-card hover:bg-white/10 font-medium transition-colors"
                      style={{ color: 'var(--text)' }}
                    >
                      Change
                    </button>
                    <button
                      onClick={handleUpload}
                      className="flex-1 min-h-[56px] rounded-xl bg-gradient-to-r from-accent to-purple-600 text-white font-semibold shadow-accent-glow hover:shadow-2xl transition-shadow"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[80px] rounded-xl glass-card hover:bg-white/10 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-accent" />
                    <span className="font-medium" style={{ color: 'var(--text)' }}>
                      Take Photo
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full min-h-[80px] rounded-xl glass-card hover:bg-white/10 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-accent" />
                    <span className="font-medium" style={{ color: 'var(--text)' }}>
                      Choose from Gallery
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
