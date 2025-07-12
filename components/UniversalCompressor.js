import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { 
  FILE_TYPES, 
  detectFileType, 
  getFileTypeInfo, 
  getAllSupportedExtensions,
  isFileSupported 
} from '../utils/fileTypes';
import { compressionEngine } from '../utils/compressionEngine';
import { formatFileSize, downloadFile, downloadAllFiles } from '../utils/pdfUtils';

export default function UniversalCompressor() {
  const [files, setFiles] = useState([]);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState('');
  
  // Compression options for different file types
  const [pdfOptions, setPdfOptions] = useState({ quality: 50, dpi: 150 });
  const [imageOptions, setImageOptions] = useState({ 
    quality: 0.8, 
    format: 'jpeg',
    maxWidth: null,
    maxHeight: null 
  });
  const [textOptions, setTextOptions] = useState({
    method: 'optimize',
    removeComments: true,
    removeExtraWhitespace: true,
    removeEmptyLines: true
  });

  const [selectedTab, setSelectedTab] = useState('all');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

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
    const supportedFiles = Array.from(newFiles).filter(file => {
      if (!isFileSupported(file)) {
        console.warn(`Unsupported file type: ${file.name}`);
        return false;
      }
      return true;
    });
    
    if (supportedFiles.length === 0) {
      alert('No supported files found. Please select PDF, image, text, or document files.');
      return;
    }
    
    if (supportedFiles.length !== newFiles.length) {
      alert(`${newFiles.length - supportedFiles.length} unsupported files were excluded.`);
    }
    
    setFiles(prev => [...prev, ...supportedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert('Please select at least one file to compress.');
      return;
    }
    
    setIsProcessing(true);
    setProcessedFiles([]);
    setProcessingProgress(0);
    
    try {
      const compressionOptions = {
        [FILE_TYPES.PDF]: pdfOptions,
        [FILE_TYPES.IMAGE]: imageOptions,
        [FILE_TYPES.TEXT]: textOptions
      };

      const progressCallback = (progress, fileIndex, fileName, fileType) => {
        setProcessingProgress(progress);
        setCurrentProcessingFile(fileName);
      };

      const results = await compressionEngine.compressFiles(
        files, 
        compressionOptions, 
        progressCallback
      );
      
      setProcessedFiles(results);
      
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files: ' + error.message);
    }
    
    setIsProcessing(false);
    setProcessingProgress(0);
    setCurrentProcessingFile('');
  };

  const getFilesByType = (fileType) => {
    return files.filter(file => detectFileType(file) === fileType);
  };

  const getProcessedFilesByType = (fileType) => {
    return processedFiles.filter(result => result.fileType === fileType);
  };

  const renderFileList = (filesToRender, title) => {
    if (filesToRender.length === 0) return null;

    return (
      <div className="file-type-section">
        <h4>{title} ({filesToRender.length})</h4>
        <div className="file-list">
          {filesToRender.map((file, index) => {
            const fileType = detectFileType(file);
            const fileInfo = getFileTypeInfo(fileType);
            
            return (
              <div key={index} className="file-item">
                <div className="file-icon">{fileInfo?.icon || '📄'}</div>
                <div className="file-details">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatFileSize(file.size)}</div>
                  <div className="file-type">{fileInfo?.description || 'Unknown'}</div>
                </div>
                <button className="remove-btn" onClick={() => removeFile(files.indexOf(file))}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCompressionOptions = () => {
    return (
      <div className="compression-options">
        <div className="options-header">
          <h3>Compression Options</h3>
          <button 
            className="toggle-advanced"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? 'Simple' : 'Advanced'} Options
          </button>
        </div>

        {/* PDF Options */}
        {getFilesByType(FILE_TYPES.PDF).length > 0 && (
          <div className="file-type-options">
            <h4>📄 PDF Options</h4>
            <div className="option">
              <label>Quality: {pdfOptions.quality}%</label>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={pdfOptions.quality}
                onChange={(e) => setPdfOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
              />
            </div>
            <div className="option">
              <label>DPI: {pdfOptions.dpi}</label>
              <input 
                type="range" 
                min="72" 
                max="300" 
                value={pdfOptions.dpi}
                onChange={(e) => setPdfOptions(prev => ({ ...prev, dpi: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        )}

        {/* Image Options */}
        {getFilesByType(FILE_TYPES.IMAGE).length > 0 && (
          <div className="file-type-options">
            <h4>🖼️ Image Options</h4>
            <div className="option">
              <label>Quality: {Math.round(imageOptions.quality * 100)}%</label>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                value={imageOptions.quality}
                onChange={(e) => setImageOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="option">
              <label>Format:</label>
              <select 
                value={imageOptions.format}
                onChange={(e) => setImageOptions(prev => ({ ...prev, format: e.target.value }))}
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            {showAdvancedOptions && (
              <>
                <div className="option">
                  <label>Max Width (px):</label>
                  <input 
                    type="number" 
                    placeholder="Auto"
                    value={imageOptions.maxWidth || ''}
                    onChange={(e) => setImageOptions(prev => ({ 
                      ...prev, 
                      maxWidth: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
                <div className="option">
                  <label>Max Height (px):</label>
                  <input 
                    type="number" 
                    placeholder="Auto"
                    value={imageOptions.maxHeight || ''}
                    onChange={(e) => setImageOptions(prev => ({ 
                      ...prev, 
                      maxHeight: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Text Options */}
        {getFilesByType(FILE_TYPES.TEXT).length > 0 && (
          <div className="file-type-options">
            <h4>📝 Text Options</h4>
            <div className="option">
              <label>Method:</label>
              <select 
                value={textOptions.method}
                onChange={(e) => setTextOptions(prev => ({ ...prev, method: e.target.value }))}
              >
                <option value="optimize">Optimize</option>
                <option value="minify">Minify</option>
                <option value="gzip">GZIP</option>
              </select>
            </div>
            {showAdvancedOptions && (
              <>
                <div className="option-checkbox">
                  <input 
                    type="checkbox" 
                    checked={textOptions.removeComments}
                    onChange={(e) => setTextOptions(prev => ({ ...prev, removeComments: e.target.checked }))}
                  />
                  <label>Remove Comments</label>
                </div>
                <div className="option-checkbox">
                  <input 
                    type="checkbox" 
                    checked={textOptions.removeExtraWhitespace}
                    onChange={(e) => setTextOptions(prev => ({ ...prev, removeExtraWhitespace: e.target.checked }))}
                  />
                  <label>Remove Extra Whitespace</label>
                </div>
                <div className="option-checkbox">
                  <input 
                    type="checkbox" 
                    checked={textOptions.removeEmptyLines}
                    onChange={(e) => setTextOptions(prev => ({ ...prev, removeEmptyLines: e.target.checked }))}
                  />
                  <label>Remove Empty Lines</label>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (processedFiles.length === 0) return null;

    const successfulResults = processedFiles.filter(result => result.success);
    const failedResults = processedFiles.filter(result => !result.success);

    return (
      <div className="results">
        <h3>Results ({processedFiles.length} files processed)</h3>
        
        {successfulResults.length > 0 && (
          <div className="successful-results">
            <h4>✅ Successfully Compressed ({successfulResults.length})</h4>
            {successfulResults.map((result, index) => {
              const fileInfo = getFileTypeInfo(result.fileType);
              
              return (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <div className="file-icon">{fileInfo?.icon || '📄'}</div>
                    <div className="file-name">{result.original.name}</div>
                  </div>
                  <div className="result-details">
                    <div className="size-comparison">
                      <span>Original: {formatFileSize(result.original.size)}</span>
                      <span> → </span>
                      <span>Compressed: {formatFileSize(result.compressed.size)}</span>
                      <span className="reduction"> ({result.reduction}% smaller)</span>
                    </div>
                    <div className="actions">
                      <button onClick={() => downloadFile(result.compressed)}>Download</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {failedResults.length > 0 && (
          <div className="failed-results">
            <h4>❌ Failed to Compress ({failedResults.length})</h4>
            {failedResults.map((result, index) => (
              <div key={index} className="result-item error">
                <div className="file-name">{result.original.name}</div>
                <div className="error-message">{result.error}</div>
              </div>
            ))}
          </div>
        )}

        {successfulResults.length > 0 && (
          <div className="download-all-container">
            <button onClick={() => downloadAllFiles(successfulResults.map(r => r.compressed))}>
              Download All Compressed Files
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Universal File Compressor</title>
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

      <div className="container">
        <h1>Universal File Compressor</h1>
        <div className="subtitle">
          <p>Compress PDFs, images, text files, and more while maintaining quality</p>
          <a href="https://github.com/bchewy/compress" className="github-link" target="_blank" rel="noopener noreferrer">
            <svg height="24" viewBox="0 0 16 16" width="24" className="github-icon">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub Repository
          </a>
        </div>
        
        <div className="supported-formats">
          <p><strong>Supported formats:</strong> PDF, JPEG, PNG, GIF, WebP, TXT, MD, JSON, XML, CSV, and more</p>
        </div>
        
        <div 
          ref={dropAreaRef}
          className="drop-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drop files here or</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept={getAllSupportedExtensions()}
            multiple 
            hidden 
            onChange={handleFileSelect}
          />
          <button onClick={() => fileInputRef.current?.click()}>Select Files</button>
        </div>
        
        {files.length > 0 && (
          <div className="file-list-container">
            <h3>Files to Process ({files.length})</h3>
            
            <div className="file-type-tabs">
              <button 
                className={selectedTab === 'all' ? 'active' : ''}
                onClick={() => setSelectedTab('all')}
              >
                All ({files.length})
              </button>
              {Object.values(FILE_TYPES).map(type => {
                const typeFiles = getFilesByType(type);
                if (typeFiles.length === 0) return null;
                const info = getFileTypeInfo(type);
                
                return (
                  <button 
                    key={type}
                    className={selectedTab === type ? 'active' : ''}
                    onClick={() => setSelectedTab(type)}
                  >
                    {info.icon} {info.description} ({typeFiles.length})
                  </button>
                );
              })}
            </div>
            
            <div className="file-list-content">
              {selectedTab === 'all' 
                ? renderFileList(files, 'All Files')
                : renderFileList(getFilesByType(selectedTab), getFileTypeInfo(selectedTab)?.description || 'Files')
              }
            </div>
          </div>
        )}
        
        {files.length > 0 && renderCompressionOptions()}
        
        {isProcessing && (
          <div className="processing-status">
            <h3>Processing Files...</h3>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${processingProgress}%` }}></div>
            </div>
            <p>{Math.round(processingProgress)}% - {currentProcessingFile}</p>
          </div>
        )}
        
        <div className="action-buttons">
          <button 
            className="compress-btn"
            disabled={files.length === 0 || isProcessing}
            onClick={processFiles}
          >
            {isProcessing ? 'Processing...' : `Compress ${files.length} File${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
        
        {renderResults()}
      </div>
    </>
  );
}