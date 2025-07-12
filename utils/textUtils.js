// Text file compression and optimization utilities

import { debugConfig, formatFileSize } from './pdfUtils';

// Dynamic import for pako (client-side only)
let pako = null;
if (typeof window !== 'undefined') {
  import('pako').then(module => {
    pako = module;
  });
}

export const TEXT_FORMATS = {
  PLAIN: 'txt',
  MARKDOWN: 'md',
  JSON: 'json',
  XML: 'xml',
  CSV: 'csv',
  RTF: 'rtf'
};

export const COMPRESSION_METHODS = {
  GZIP: 'gzip',
  MINIFY: 'minify',
  OPTIMIZE: 'optimize'
};

// Compress text file using various methods
export async function compressText(file, options = {}) {
  const {
    method = COMPRESSION_METHODS.OPTIMIZE,
    removeComments = true,
    removeExtraWhitespace = true,
    removeEmptyLines = true,
    optimizeJson = true,
    progressCallback = () => {}
  } = options;

  try {
    progressCallback(10);
    
    // Read file content
    const content = await readFileAsText(file);
    
    progressCallback(30);
    
    let compressedContent = content;
    
    // Apply compression based on file type and method
    const fileType = detectTextFileType(file);
    
    progressCallback(50);
    
    switch (method) {
      case COMPRESSION_METHODS.MINIFY:
        compressedContent = await minifyText(content, fileType, {
          removeComments,
          removeExtraWhitespace,
          removeEmptyLines
        });
        break;
        
      case COMPRESSION_METHODS.OPTIMIZE:
        compressedContent = await optimizeText(content, fileType, {
          removeComments,
          removeExtraWhitespace,
          removeEmptyLines,
          optimizeJson
        });
        break;
        
      case COMPRESSION_METHODS.GZIP:
        if (pako) {
          try {
            // Use pako for GZIP compression
            const uint8Array = new TextEncoder().encode(content);
            const compressed = pako.gzip(uint8Array);
            
            // Create a new file with .gz extension
            const blob = new Blob([compressed], { type: 'application/gzip' });
            const gzFileName = file.name + '.gz';
            const compressedFile = new File([blob], gzFileName, { type: 'application/gzip' });
            
            progressCallback(100);
            return compressedFile;
          } catch (error) {
            debugConfig.warn('GZIP compression failed, falling back to optimization:', error);
            compressedContent = await optimizeText(content, fileType, options);
          }
        } else {
          debugConfig.warn('Pako not available, falling back to optimization');
          compressedContent = await optimizeText(content, fileType, options);
        }
        break;
    }
    
    progressCallback(80);
    
    // Create compressed file
    const blob = new Blob([compressedContent], { type: file.type });
    const compressedFile = new File([blob], file.name, { type: file.type });
    
    progressCallback(100);
    
    return compressedFile;
    
  } catch (error) {
    debugConfig.error('Error compressing text file:', error);
    throw error;
  }
}

// Minify text content
async function minifyText(content, fileType, options) {
  let minified = content;
  
  switch (fileType) {
    case TEXT_FORMATS.JSON:
      minified = minifyJson(content);
      break;
      
    case TEXT_FORMATS.XML:
      minified = minifyXml(content, options);
      break;
      
    case TEXT_FORMATS.CSV:
      minified = minifyCsv(content, options);
      break;
      
    default:
      minified = minifyPlainText(content, options);
      break;
  }
  
  return minified;
}

// Optimize text content
async function optimizeText(content, fileType, options) {
  let optimized = content;
  
  // Apply common optimizations
  if (options.removeExtraWhitespace) {
    optimized = optimized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
    optimized = optimized.replace(/[ \t]+$/gm, ''); // Trailing whitespace
  }
  
  if (options.removeEmptyLines) {
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple empty lines to double
  }
  
  // File-type specific optimizations
  switch (fileType) {
    case TEXT_FORMATS.JSON:
      if (options.optimizeJson) {
        optimized = optimizeJson(optimized);
      }
      break;
      
    case TEXT_FORMATS.XML:
      optimized = optimizeXml(optimized, options);
      break;
      
    case TEXT_FORMATS.MARKDOWN:
      optimized = optimizeMarkdown(optimized, options);
      break;
  }
  
  return optimized;
}

// JSON-specific functions
function minifyJson(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (error) {
    debugConfig.warn('Invalid JSON, returning original content');
    return content;
  }
}

function optimizeJson(content) {
  try {
    const parsed = JSON.parse(content);
    // Pretty print with 2 spaces (good balance between readability and size)
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    debugConfig.warn('Invalid JSON, returning original content');
    return content;
  }
}

// XML-specific functions
function minifyXml(content, options) {
  let minified = content;
  
  // Remove comments
  if (options.removeComments) {
    minified = minified.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Remove extra whitespace between tags
  minified = minified.replace(/>\s+</g, '><');
  
  // Remove leading/trailing whitespace
  minified = minified.trim();
  
  return minified;
}

function optimizeXml(content, options) {
  let optimized = content;
  
  // Remove comments if requested
  if (options.removeComments) {
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Normalize whitespace between tags
  optimized = optimized.replace(/>\s+</g, '>\n<');
  
  return optimized;
}

// CSV-specific functions
function minifyCsv(content, options) {
  const lines = content.split('\n');
  
  // Remove empty lines
  const filteredLines = options.removeEmptyLines 
    ? lines.filter(line => line.trim() !== '')
    : lines;
  
  // Remove extra spaces around commas
  const cleanedLines = filteredLines.map(line => 
    line.replace(/\s*,\s*/g, ',').trim()
  );
  
  return cleanedLines.join('\n');
}

// Markdown-specific functions
function optimizeMarkdown(content, options) {
  let optimized = content;
  
  // Remove comments (HTML comments in markdown)
  if (options.removeComments) {
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Normalize heading spacing
  optimized = optimized.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');
  
  // Normalize list spacing
  optimized = optimized.replace(/^(\s*[*+-])\s+/gm, '$1 ');
  
  return optimized;
}

// Plain text optimization
function minifyPlainText(content, options) {
  let minified = content;
  
  if (options.removeExtraWhitespace) {
    minified = minified.replace(/[ \t]+/g, ' ');
    minified = minified.replace(/[ \t]+$/gm, '');
  }
  
  if (options.removeEmptyLines) {
    minified = minified.replace(/\n\s*\n\s*\n/g, '\n\n');
  }
  
  return minified.trim();
}

// Batch compress text files
export async function compressTextFiles(files, options = {}, progressCallback = () => {}) {
  const results = [];
  const totalFiles = files.length;
  
  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    
    try {
      const fileProgressCallback = (progress) => {
        const overallProgress = ((i / totalFiles) + (progress / 100) / totalFiles) * 100;
        progressCallback(overallProgress, i, file.name);
      };
      
      const compressedFile = await compressText(file, {
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

// Helper functions
function detectTextFileType(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'json': return TEXT_FORMATS.JSON;
    case 'xml': return TEXT_FORMATS.XML;
    case 'csv': return TEXT_FORMATS.CSV;
    case 'md': case 'markdown': return TEXT_FORMATS.MARKDOWN;
    case 'rtf': return TEXT_FORMATS.RTF;
    default: return TEXT_FORMATS.PLAIN;
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

function calculateReduction(originalSize, compressedSize) {
  return ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
}

// Get text file metadata
export async function getTextMetadata(file) {
  try {
    const content = await readFileAsText(file);
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const characters = content.length;
    const charactersNoSpaces = content.replace(/\s/g, '').length;
    
    return {
      filename: file.name,
      size: formatFileSize(file.size),
      type: detectTextFileType(file),
      lines: lines.length,
      words: words.length,
      characters: characters,
      charactersNoSpaces: charactersNoSpaces,
      averageWordsPerLine: (words.length / lines.length).toFixed(2),
      encoding: 'UTF-8' // Assumption for web files
    };
  } catch (error) {
    debugConfig.error('Error getting text metadata:', error);
    throw error;
  }
}