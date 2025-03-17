// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

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
let currentPage = 1;
let totalPages = 1;
let originalPdf = null;
let compressedPdf = null;

// Event listeners
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

downloadAllBtn.addEventListener('click', downloadAllFiles);

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
        } catch (error) {
            console.error('Error compressing PDF:', error);
            resultName.textContent = `${file.name} (Error: ${error.message || 'Compression failed'})`;
            resultInfo.removeChild(progressContainer);
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

// New functions for comparison and download all
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