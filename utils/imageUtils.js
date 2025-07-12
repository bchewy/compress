// Image compression and optimization utilities

import { debugConfig, formatFileSize } from './pdfUtils';

// Dynamic import for browser-image-compression (client-side only)
let imageCompression = null;
if (typeof window !== 'undefined') {
  import('browser-image-compression').then(module => {
    imageCompression = module.default;
  });
}

export const IMAGE_FORMATS = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
  AVIF: 'avif'
};

export const COMPRESSION_PRESETS = {
  HIGH_QUALITY: { quality: 0.95, description: 'High Quality (Minimal compression)' },
  BALANCED: { quality: 0.80, description: 'Balanced (Good quality, moderate size)' },
  OPTIMIZED: { quality: 0.65, description: 'Optimized (Smaller size, good quality)' },
  AGGRESSIVE: { quality: 0.45, description: 'Aggressive (Small size, lower quality)' },
  MAXIMUM: { quality: 0.25, description: 'Maximum (Smallest size, basic quality)' }
};

// Compress image with specified settings
export async function compressImage(file, options = {}) {
  const {
    quality = 0.8,
    format = IMAGE_FORMATS.JPEG,
    maxWidth = null,
    maxHeight = null,
    maintainAspectRatio = true,
    progressCallback = () => {}
  } = options;

  // Use browser-image-compression if available for better compression
  if (imageCompression && (format === IMAGE_FORMATS.JPEG || format === IMAGE_FORMATS.PNG)) {
    try {
      progressCallback(10);
      
      const compressionOptions = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: Math.max(maxWidth || 1920, maxHeight || 1920),
        useWebWorker: true,
        quality: quality,
        fileType: `image/${format}`
      };

      progressCallback(50);
      
      const compressedFile = await imageCompression(file, compressionOptions);
      
      progressCallback(100);
      
      return new File([compressedFile], changeFileExtension(file.name, format), {
        type: `image/${format}`
      });
      
    } catch (error) {
      debugConfig.warn('browser-image-compression failed, falling back to canvas method:', error);
      // Fall through to canvas method
    }
  }

  // Fallback to canvas-based compression
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      try {
        progressCallback(25);

        // Calculate new dimensions
        let { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight, 
          maintainAspectRatio
        );

        canvas.width = width;
        canvas.height = height;

        progressCallback(50);

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        progressCallback(75);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          progressCallback(100);

          // Create new file
          const compressedFile = new File(
            [blob], 
            changeFileExtension(file.name, format), 
            { type: `image/${format}` }
          );

          resolve(compressedFile);
        }, `image/${format}`, quality);

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

// Batch compress multiple images
export async function compressImages(files, options = {}, progressCallback = () => {}) {
  const results = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    
    try {
      const fileProgressCallback = (progress) => {
        const overallProgress = ((i / totalFiles) + (progress / 100) / totalFiles) * 100;
        progressCallback(overallProgress, i, file.name);
      };

      const compressedFile = await compressImage(file, {
        ...options,
        progressCallback: fileProgressCallback
      });

      results.push({
        original: file,
        compressed: compressedFile,
        reduction: calculateReduction(file.size, compressedFile.size),
        success: true
      });

    } catch (error) {
      debugConfig.error(`Failed to compress ${file.name}:`, error);
      results.push({
        original: file,
        compressed: null,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

// Convert image format
export async function convertImageFormat(file, targetFormat, quality = 0.9) {
  if (!Object.values(IMAGE_FORMATS).includes(targetFormat)) {
    throw new Error(`Unsupported target format: ${targetFormat}`);
  }

  return compressImage(file, {
    format: targetFormat,
    quality
  });
}

// Resize image
export async function resizeImage(file, width, height, maintainAspectRatio = true) {
  return compressImage(file, {
    maxWidth: width,
    maxHeight: height,
    maintainAspectRatio,
    quality: 0.95 // High quality for resize operations
  });
}

// Create image thumbnails
export async function createThumbnail(file, size = 150) {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    maintainAspectRatio: true,
    quality: 0.8,
    format: IMAGE_FORMATS.JPEG
  });
}

// Helper functions
function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight, maintainAspectRatio) {
  let width = originalWidth;
  let height = originalHeight;

  if (!maxWidth && !maxHeight) {
    return { width, height };
  }

  if (maintainAspectRatio) {
    const aspectRatio = originalWidth / originalHeight;

    if (maxWidth && maxHeight) {
      // Fit within both constraints
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    } else if (maxWidth) {
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
    } else if (maxHeight) {
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    }
  } else {
    // Don't maintain aspect ratio
    if (maxWidth) width = Math.min(width, maxWidth);
    if (maxHeight) height = Math.min(height, maxHeight);
  }

  return { 
    width: Math.round(width), 
    height: Math.round(height) 
  };
}

function changeFileExtension(filename, newFormat) {
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  return `${nameWithoutExt}.${newFormat}`;
}

function calculateReduction(originalSize, compressedSize) {
  return ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
}

// Get image metadata
export async function getImageMetadata(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: (img.width / img.height).toFixed(2),
        megapixels: ((img.width * img.height) / 1000000).toFixed(2),
        size: formatFileSize(file.size),
        format: file.type,
        filename: file.name
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for metadata extraction'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// Optimize image for web
export async function optimizeForWeb(file, targetSize = 'medium') {
  const presets = {
    small: { maxWidth: 800, quality: 0.7, format: IMAGE_FORMATS.WEBP },
    medium: { maxWidth: 1200, quality: 0.8, format: IMAGE_FORMATS.WEBP },
    large: { maxWidth: 1920, quality: 0.85, format: IMAGE_FORMATS.WEBP },
    retina: { maxWidth: 2560, quality: 0.9, format: IMAGE_FORMATS.WEBP }
  };

  const preset = presets[targetSize] || presets.medium;
  
  return compressImage(file, {
    ...preset,
    maintainAspectRatio: true
  });
}