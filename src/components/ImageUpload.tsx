import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUploadThing } from '../lib/uploadthing';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (url: string) => void;
}

export default function ImageUpload({ currentImageUrl, onUpload }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        onUpload(res[0].url);
        setIsUploading(false);
        setProgress(0);
      }
    },
    onUploadProgress: (p) => {
      setProgress(p);
    },
    onUploadError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide an image file (PNG, JPG, etc)');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      await startUpload([file]);
    } catch (err) {
      setError('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        className={`relative w-32 h-32 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer group overflow-hidden ${
          dragActive ? 'border-[#0D5BFF] bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        {currentImageUrl ? (
          <>
            <img 
              src={currentImageUrl} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-[2.2rem]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2.2rem]">
               <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
             <Upload className="w-6 h-6 mb-2 group-hover:text-[#0D5BFF] transition-colors" />
             <span className="text-[8px] font-black uppercase tracking-widest">Upload ID</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4">
             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-[#0D5BFF]"
                />
             </div>
             <span className="text-[7px] font-black uppercase text-[#0B132B]">{Math.round(progress)}%</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100"
          >
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <p className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
