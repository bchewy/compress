// utils/pdfUtils.js - PDF compression and processing utilities

// Initialize PDF.js worker
if (typeof window !== 'undefined' && typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// AWS Configuration - Will be populated from server
let awsConfig = {
  region: '',
  credentials: {
    accessKeyId: '',
    secretAccessKey: ''
  },
  bucketName: ''
};

// Debug configuration
export const debugConfig = {
  isDebugMode: false,
  log: function(message, ...args) {
    if (this.isDebugMode) {
      console.log(message, ...args);
    }
  },
  warn: function(message, ...args) {
    if (this.isDebugMode) {
      console.warn(message, ...args);
    } else {
      console.warn('[WARNING]', message, ...args);
    }
  },
  error: function(message, ...args) {
    console.error(message, ...args);
  }
};

// Load AWS configuration from server
export async function loadAwsConfig() {
  try {
    debugConfig.log('Loading AWS configuration from server...');
    const response = await fetch('/api/aws-config');
    
    if (!response.ok) {
      throw new Error(`Failed to load AWS config: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json();
    
    // Update the AWS config
    awsConfig.region = config.region;
    awsConfig.credentials.accessKeyId = config.credentials.accessKeyId;
    awsConfig.credentials.secretAccessKey = config.credentials.secretAccessKey;
    awsConfig.bucketName = config.bucketName;
    
    debugConfig.log('AWS configuration loaded successfully');
  } catch (error) {
    debugConfig.error('Error loading AWS configuration:', error);
    throw error;
  }
}

// Compress PDF file
export async function compressPdf(file, quality, dpi, progressCallback) {
  if (typeof window === 'undefined' || typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
    throw new Error('PDF libraries not loaded');
  }

  // Convert quality from percentage (1-100) to decimal (0-1)
  const imageQuality = quality / 100;
  
  // Load the PDF using PDF.js
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  
  // Create a new PDF with pdf-lib
  const pdfDoc = await PDFLib.PDFDocument.create();
  
  for (let i = 1; i <= numPages; i++) {
    // Update progress
    progressCallback((i - 1) / numPages * 100);
    
    // Get the page
    const page = await pdf.getPage(i);
    
    // Calculate scale based on DPI
    // PDF.js default is 96 DPI
    const scale = dpi / 96;
    const viewport = page.getViewport({ scale });
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport
    }).promise;
    
    // Convert the canvas to a JPEG with compression
    const jpegData = canvas.toDataURL('image/jpeg', imageQuality);
    
    // Convert the data URL to a Uint8Array
    const jpegImage = await fetchImageAsUint8Array(jpegData);
    
    // Embed the JPEG into the new PDF
    const image = await pdfDoc.embedJpg(jpegImage);
    
    // Add a page with the same dimensions
    const newPage = pdfDoc.addPage([viewport.width, viewport.height]);
    
    // Draw the image on the page
    newPage.drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    });
  }
  
  // Update progress to 100%
  progressCallback(100);
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  
  // Create a new file
  return new File([pdfBytes], file.name, { type: 'application/pdf' });
}

// Helper function to convert data URL to Uint8Array
async function fetchImageAsUint8Array(dataUrl) {
  // Remove the data URL prefix
  const base64Data = dataUrl.split(',')[1];
  
  // Decode the base64 string to a Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

// Add PDF to combined PDF document
export async function addToCombinedPdf(pdfFile, targetPdfDoc) {
  if (typeof PDFLib === 'undefined') {
    throw new Error('PDFLib not loaded');
  }

  try {
    debugConfig.log('Adding file to combined PDF:', pdfFile.name, 'Size:', formatFileSize(pdfFile.size));
    
    // Make a fresh copy of the file to ensure the ArrayBuffer isn't shared or detached
    debugConfig.log('Creating a fresh copy of the file using slice(0)');
    const copiedFile = pdfFile.slice(0);
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await copiedFile.arrayBuffer();
    debugConfig.log('ArrayBuffer created successfully, byteLength:', arrayBuffer.byteLength);
    
    // Load the PDF with PDF-Lib
    debugConfig.log('Loading PDF from ArrayBuffer with PDFLib...');
    const sourcePdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // Copy pages from source document to target document
    debugConfig.log('Copying pages from source to target...');
    const pageCount = sourcePdfDoc.getPageCount();
    const copiedPages = await targetPdfDoc.copyPages(sourcePdfDoc, [...Array(pageCount).keys()]);
    
    // Add each copied page to the target document
    for (const page of copiedPages) {
      targetPdfDoc.addPage(page);
    }
    
    debugConfig.log('Successfully copied', copiedPages.length, 'pages');
    return true;
  } catch (error) {
    debugConfig.error('Error adding to combined PDF:', error);
    throw new Error('Failed to add to combined PDF: ' + error.message);
  }
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Download file
export function downloadFile(file, prefix = 'compressed_') {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}${file.name}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download multiple files with delay
export function downloadAllFiles(files) {
  if (files.length === 0) return;
  
  // For multiple files, we need to trigger downloads sequentially
  // with a small delay to ensure browser handles them properly
  files.forEach((file, index) => {
    setTimeout(() => {
      downloadFile(file);
    }, index * 500); // 500ms delay between downloads
  });
}

// Get Mistral API key from localStorage
export function getMistralApiKey() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mistralApiKey');
}

// Process large PDF in chunks for OCR
export async function processLargePdfInChunks(pdfFile) {
  debugConfig.log('Processing large PDF in chunks:', pdfFile.name);
  
  try {
    // Load the PDF using PDF.js to get page count
    const tempPdfBytes = await pdfFile.slice(0).arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: tempPdfBytes }).promise;
    const numPages = pdf.numPages;
    
    debugConfig.log(`PDF has ${numPages} pages, will process in chunks`);
    
    // Create chunks of pages - smaller chunks for very large PDFs
    const pdfSizeInMB = pdfFile.size / (1024 * 1024);
    
    // Adjust chunk size based on PDF size
    let CHUNK_SIZE = 5; // default
    if (pdfSizeInMB > 30) {
      CHUNK_SIZE = 2; // Very large PDFs get tiny chunks
    } else if (pdfSizeInMB > 20) {
      CHUNK_SIZE = 3; // Larger PDFs get smaller chunks
    } else if (pdfSizeInMB > 10) {
      CHUNK_SIZE = 4; // Medium PDFs get medium chunks
    }
    
    debugConfig.log(`Using chunk size of ${CHUNK_SIZE} pages based on PDF size (${pdfSizeInMB.toFixed(2)} MB)`);
    
    const chunks = [];
    
    for (let i = 1; i <= numPages; i += CHUNK_SIZE) {
      const endPage = Math.min(i + CHUNK_SIZE - 1, numPages);
      chunks.push({ startPage: i, endPage: endPage });
    }
    
    debugConfig.log(`Split PDF into ${chunks.length} chunks for processing`);
    
    // Process each chunk and collect results
    const allResults = [];
    let failedChunks = 0;
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      debugConfig.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} (pages ${chunk.startPage}-${chunk.endPage})`);
      
      try {
        // Create a new PDF with just the pages from this chunk
        const chunkPdfDoc = await PDFLib.PDFDocument.create();
        
        // Create a fresh copy of the file for each chunk
        const sourcePdfBytes = await pdfFile.slice(0).arrayBuffer();
        const sourcePdfDoc = await PDFLib.PDFDocument.load(sourcePdfBytes);
        
        // Copy pages from source to chunk
        const pageIndices = [];
        for (let i = chunk.startPage - 1; i < chunk.endPage; i++) {
          pageIndices.push(i);
        }
        
        const copiedPages = await chunkPdfDoc.copyPages(sourcePdfDoc, pageIndices);
        copiedPages.forEach(page => chunkPdfDoc.addPage(page));
        
        // Save the chunk PDF
        const chunkPdfBytes = await chunkPdfDoc.save();
        const chunkPdfFile = new File([chunkPdfBytes], `chunk_${chunkIndex + 1}_${pdfFile.name}`, { type: 'application/pdf' });
        
        // Process this chunk with OCR
        debugConfig.log(`Sending chunk ${chunkIndex + 1} to OCR service (${formatFileSize(chunkPdfFile.size)})`);
        const chunkResult = await analyzeCombinedPdfWithMistral(chunkPdfFile);
        
        if (chunkResult) {
          allResults.push(chunkResult);
          debugConfig.log(`Successfully processed chunk ${chunkIndex + 1}`);
        } else {
          debugConfig.warn(`Failed to process chunk ${chunkIndex + 1} - no results returned`);
          failedChunks++;
        }
      } catch (chunkError) {
        debugConfig.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError);
        failedChunks++;
        
        // Check if too many chunks are failing
        if (failedChunks > 2 && failedChunks / (chunkIndex + 1) > 0.5) {
          debugConfig.error('Too many chunks failing, aborting chunked processing');
          throw new Error('Multiple chunk processing failures - OCR may not be working properly');
        }
      }
      
      // Add a delay between chunks to avoid rate limiting
      const delayTime = 2000 + (Math.random() * 1000); // 2-3 seconds
      debugConfig.log(`Waiting ${Math.round(delayTime/1000)} seconds before processing next chunk...`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
    
    // Combine all results - require at least one successful chunk
    if (allResults.length === 0) {
      throw new Error('Failed to process any chunks of the PDF');
    }
    
    // Merge metadata from all chunks
    const combinedMetadata = {
      pageCount: numPages,
      totalWords: allResults.reduce((sum, result) => sum + (result.totalWords || 0), 0),
      language: allResults[0].language, // Use the language from the first chunk
      hasImages: allResults.some(result => result.hasImages),
      extractedText: allResults.map(result => result.extractedText || '').join('\n\n'),
      fullText: allResults.map(result => result.fullText || '').join('\n\n'),
      images: []
    };
    
    // Combine all images from all chunks, updating page indices
    allResults.forEach((result, chunkIndex) => {
      if (result.images && result.images.length > 0) {
        const chunkStartPage = chunks[chunkIndex].startPage;
        
        result.images.forEach(image => {
          // Update the page index to reflect the position in the full document
          const adjustedImage = { ...image };
          adjustedImage.pageIndex = (chunkStartPage - 1) + image.pageIndex;
          combinedMetadata.images.push(adjustedImage);
        });
      }
    });
    
    debugConfig.log(`Successfully processed all chunks, combined ${combinedMetadata.images.length} images`);
    return combinedMetadata;
  } catch (error) {
    debugConfig.error('Error processing large PDF in chunks:', error);
    throw error;
  }
}

// Analyze combined PDF with Mistral OCR API (placeholder - needs full implementation)
export async function analyzeCombinedPdfWithMistral(pdfFile) {
  // This is a simplified version - the full implementation would include
  // S3 upload, Mistral API calls, etc.
  debugConfig.log('OCR analysis would be implemented here for:', pdfFile.name);
  
  // Return mock metadata for now
  return {
    pageCount: 1,
    totalWords: 100,
    language: 'en',
    hasImages: false,
    extractedText: 'Sample extracted text...',
    fullText: 'Sample full text...',
    images: []
  };
}