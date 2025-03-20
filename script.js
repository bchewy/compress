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

// Load AWS configuration from server
async function loadAwsConfig() {
    try {
        console.log('Loading AWS configuration from server...');
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
        
        console.log('AWS configuration loaded successfully');
    } catch (error) {
        console.error('Error loading AWS configuration:', error);
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

// Event listeners
window.addEventListener('load', loadAwsConfig);

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
        alert('Please select PDF files only.');
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
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;
        
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        
        const orderNum = document.createElement('div');
        orderNum.className = 'order-num';
        orderNum.textContent = index + 1;
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            removeFile(index);
        });
        
        fileItem.appendChild(dragHandle);
        fileItem.appendChild(orderNum);
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    });
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
    compressBtn.disabled = true;
    compressedFiles = [];
    combinedPdf = null;
    combinedPdfMetadata = null;
    downloadCombinedBtn.disabled = true;
    
    const shouldCombine = combineFilesCheckbox.checked;
    let combinedPdfDoc = null;
    
    if (shouldCombine) {
        // Create a new PDF document for the combined output
        combinedPdfDoc = await PDFLib.PDFDocument.create();
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create result item
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const resultInfo = document.createElement('div');
        resultInfo.className = 'result-info';
        
        const resultName = document.createElement('div');
        resultName.textContent = `${file.name} (Compressing...)`;
        
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-bar';
        
        const progress = document.createElement('div');
        progress.className = 'progress';
        
        progressContainer.appendChild(progress);
        resultInfo.appendChild(resultName);
        resultInfo.appendChild(progressContainer);
        resultItem.appendChild(resultInfo);
        resultList.appendChild(resultItem);
        
        try {
            // Compress the PDF
            const compressedPdf = await compressPdf(file, qualitySlider.value, dpiSlider.value, (percent) => {
                progress.style.width = `${percent}%`;
            });
            
            // Add to compressed files array
            compressedFiles.push(compressedPdf);
            
            // Update the result item
            resultName.textContent = file.name;
            
            const sizeComparison = document.createElement('div');
            sizeComparison.className = 'size-comparison';
            
            const originalSize = formatFileSize(file.size);
            const compressedSize = formatFileSize(compressedPdf.size);
            const reduction = Math.round((1 - (compressedPdf.size / file.size)) * 100);
            
            sizeComparison.innerHTML = `Original: <strong>${originalSize}</strong> → Compressed: <strong>${compressedSize}</strong> <span class="reduction">(-${reduction}%)</span>`;
            
            resultInfo.removeChild(progressContainer);
            resultInfo.appendChild(sizeComparison);
            
            // Add buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'buttons-container';
            
            // Add download button
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => {
                // Create download link
                downloadFile(compressedPdf);
            });
            
            // Add compare button
            const compareBtn = document.createElement('button');
            compareBtn.className = 'compare-btn';
            compareBtn.textContent = 'Compare';
            compareBtn.addEventListener('click', () => {
                openComparisonModal(file, compressedPdf);
            });
            
            buttonsContainer.appendChild(downloadBtn);
            buttonsContainer.appendChild(compareBtn);
            resultItem.appendChild(buttonsContainer);
            
            // Update download all button
            downloadAllBtn.disabled = false;
            
            // If combining, add pages to the combined PDF
            if (shouldCombine && combinedPdfDoc) {
                await addToCombinedPdf(compressedPdf, combinedPdfDoc);
            }
        } catch (error) {
            console.error('Error compressing PDF:', error);
            resultName.textContent = `${file.name} (Error: ${error.message || 'Compression failed'})`;
            resultInfo.removeChild(progressContainer);
        }
    }
    
    // If combining, finalize the combined PDF
    if (shouldCombine && combinedPdfDoc) {
        try {
            // Convert combined PDF to Uint8Array
            const combinedPdfBytes = await combinedPdfDoc.save();
            combinedPdf = new File([combinedPdfBytes], 'combined.pdf', { type: 'application/pdf' });
            downloadCombinedBtn.disabled = false;
            
            // Get metadata for combined PDF using Mistral OCR if enabled
            const ocrEnabled = enableOcrCheckbox.checked;
            if (ocrEnabled) {
                try {
                    combinedPdfMetadata = await analyzeCombinedPdfWithMistral(combinedPdf);
                    displayCombinedPdfMetadata(combinedPdfMetadata);
                } catch (error) {
                    console.error('Error analyzing combined PDF:', error);
                }
            }
        } catch (error) {
            console.error('Error creating combined PDF:', error);
            alert('Failed to create combined PDF: ' + (error.message || 'Unknown error'));
        }
    }
    
    compressBtn.disabled = false;
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
        // Load the PDF data
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Load the PDF document using pdf-lib
        const sourceDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Copy pages from source to target
        const copiedPages = await targetPdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
        
        // Add the copied pages to the target document
        copiedPages.forEach(page => {
            targetPdfDoc.addPage(page);
        });
        
        return true;
    } catch (error) {
        console.error('Error adding to combined PDF:', error);
        return false;
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
        console.error('Error rendering comparison pages:', error);
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
        const apiKey = getMistralApiKey();
        if (!apiKey) {
            throw new Error('API key is required for OCR analysis');
        }
        
        console.log('File size:', formatFileSize(pdfFile.size));
        
        // Check file size - Mistral has a 50MB limit
        if (pdfFile.size > 50 * 1024 * 1024) {
            alert('The PDF is too large for OCR analysis (maximum 50MB)');
            throw new Error('File is too large for OCR analysis (maximum 50MB)');
        }
        
        // Upload file to S3
        console.log('Uploading PDF to S3...');
        
        // Create unique key for the file
        const fileKey = `ocr-temp/${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        let fileUrl;
        try {
            // Try to upload to S3 with AWS authentication
            const s3Url = await uploadToS3(pdfFile, fileKey);
            console.log('File uploaded successfully to S3, URL:', s3Url);
            
            // Generate a pre-signed GET URL for Mistral to access the file
            fileUrl = await generatePresignedGetUrl(fileKey);
            console.log('Generated pre-signed GET URL for Mistral:', fileUrl);
        } catch (uploadError) {
            console.error('Failed to upload to S3:', uploadError);
            alert('Failed to upload file to S3. Please check browser console for details.');
            throw new Error('S3 upload failed: ' + uploadError.message);
        }
        
        // Now use the OCR API with the file URL
        console.log('Sending OCR request to Mistral...');
        
        try {
            const response = await fetch('https://api.mistral.ai/v1/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: "mistral-ocr-latest",
                    document: {
                        type: "document_url",
                        document_url: fileUrl,
                        document_name: pdfFile.name || "combined_document.pdf"
                    },
                    include_image_base64: true  // Add this parameter to get base64 image data
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Mistral OCR API error:', response.status, errorText);
                
                // Clean up the file since OCR failed
                try {
                    await deleteFromS3(fileKey);
                    console.log('Cleaned up S3 file after OCR failure');
                } catch (cleanupError) {
                    console.warn('Failed to clean up S3 file:', cleanupError);
                }
                
                // Show user-friendly error message
                if (response.status === 401) {
                    alert('Invalid Mistral API key. Please check your API key and try again.');
                } else if (response.status === 429) {
                    alert('Mistral API rate limit exceeded. Please try again later.');
                } else if (response.status === 500) {
                    alert('Mistral server error. The OCR service may be experiencing issues.');
                } else {
                    alert(`OCR processing failed: ${response.status}. Please check browser console for details.`);
                }
                
                throw new Error(`Mistral OCR API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('OCR processing complete');
            console.log('API response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            
            if (data.pages && data.pages.length > 0 && data.pages[0].images) {
                console.log(`Found ${data.pages.reduce((count, page) => count + (page.images ? page.images.length : 0), 0)} images in the document`);
                // Log the structure of the first image if available
                if (data.pages[0].images && data.pages[0].images.length > 0) {
                    console.log('First image object structure:', JSON.stringify(data.pages[0].images[0], null, 2));
                }
            }
            
            // Clean up - delete the file if possible
            try {
                await deleteFromS3(fileKey);
                console.log('Temporary file deleted from S3');
            } catch (cleanupError) {
                console.warn('Failed to delete temporary file from S3:', cleanupError);
            }
            
            // Extract full text and store it for download
            const fullText = data.pages.map(page => page.markdown || page.text).join('\n\n');
            
            // Extract images from the response
            const extractedImages = [];
            const markdownImageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
            
            // First, check if images are included in the API response
            data.pages.forEach((page, pageIndex) => {
                if (page.images && page.images.length > 0) {
                    page.images.forEach((image, imageIndex) => {
                        // Try different possible field names for base64 data
                        const base64Data = image.image_base64 || image.base64_data || image.base64 || image.image_data || null;
                        
                        if (base64Data) {
                            console.log(`Found direct base64 data for image ${pageIndex + 1}-${imageIndex + 1}`);
                            
                            // Determine mime type or use default
                            let mimeType = image.mime_type || image.content_type;
                            if (!mimeType) {
                                // Try to infer from image ID
                                if (image.id && image.id.endsWith('.png')) {
                                    mimeType = 'image/png';
                                } else if ((image.id && image.id.endsWith('.jpg')) || (image.id && image.id.endsWith('.jpeg'))) {
                                    mimeType = 'image/jpeg';
                                } else {
                                    mimeType = 'image/jpeg'; // Default
                                }
                            }
                            
                            extractedImages.push({
                                pageIndex: pageIndex + 1,
                                imageIndex: imageIndex + 1,
                                base64Data: base64Data,
                                mimeType: mimeType,
                                originalId: image.id || `image-${pageIndex}-${imageIndex}`,
                                isLocalReference: false // This is actual image data, not a reference
                            });
                        } else if (image.id) {
                            // No base64 data but we have an ID - this might be a reference
                            console.log(`Found image reference with ID: ${image.id}`);
                            
                            // Create a placeholder with the ID
                            extractedImages.push({
                                pageIndex: pageIndex + 1,
                                imageIndex: imageIndex + 1,
                                base64Data: `![${image.id}](${image.id})`,
                                mimeType: 'application/octet-stream',
                                originalId: image.id,
                                isLocalReference: !image.id.includes('://') && !image.id.startsWith('//')
                            });
                        }
                    });
                }
            });
            
            // Next, extract any image references from markdown
            let match;
            data.pages.forEach((page, pageIndex) => {
                const markdown = page.markdown || '';
                
                // Reset regex state
                markdownImageRegex.lastIndex = 0;
                
                while ((match = markdownImageRegex.exec(markdown)) !== null) {
                    const altText = match[1];
                    const imageUrl = match[2];
                    
                    console.log(`Found markdown image reference on page ${pageIndex + 1}: ${match[0]}`);
                    
                    // Check if this is a local image reference (no protocol/domain)
                    const isLocalReference = !imageUrl.includes('://') && !imageUrl.startsWith('//');
                    
                    // Check if this image is already in our list (to avoid duplicates)
                    const isDuplicate = extractedImages.some(img => 
                        img.originalId === imageUrl || 
                        (img.base64Data && img.base64Data.includes(imageUrl))
                    );
                    
                    if (!isDuplicate) {
                        // Add this image reference
                        extractedImages.push({
                            pageIndex: pageIndex + 1,
                            imageIndex: extractedImages.length + 1,
                            base64Data: match[0], // Store the full markdown reference
                            mimeType: imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg',
                            originalId: imageUrl,
                            isLocalReference: isLocalReference
                        });
                    }
                }
            });
            
            console.log(`Total extracted images: ${extractedImages.length}`);
            
            return {
                pageCount: data.pages.length,
                totalWords: data.pages.reduce((sum, page) => sum + countWords(page.markdown || page.text), 0),
                language: detectLanguage(data.pages),
                hasImages: data.pages.some(page => page.images && page.images.length > 0),
                extractedText: fullText.substring(0, 200) + '...',
                fullText: fullText, // Store the full text for download
                images: extractedImages // Store the extracted images
            };
        } catch (ocrError) {
            // If OCR failed but upload succeeded, make sure to clean up
            try {
                await deleteFromS3(fileKey);
                console.log('Cleaned up S3 file after OCR error');
            } catch (cleanupError) {
                console.warn('Failed to clean up S3 file:', cleanupError);
            }
            throw ocrError;
        }
    } catch (error) {
        console.error('Error in Mistral OCR analysis:', error);
        return null;
    }
}

/**
 * Upload a file to S3 using pre-signed URL and return a URL
 * @param {File} file - The file to upload
 * @param {string} key - The key to use for the file in S3
 * @returns {Promise<string>} - The URL for the uploaded file
 */
async function uploadToS3(file, key) {
    console.log('Generating pre-signed URL for S3 upload...');
    
    try {
        // Get current timestamp in ISO format
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);
        
        // AWS Signature V4 parameters
        const service = 's3';
        const region = awsConfig.region;
        const accessKey = awsConfig.credentials.accessKeyId;
        const secretKey = awsConfig.credentials.secretAccessKey;
        const host = `${awsConfig.bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${key}`;
        const method = 'PUT';
        const expires = 3600; // 1 hour
        
        // Pre-signed URL parameters
        const contentType = file.type || 'application/octet-stream';
        
        // Create canonical query string for pre-signed URL
        const amzQueryParams = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expires.toString(),
            'X-Amz-SignedHeaders': 'host'
        };
        
        // Build the canonical query string
        const canonicalQueryString = Object.keys(amzQueryParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(amzQueryParams[key])}`)
            .join('&');
        
        // Create canonical request
        const canonicalRequest = method + '\n' +
            '/' + key + '\n' +
            canonicalQueryString + '\n' +
            'host:' + host + '\n' +
            '\n' +
            'host\n' +
            'UNSIGNED-PAYLOAD';
        
        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const scope = dateStamp + '/' + region + '/' + service + '/aws4_request';
        const canonicalRequestHash = await sha256(canonicalRequest);
        
        const stringToSign = algorithm + '\n' +
            amzDate + '\n' +
            scope + '\n' +
            canonicalRequestHash;
        
        // Calculate signature
        const signature = await getSignature(secretKey, dateStamp, region, service, stringToSign);
        
        // Create pre-signed URL
        const presignedUrl = `${endpoint}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
        
        console.log('Pre-signed URL generated:', presignedUrl);
        
        // Use the pre-signed URL to upload the file
        console.log('Uploading to S3 with pre-signed URL...');
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType
            },
            body: file
        });
        
        if (response.ok) {
            console.log('S3 upload successful!');
            return endpoint;
        } else {
            const errorText = await response.text();
            console.error('S3 upload failed:', response.status, errorText);
            throw new Error(`S3 upload failed: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error during S3 upload:', error.message);
        throw error;
    }
}

/**
 * Create a SHA-256 hash of a string
 * @param {string} message - The message to hash
 * @returns {Promise<string>} - The hex-encoded hash
 */
async function sha256(message) {
    // Convert the message string to a buffer
    const msgBuffer = new TextEncoder().encode(message);
    
    // Create the hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    // Convert the hash to a hex string
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Create an HMAC using SHA-256
 * @param {ArrayBuffer} key - The key
 * @param {string} message - The message
 * @returns {Promise<ArrayBuffer>} - The HMAC
 */
async function hmacSha256(key, message) {
    const msgBuffer = new TextEncoder().encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign']
    );
    
    return await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

/**
 * Calculate the AWS Signature V4
 * @param {string} secretKey - The AWS secret key
 * @param {string} dateStamp - The date stamp (YYYYMMDD)
 * @param {string} region - The AWS region
 * @param {string} service - The AWS service
 * @param {string} stringToSign - The string to sign
 * @returns {Promise<string>} - The signature
 */
async function getSignature(secretKey, dateStamp, region, service, stringToSign) {
    // Create the signing key
    const kDate = await hmacSha256(
        new TextEncoder().encode('AWS4' + secretKey),
        dateStamp
    );
    
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    
    // Sign the string to sign with the signing key
    const signature = await hmacSha256(kSigning, stringToSign);
    
    // Convert the signature to hex
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Delete a file from S3 using pre-signed URL
 * @param {string} key - The key of the file to delete
 * @returns {Promise<void>}
 */
async function deleteFromS3(key) {
    try {
        console.log('Generating pre-signed URL for S3 deletion:', key);
        
        // Get current timestamp in ISO format
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);
        
        // AWS Signature V4 parameters
        const service = 's3';
        const region = awsConfig.region;
        const accessKey = awsConfig.credentials.accessKeyId;
        const secretKey = awsConfig.credentials.secretAccessKey;
        const host = `${awsConfig.bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${key}`;
        const method = 'DELETE';
        const expires = 3600; // 1 hour
        
        // Pre-signed URL parameters
        const amzQueryParams = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expires.toString(),
            'X-Amz-SignedHeaders': 'host'
        };
        
        // Build the canonical query string
        const canonicalQueryString = Object.keys(amzQueryParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(amzQueryParams[key])}`)
            .join('&');
        
        // Create canonical request
        const canonicalRequest = method + '\n' +
            '/' + key + '\n' +
            canonicalQueryString + '\n' +
            'host:' + host + '\n' +
            '\n' +
            'host\n' +
            'UNSIGNED-PAYLOAD';
        
        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const scope = dateStamp + '/' + region + '/' + service + '/aws4_request';
        const canonicalRequestHash = await sha256(canonicalRequest);
        
        const stringToSign = algorithm + '\n' +
            amzDate + '\n' +
            scope + '\n' +
            canonicalRequestHash;
        
        // Calculate signature
        const signature = await getSignature(secretKey, dateStamp, region, service, stringToSign);
        
        // Create pre-signed URL
        const presignedUrl = `${endpoint}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
        
        console.log('Pre-signed URL for deletion generated');
        
        // Use the pre-signed URL to delete the file
        console.log('Deleting from S3 with pre-signed URL...');
        const response = await fetch(presignedUrl, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('File deleted successfully from S3');
        } else {
            const errorText = await response.text();
            console.warn('Could not delete file from S3:', response.status, errorText);
        }
    } catch (error) {
        console.warn('Error deleting file from S3:', error.message);
    }
}

/**
 * Count words in text
 * @param {string} text - The text to count words in
 * @returns {number} - Word count
 */
function countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Detect primary language in pages
 * @param {Array} pages - Pages from OCR result
 * @returns {string} - Detected language
 */
function detectLanguage(pages) {
    // This is a simplified detection - in a real app, you'd use a proper language detection library
    const fullText = pages.map(page => page.markdown || page.text).join(' ');
    // Simple detection based on common words
    const englishWords = ['the', 'and', 'in', 'to', 'of'];
    const frenchWords = ['le', 'la', 'et', 'en', 'des'];
    const spanishWords = ['el', 'la', 'en', 'y', 'de'];
    
    const lowercaseText = fullText.toLowerCase();
    
    let englishCount = 0;
    let frenchCount = 0;
    let spanishCount = 0;
    
    englishWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowercaseText.match(regex);
        if (matches) englishCount += matches.length;
    });
    
    frenchWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowercaseText.match(regex);
        if (matches) frenchCount += matches.length;
    });
    
    spanishWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = lowercaseText.match(regex);
        if (matches) spanishCount += matches.length;
    });
    
    if (englishCount > frenchCount && englishCount > spanishCount) return 'English';
    if (frenchCount > englishCount && frenchCount > spanishCount) return 'French';
    if (spanishCount > englishCount && spanishCount > frenchCount) return 'Spanish';
    
    return 'Unknown';
}

/**
 * Display combined PDF metadata in the UI
 * @param {Object} metadata - The metadata to display
 */
function displayCombinedPdfMetadata(metadata) {
    if (!metadata) return;
    
    // Create metadata container if it doesn't exist
    let metadataContainer = document.getElementById('combined-pdf-metadata');
    if (!metadataContainer) {
        metadataContainer = document.createElement('div');
        metadataContainer.id = 'combined-pdf-metadata';
        metadataContainer.className = 'combined-pdf-metadata';
        
        const title = document.createElement('h3');
        title.textContent = 'Combined PDF Information';
        metadataContainer.appendChild(title);
        
        const metadataContent = document.createElement('div');
        metadataContent.className = 'metadata-content';
        metadataContainer.appendChild(metadataContent);
        
        // Insert after the download buttons
        const downloadAllContainer = document.querySelector('.download-all-container');
        downloadAllContainer.parentNode.insertBefore(metadataContainer, downloadAllContainer.nextSibling);
    }
    
    // Update metadata content
    const metadataContent = metadataContainer.querySelector('.metadata-content');
    metadataContent.innerHTML = `
        <div class="metadata-item">
            <span class="metadata-label">Number of Pages:</span>
            <span class="metadata-value">${metadata.pageCount}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Total Words:</span>
            <span class="metadata-value">${metadata.totalWords}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Primary Language:</span>
            <span class="metadata-value">${metadata.language}</span>
        </div>
        <div class="metadata-item">
            <span class="metadata-label">Contains Images:</span>
            <span class="metadata-value">${metadata.hasImages ? 'Yes' : 'No'}</span>
        </div>
        <div class="metadata-preview">
            <h4>Text Preview:</h4>
            <div class="text-preview">${metadata.extractedText}</div>
        </div>
    `;
    
    // Add images preview if there are any
    if (metadata.images && metadata.images.length > 0) {
        const imagesPreview = document.createElement('div');
        imagesPreview.className = 'images-preview';
        imagesPreview.innerHTML = '<h4>Extracted Images:</h4>';
        
        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'extracted-images-container';
        
        metadata.images.forEach((image, index) => {
            if (image.base64Data) {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'extracted-image-wrapper';
                
                const img = document.createElement('img');
                
                // Handle different image data scenarios
                if (image.base64Data.startsWith('data:')) {
                    // Already a data URL
                    img.src = image.base64Data;
                    img.alt = `Extracted image ${index + 1}`;
                } else if (image.base64Data.includes('![') && image.base64Data.includes('](')) {
                    // This is a markdown image reference, extract the URL
                    const markdownMatch = image.base64Data.match(/!\[(.*?)\]\((.*?)\)/);
                    if (markdownMatch && markdownMatch[2]) {
                        const imageUrl = markdownMatch[2];
                        const isLocalReference = image.isLocalReference || (!imageUrl.includes('://') && !imageUrl.startsWith('//'));
                        
                        if (isLocalReference) {
                            // This is a local file reference, not a web URL - don't try to fetch it
                            img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3E' + encodeURIComponent('Image reference: ' + imageUrl) + '%3C%2Ftext%3E%3C%2Fsvg%3E';
                            img.alt = `Local image reference: ${imageUrl}`;
                            console.log(`Displaying placeholder for local image reference: ${imageUrl}`);
                        } else {
                            // Set a placeholder initially
                            img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3ELoading%20image...%3C%2Ftext%3E%3C%2Fsvg%3E';
                            img.alt = `Loading image ${index + 1}...`;
                            
                            // Try to fetch the image asynchronously
                            (async () => {
                                try {
                                    // Try to fetch the image directly
                                    const base64Data = await fetchImageAsBase64(imageUrl);
                                    
                                    if (base64Data) {
                                        img.src = base64Data;
                                        img.alt = `Extracted image ${index + 1}`;
                                        console.log(`Successfully loaded image from ${imageUrl}`);
                                    } else {
                                        img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3ECould%20not%20load%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
                                        img.alt = `Could not load: ${imageUrl}`;
                                        console.warn(`Could not fetch image from ${imageUrl}`);
                                    }
                                } catch (error) {
                                    console.error(`Error fetching image from ${imageUrl}:`, error);
                                    img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3EError%20loading%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
                                    img.alt = `Error loading: ${imageUrl}`;
                                }
                            })();
                        }
                    } else {
                        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='; // 1x1 transparent placeholder
                    }
                } else if (image.base64Data.startsWith('Failed to extract')) {
                    // Error message
                    img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3E' + encodeURIComponent(image.base64Data) + '%3C%2Ftext%3E%3C%2Fsvg%3E';
                    img.alt = image.base64Data;
                } else {
                    // Regular base64 data that needs to be converted to a data URL
                    // Check if it's already properly formatted or needs prefix
                    if (/^[A-Za-z0-9+/=]+$/.test(image.base64Data.trim())) {
                        img.src = `data:${image.mimeType || 'image/jpeg'};base64,${image.base64Data}`;
                    } else {
                        // Log the problematic data for debugging
                        console.warn('Non-standard base64 data:', image.base64Data.substring(0, 100) + '...');
                        img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3EInvalid%20image%20data%3C%2Ftext%3E%3C%2Fsvg%3E';
                    }
                }
                
                img.alt = `Extracted image ${index + 1}`;
                img.className = 'extracted-image';
                
                const caption = document.createElement('div');
                caption.className = 'image-caption';
                caption.textContent = `Page ${image.pageIndex}, Image ${image.imageIndex}${image.originalId ? ' (' + image.originalId + ')' : ''}`;
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(caption);
                imagesContainer.appendChild(imgWrapper);
            }
        });
        
        imagesPreview.appendChild(imagesContainer);
        metadataContent.appendChild(imagesPreview);
    }
    
    // Add download buttons container
    const downloadButtonsContainer = document.createElement('div');
    downloadButtonsContainer.className = 'download-buttons-container';
    
    // Add download text button
    const downloadTextBtn = document.createElement('button');
    downloadTextBtn.id = 'downloadTextBtn';
    downloadTextBtn.className = 'download-text-btn';
    downloadTextBtn.textContent = 'Download Extracted Text';
    downloadTextBtn.addEventListener('click', () => downloadExtractedText(metadata.fullText));
    
    // Add download HTML button (with images)
    const downloadHtmlBtn = document.createElement('button');
    downloadHtmlBtn.id = 'downloadHtmlBtn';
    downloadHtmlBtn.className = 'download-html-btn';
    downloadHtmlBtn.textContent = 'Download as HTML with Images';
    downloadHtmlBtn.addEventListener('click', () => {
        // Show loading state
        downloadHtmlBtn.textContent = 'Preparing HTML...';
        downloadHtmlBtn.disabled = true;
        
        // Call the async function
        downloadExtractedHtml(metadata.fullText, metadata.images)
            .then(() => {
                // Reset button state
                downloadHtmlBtn.textContent = 'Download as HTML with Images';
                downloadHtmlBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error generating HTML:', error);
                alert('Error creating HTML file: ' + error.message);
                downloadHtmlBtn.textContent = 'Download as HTML with Images';
                downloadHtmlBtn.disabled = false;
            });
    });
    
    downloadButtonsContainer.appendChild(downloadTextBtn);
    downloadButtonsContainer.appendChild(downloadHtmlBtn);
    metadataContent.appendChild(downloadButtonsContainer);
}

/**
 * Download the extracted text as a .txt file
 * @param {string} text - The text to download
 */
function downloadExtractedText(text) {
    if (!text) {
        alert('No text available to download');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_text.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Get Mistral API key from local storage or prompt user
 * @returns {string} - Mistral API key
 */
function getMistralApiKey() {
    let apiKey = localStorage.getItem('mistralApiKey');
    
    if (!apiKey) {
        apiKey = prompt('Please enter your Mistral API key to analyze the combined PDF:');
        if (apiKey) {
            const saveKey = confirm('Would you like to save this API key for future use?');
            if (saveKey) {
                localStorage.setItem('mistralApiKey', apiKey);
                // Update the input field to show masked value
                mistralApiKeyInput.value = '••••••••••••••••';
            }
        }
    }
    
    return apiKey;
}

/**
 * Generate a pre-signed GET URL for accessing a file from S3
 * @param {string} key - The key of the file in S3
 * @returns {Promise<string>} - The pre-signed URL
 */
async function generatePresignedGetUrl(key) {
    console.log('Generating pre-signed GET URL for:', key);
    
    try {
        // Get current timestamp in ISO format
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);
        
        // AWS Signature V4 parameters
        const service = 's3';
        const region = awsConfig.region;
        const accessKey = awsConfig.credentials.accessKeyId;
        const secretKey = awsConfig.credentials.secretAccessKey;
        const host = `${awsConfig.bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${key}`;
        const method = 'GET';
        const expires = 86400; // 24 hours - Mistral might need time to process
        
        // Pre-signed URL parameters
        const amzQueryParams = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${accessKey}/${dateStamp}/${region}/${service}/aws4_request`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expires.toString(),
            'X-Amz-SignedHeaders': 'host'
        };
        
        // Build the canonical query string
        const canonicalQueryString = Object.keys(amzQueryParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(amzQueryParams[key])}`)
            .join('&');
        
        // Create canonical request
        const canonicalRequest = method + '\n' +
            '/' + key + '\n' +
            canonicalQueryString + '\n' +
            'host:' + host + '\n' +
            '\n' +
            'host\n' +
            'UNSIGNED-PAYLOAD';
        
        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const scope = dateStamp + '/' + region + '/' + service + '/aws4_request';
        const canonicalRequestHash = await sha256(canonicalRequest);
        
        const stringToSign = algorithm + '\n' +
            amzDate + '\n' +
            scope + '\n' +
            canonicalRequestHash;
        
        // Calculate signature
        const signature = await getSignature(secretKey, dateStamp, region, service, stringToSign);
        
        // Create pre-signed URL
        const presignedUrl = `${endpoint}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
        
        return presignedUrl;
    } catch (error) {
        console.error('Error generating pre-signed GET URL:', error);
        throw error;
    }
}

/**
 * Download the extracted text and images as an HTML file
 * @param {string} text - The extracted text
 * @param {Array} images - The extracted images
 */
async function downloadExtractedHtml(text, images) {
    if (!text && (!images || images.length === 0)) {
        alert('No content available to download');
        return;
    }
    
    // Convert text to HTML paragraphs
    const htmlText = text
        ? text
            .split('\n\n')
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('')
        : '<p>No text was extracted</p>';
    
    // Create image HTML if images exist
    let imagesHtml = '';
    if (images && images.length > 0) {
        imagesHtml = '<div class="extracted-images">\n';
        imagesHtml += '<h2>Extracted Images</h2>\n';
        
        // Process images (fetch if needed)
        for (const [index, image] of images.entries()) {
            if (image.base64Data) {
                let imgSrc = '';
                
                // Handle different image data scenarios
                if (image.base64Data.startsWith('data:')) {
                    // Already a data URL
                    imgSrc = image.base64Data;
                } else if (image.base64Data.includes('![') && image.base64Data.includes('](')) {
                    // This is a markdown image reference, extract the URL
                    const markdownMatch = image.base64Data.match(/!\[(.*?)\]\((.*?)\)/);
                    if (markdownMatch && markdownMatch[2]) {
                        const imageUrl = markdownMatch[2];
                        const isLocalReference = image.isLocalReference || (!imageUrl.includes('://') && !imageUrl.startsWith('//'));
                        
                        if (isLocalReference) {
                            // This is a local file reference, not a web URL
                            imgSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3E' + encodeURIComponent('Image reference: ' + imageUrl) + '%3C%2Ftext%3E%3C%2Fsvg%3E';
                            console.log(`Using placeholder for local image in HTML export: ${imageUrl}`);
                        } else {
                            // Try to fetch the image
                            try {
                                const fetchedImage = await fetchImageAsBase64(imageUrl);
                                if (fetchedImage) {
                                    imgSrc = fetchedImage;
                                    console.log(`Successfully fetched image for HTML export: ${imageUrl}`);
                                } else {
                                    imgSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3ECould%20not%20load%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
                                    console.warn(`Could not fetch image for HTML export: ${imageUrl}`);
                                }
                            } catch (error) {
                                console.error(`Error fetching image for HTML export: ${error.message}`);
                                imgSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3EError%20loading%20image%3C%2Ftext%3E%3C%2Fsvg%3E';
                            }
                        }
                    } else {
                        imgSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='; // 1x1 transparent placeholder
                    }
                } else if (image.base64Data.startsWith('Failed to extract')) {
                    // Error message
                    imgSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3E' + encodeURIComponent(image.base64Data) + '%3C%2Ftext%3E%3C%2Fsvg%3E';
                } else {
                    // Regular base64 data that needs to be converted to a data URL
                    // Check if it's already properly formatted base64
                    if (/^[A-Za-z0-9+/=]+$/.test(image.base64Data.trim())) {
                        imgSrc = `data:${image.mimeType || 'image/jpeg'};base64,${image.base64Data}`;
                    } else {
                        // Log the problematic data for debugging
                        console.warn('Non-standard base64 data in HTML export:', image.base64Data.substring(0, 100) + '...');
                        imgSrc = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22300%22%20height%3D%22200%22%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22200%22%20height%3D%22100%22%20style%3D%22fill%3A%23CCCCCC%3Bstroke%3Ablack%3Bstroke-width%3A2%3Bfill-opacity%3A0.1%3Bstroke-opacity%3A0.9%22%20%2F%3E%3Ctext%20x%3D%22150%22%20y%3D%22100%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%23333333%22%3EInvalid%20image%20data%3C%2Ftext%3E%3C%2Fsvg%3E';
                    }
                }
                
                imagesHtml += `
                <div class="image-container">
                    <h3>Page ${image.pageIndex || 'Unknown'}, Image ${image.imageIndex || index + 1}${image.originalId ? ' (' + image.originalId + ')' : ''}</h3>
                    <img src="${imgSrc}" 
                         alt="Extracted image ${index + 1}" 
                         style="max-width: 100%; height: auto; margin-bottom: 20px;">
                </div>`;
            }
        }
        
        imagesHtml += '</div>';
    }
    
    // Create the complete HTML document
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Extracted Content</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
            }
            .content {
                margin-bottom: 30px;
            }
            .extracted-images {
                margin-top: 30px;
                border-top: 1px solid #ccc;
                padding-top: 20px;
            }
            .image-container {
                margin-bottom: 30px;
            }
            h1, h2, h3 {
                color: #333;
            }
        </style>
    </head>
    <body>
        <h1>Extracted Content</h1>
        <div class="content">
            ${htmlText}
        </div>
        ${imagesHtml}
    </body>
    </html>
    `;
    
    // Create and download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_content.html';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
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
    width: 150px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    background-color: #f9f9f9;
}

.extracted-image {
    width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: 3px;
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
            console.log(`Skipping fetch for local image reference: ${url}`);
            return null;
        }
        
        console.log(`Fetching image from URL: ${url}`);
        
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
        console.error('Error fetching image:', error);
        return null;
    }
} 