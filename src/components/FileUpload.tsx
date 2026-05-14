import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUploadThing } from '../lib/uploadthing';

interface FileUploadProps {
  currentFileUrl?: string;
  onUpload: (url: string) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  label?: string;
}

export default function FileUpload({ 
  currentFileUrl, 
  onUpload, 
  allowedTypes = ['image/*', 'application/pdf'],
  maxSizeMB = 5,
  label = 'Upload File'
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("fileUploader", {
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
    }
  });

  const handleUpload = async (file: File) => {
    // Basic type check on client side
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
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
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  const isImage = currentFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)|(image\/)/i);

  return (
    <div className="space-y-3 w-full">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${
          dragActive ? 'border-[#0D5BFF] bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept={allowedTypes.join(',')}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        {currentFileUrl ? (
          <div className="space-y-3">
            {isImage ? (
              <img 
                src={currentFileUrl} 
                alt="Uploaded" 
                className="w-24 h-24 object-cover rounded-xl mx-auto shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-[#0D5BFF]" />
              </div>
            )}
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
              <CheckCircle className="w-3 h-3" />
              <span>File Uploaded</span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Click to change file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-400">
             <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
               <Upload className="w-5 h-5 group-hover:text-[#0D5BFF] transition-colors" />
             </div>
             <span className="text-xs font-bold text-slate-600 mb-1">{label}</span>
             <p className="text-[10px] text-slate-400">Drag & drop or click to browse</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 rounded-2xl z-10">
             <Loader2 className="w-8 h-8 text-[#0D5BFF] animate-spin mb-3" />
             <div className="w-full max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-[#0D5BFF]"
                />
             </div>
             <span className="text-[10px] font-black uppercase text-[#0B132B]">{Math.round(progress)}% Uploading</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100 overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
