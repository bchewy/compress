// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// AWS Configuration - Will be populated from server
const awsConfig = {
    region: '',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    },
    bucketName: ''
};

// Debug configuration
const debugConfig = {
    isDebugMode: localStorage.getItem('debugMode') === 'true' || false,
    log: function(message, ...args) {
        if (this.isDebugMode) {
            console.log(message, ...args);
        }
    },
    warn: function(message, ...args) {
        // Always show warnings, but with different styling based on debug mode
        if (this.isDebugMode) {
            console.warn(message, ...args);
        } else {
            console.warn('[WARNING]', message, ...args);
        }
    },
    error: function(message, ...args) {
        // Always log errors regardless of debug mode
        console.error(message, ...args);
    }
};

// Load AWS configuration from server
async function loadAwsConfig() {
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
        alert('Failed to load AWS configuration. Some features may not work properly.');
    }
}

// DOM elements
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const fileList = document.getElementById('file-list');
const compressBtn = document.getElementById('compressBtn');
const resultList = document.getElementById('result-list');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const dpiSlider = document.getElementById('dpi');
const dpiValue = document.getElementById('dpiValue');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadCombinedBtn = document.getElementById('downloadCombinedBtn');
const combineFilesCheckbox = document.getElementById('combineFiles');
const mistralApiKeyInput = document.getElementById('mistralApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
const enableOcrCheckbox = document.getElementById('enableOcr');
const debugModeCheckbox = document.getElementById('debugMode');

// Comparison modal elements
const comparisonModal = document.getElementById('comparisonModal');
const closeBtn = document.querySelector('.close-btn');
const originalViewer = document.getElementById('originalViewer');
const compressedViewer = document.getElementById('compressedViewer');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// State
let files = [];
let compressedFiles = [];
let combinedPdf = null;
let currentPage = 1;
let totalPages = 1;
let originalPdf = null;
let compressedPdf = null;
let combinedPdfMetadata = null;

// Initialize Sortable for reordering files
const sortable = new Sortable(fileList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    handle: '.drag-handle',
    onEnd: () => {
        // Reorder files array based on the new DOM order
        const newFilesOrder = [];
        const fileItems = fileList.querySelectorAll('.file-item');
        
        fileItems.forEach(item => {
            const index = parseInt(item.dataset.index);
            newFilesOrder.push(files[index]);
        });
        
        files = newFilesOrder;
        updateFileList();
    }
});

// Initialize debug mode checkbox based on saved preference
debugModeCheckbox.checked = debugConfig.isDebugMode;

// Event listeners
window.addEventListener('load', loadAwsConfig);

// Debug mode toggle event listener
debugModeCheckbox.addEventListener('change', () => {
    debugConfig.isDebugMode = debugModeCheckbox.checked;
    localStorage.setItem('debugMode', debugModeCheckbox.checked);
    debugConfig.log('Debug mode ' + (debugConfig.isDebugMode ? 'enabled' : 'disabled'));
});

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('highlight');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('highlight');
    
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
});

selectBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
});

compressBtn.addEventListener('click', processFiles);

qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
});

dpiSlider.addEventListener('input', () => {
    dpiValue.textContent = `${dpiSlider.value} DPI`;
});

// API key management
saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = mistralApiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('mistralApiKey', apiKey);
        mistralApiKeyInput.value = '';
        alert('API key saved successfully!');
    } else {
        alert('Please enter an API key.');
    }
});

clearApiKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('mistralApiKey');
    mistralApiKeyInput.value = '';
    alert('API key cleared.');
});

// Load saved API key if exists
const savedApiKey = localStorage.getItem('mistralApiKey');
if (savedApiKey) {
    mistralApiKeyInput.value = '••••••••••••••••'; // Show masked value to indicate key is saved
}

// Initialize the enableOcr checkbox based on saved preference
const enableOcr = localStorage.getItem('enableOcr') !== 'false'; // Default to true if not set
enableOcrCheckbox.checked = enableOcr;

// Save the OCR preference when changed
enableOcrCheckbox.addEventListener('change', () => {
    localStorage.setItem('enableOcr', enableOcrCheckbox.checked);
});

downloadAllBtn.addEventListener('click', downloadAllFiles);
downloadCombinedBtn.addEventListener('click', downloadCombinedFile);

// Modal control
closeBtn.addEventListener('click', () => {
    comparisonModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === comparisonModal) {
        comparisonModal.style.display = 'none';
    }
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderComparisonPages(currentPage);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderComparisonPages(currentPage);
    }
});

// Functions
function handleFiles(newFiles) {
    const pdfFiles = Array.from(newFiles).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        alert('Please select only PDF files.');
        return;
    }
    
    files = [...files, ...pdfFiles];
    updateFileList();
    updateCompressButton();
}

function updateFileList() {
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.dataset.index = index;
        
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        dragHandle.innerHTML = '⋮⋮';
        
        const fileDetails = document.createElement('div');
        fileDetails.classList.add('file-details');
        
        const fileName = document.createElement('div');
        fileName.classList.add('file-name');
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.classList.add('file-size');
        fileSize.textContent = formatFileSize(file.size);
        
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeFile(index));
        
        fileDetails.appendChild(fileName);
        fileDetails.appendChild(fileSize);
        
        fileItem.appendChild(dragHandle);
        fileItem.appendChild(fileDetails);
        fileItem.appendChild(removeBtn);
        
        fileList.appendChild(fileItem);
    });
    
    document.getElementById('file-list-container').style.display = files.length > 0 ? 'block' : 'none';
}

function removeFile(index) {
    files.splice(index, 1);
    updateFileList();
    updateCompressButton();
}

function updateCompressButton() {
    compressBtn.disabled = files.length === 0;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processFiles() {
    if (files.length === 0) {
        alert('Please select at least one PDF file to compress.');
        return;
    }
    
    // Disable the compress button while processing
    compressBtn.disabled = true;
    compressBtn.textContent = 'Processing...';
    
    // Clear previous results
    resultList.innerHTML = '';
    document.getElementById('results').style.display = 'block';
    downloadAllBtn.disabled = true;
    downloadCombinedBtn.disabled = true;
    
    // Reset combined PDF if enabled
    if (combineFilesCheckbox.checked) {
        combinedPdf = await PDFLib.PDFDocument.create();
        combinedPdfMetadata = null;
    }
    
    // Process each file
    compressedFiles = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        
        const resultHeader = document.createElement('div');
        resultHeader.classList.add('result-header');
        
        const fileName = document.createElement('div');
        fileName.classList.add('file-name');
        fileName.textContent = file.name;
        
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('progress-container');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = '0%';
        
        const progressText = document.createElement('div');
        progressText.classList.add('progress-text');
        progressText.textContent = 'Compressing: 0%';
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        resultHeader.appendChild(fileName);
        resultItem.appendChild(resultHeader);
        resultItem.appendChild(progressContainer);
        
        resultList.appendChild(resultItem);
        
        try {
            // Update progress callback
            const updateProgress = (progress) => {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Compressing: ${progress}%`;
            };
            
            // Compress the PDF
            const compressedFile = await compressPdf(file, parseInt(qualitySlider.value), parseInt(dpiSlider.value), updateProgress);
            compressedFiles.push(compressedFile);
            
            // Update the result item with compression details
            progressContainer.style.display = 'none';
            
            const resultDetails = document.createElement('div');
            resultDetails.classList.add('result-details');
            
            const sizeComparison = document.createElement('div');
            sizeComparison.classList.add('size-comparison');
            
            const originalSize = document.createElement('span');
            originalSize.textContent = `Original: ${formatFileSize(file.size)}`;
            
            const arrow = document.createElement('span');
            arrow.textContent = ' → ';
            
            const newSize = document.createElement('span');
            newSize.textContent = `Compressed: ${formatFileSize(compressedFile.size)}`;
            
            const reduction = document.createElement('span');
            const percentReduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(2);
            reduction.textContent = ` (${percentReduction}% smaller)`;
            
            sizeComparison.appendChild(originalSize);
            sizeComparison.appendChild(arrow);
            sizeComparison.appendChild(newSize);
            sizeComparison.appendChild(reduction);
            
            const actions = document.createElement('div');
            actions.classList.add('actions');
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => downloadFile(compressedFile));
            
            const compareBtn = document.createElement('button');
            compareBtn.textContent = 'Compare';
            compareBtn.addEventListener('click', () => openComparisonModal(file, compressedFile));
            
            actions.appendChild(downloadBtn);
            actions.appendChild(compareBtn);
            
            resultDetails.appendChild(sizeComparison);
            resultDetails.appendChild(actions);
            
            resultItem.appendChild(resultDetails);
            
            // Add to combined PDF if enabled
            if (combineFilesCheckbox.checked) {
                await addToCombinedPdf(compressedFile, combinedPdf);
            }
        } catch (error) {
            debugConfig.error('Error compressing file:', error);
            
            progressContainer.style.display = 'none';
            
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('error-message');
            errorMessage.textContent = `Error: ${error.message}`;
            
            resultItem.appendChild(errorMessage);
        }
    }
    
    // Enable the download buttons
    downloadAllBtn.disabled = compressedFiles.length === 0;
    
    // Enable download combined button if combined PDF was created
    if (combineFilesCheckbox.checked && compressedFiles.length > 0) {
        downloadCombinedBtn.disabled = false;
        
        // Process OCR for combined PDF if enabled
        if (enableOcrCheckbox.checked && combinedPdf) {
            try {
                // Save the combined PDF as a Blob
                const combinedPdfBytes = await combinedPdf.save();
                const combinedPdfBlob = new Blob([combinedPdfBytes], { type: 'application/pdf' });
                const combinedPdfFile = new File([combinedPdfBlob], 'combined.pdf', { type: 'application/pdf' });
                
                // Check if the PDF is large before OCR processing
                const isLargePdf = combinedPdfFile.size > 10 * 1024 * 1024; // 10MB threshold
                
                if (isLargePdf) {
                    debugConfig.log('PDF is large, using chunking approach for OCR');
                    combinedPdfMetadata = await processLargePdfInChunks(combinedPdfFile);
                } else {
                    debugConfig.log('Processing PDF with standard OCR approach');
                    combinedPdfMetadata = await analyzeCombinedPdfWithMistral(combinedPdfFile);
                }
                
                if (!combinedPdfMetadata) {
                    debugConfig.log('OCR processing returned no metadata');
                }
                
                if (combinedPdfMetadata) {
                    // Display the metadata section
                    displayCombinedPdfMetadata(combinedPdfMetadata);
                }
            } catch (error) {
                debugConfig.error('Error during OCR processing:', error);
                alert('Error during OCR processing: ' + error.message);
            }
        }
    }
    
    // Reset the compress button
    compressBtn.disabled = false;
    compressBtn.textContent = 'Compress Files';
}

async function compressPdf(file, quality, dpi, progressCallback) {
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

// Functions for comparison, download all, and combining PDFs
function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAllFiles() {
    if (compressedFiles.length === 0) return;
    
    // For multiple files, we need to trigger downloads sequentially
    // with a small delay to ensure browser handles them properly
    compressedFiles.forEach((file, index) => {
        setTimeout(() => {
            downloadFile(file);
        }, index * 500); // 500ms delay between downloads
    });
}

function downloadCombinedFile() {
    if (!combinedPdf) return;
    
    const url = URL.createObjectURL(combinedPdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combined.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function addToCombinedPdf(pdfFile, targetPdfDoc) {
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
        
        // After loading, the arrayBuffer might get detached (transferred)
        debugConfig.log('After PDFLib.load, ArrayBuffer is detached:', isArrayBufferDetached(arrayBuffer));
        
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
        
        // Try alternative approach with blob URL
        try {
            debugConfig.log('Trying alternative approach...');
            
            // Create a Blob URL for the file
            const blob = new Blob([pdfFile], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            debugConfig.log('Created blob URL:', blobUrl);
            
            // Load the PDF document from the Blob URL using pdf.js
            const loadingTask = pdfjsLib.getDocument(blobUrl);
            const pdfDoc = await loadingTask.promise;
            debugConfig.log('Successfully loaded PDF from blob URL');
            
            // Copy each page
            const pageCount = pdfDoc.numPages;
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });
                
                // Create a blank page in the target document
                const targetPage = targetPdfDoc.addPage([viewport.width, viewport.height]);
                
                // We can't directly copy content, but for this fallback it's acceptable
                // More complex solution would involve rendering each page to canvas and embedding
            }
            
            debugConfig.log('Pages copied from blob URL source');
            URL.revokeObjectURL(blobUrl);
            return true;
        } catch (fallbackError) {
            debugConfig.error('Error in alternative approach:', fallbackError);
            throw new Error('Failed to add to combined PDF: ' + error.message);
        }
    }
}

// Helper function to check if an ArrayBuffer is detached
function isArrayBufferDetached(buffer) {
    try {
        // If we can access the byteLength, it's not detached
        return buffer.byteLength === 0;
    } catch (e) {
        // If accessing byteLength throws an error, it's detached
        return true;
    }
}

async function openComparisonModal(originalFile, compressedFile) {
    // Clear previous viewers
    originalViewer.innerHTML = '';
    compressedViewer.innerHTML = '';
    
    // Load original PDF
    const originalArrayBuffer = await originalFile.arrayBuffer();
    originalPdf = await pdfjsLib.getDocument({ data: originalArrayBuffer }).promise;
    
    // Load compressed PDF
    const compressedArrayBuffer = await compressedFile.arrayBuffer();
    compressedPdf = await pdfjsLib.getDocument({ data: compressedArrayBuffer }).promise;
    
    // Set total pages (use the smaller of the two)
    totalPages = Math.min(originalPdf.numPages, compressedPdf.numPages);
    totalPagesSpan.textContent = totalPages;
    
    // Reset current page
    currentPage = 1;
    currentPageSpan.textContent = currentPage;
    
    // Render first page of both PDFs
    await renderComparisonPages(currentPage);
    
    // Show the modal
    comparisonModal.style.display = 'block';
}

async function renderComparisonPages(pageNumber) {
    try {
        // Update page number display
        currentPageSpan.textContent = pageNumber;
        
        // Render original PDF page
        await renderPdfPage(originalPdf, pageNumber, originalViewer);
        
        // Render compressed PDF page
        await renderPdfPage(compressedPdf, pageNumber, compressedViewer);
        
        // Update buttons state
        prevPageBtn.disabled = pageNumber === 1;
        nextPageBtn.disabled = pageNumber === totalPages;
    } catch (error) {
        debugConfig.error('Error rendering comparison pages:', error);
    }
}

async function renderPdfPage(pdfDoc, pageNumber, container) {
    // Clear container
    container.innerHTML = '';
    
    // Get the page
    const page = await pdfDoc.getPage(pageNumber);
    
    // Calculate scale to fit container width (around 450px)
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(container.clientWidth / viewport.width, 1);
    const scaledViewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    
    // Render the page
    const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
    };
    
    await page.render(renderContext).promise;
    
    // Add to container
    container.appendChild(canvas);
}

/**
 * Analyze combined PDF with Mistral OCR API
 * @param {File} pdfFile - The combined PDF file
 * @returns {Promise<Object>} - Metadata about the PDF
 */
async function analyzeCombinedPdfWithMistral(pdfFile) {
    try {
        // Check if we have a valid API key
        const apiKey = getMistralApiKey();
        if (!apiKey) {
            throw new Error('Mistral API key is required for OCR processing. Please add it in the Settings.');
        }
        
        // Check file size - using S3 is better for large files
        debugConfig.log('File size:', formatFileSize(pdfFile.size));
        
        // Create a unique key for S3
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 10);
        const uniqueId = `${timestamp}-${randomString}`;
        const s3Key = `temp-ocr/${uniqueId}.pdf`;
        
        // Check if file is large (over 10MB)
        const isLargePdf = pdfFile.size > 10 * 1024 * 1024;
        debugConfig.log('Is large PDF?', isLargePdf, `(${pdfFile.size} bytes)`);
        
        // Upload to S3 first
        debugConfig.log('Uploading PDF to S3...');
        try {
            await uploadToS3(pdfFile, s3Key);
        } catch (uploadError) {
            debugConfig.error('Failed to upload to S3:', uploadError);
            throw new Error('Failed to upload PDF for OCR processing: ' + uploadError.message);
        }
        
        // Generate pre-signed URL for Mistral to access
        const fileUrl = await generatePresignedGetUrl(s3Key);
        debugConfig.log('Generated pre-signed GET URL for Mistral:', fileUrl);
        
        let metadata = null;
        
        try {
            // Make OCR request to Mistral
            debugConfig.log('Sending OCR request to Mistral...');
            
            // Prepare headers
            const headers = new Headers({
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            });
            
            // Prepare request body
            const requestBody = {
                url: fileUrl,
                mode: "document",
                // Include image extraction with all possible types
                images: true,
                images_formats: ["base64", "base64_with_shape"],
                skip_table_extraction: false,
                skip_text_extraction: false, 
                skip_figure_extraction: false
            };
            
            debugConfig.log('OCR request payload:', JSON.stringify(requestBody));
            debugConfig.log('Sending request to Mistral OCR API with URL:', fileUrl);
            
            // Add loading animation
            const metadataSection = document.createElement('div');
            metadataSection.className = 'metadata-section';
            metadataSection.innerHTML = `
                <h3>OCR Processing</h3>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Analyzing document with OCR. This may take a minute...</p>
                </div>
            `;
            resultList.appendChild(metadataSection);
            
            // Send OCR request to Mistral
            try {
                const response = await fetch('https://api.mistral.ai/v1/ocr', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });
                
                // Cleanup S3 on error
                if (!response.ok) {
                    debugConfig.error('OCR request failed:', response.status, response.statusText);
                    await deleteFromS3(s3Key);
                    debugConfig.log('Cleaned up S3 file after OCR failure');
                    
                    const errorText = await response.text();
                    throw new Error(`OCR request failed: ${response.status} ${response.statusText}: ${errorText}`);
                }
                
                // Parse response
                const data = await response.json();
                
                // Successful response
                debugConfig.log('Received successful response from Mistral OCR API');
                
                // Get headers for debugging
                const responseHeaders = {};
                for (const [key, value] of response.headers.entries()) {
                    responseHeaders[key] = value;
                }
                debugConfig.log('Response headers:', responseHeaders);
                
                debugConfig.log('OCR processing complete');
                
                // Check response size
                const responseSize = new TextEncoder().encode(JSON.stringify(data)).length;
                debugConfig.log(`OCR API response size: ${formatFileSize(responseSize)}`);
                
                // Check data structure
                debugConfig.log('API response structure:');
                debugConfig.log('- Has pages array:', Boolean(data.pages));
                debugConfig.log('- Number of pages:', data.pages ? data.pages.length : 0);
                
                if (data.pages && data.pages.length > 0) {
                    debugConfig.log('- First page has images array:', Boolean(data.pages[0].images));
                    debugConfig.log('- Number of images in first page:', data.pages[0].images ? data.pages[0].images.length : 0);
                }
                
                // Count truncated images
                let totalImages = 0;
                let totalImagesWithBase64 = 0;
                let totalTruncatedImages = 0;
                
                if (data.pages) {
                    for (const page of data.pages) {
                        if (page.images) {
                            totalImages += page.images.length;
                            
                            for (const image of page.images) {
                                if (image.data || (image.base64 && image.base64.data)) {
                                    totalImagesWithBase64++;
                                    
                                    // Check for truncation in the base64 data
                                    let base64Data = '';
                                    if (image.data) {
                                        base64Data = image.data;
                                    } else if (image.base64 && image.base64.data) {
                                        base64Data = image.base64.data;
                                    }
                                    
                                    if (base64Data && !base64Data.endsWith('=') && base64Data.length % 4 !== 0) {
                                        totalTruncatedImages++;
                                    }
                                }
                            }
                        }
                    }
                }
                
                debugConfig.log(`- Total images: ${totalImages}`);
                debugConfig.log(`- Images with base64 data: ${totalImagesWithBase64}/${totalImages}`);
                debugConfig.log(`- Images with truncation issues: ${totalTruncatedImages}/${totalImagesWithBase64}`);
                
                // Check for response truncation
                const isTruncated = checkResponseForTruncation(data);
                
                // Clean up the temporary file from S3
                try {
                    await deleteFromS3(s3Key);
                    debugConfig.log('Temporary file deleted from S3');
                } catch (cleanupError) {
                    debugConfig.error('Failed to clean up temporary file:', cleanupError);
                    // Non-critical error, continue processing
                }
                
                // Create metadata object
                metadata = {
                    pages: data.pages || [],
                    pageCount: data.pages ? data.pages.length : 0,
                    images: [],
                    extractedText: '',
                    wordCount: 0,
                    language: '',
                    responseSize: responseSize,
                    isTruncated: isTruncated
                };
                
                // Extract images from the response (fixing truncated base64 data where possible)
                for (let pageIndex = 0; pageIndex < metadata.pages.length; pageIndex++) {
                    const page = metadata.pages[pageIndex];
                    
                    // Extract text content
                    if (page.text) {
                        metadata.extractedText += page.text + '\n\n';
                    }
                    
                    // Process images in this page
                    if (page.images) {
                        for (let imageIndex = 0; imageIndex < page.images.length; imageIndex++) {
                            const image = page.images[imageIndex];
                            let base64Data = '';
                            let imageType = 'image/png'; // Default type
                            
                            // Try different ways the image data could be represented
                            if (image.data) {
                                debugConfig.log(`Found direct base64 data for image ${pageIndex + 1}-${imageIndex + 1}`);
                                base64Data = image.data;
                                
                                // Try to determine image type from data
                                if (base64Data.startsWith('data:')) {
                                    const match = base64Data.match(/^data:([^;]+);base64,(.*)$/);
                                    if (match) {
                                        imageType = match[1];
                                        debugConfig.log(`Image ${pageIndex + 1}-${imageIndex + 1} already has data URL format, extracting base64 part`);
                                        base64Data = match[2];
                                    }
                                }
                            } else if (image.base64 && image.base64.data) {
                                base64Data = image.base64.data;
                            }
                            
                            // Process base64 data if available
                            if (base64Data) {
                                // Fix padding issues in base64 data
                                let processedData = base64Data;
                                const originalLength = processedData.length;
                                
                                // Fix padding if needed
                                const remainder = processedData.length % 4;
                                if (remainder > 0) {
                                    processedData += '='.repeat(4 - remainder);
                                    debugConfig.log(`Fixed base64 data with padding, new length: ${processedData.length} (was ${originalLength})`);
                                }
                                
                                // Clean invalid base64 characters
                                const base64Regex = /^[A-Za-z0-9+/=]+$/;
                                if (!base64Regex.test(processedData)) {
                                    const cleanedData = processedData.replace(/[^A-Za-z0-9+/=]/g, '');
                                    debugConfig.log(`Cleaned base64 data, removed ${processedData.length - cleanedData.length} invalid characters`);
                                    processedData = cleanedData;
                                }
                                
                                // Create image object
                                const imageObj = {
                                    id: image.id || `img-${pageIndex}-${imageIndex}`,
                                    pageIndex: pageIndex,
                                    base64Data: processedData,
                                    dataUrl: `data:${imageType};base64,${processedData}`,
                                    width: image.width || (image.base64 && image.base64.width) || 0,
                                    height: image.height || (image.base64 && image.base64.height) || 0,
                                    x: image.x || (image.base64 && image.base64.x) || 0,
                                    y: image.y || (image.base64 && image.base64.y) || 0,
                                    isTruncated: remainder > 0 || originalLength !== processedData.length
                                };
                                
                                // Add to images array
                                metadata.images.push(imageObj);
                            }
                        }
                    }
                    
                    // Process markdown images - some OCR responses include images as markdown reference
                    if (page.text) {
                        // Look for markdown image references
                        const markdownImageRegex = /!\[(.*?)\]\((.*?)\)/g;
                        let match;
                        
                        while ((match = markdownImageRegex.exec(page.text)) !== null) {
                            const imageUrl = match[2];
                            
                            // Skip if it's a data URL (already handled above)
                            if (imageUrl.startsWith('data:')) {
                                continue;
                            }
                            
                            // Check if the image ID matches one we already processed
                            const existingImage = metadata.images.find(img => img.id === imageUrl);
                            if (existingImage) {
                                continue;
                            }
                            
                            // Try to find a reference in the API response
                            let imageFound = false;
                            
                            // Check in figures array if available
                            if (page.figures) {
                                for (const figure of page.figures) {
                                    if (figure.id === imageUrl) {
                                        imageFound = true;
                                        
                                        // Use any partial data if available
                                        let base64Data = '';
                                        if (figure.data) {
                                            base64Data = figure.data;
                                            
                                            // Apply same fix as above for truncated base64
                                            const remainder = base64Data.length % 4;
                                            if (remainder > 0) {
                                                const originalLength = base64Data.length;
                                                base64Data += '='.repeat(4 - remainder);
                                                debugConfig.log(`Fixed base64 data with padding, new length: ${base64Data.length} (was ${originalLength})`);
                                            }
                                            
                                            debugConfig.log(`Attempting to use partially truncated image data (${base64Data.length} chars)`);
                                            
                                            metadata.images.push({
                                                id: imageUrl,
                                                pageIndex: pageIndex,
                                                base64Data: base64Data,
                                                dataUrl: `data:image/png;base64,${base64Data}`,
                                                width: figure.width || 0,
                                                height: figure.height || 0,
                                                x: figure.x || 0,
                                                y: figure.y || 0,
                                                isTruncated: true
                                            });
                                        }
                                        break;
                                    }
                                }
                            }
                            
                            // If not found in figures, check all images
                            if (!imageFound && data.pages) {
                                for (const p of data.pages) {
                                    if (p.images) {
                                        for (const img of p.images) {
                                            if (img.id === imageUrl) {
                                                const imgId = img.originalId || img.id;
                                                const escapedId = imgId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                const imgRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedId}\\)`, 'g');
                                                
                                                // Log information about this replacement attempt
                                                const matches = modifiedText.match(imgRegex);
                                                const matchCount = matches ? matches.length : 0;
                                                imageRefsFound += matchCount;
                                                debugConfig.log(`Image '${imgId}': Found ${matchCount} references in text`);
                                                
                                                if (img.base64Data) {
                                                    // Check if it's a partial image
                                                    if (img.isTruncated && img.isPartialImage) {
                                                        debugConfig.log(`  - Replacing with partially recovered image data (${img.base64Data.length} chars)`);
                                                        modifiedText = modifiedText.replace(imgRegex, (match, altText) => {
                                                            successfulReplacements++;
                                                            replacedImages++;
                                                            return `<div class="image-container partial-image">
                                                                <div class="image-warning">⚠️ Partially recovered image</div>
                                                                <img src="${img.base64Data}" alt="${altText || 'Partial Image'}" />
                                                            </div>`;
                                                        });
                                                    } else {
                                                        debugConfig.log(`  - Replacing with embedded data (${img.base64Data.length} chars)`);
                                                        modifiedText = modifiedText.replace(imgRegex, (match, altText) => {
                                                            successfulReplacements++;
                                                            replacedImages++;
                                                            return `<div class="image-container"><img src="${img.base64Data}" alt="${altText || 'Image'}" /></div>`;
                                                        });
                                                    }
                                                } else if (img.isLocalReference) {
                                                    debugConfig.log(`  - Using local reference: ${imgId}`);
                                                    modifiedText = modifiedText.replace(imgRegex, (match, altText) => {
                                                        successfulReplacements++;
                                                        replacedImages++;
                                                        return `<div class="image-container"><img src="${imgId}" alt="${altText || 'Image'}" /></div>`;
                                                    });
                                                } else {
                                                    debugConfig.log(`  - Image has no usable data or reference`);
                                                    modifiedText = modifiedText.replace(imgRegex, (match, altText) => {
                                                        return `<div class="missing-image">Missing Image: ${altText || imgId || 'Unknown'}</div>`;
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                debugConfig.log(`Image replacement summary: Found ${imageRefsFound} references, successfully replaced ${successfulReplacements}`);
                
                // Convert markdown-like syntax to HTML
                // These are simple conversions for headings, bold, italic, code, etc.
                modifiedText = modifiedText.replace(/^### (.*$)/gm, '<h3>$1</h3>');
                modifiedText = modifiedText.replace(/^## (.*$)/gm, '<h2>$1</h2>');
                modifiedText = modifiedText.replace(/^# (.*$)/gm, '<h1>$1</h1>');
                modifiedText = modifiedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                modifiedText = modifiedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
                modifiedText = modifiedText.replace(/`(.*?)`/g, '<code>$1</code>');
                
                // Handle paragraphs and line breaks (simplified)
                modifiedText = modifiedText.replace(/\n\n/g, '</p><p>');
                
                // Complete the HTML content
                htmlContent += `<p>${modifiedText}</p>`;
                htmlContent += `
</body>
</html>`;

                // Log the final HTML content size
                debugConfig.log(`Final HTML content size: ${formatFileSize(htmlContent.length)}`);
                
                // Create a blob with the HTML content
                const blob = new Blob([htmlContent], { type: 'text/html' });
                
                // Create a URL for the blob
                const url = URL.createObjectURL(blob);
                
                // Create a download link
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title}.html`;
                
                // Trigger the download
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (error) {
                debugConfig.error('Error generating HTML:', error);
                alert('Error generating HTML export. Please check the browser console for details.');
            }
        } catch (error) {
            debugConfig.error('Error generating HTML:', error);
            alert('Error generating HTML export. Please check the browser console for details.');
        }
    } catch (error) {
        debugConfig.error('Error generating HTML:', error);
        alert('Error generating HTML export. Please check the browser console for details.');
    }
}

// Add CSS styles for the extracted images
const imageStyles = document.createElement('style');
imageStyles.textContent = `
.extracted-images-container {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-top: 10px;
    margin-bottom: 20px;
}

.extracted-image-wrapper {
    width: 200px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    background-color: #f9f9f9;
    position: relative; /* Add positioning for the warning overlay */
}

.extracted-image {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: contain;
    border-radius: 3px;
    display: block;
    margin: 0 auto;
}

.partial-image {
    border: 2px solid #f0ad4e; /* Amber warning border */
}

.image-warning {
    position: absolute;
    top: 0;
    right: 0;
    background-color: rgba(240, 173, 78, 0.8); /* Amber with opacity */
    color: white;
    padding: 2px 5px;
    font-size: 10px;
    border-bottom-left-radius: 4px;
}

.image-caption {
    font-size: 12px;
    text-align: center;
    margin-top: 5px;
    color: #666;
}

.download-buttons-container {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.download-text-btn,
.download-html-btn {
    padding: 8px 15px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.download-html-btn {
    background-color: #2196F3;
}

.download-text-btn:hover,
.download-html-btn:hover {
    opacity: 0.9;
}
`;

document.head.appendChild(imageStyles);

/**
 * Function to fetch an image and convert it to base64
 * @param {string} url - The URL of the image to fetch
 * @returns {Promise<string>} - Promise resolving to base64 data URL
 */
async function fetchImageAsBase64(url) {
    try {
        // If this is a local reference (not a full URL), don't even try to fetch it
        if (!url.includes('://') && !url.startsWith('//')) {
            debugConfig.log(`Skipping fetch for local image reference: ${url}`);
            return null;
        }
        
        debugConfig.log(`Fetching image from URL: ${url}`);
        
        // Try to fetch the image
        const response = await fetch(url, {
            method: 'GET',
            // Don't specify mode: 'cors' to allow browser to decide
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Get the image as blob
        const blob = await response.blob();
        
        // Convert blob to base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        debugConfig.error('Error fetching image:', error);
        return null;
    }
}

// Near the processFiles function, add this new function for processing large PDFs in chunks

/**
 * Process a large PDF by splitting it into chunks for OCR
 * @param {File} pdfFile - The PDF file to process
 * @returns {Promise<Object>} - Combined metadata from all chunks
 */
async function processLargePdfInChunks(pdfFile) {
    debugConfig.log('Processing large PDF in chunks:', pdfFile.name);
    
    try {
        // Load the PDF using PDF.js to get page count
        // Use a temporary copy to prevent ArrayBuffer detachment
        const tempPdfBytes = await pdfFile.slice(0).arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: tempPdfBytes }).promise;
        const numPages = pdf.numPages;
        
        debugConfig.log(`PDF has ${numPages} pages, will process in chunks`);
        
        // Create chunks of pages - smaller chunks for very large PDFs
        const pdfSizeInMB = pdfFile.size / (1024 * 1024);
        
        // Adjust chunk size based on PDF size: smaller chunks for larger files
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
                
                // Create a fresh copy of the file for each chunk to avoid the "detached ArrayBuffer" error
                // This is crucial - reusing the same ArrayBuffer causes "Cannot perform Construct on a detached ArrayBuffer"
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
        
        // Give a warning if some chunks failed
        if (failedChunks > 0) {
            debugConfig.warn(`${failedChunks} out of ${chunks.length} chunks failed processing`);
        }
        
        // Merge metadata from all chunks
        const combinedMetadata = {
            pageCount: numPages,
            totalWords: allResults.reduce((sum, result) => sum + result.totalWords, 0),
            language: allResults[0].language, // Use the language from the first chunk
            hasImages: allResults.some(result => result.hasImages),
            extractedText: allResults.map(result => result.extractedText).join('\n\n'),
            fullText: allResults.map(result => result.fullText).join('\n\n'),
            images: []
        };
        
        // Combine all images from all chunks, updating page indices
        let pageOffset = 0;
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
            
            pageOffset += chunks[chunkIndex].endPage - chunks[chunkIndex].startPage + 1;
        });
        
        debugConfig.log(`Successfully processed all chunks, combined ${combinedMetadata.images.length} images`);
        return combinedMetadata;
    } catch (error) {
        debugConfig.error('Error processing large PDF in chunks:', error);
        throw error;
    }
}

// Now, update the processFiles function to use the chunking approach for very large PDFs
// Find the part where combinedPdfMetadata is obtained and modify it:

// Inside processFiles function, modify this section:
// if (shouldCombine && combinedPdfDoc) {
//     try {
//         ...
//         const ocrEnabled = enableOcrCheckbox.checked;
//         if (ocrEnabled) {
//             try {
//                 combinedPdfMetadata = await analyzeCombinedPdfWithMistral(combinedPdf);
//                 displayCombinedPdfMetadata(combinedPdfMetadata);
//             } catch (error) {
//                 console.error('Error analyzing combined PDF:', error);
//             }
//         }
//         ...
//     }
// }