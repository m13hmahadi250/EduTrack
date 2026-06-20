import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (url: string) => void;
  onDelete?: () => void;
}

export default function ImageUpload({ currentImageUrl, onUpload, onDelete }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please provide an image file (PNG, JPG, etc)');
      return;
    }

    if (!auth.currentUser) {
      setError('You must be logged in to upload files');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Create FormData to send raw file to server for 'sharp' compression & webp conversion
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'profiles');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload', true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.publicUrl) {
              onUpload(data.publicUrl);
              setIsUploading(false);
              setProgress(0);
            } else {
              setError('Server did not return a valid public URL');
              setIsUploading(false);
            }
          } catch (e) {
            setError('Failed to parse upload response');
            setIsUploading(false);
          }
        } else {
          console.error("Upload server compression error:", xhr.status, xhr.responseText);
          setError(`Upload failed with status ${xhr.status}. Please check Cloudflare R2 configurations.`);
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        console.error("Upload network error during image post");
        setError('Upload failure due to network error.');
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
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
    <div className="flex flex-col items-center gap-2">
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
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-[2.2rem]">
               <Camera className="w-5 h-5 text-white hover:scale-110 transition-transform" />
               {onDelete && (
                 <button
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation();
                     onDelete();
                   }}
                   className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all hover:scale-110"
                   title="Delete Photo"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
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

      {currentImageUrl && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 active:scale-95 transition-all mt-1 cursor-pointer bg-transparent border-0 p-1"
        >
          <Trash2 className="w-3 h-3" />
          Remove Photo
        </button>
      )}

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
