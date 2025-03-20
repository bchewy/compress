# Ultra-Compress PDF

A web application to compress PDF files while maintaining readability for both humans and LLMs.

## Features

- Drag and drop interface for PDF files
- Adjustable compression settings:
  - Image quality (affects file size)
  - Resolution (DPI)
- Real-time compression progress
- Download compressed PDF files
- Size comparison between original and compressed files
- Side-by-side comparison viewer for original and compressed PDFs
- Download all compressed files at once
- Reorder PDFs via drag-and-drop
- Combine multiple PDFs into a single document
- OCR analysis for combined PDFs via Mistral AI
- AWS S3 integration for temporary file storage

## How It Works

Ultra-Compress PDF works by:

1. Reading the PDF file using PDF.js
2. Rendering each page to a canvas
3. Converting each page to a JPEG with adjustable quality
4. Creating a new PDF with pdf-lib containing the compressed images
5. Preserving the original page dimensions

For OCR functionality:
1. Combined PDF is securely uploaded to AWS S3 using pre-signed URLs
2. Mistral AI's OCR service processes the document
3. Text is extracted from all pages, including images and scanned content
4. The file is automatically deleted from S3 after processing

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

4. Start the server
   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser

## Usage

1. Open the application in a web browser
2. Drag and drop PDF files onto the drop area or click "Select Files" to choose files
3. Arrange the files in your desired order using drag and drop
4. Adjust compression settings as needed:
   - Lower image quality for smaller file size
   - Lower DPI for further size reduction
5. Optionally check "Combine all PDFs into a single file" if you want a merged document
6. For OCR analysis of combined PDFs, enable the OCR option and enter your Mistral API key
7. Click "Compress Files" to start the compression process
8. Once compression is complete, you can:
   - Download individual compressed files
   - Compare the original and compressed versions side by side
   - Download all compressed files at once with the "Download All" button
   - Download the combined PDF (if you selected that option)
   - View OCR results and download extracted text (for combined PDFs with OCR)

## Security Note

- All PDF processing is done client-side
- AWS credentials are securely handled server-side
- S3 uploads use pre-signed URLs for secure, temporary access
- Files uploaded to S3 are automatically deleted after OCR processing
- Your Mistral API key is stored locally in your browser if you choose to save it

## Dependencies

- [PDF.js](https://mozilla.github.io/pdf.js/) - For rendering PDF pages
- [pdf-lib](https://pdf-lib.js.org/) - For creating new PDF files
- [SortableJS](https://github.com/SortableJS/Sortable) - For drag and drop reordering
- [Express](https://expressjs.com/) - For server-side routing and API
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

- All processing is done client-side; no files are uploaded to a server
- Large PDFs may take more time to process
- Text quality is dependent on the selected DPI and image quality settings 