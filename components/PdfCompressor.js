import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { 
  debugConfig, 
  loadAwsConfig, 
  compressPdf, 
  addToCombinedPdf, 
  formatFileSize, 
  downloadFile, 
  downloadAllFiles,
  processLargePdfInChunks,
  analyzeCombinedPdfWithMistral,
  getMistralApiKey 
} from '../utils/pdfUtils';

export default function PdfCompressor() {
  const [files, setFiles] = useState([]);
  const [compressedFiles, setCompressedFiles] = useState([]);
  const [quality, setQuality] = useState(50);
  const [dpi, setDpi] = useState(150);
  const [combineFiles, setCombineFiles] = useState(false);
  const [enableOcr, setEnableOcr] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [mistralApiKey, setMistralApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [combinedPdf, setCombinedPdf] = useState(null);
  const [combinedPdfMetadata, setCombinedPdfMetadata] = useState(null);
  
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  useEffect(() => {
    // Load saved preferences
    const savedDebugMode = localStorage.getItem('debugMode') === 'true';
    const savedEnableOcr = localStorage.getItem('enableOcr') !== 'false';
    const savedApiKey = localStorage.getItem('mistralApiKey');
    
    setDebugMode(savedDebugMode);
    setEnableOcr(savedEnableOcr);
    if (savedApiKey) {
      setMistralApiKey('••••••••••••••••');
    }

    // Update debug config
    debugConfig.isDebugMode = savedDebugMode;

    // Load AWS config
    loadAwsConfig().catch(error => {
      console.error('Failed to load AWS configuration:', error);
    });
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    dropAreaRef.current?.classList.add('highlight');
  };

  const handleDragLeave = () => {
    dropAreaRef.current?.classList.remove('highlight');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropAreaRef.current?.classList.remove('highlight');
    
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    handleFiles(e.target.files);
  };

  const handleFiles = (newFiles) => {
    const pdfFiles = Array.from(newFiles).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Please select only PDF files.');
      return;
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert('Please select at least one PDF file to compress.');
      return;
    }
    
    setIsProcessing(true);
    setCompressedFiles([]);
    
    // Reset combined PDF if enabled
    let combinedPdfDoc = null;
    if (combineFiles) {
      combinedPdfDoc = await window.PDFLib.PDFDocument.create();
    }
    
    // Process each file
    const processedFiles = [];
    const totalFiles = files.length;
    
    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${totalFiles}: ${file.name}`);
        
        // Progress callback
        const updateProgress = (progress) => {
          console.log(`File ${i + 1} progress: ${progress}%`);
        };
        
        // Compress the PDF
        const compressedFile = await compressPdf(file, quality, dpi, updateProgress);
        processedFiles.push(compressedFile);
        
        // Add to combined PDF if enabled
        if (combineFiles && combinedPdfDoc) {
          await addToCombinedPdf(compressedFile, combinedPdfDoc);
        }
      }
      
      setCompressedFiles(processedFiles);
      
      // Create combined PDF blob if enabled
      if (combineFiles && combinedPdfDoc) {
        const combinedPdfBytes = await combinedPdfDoc.save();
        const combinedPdfBlob = new Blob([combinedPdfBytes], { type: 'application/pdf' });
        const combinedPdfFile = new File([combinedPdfBlob], 'combined.pdf', { type: 'application/pdf' });
        setCombinedPdf(combinedPdfFile);
        
        // Process OCR for combined PDF if enabled
        if (enableOcr) {
          try {
            const isLargePdf = combinedPdfFile.size > 10 * 1024 * 1024; // 10MB threshold
            
            let metadata;
            if (isLargePdf) {
              debugConfig.log('PDF is large, using chunking approach for OCR');
              metadata = await processLargePdfInChunks(combinedPdfFile);
            } else {
              debugConfig.log('Processing PDF with standard OCR approach');
              metadata = await analyzeCombinedPdfWithMistral(combinedPdfFile);
            }
            
            setCombinedPdfMetadata(metadata);
          } catch (error) {
            debugConfig.error('Error during OCR processing:', error);
            alert('Error during OCR processing: ' + error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const saveApiKey = () => {
    const apiKey = mistralApiKey.trim();
    if (apiKey && apiKey !== '••••••••••••••••') {
      localStorage.setItem('mistralApiKey', apiKey);
      setMistralApiKey('••••••••••••••••');
      alert('API key saved successfully!');
    } else {
      alert('Please enter an API key.');
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('mistralApiKey');
    setMistralApiKey('');
    alert('API key cleared.');
  };

  const handleDebugModeChange = (e) => {
    const checked = e.target.checked;
    setDebugMode(checked);
    localStorage.setItem('debugMode', checked);
    debugConfig.isDebugMode = checked;
  };

  const handleEnableOcrChange = (e) => {
    const checked = e.target.checked;
    setEnableOcr(checked);
    localStorage.setItem('enableOcr', checked);
  };

  const handleDownloadAll = () => {
    downloadAllFiles(compressedFiles);
  };

  const handleDownloadCombined = () => {
    if (combinedPdf) {
      downloadFile(combinedPdf, '');
    }
  };

  return (
    <>
      <Head>
        <title>Ultra-Compress PDF</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <Script 
        src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js" 
        strategy="beforeInteractive"
      />
      <Script 
        src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js" 
        strategy="beforeInteractive"
      />
      <Script 
        src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js" 
        strategy="beforeInteractive"
      />

      <div className="container">
        <h1>compress.bchwy.com</h1>
        <div className="subtitle">
          <p>Drop your PDFs here to compress them while keeping them readable for humans and LLMs</p>
          <a href="https://github.com/bchewy/compress" className="github-link" target="_blank" rel="noopener noreferrer">
            <svg height="24" viewBox="0 0 16 16" width="24" className="github-icon">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub Repository
          </a>
        </div>
        
        <details className="how-it-works-collapsible">
          <summary>How It Works</summary>
          <div className="how-it-works">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <div className="feature-content">
                <h3>PDF Compression</h3>
                <p>Our compression engine intelligently reduces PDF file sizes while maintaining readability:</p>
                <ul>
                  <li>Converts each page to an optimized image at your selected DPI</li>
                  <li>Applies JPEG compression using your chosen quality setting</li>
                  <li>Rebuilds a new, lightweight PDF with the optimized images</li>
                </ul>
                <p className="feature-note">Result: Files that are 70-90% smaller but still perfectly readable by both humans and AI systems.</p>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <div className="feature-content">
                <h3>PDF Combination</h3>
                <p>Merge multiple documents into a single, organized PDF:</p>
                <ul>
                  <li>Compresses each document with your specified settings</li>
                  <li>Preserves document order as arranged in your file list</li>
                  <li>Combines all pages into a clean, unified document</li>
                </ul>
                <p className="feature-note">Perfect for creating course materials, reports, or documentation from multiple sources.</p>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <div className="feature-content">
                <h3>OCR Processing</h3>
                <p>Extract and analyze text from your combined documents:</p>
                <ul>
                  <li>Securely uploads your PDF to AWS S3 with a temporary pre-signed URL</li>
                  <li>Processes the document through Mistral AI&apos;s advanced OCR service</li>
                  <li>Extracts text from all content, including images and scanned pages</li>
                  <li>Automatically deletes your file from S3 after processing</li>
                  <li>Provides document metadata and downloadable extracted text</li>
                </ul>
                <p className="feature-note">Your files remain private and are only temporarily stored during the OCR process.</p>
              </div>
            </div>
          </div>
        </details>
        
        <div 
          ref={dropAreaRef}
          className="drop-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drop PDF files here or</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf" 
            multiple 
            hidden 
            onChange={handleFileSelect}
          />
          <button onClick={() => fileInputRef.current?.click()}>Select Files</button>
        </div>
        
        {files.length > 0 && (
          <div id="file-list-container">
            <h3>Files to Process</h3>
            <p className="reorder-hint">Drag and drop to reorder files</p>
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="drag-handle">⋮⋮</div>
                  <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatFileSize(file.size)}</div>
                  </div>
                  <button className="remove-btn" onClick={() => removeFile(index)}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="compression-options">
          <h3>Compression Options</h3>
          <div className="option">
            <label htmlFor="quality">Image Quality (lower = smaller size):</label>
            <input 
              type="range" 
              id="quality" 
              min="1" 
              max="100" 
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
            />
            <span>{quality}%</span>
          </div>
          <div className="option">
            <label htmlFor="dpi">Resolution (DPI):</label>
            <input 
              type="range" 
              id="dpi" 
              min="72" 
              max="300" 
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value))}
            />
            <span>{dpi} DPI</span>
          </div>
          <div className="combine-option">
            <input 
              type="checkbox" 
              id="combineFiles"
              checked={combineFiles}
              onChange={(e) => setCombineFiles(e.target.checked)}
            />
            <label htmlFor="combineFiles">Combine all PDFs into a single file</label>
          </div>
          <div className="api-settings">
            <details>
              <summary>OCR Settings</summary>
              <div className="api-key-settings">
                <div className="option-row">
                  <input 
                    type="checkbox" 
                    id="enableOcr"
                    checked={enableOcr}
                    onChange={handleEnableOcrChange}
                  />
                  <label htmlFor="enableOcr">Enable OCR analysis for combined PDF</label>
                </div>
                <div className="option-row">
                  <input 
                    type="checkbox" 
                    id="debugMode"
                    checked={debugMode}
                    onChange={handleDebugModeChange}
                  />
                  <label htmlFor="debugMode">Enable Debug Mode (console logs)</label>
                </div>
                <label htmlFor="mistralApiKey">Mistral API Key:</label>
                <div className="api-key-input">
                  <input 
                    type="password" 
                    id="mistralApiKey" 
                    placeholder="Enter your Mistral API key"
                    value={mistralApiKey}
                    onChange={(e) => setMistralApiKey(e.target.value)}
                  />
                  <button onClick={saveApiKey}>Save</button>
                  <button onClick={clearApiKey}>Clear</button>
                </div>
                <p className="api-key-info">Required for analyzing combined PDFs with OCR. Your API key is stored locally in your browser.</p>
              </div>
            </details>
          </div>
          <button 
            id="compressBtn" 
            disabled={files.length === 0 || isProcessing}
            onClick={processFiles}
          >
            {isProcessing ? 'Processing...' : 'Compress Files'}
          </button>
        </div>
        
        <div className="results" style={{ display: compressedFiles.length > 0 ? 'block' : 'none' }}>
          <h3>Results</h3>
          <div id="result-list">
            {compressedFiles.map((compressedFile, index) => {
              const originalFile = files[index];
              const reduction = originalFile ? ((originalFile.size - compressedFile.size) / originalFile.size * 100).toFixed(2) : 0;
              
              return (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <div className="file-name">{compressedFile.name}</div>
                  </div>
                  <div className="result-details">
                    <div className="size-comparison">
                      <span>Original: {originalFile ? formatFileSize(originalFile.size) : 'Unknown'}</span>
                      <span> → </span>
                      <span>Compressed: {formatFileSize(compressedFile.size)}</span>
                      <span className="reduction"> ({reduction}% smaller)</span>
                    </div>
                    <div className="actions">
                      <button onClick={() => downloadFile(compressedFile)}>Download</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="download-all-container">
            <button disabled={compressedFiles.length === 0} onClick={handleDownloadAll}>Download All</button>
            <button disabled={!combinedPdf} onClick={handleDownloadCombined}>Download Combined PDF</button>
          </div>
        </div>
      </div>
    </>
  );
}