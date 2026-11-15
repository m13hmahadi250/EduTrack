import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

interface FileUploadProps {
  currentFileUrl?: string;
  onUpload: (url: string) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  label?: string;
  folder?: 'nid' | 'documents' | 'homework' | 'profiles';
}

export default function FileUpload({ 
  currentFileUrl, 
  onUpload, 
  allowedTypes = ['image/*', 'application/pdf'],
  maxSizeMB = 5,
  label = 'Upload File',
  folder = 'documents',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const explicitAccept = allowedTypes
    .flatMap((t) => {
      if (t === 'image/*') return ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];
      if (t === 'application/pdf') return ['application/pdf', '.pdf'];
      return [t];
    })
    .join(',');

  const handleUpload = async (file: File) => {
    // Basic type check on client side (supports Android WebView files with empty MIME by extension check)
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.replace('/*', '');
        if (prefix === 'image') {
          return file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
        }
        return file.type.startsWith(prefix);
      }
      if (type === 'application/pdf') {
        return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      }
      return file.type === type;
    });

    if (!isAllowed) {
      setError(`Invalid file type. Allowed: JPG, PNG, WEBP, PDF`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`);
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
      const idToken = await auth.currentUser.getIdToken();
      const isImg = file.type.startsWith('image/');
      const targetFolder = folder || 'documents';
      
      if (isImg) {
        // Use server-side compression endpoint
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', targetFolder);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/storage/upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

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
            console.error("Upload image compression error:", xhr.status, xhr.responseText);
            setError(`Upload failed with status ${xhr.status}.`);
            setIsUploading(false);
          }
        };

        xhr.onerror = () => {
          setError('Upload failed due to network error.');
          setIsUploading(false);
        };

        xhr.send(formData);
      } else {
        // Fallback to legacy/standard presign direct upload for docs (PDFs, etc)
        const response = await fetch('/api/storage/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            folder: targetFolder,
          })
        });

        const responseText = await response.text();
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error("Failed to parse response:", responseText);
          throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`);
        }

        if (!response.ok) {
          const errorDetail = responseData.message || responseData.error || responseData.details || responseText || 'Unknown server error';
          throw new Error(`Storage error (${response.status}): ${errorDetail}`);
        }

        const { uploadUrl, publicUrl } = responseData;
        if (!uploadUrl || !publicUrl) {
          throw new Error('Server did not return upload URLs');
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress((e.loaded / e.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            onUpload(publicUrl);
            setIsUploading(false);
            setProgress(0);
          } else {
            console.error("XHR Upload Failed:", xhr.status, xhr.statusText, xhr.responseText);
            setError(`Upload failed with status ${xhr.status}.`);
            setIsUploading(false);
          }
        };

        xhr.onerror = () => {
          setError('Network error during upload.');
          setIsUploading(false);
        };

        xhr.send(file);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
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
        className={`relative w-full p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center text-center min-h-[140px] ${
          dragActive
            ? 'border-[#0D5BFF] bg-blue-50 dark:bg-blue-950/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept={explicitAccept}
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
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-[#0D5BFF]" />
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle className="w-4 h-4" />
              <span>File Uploaded</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tap to replace file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
             <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-700">
               <Upload className="w-5 h-5 group-hover:text-[#0D5BFF] transition-colors" />
             </div>
             <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</span>
             <p className="text-xs text-slate-500 dark:text-slate-400">Tap to choose JPG, PNG or PDF</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 rounded-2xl z-10">
             <Loader2 className="w-8 h-8 text-[#0D5BFF] animate-spin mb-3" />
             <div className="w-full max-w-[140px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-[#0D5BFF]"
                />
             </div>
             <span className="text-xs font-bold uppercase text-[#0B132B] dark:text-white">{Math.round(progress)}% Uploading</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 overflow-hidden"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
