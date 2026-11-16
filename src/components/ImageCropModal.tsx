import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useBackHandler } from '../utils/mobileWebView';

interface ImageCropModalProps {
  imageSrc: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageSrc, onConfirm, onCancel }: ImageCropModalProps) {
  useBackHandler(true, onCancel, 'image-crop-modal');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number } | null>(null);

  const VIEWPORT_SIZE = 280; // 280px x 280px visual cropper

  // Parse natural size when image loads
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      setNaturalDimensions({ width, height });

      // Calculate initial base size to fit the viewport (aspect ratio preserve)
      const aspect = width / height;
      let baseWidth = VIEWPORT_SIZE;
      let baseHeight = VIEWPORT_SIZE;

      if (aspect > 1) {
        // Landscape
        baseHeight = VIEWPORT_SIZE;
        baseWidth = VIEWPORT_SIZE * aspect;
      } else {
        // Portrait
        baseWidth = VIEWPORT_SIZE;
        baseHeight = VIEWPORT_SIZE / aspect;
      }

      setBaseDimensions({ width: baseWidth, height: baseHeight });
      // Center the image initially
      setOffset({
        x: (VIEWPORT_SIZE - baseWidth) / 2,
        y: (VIEWPORT_SIZE - baseHeight) / 2,
      });
      setZoom(1);
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle zooming updates and maintain constraints
  const handleZoomChange = (newZoomValue: number) => {
    const clampedZoom = Math.max(1, Math.min(4, newZoomValue));
    setZoom(clampedZoom);
  };

  // Rotate clockwise by 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments
  const handleReset = () => {
    if (baseDimensions) {
      setOffset({
        x: (VIEWPORT_SIZE - baseDimensions.width) / 2,
        y: (VIEWPORT_SIZE - baseDimensions.height) / 2,
      });
      setZoom(1);
      setRotation(0);
    }
  };

  // Clamps offset to prevent pulling any transparent/empty space inside the viewport
  const clampOffset = (
    x: number, 
    y: number, 
    currentWidth: number, 
    currentHeight: number, 
    r: number
  ) => {
    if (!baseDimensions) return { x, y };

    // Determine the actual visual size dimensions after taking rotation into account
    const isRotated90 = r === 90 || r === 270;
    const w = isRotated90 ? currentHeight : currentWidth;
    const h = isRotated90 ? currentWidth : currentHeight;

    let clampedX = x;
    if (w >= VIEWPORT_SIZE) {
      const minX = VIEWPORT_SIZE - (w + baseDimensions.width) / 2;
      const maxX = (w - baseDimensions.width) / 2;
      clampedX = Math.max(minX, Math.min(maxX, x));
    } else {
      clampedX = (VIEWPORT_SIZE - baseDimensions.width) / 2;
    }

    let clampedY = y;
    if (h >= VIEWPORT_SIZE) {
      const minY = VIEWPORT_SIZE - (h + baseDimensions.height) / 2;
      const maxY = (h - baseDimensions.height) / 2;
      clampedY = Math.max(minY, Math.min(maxY, y));
    } else {
      clampedY = (VIEWPORT_SIZE - baseDimensions.height) / 2;
    }

    return { x: clampedX, y: clampedY };
  };

  // Keep offset clamped whenever zoom or rotation changes
  useEffect(() => {
    if (baseDimensions) {
      const currentWidth = baseDimensions.width * zoom;
      const currentHeight = baseDimensions.height * zoom;
      setOffset((prev) => clampOffset(prev.x, prev.y, currentWidth, currentHeight, rotation));
    }
  }, [zoom, rotation, baseDimensions]);

  // Pointer event handlers for cross-platform mouse + touch drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!baseDimensions) return;
    setIsDragging(true);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { ...offset };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !baseDimensions) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    const currentWidth = baseDimensions.width * zoom;
    const currentHeight = baseDimensions.height * zoom;

    const newX = dragStartOffset.current.x + dx;
    const newY = dragStartOffset.current.y + dy;

    setOffset(clampOffset(newX, newY, currentWidth, currentHeight, rotation));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  // Apply the crop using canvas context transformations
  const handleApplyCrop = () => {
    if (!naturalDimensions || !baseDimensions) return;

    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 400; // Output high-def square size
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill background with white just in case (to preserve JPG-like solid avatars)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Calculate dimensions after transformations
    const scaleFactor = OUTPUT_SIZE / VIEWPORT_SIZE;

    // Viewport coordinates
    const baseW = baseDimensions.width;
    const baseH = baseDimensions.height;

    // Image center in viewport coordinate system
    const cx = baseW / 2 + offset.x;
    const cy = baseH / 2 + offset.y;

    // Offset of the image center from viewport center (140, 140)
    const dx = cx - (VIEWPORT_SIZE / 2);
    const dy = cy - (VIEWPORT_SIZE / 2);

    // Canvas offsets (scaled center relative to canvas center)
    const canvas_cx = OUTPUT_SIZE / 2 + dx * scaleFactor;
    const canvas_cy = OUTPUT_SIZE / 2 + dy * scaleFactor;

    // Visual dimensions of image drawn on canvas
    const drawWidth = baseW * scaleFactor * zoom;
    const drawHeight = baseH * scaleFactor * zoom;

    // Context changes
    ctx.save();
    ctx.translate(canvas_cx, canvas_cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Load original image to draw on canvas
    const imgToDraw = new Image();
    if (!imageSrc.startsWith('data:')) {
      imgToDraw.crossOrigin = 'anonymous'; // Avoid tainted canvas problems
    }
    imgToDraw.onload = () => {
      // Draw image centered around its translated & rotated origin
      ctx.drawImage(imgToDraw, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Extract blob
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped_avatar.webp', {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          onConfirm(croppedFile);
        }
      }, 'image/webp', 0.95);
    };
    imgToDraw.src = imageSrc;
  };

  const isRotatedChanged = rotation === 90 || rotation === 270;
  const imageTransform = `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`;

  return (
    <div id="image-crop-modal-overlay" className="fixed inset-0 bg-[#0B132B]/85 backdrop-blur-md z-[200] flex items-center justify-center p-2.5 sm:p-4">
      <motion.div
        id="image-crop-modal-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#111A2E] rounded-3xl sm:rounded-[2.5rem] w-full max-w-md max-h-[92dvh] overflow-y-auto border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0B132B] dark:text-white uppercase tracking-wider">Crop Profile Photo</h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Adjust crop matching 1:1 format</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[44px] min-h-[44px] p-2.5 bg-slate-50 dark:bg-[#1A253E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Cancel"
            aria-label="Cancel crop"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Crop Stage */}
        <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0A101D] border-b border-slate-100 dark:border-slate-800">
          <div
            id="crop-viewport-container"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative w-[280px] h-[280px] rounded-[3rem] overflow-hidden bg-slate-200 dark:bg-slate-950 border-4 border-white dark:border-[#111A2E] shadow-inner select-none cursor-grab active:cursor-grabbing touch-none"
            style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
          >
            {/* Base Image Container */}
            {baseDimensions && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Original crop candidate"
                className="absolute origin-center select-none pointer-events-none"
                style={{
                  width: `${baseDimensions.width}px`,
                  height: `${baseDimensions.height}px`,
                  transform: imageTransform,
                  transformOrigin: '50% 50%',
                  willChange: 'transform',
                }}
              />
            )}

            {/* Viewport Mask Circular guide lines overlay */}
            <div id="crop-mask-overlay" className="absolute inset-0 border-[3px] border-dashed border-[#0D5BFF]/60 rounded-[2.9rem] pointer-events-none flex items-center justify-center">
              {/* Thin target hair cross */}
              <div className="absolute w-8 h-[2px] bg-[#0D5BFF]/40" />
              <div className="absolute h-8 w-[2px] bg-[#0D5BFF]/40" />
              {/* Inner ring helper */}
              <div className="w-[85%] h-[85%] border border-white/20 rounded-full" />
            </div>
          </div>
          <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-4">
            Drag photo to center and fit within circle
          </span>
        </div>

        {/* Modal Controls */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Zoom controls */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#0B132B] dark:text-slate-300">
              <span className="flex items-center gap-1">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                Zoom
              </span>
              <span className="text-[#0D5BFF]">{zoom.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                type="button"
                onClick={() => handleZoomChange(zoom - 0.2)}
                disabled={zoom <= 1}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-50 dark:bg-[#1A253E] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-[#0B132B] dark:text-white rounded-xl transition-all"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-[#1A253E] rounded-lg appearance-none cursor-pointer accent-[#0D5BFF]"
              />
              <button 
                type="button"
                onClick={() => handleZoomChange(zoom + 0.2)}
                disabled={zoom >= 4}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-50 dark:bg-[#1A253E] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-[#0B132B] dark:text-white rounded-xl transition-all"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Buttons for transforms */}
          <div className="flex justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleRotate}
              className="flex-1 min-h-[44px] py-3 px-4 bg-slate-50 dark:bg-[#1A253E] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-transparent text-[#0B132B] dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate 90°
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] py-3 px-5 bg-slate-50 dark:bg-[#1A253E] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-transparent text-[#0B132B] dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              title="Reset Adjustments"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 sm:gap-4 pt-2 border-t border-slate-50 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] py-3.5 px-4 sm:px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0B132B] dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex-1 min-h-[44px] py-3.5 px-4 sm:px-6 bg-[#0D5BFF] hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_12px_24px_-8px_rgba(13,91,255,0.4)]"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
