# Universal File Compressor

A comprehensive web application to compress and optimize multiple file types including PDFs, images, documents, text files, and more while maintaining quality and readability.

## Features

### Universal File Support
- **PDF Files**: Compress with adjustable quality and DPI settings
- **Images**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG compression and format conversion
- **Text Files**: TXT, MD, JSON, XML, CSV optimization and GZIP compression
- **Documents**: Office files (Word, Excel, PowerPoint) - *coming soon*
- **Videos**: MP4, AVI, MOV compression - *coming soon*
- **Audio**: MP3, WAV, AAC compression - *coming soon*

### Core Features
- **Intelligent File Detection**: Automatic file type recognition and appropriate compression
- **Drag & Drop Interface**: Intuitive file handling for all supported formats
- **Batch Processing**: Process multiple mixed file types simultaneously
- **Smart File Organization**: Tabbed interface to organize files by type
- **Real-time Progress**: Live compression progress for each file
- **Advanced Options**: Simple and advanced compression settings per file type
- **Size Comparison**: Before/after file size analysis with reduction percentages
- **Download Management**: Individual file downloads or bulk download all compressed files

### PDF-Specific Features
- Adjustable image quality and DPI settings
- Side-by-side comparison viewer
- OCR analysis for combined PDFs via Mistral AI
- AWS S3 integration for temporary file storage
- PDF combination and reordering

### Image-Specific Features
- Format conversion (JPEG, PNG, WebP, AVIF)
- Quality adjustment and resizing
- Web optimization presets
- Metadata extraction
- Thumbnail generation

### Text-Specific Features
- JSON/XML minification and prettification
- Comment removal and whitespace optimization
- GZIP compression for maximum size reduction
- Format-specific optimizations

## How It Works

The Universal File Compressor uses different compression strategies based on file type:

### PDF Compression
1. Reads PDF files using PDF.js
2. Renders each page to a canvas at specified DPI
3. Converts pages to JPEG with adjustable quality
4. Creates a new PDF with pdf-lib containing compressed images
5. Preserves original page dimensions and structure

### Image Compression
1. Detects image format and metadata
2. Uses browser-image-compression for optimal results
3. Falls back to canvas-based compression if needed
4. Supports format conversion and resizing
5. Maintains aspect ratios and quality settings

### Text Compression
1. Analyzes file type (JSON, XML, CSV, etc.)
2. Applies format-specific optimizations
3. Removes comments, whitespace, and empty lines
4. Uses GZIP compression for maximum reduction
5. Preserves data integrity and readability

### OCR Functionality (PDF)
1. Combined PDFs are securely uploaded to AWS S3
2. Mistral AI's OCR service processes documents
3. Text is extracted from all content including images
4. Files are automatically deleted from S3 after processing

## Setup

### Prerequisites
- Node.js 16+
- AWS account with S3 bucket
- Mistral AI API key (for OCR functionality)

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/bchewy/compress.git
   cd compress
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your AWS credentials:
   ```
   AWS_REGION=your-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_BUCKET_NAME=your-bucket-name
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

### Production Build

To build for production:
```bash
npm run build
npm start
```

## Usage

### Getting Started
1. Open the application in a web browser (http://localhost:3001 during development)
2. Drop files onto the drag area or click "Select Files"
3. Supported formats are automatically detected and organized by type

### File Organization
- Files are automatically grouped by type (PDF, Images, Text, etc.)
- Use the tabs to view files by category or see all files together
- Each file shows its type, size, and a relevant icon

### Compression Options
- **Simple Mode**: Quick compression with good default settings
- **Advanced Mode**: Fine-tune settings for each file type:
  - **PDF**: Adjust quality (1-100%) and DPI (72-300)
  - **Images**: Set quality, format conversion, and resize options
  - **Text**: Choose optimization level and specific improvements

### Processing Files
1. Select your desired compression settings
2. Click "Compress [X] Files" to start processing
3. Monitor real-time progress for each file
4. View detailed results with before/after size comparisons

### Download Options
- Download individual files from the results section
- Use "Download All" for bulk download of all compressed files
- Failed compressions are clearly indicated with error messages

### Special Features
- **PDF OCR**: Enable in advanced settings with Mistral API key
- **Format Conversion**: Convert images between formats (JPEG, PNG, WebP)
- **GZIP Compression**: Maximum compression for text files
- **Batch Processing**: Handle mixed file types in one operation

## Security Note

- All PDF processing is done client-side
- AWS credentials are securely handled server-side
- S3 uploads use pre-signed URLs for secure, temporary access
- Files uploaded to S3 are automatically deleted after OCR processing
- Your Mistral API key is stored locally in your browser if you choose to save it

## Dependencies

- [Next.js](https://nextjs.org/) - React framework for production
- [React](https://reactjs.org/) - Component-based UI library
- [PDF.js](https://mozilla.github.io/pdf.js/) - For rendering PDF pages
- [pdf-lib](https://pdf-lib.js.org/) - For creating new PDF files
- [SortableJS](https://github.com/SortableJS/Sortable) - For drag and drop reordering
- [dotenv](https://github.com/motdotla/dotenv) - For environment variable management

## Comparison Viewer

The comparison viewer allows you to:
- See the original and compressed PDFs side by side
- Navigate through all pages using the page controls
- Visually check the quality difference between versions

## File Ordering

You can easily reorder your PDF files before compression:
- Drag the handle (⋮⋮) on the left side of each file to reorder
- The order number is displayed next to each file
- This order determines:
  - The processing sequence
  - The page order when combining PDFs into a single document

## Notes

- PDF compression is done client-side; no files are uploaded to a server for compression
- For OCR functionality, files are temporarily uploaded to S3 and automatically deleted after processing
- Large PDFs may take more time to process
- Text quality is dependent on the selected DPI and image quality settings

## Architecture

This application has been converted from a vanilla HTML/JavaScript app to a Next.js application:

- **Frontend**: React components with hooks for state management
- **Backend**: Next.js API routes for AWS configuration
- **Styling**: Global CSS (preserved from original design)
- **PDF Processing**: Client-side using PDF.js and pdf-lib
- **OCR**: Mistral AI integration with AWS S3 for temporary storage 