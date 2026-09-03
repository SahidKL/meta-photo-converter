import React, { useState, useEffect, useRef, useCallback } from 'react';

// Fixed Authentic Ray-Ban Meta Gen 2 Hardware Specification (Injected Automatically in Background)
const META_GEN2_SPEC = {
  make: 'Meta',
  model: 'Ray-Ban Meta Smart Glasses',
  software: 'Meta View 188.0.0.12.110',
  lensModel: 'Ultra-Wide 12MP POV Camera',
  lensMake: 'Luxottica / Meta',
  aperture: 2.2,
  focalLength: '2.8',
  focalLength35mm: 22,
  shutterNumerator: 1,
  shutterDenominator: 120,
  iso: 100
};

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16 Story / Reel', ratioVal: 9 / 16, badge: 'Instagram Story' },
  { id: '3:4', label: '3:4 Native POV', ratioVal: 3 / 4, badge: 'Ray-Ban 12MP' },
  { id: '1:1', label: '1:1 Square', ratioVal: 1, badge: 'Feed Post' },
  { id: '4:3', label: '4:3 Landscape', ratioVal: 4 / 3, badge: 'Standard' },
  { id: '16:9', label: '16:9 Cinematic', ratioVal: 16 / 9, badge: 'Widescreen' },
  { id: 'original', label: 'Original Ratio', ratioVal: null, badge: '100% Source' }
];

const FIT_MODES = [
  { id: 'blur', label: 'Blurred Glass Fill', icon: '✨', desc: 'Fits subject with blurred photo backdrop' },
  { id: 'contain', label: 'Solid Fit (No Crop)', icon: '🎨', desc: 'Fits entire subject with solid background' },
  { id: 'cover', label: 'Cover (Fill & Crop)', icon: '📐', desc: 'Fills target frame completely' }
];

const SOLID_COLOR_PRESETS = [
  { name: 'OLED Black', hex: '#000000' },
  { name: 'Dark Slate', hex: '#0f172a' },
  { name: 'Midnight Carbon', hex: '#18181b' },
  { name: 'Studio Charcoal', hex: '#27272a' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Warm Cream', hex: '#fdf6ee' },
  { name: 'Sakura Pink', hex: '#fce7f3' },
  { name: 'Lavender Bloom', hex: '#f3e8ff' },
  { name: 'Sky Mist Blue', hex: '#e0f2fe' },
  { name: 'Matcha Sage', hex: '#dcfce7' },
];

export default function App() {
  // Page 1: Upload (rawImageSource === null)
  // Page 2: Edit Frame & Share (rawImageSource !== null)
  const [rawImageSource, setRawImageSource] = useState(null);
  const [imageFileName, setImageFileName] = useState('Untitled design.png');

  // Client-Side Framing State
  const [selectedRatio, setSelectedRatio] = useState('9:16');
  const [selectedFit, setSelectedFit] = useState('blur');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panY, setPanY] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#0f172a');
  const [customColor, setCustomColor] = useState('#0f172a');

  // Output Buffers
  const [renderedDataUrl, setRenderedDataUrl] = useState(null);
  const [outputDimensions, setOutputDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [notification, setNotification] = useState(null);

  // Local EXIF Timestamps
  const [captureDate] = useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}:${pad(now.getMonth() + 1)}:${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const fileInputRef = useRef(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Block Text Selection, Copying, and Context Menu Across the Page
  useEffect(() => {
    const blockCopyOrSelect = (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', blockCopyOrSelect);
    document.addEventListener('cut', blockCopyOrSelect);
    document.addEventListener('selectstart', blockCopyOrSelect);
    document.addEventListener('contextmenu', blockCopyOrSelect);

    return () => {
      document.removeEventListener('copy', blockCopyOrSelect);
      document.removeEventListener('cut', blockCopyOrSelect);
      document.removeEventListener('selectstart', blockCopyOrSelect);
      document.removeEventListener('contextmenu', blockCopyOrSelect);
    };
  }, []);

  // Pure Client-Side File Reader
  const processImageFile = useCallback((file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      showNotification('Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImageSource(event.target.result);
      setImageFileName(file.name || 'Untitled design.png');
      setZoomLevel(1.0);
      setPanY(0);
      showNotification('Loaded locally in browser! 100% offline.');
    };
    reader.readAsDataURL(file);
  }, []);

  // Browser Clipboard Paste Support
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile]);

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const degToDmsRational = (deg) => {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.round((minutesNotTruncated - minutes) * 60 * 100);
    return [[degrees, 1], [minutes, 1], [seconds, 100]];
  };

  // Local EXIF Byte Serialization for Meta 2
  const generateExifBytes = useCallback(() => {
    if (!window.piexif) return null;

    const zeroth = {
      [window.piexif.ImageIFD.Make]: META_GEN2_SPEC.make,
      [window.piexif.ImageIFD.Model]: META_GEN2_SPEC.model,
      [window.piexif.ImageIFD.Software]: META_GEN2_SPEC.software,
      [window.piexif.ImageIFD.Orientation]: 1,
      [window.piexif.ImageIFD.XResolution]: [72, 1],
      [window.piexif.ImageIFD.YResolution]: [72, 1],
      [window.piexif.ImageIFD.ResolutionUnit]: 2,
      [window.piexif.ImageIFD.DateTime]: captureDate,
    };

    const exif = {
      [window.piexif.ExifIFD.ExposureTime]: [META_GEN2_SPEC.shutterNumerator, META_GEN2_SPEC.shutterDenominator],
      [window.piexif.ExifIFD.FNumber]: [Math.round(META_GEN2_SPEC.aperture * 10), 10],
      [window.piexif.ExifIFD.ISOSpeedRatings]: META_GEN2_SPEC.iso,
      [window.piexif.ExifIFD.FocalLength]: [Math.round(parseFloat(META_GEN2_SPEC.focalLength) * 10), 10],
      [window.piexif.ExifIFD.FocalLengthIn35mmFilm]: META_GEN2_SPEC.focalLength35mm,
      [window.piexif.ExifIFD.ColorSpace]: 1,
      [window.piexif.ExifIFD.DateTimeOriginal]: captureDate,
      [window.piexif.ExifIFD.DateTimeDigitized]: captureDate,
      [window.piexif.ExifIFD.LensMake]: META_GEN2_SPEC.lensMake,
      [window.piexif.ExifIFD.LensModel]: META_GEN2_SPEC.lensModel
    };

    const gps = {
      [window.piexif.GPSIFD.GPSLatitudeRef]: 'N',
      [window.piexif.GPSIFD.GPSLatitude]: degToDmsRational(37.4848),
      [window.piexif.GPSIFD.GPSLongitudeRef]: 'W',
      [window.piexif.GPSIFD.GPSLongitude]: degToDmsRational(-122.1484)
    };

    return window.piexif.dump({ "0th": zeroth, "Exif": exif, "GPS": gps, "1st": {}, "thumbnail": null });
  }, [captureDate]);

  // Pure Local Canvas Composite Renderer
  const renderCompositeImage = useCallback(() => {
    if (!rawImageSource) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      let targetW = srcW;
      let targetH = srcH;

      const ratioConfig = ASPECT_RATIOS.find((r) => r.id === selectedRatio);
      if (selectedRatio !== 'original' && ratioConfig && ratioConfig.ratioVal) {
        const targetRatio = ratioConfig.ratioVal;
        const currentRatio = srcW / srcH;

        if (targetRatio < currentRatio) {
          targetH = Math.max(srcH, Math.round(srcW / targetRatio));
          targetW = Math.round(targetH * targetRatio);
        } else {
          targetW = Math.max(srcW, Math.round(srcH * targetRatio));
          targetH = Math.round(targetW / targetRatio);
        }

        const maxDim = 3840;
        if (targetW > maxDim || targetH > maxDim) {
          const downScale = maxDim / Math.max(targetW, targetH);
          targetW = Math.round(targetW * downScale);
          targetH = Math.round(targetH * downScale);
        }
      }

      setOutputDimensions({ width: targetW, height: targetH });

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Draw Backdrop
      if (selectedFit === 'blur') {
        const bgImg = new Image();
        bgImg.onload = () => {
          ctx.save();
          const bgScale = Math.max(targetW / bgImg.width, targetH / bgImg.height) * 1.15;
          const bgW = bgImg.width * bgScale;
          const bgH = bgImg.height * bgScale;
          ctx.filter = 'blur(40px) brightness(0.65)';
          ctx.drawImage(bgImg, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
          ctx.restore();

          drawSubject(ctx, img, targetW, targetH, srcW, srcH);
        };
        bgImg.src = rawImageSource;
        return;
      } else {
        ctx.fillStyle = selectedColor;
        ctx.fillRect(0, 0, targetW, targetH);
      }

      drawSubject(ctx, img, targetW, targetH, srcW, srcH);
    };

    img.src = rawImageSource;
  }, [
    rawImageSource,
    selectedRatio,
    selectedFit,
    zoomLevel,
    panY,
    selectedColor,
    generateExifBytes
  ]);

  const drawSubject = (ctx, img, targetW, targetH, srcW, srcH) => {
    let baseScale = 1;
    if (selectedFit === 'cover') {
      baseScale = Math.max(targetW / srcW, targetH / srcH);
    } else {
      baseScale = Math.min(targetW / srcW, targetH / srcH);
    }

    const finalScale = baseScale * zoomLevel;
    const finalW = srcW * finalScale;
    const finalH = srcH * finalScale;

    const centerX = (targetW - finalW) / 2;
    const centerY = (targetH - finalH) / 2 + (panY / 100) * (targetH / 2);

    ctx.drawImage(img, centerX, centerY, finalW, finalH);

    // In-memory JPEG compression
    const baseOutput = ctx.canvas.toDataURL('image/jpeg', 0.98);
    let finalTagged = baseOutput;

    // In-browser binary metadata injection
    if (window.piexif) {
      try {
        const exifBytes = generateExifBytes();
        if (exifBytes) {
          finalTagged = window.piexif.insert(exifBytes, baseOutput);
        }
      } catch (e) {
        console.warn('Local EXIF injection warning:', e);
      }
    }

    setRenderedDataUrl(finalTagged);
  };

  // Load piexifjs strictly as a local utility
  useEffect(() => {
    if (window.piexif) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/piexifjs/1.0.6/piexif.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (rawImageSource) {
      renderCompositeImage();
    }
  }, [renderCompositeImage, rawImageSource]);

  // Local Web Share API (Primary Output Action)
  const handleDirectShare = async () => {
    if (!renderedDataUrl) return;
    setIsProcessing(true);
    try {
      const blob = await (await fetch(renderedDataUrl)).blob();
      const filename = `meta_${selectedRatio.replace(':', 'x')}_${imageFileName.replace(/\.[^/.]+$/, "") || 'story'}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Meta POV (${selectedRatio})`,
          text: 'Captured on Ray-Ban Meta Smart Glasses'
        });
        showNotification('Share prompt opened!');
      } else {
        // Fallback for browsers that do not support Web Share API
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showNotification('Web share not supported on this browser. File downloaded.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        showNotification('Share prompt dismissed.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 border border-neutral-700 text-neutral-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-sm backdrop-blur-md max-w-[90vw]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            processImageFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center p-0.5 shadow-md">
              <div className="w-full h-full bg-neutral-950 rounded-[9px] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="12" r="4" />
                  <circle cx="18" cy="12" r="4" />
                  <path d="M10 12h4" />
                  <path d="M2 12c.5-3 2.5-5 5-5" />
                  <path d="M22 12c-.5-3-2.5-5-5-5" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-base">Meta Photo Converter</span>
              </div>
            </div>
          </div>

          {rawImageSource && (
            <button
              onClick={() => {
                setRawImageSource(null);
                setRenderedDataUrl(null);
                setImageFileName('Untitled design.png');
              }}
              className="px-3 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-lg border border-neutral-700 transition flex items-center gap-1.5"
            >
              <span>← Upload Another Photo</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full flex flex-col justify-center">

        {/* PAGE 1: UPLOAD SCREEN */}
        {!rawImageSource ? (
          <div className="max-w-2xl mx-auto w-full py-8 animate-fade-in flex flex-col gap-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 bg-gradient-to-b ${
                isDraggingOver
                  ? 'border-pink-500 bg-pink-950/20 scale-[1.01] shadow-2xl shadow-pink-500/20 ring-4 ring-pink-500/20'
                  : 'border-neutral-700 hover:border-pink-500/70 bg-neutral-900/40 hover:bg-neutral-900/80 shadow-xl'
              }`}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center p-0.5 shadow-2xl shadow-purple-500/30">
                <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center">
                  <svg className="w-10 h-10 text-pink-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5 max-w-md">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Create Your Instagram Story
                </h2>
                <p className="text-sm sm:text-base text-neutral-400 font-medium">
                  Upload a photo to get started
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 px-8 py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl text-sm sm:text-base shadow-xl shadow-pink-600/30 active:scale-[0.98] transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload Image</span>
              </button>

              <div className="pt-4 border-t border-neutral-800/80 w-full flex flex-col items-center gap-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-800 font-mono text-[11px] text-neutral-300 font-semibold border border-neutral-700">JPG</span>
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-800 font-mono text-[11px] text-neutral-300 font-semibold border border-neutral-700">JPEG</span>
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-800 font-mono text-[11px] text-neutral-300 font-semibold border border-neutral-700">PNG</span>
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-800 font-mono text-[11px] text-neutral-300 font-semibold border border-neutral-700">WEBP</span>
                </div>
              </div>
            </div>

            {/* Shop Gifts at eBuySouk Promo Link Button */}
            <div className="w-full flex justify-center">
              <a
                href="https://ebuysouk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-orange-500/20 border border-amber-300/30 active:scale-[0.98] transition-all group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🎁</span>
                <span className="tracking-wide">Shop Gifts at eBuySouk</span>
                <svg className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          /* PAGE 2: EDIT FRAME & SHARE SCREEN */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fade-in">

            {/* Left Column: Image Viewfinder */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 truncate max-w-[150px]">{imageFileName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-lg border border-neutral-700 transition"
                    >
                      Change Photo
                    </button>
                    <button
                      onClick={() => {
                        setRawImageSource(null);
                        setRenderedDataUrl(null);
                        setImageFileName('Untitled design.png');
                      }}
                      className="px-2 py-1 text-xs bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-lg border border-red-800/40 transition"
                      title="Clear photo"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="relative w-full aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
                  {renderedDataUrl && (
                    <img 
                      src={renderedDataUrl} 
                      alt="Meta Photo Capture" 
                      className="w-full h-full object-contain select-none z-10"
                    />
                  )}

                  <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between text-[10px] font-mono text-white/90 drop-shadow-md z-20">
                    <div className="flex justify-between items-center">
                      <span className="bg-black/70 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span>POV {selectedRatio}</span>
                      </span>
                      <span className="bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                        {outputDimensions.width} × {outputDimensions.height} HD
                      </span>
                    </div>

                    <div className="self-center bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10 text-[10px] text-center">
                      <span>Scale: <b>{Math.round(zoomLevel * 100)}%</b> · Meta EXIF</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                        Client Processing
                      </span>
                      <span className="bg-black/70 px-2 py-0.5 rounded-full border border-white/10 text-emerald-400">
                        Meta 2 Tags
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => {
                      setZoomLevel(1.0);
                      setPanY(0);
                      showNotification("Reset alignment & scale to 100%");
                    }}
                    className="w-full py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-neutral-700"
                  >
                    <span>🎯 Reset Scale & Position</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Edit Frame & Share Workspace */}
            <div className="lg:col-span-7 flex flex-col gap-4">

              {/* 1. EDIT FRAME */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-xl">
                <div className="border-b border-neutral-800 pb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🎨</span> Edit Frame
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select story ratio, backdrop colors, or zoom framing.
                  </p>
                </div>

                {/* Aspect Ratio Choices */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                    1. Select Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRatio(r.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedRatio === r.id
                            ? 'border-blue-500 bg-blue-950/40 text-white shadow-md'
                            : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{r.id}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                            {r.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-1">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Framing Style Mode */}
                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                    2. Framing Style Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {FIT_MODES.map((fit) => (
                      <button
                        key={fit.id}
                        onClick={() => setSelectedFit(fit.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedFit === fit.id
                            ? 'border-blue-500 bg-blue-950/40 text-white shadow-md'
                            : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                          <span>{fit.icon}</span>
                          <span>{fit.label}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-1">{fit.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Color Swatches */}
                {selectedFit === 'contain' && (
                  <div className="space-y-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300 font-bold">3. Backdrop Color:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">Custom:</span>
                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-lg">
                          <input
                            type="color"
                            value={customColor}
                            onChange={(e) => {
                              setCustomColor(e.target.value);
                              setSelectedColor(e.target.value);
                            }}
                            className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-xs font-mono text-neutral-200 uppercase">{selectedColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {SOLID_COLOR_PRESETS.map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => {
                            setSelectedColor(color.hex);
                            setCustomColor(color.hex);
                          }}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition ${
                            selectedColor.toLowerCase() === color.hex.toLowerCase()
                              ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                              : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/60'
                            }`}
                          >
                            <span 
                              className="w-5 h-5 rounded-full border border-neutral-700 shadow-sm"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="text-[9px] text-neutral-300 truncate max-w-full font-medium">
                              {color.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                )}

                {/* Scaling & Alignment */}
                <div className="border-t border-neutral-800 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      {selectedFit === 'contain' ? '4. Scaling & Position' : '3. Scaling & Position'}
                    </label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Zoom: {Math.round(zoomLevel * 100)}% · Pan Y: {panY}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Scale Slider:</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.6"
                        step="0.02"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Vertical Align (Pan Y):</label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={panY}
                        onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SHARE PHOTO CONTROL */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
                <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>📤</span> Share Photo
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Ready for Instagram with 👓 Meta ({outputDimensions.width} × {outputDimensions.height} HD).
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleDirectShare}
                    disabled={isProcessing}
                    className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 active:scale-[0.98] transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Share Photo</span>
                  </button>
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-center text-xs text-neutral-400">
                  <span>📲 Tap Share to post directly to Instagram Stories.</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-3 text-center text-xs text-neutral-500">
        🔒 100% Client-Side. Photos are processed strictly on your device.
      </footer>
    </div>
  );
}