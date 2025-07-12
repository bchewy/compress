// Universal compression engine for all file types

import { FILE_TYPES, detectFileType, getFileTypeInfo } from './fileTypes';
import { compressPdf } from './pdfUtils';
import { compressImage, getImageMetadata } from './imageUtils';
import { compressText, getTextMetadata } from './textUtils';
import { debugConfig, formatFileSize } from './pdfUtils';

export class CompressionEngine {
  constructor() {
    this.supportedTypes = Object.values(FILE_TYPES);
    this.activeJobs = new Map();
  }

  // Main compression method that routes to appropriate handler
  async compressFile(file, options = {}, progressCallback = () => {}) {
    const fileType = detectFileType(file);
    
    if (!fileType) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }

    const jobId = this.generateJobId();
    this.activeJobs.set(jobId, { file, status: 'processing', startTime: Date.now() });

    try {
      let result;
      
      switch (fileType) {
        case FILE_TYPES.PDF:
          result = await this.compressPdfFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.IMAGE:
          result = await this.compressImageFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.TEXT:
          result = await this.compressTextFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.DOCUMENT:
          result = await this.compressDocumentFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.VIDEO:
          result = await this.compressVideoFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.AUDIO:
          result = await this.compressAudioFile(file, options, progressCallback);
          break;
          
        case FILE_TYPES.ARCHIVE:
          result = await this.optimizeArchiveFile(file, options, progressCallback);
          break;
          
        default:
          throw new Error(`No compression handler for file type: ${fileType}`);
      }

      // Add metadata to result
      result.fileType = fileType;
      result.originalSize = file.size;
      result.jobId = jobId;
      result.processingTime = Date.now() - this.activeJobs.get(jobId).startTime;
      
      this.activeJobs.set(jobId, { 
        ...this.activeJobs.get(jobId), 
        status: 'completed', 
        result 
      });

      return result;

    } catch (error) {
      this.activeJobs.set(jobId, { 
        ...this.activeJobs.get(jobId), 
        status: 'failed', 
        error: error.message 
      });
      throw error;
    }
  }

  // Batch compression for multiple files
  async compressFiles(files, options = {}, progressCallback = () => {}) {
    const results = [];
    const totalFiles = files.length;
    
    // Group files by type for optimized processing
    const fileGroups = this.groupFilesByType(files);
    
    let processedCount = 0;
    
    for (const [fileType, groupFiles] of Object.entries(fileGroups)) {
      for (const file of groupFiles) {
        try {
          const fileProgressCallback = (progress) => {
            const overallProgress = ((processedCount + progress / 100) / totalFiles) * 100;
            progressCallback(overallProgress, processedCount, file.name, fileType);
          };

          const result = await this.compressFile(file, options[fileType] || options, fileProgressCallback);
          
          results.push({
            original: file,
            compressed: result.compressedFile,
            metadata: result.metadata || {},
            reduction: this.calculateReduction(file.size, result.compressedFile.size),
            fileType,
            success: true,
            processingTime: result.processingTime
          });

        } catch (error) {
          debugConfig.error(`Failed to compress ${file.name}:`, error);
          results.push({
            original: file,
            compressed: null,
            error: error.message,
            fileType,
            success: false
          });
        }
        
        processedCount++;
      }
    }
    
    return results;
  }

  // PDF compression handler
  async compressPdfFile(file, options, progressCallback) {
    const { quality = 50, dpi = 150 } = options;
    
    const compressedFile = await compressPdf(file, quality, dpi, progressCallback);
    
    return {
      compressedFile,
      metadata: {
        originalQuality: 'Unknown',
        newQuality: quality,
        dpi: dpi,
        compression: 'JPEG'
      }
    };
  }

  // Image compression handler
  async compressImageFile(file, options, progressCallback) {
    const { 
      quality = 0.8, 
      format = 'jpeg',
      maxWidth = null,
      maxHeight = null 
    } = options;

    const metadata = await getImageMetadata(file);
    
    const compressedFile = await compressImage(file, {
      quality,
      format,
      maxWidth,
      maxHeight,
      progressCallback
    });

    return {
      compressedFile,
      metadata: {
        ...metadata,
        newFormat: format,
        newQuality: quality
      }
    };
  }

  // Text compression handler
  async compressTextFile(file, options, progressCallback) {
    const { 
      method = 'optimize',
      removeComments = true,
      removeExtraWhitespace = true 
    } = options;

    const metadata = await getTextMetadata(file);
    
    const compressedFile = await compressText(file, {
      method,
      removeComments,
      removeExtraWhitespace,
      progressCallback
    });

    return {
      compressedFile,
      metadata: {
        ...metadata,
        compressionMethod: method
      }
    };
  }

  // Document compression handler (placeholder for future implementation)
  async compressDocumentFile(file, options, progressCallback) {
    // For now, return original file with a note
    progressCallback(100);
    
    return {
      compressedFile: file,
      metadata: {
        note: 'Document compression coming soon',
        format: file.type
      }
    };
  }

  // Video compression handler (placeholder)
  async compressVideoFile(file, options, progressCallback) {
    progressCallback(100);
    
    return {
      compressedFile: file,
      metadata: {
        note: 'Video compression coming soon',
        format: file.type
      }
    };
  }

  // Audio compression handler (placeholder)
  async compressAudioFile(file, options, progressCallback) {
    progressCallback(100);
    
    return {
      compressedFile: file,
      metadata: {
        note: 'Audio compression coming soon',
        format: file.type
      }
    };
  }

  // Archive optimization handler (placeholder)
  async optimizeArchiveFile(file, options, progressCallback) {
    progressCallback(100);
    
    return {
      compressedFile: file,
      metadata: {
        note: 'Archive optimization coming soon',
        format: file.type
      }
    };
  }

  // Helper methods
  groupFilesByType(files) {
    const groups = {};
    
    files.forEach(file => {
      const fileType = detectFileType(file);
      if (fileType) {
        if (!groups[fileType]) {
          groups[fileType] = [];
        }
        groups[fileType].push(file);
      }
    });
    
    return groups;
  }

  calculateReduction(originalSize, compressedSize) {
    return ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  }

  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  cancelJob(jobId) {
    if (this.activeJobs.has(jobId)) {
      this.activeJobs.set(jobId, {
        ...this.activeJobs.get(jobId),
        status: 'cancelled'
      });
    }
  }

  // Get compression recommendations based on file analysis
  async getCompressionRecommendations(file) {
    const fileType = detectFileType(file);
    const fileInfo = getFileTypeInfo(fileType);
    
    const recommendations = {
      fileType,
      icon: fileInfo?.icon || '📄',
      suggestions: []
    };

    switch (fileType) {
      case FILE_TYPES.IMAGE:
        const imageMetadata = await getImageMetadata(file);
        
        if (imageMetadata.megapixels > 5) {
          recommendations.suggestions.push({
            type: 'resize',
            description: 'Consider resizing - image is very large',
            impact: 'high'
          });
        }
        
        if (file.type === 'image/png' && !this.hasTransparency(file)) {
          recommendations.suggestions.push({
            type: 'format',
            description: 'Convert PNG to JPEG for better compression',
            impact: 'medium'
          });
        }
        break;

      case FILE_TYPES.PDF:
        if (file.size > 10 * 1024 * 1024) { // 10MB
          recommendations.suggestions.push({
            type: 'quality',
            description: 'Large PDF - consider aggressive compression',
            impact: 'high'
          });
        }
        break;

      case FILE_TYPES.TEXT:
        const textMetadata = await getTextMetadata(file);
        
        if (textMetadata.type === 'json') {
          recommendations.suggestions.push({
            type: 'minify',
            description: 'JSON can be minified for better compression',
            impact: 'medium'
          });
        }
        break;
    }

    return recommendations;
  }

  // Helper to check if PNG has transparency (simplified)
  hasTransparency(file) {
    // This would require more complex image analysis
    // For now, assume PNGs might have transparency
    return true;
  }
}

// Export singleton instance
export const compressionEngine = new CompressionEngine();