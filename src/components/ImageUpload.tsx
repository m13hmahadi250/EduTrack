import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import ImageCropModal from './ImageCropModal';

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
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initiateCrop = (file: File) => {
    const isImageFile = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImageFile) {
      setError('Please provide an image file (JPG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (file: File) => {
    const isImageFile = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImageFile) {
      setError('Please provide an image file (JPG, PNG, WEBP)');
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
      initiateCrop(e.dataTransfer.files[0]);
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
          dragActive
            ? 'border-[#0D5BFF] bg-blue-50 dark:bg-blue-950/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={(e) => e.target.files?.[0] && initiateCrop(e.target.files[0])}
        />

        {currentImageUrl ? (
          <>
            <img 
              src={currentImageUrl} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-[2.2rem]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-[2.2rem]">
               <Camera className="w-5 h-5 text-white hover:scale-110 transition-transform" />
               {onDelete && (
                 <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all hover:scale-110 min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Delete Photo"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
             <Upload className="w-6 h-6 mb-2 group-hover:text-[#0D5BFF] transition-colors" />
             <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center p-4">
             <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-[#0D5BFF]"
                 />
              </div>
              <span className="text-xs font-bold text-[#0B132B] dark:text-white">{Math.round(progress)}%</span>
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
          className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 active:scale-95 transition-all mt-1 cursor-pointer bg-transparent border-0 p-1.5 min-h-[36px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove Photo
        </button>
      )}

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            onConfirm={(croppedFile) => {
              setCropImageSrc(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
              handleUpload(croppedFile);
            }}
            onCancel={() => {
              setCropImageSrc(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
