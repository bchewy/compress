# Ultra-Compress PDF

A simple web application to compress PDF files while maintaining readability for both humans and LLMs.

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

## How It Works

Ultra-Compress PDF works by:

1. Reading the PDF file using PDF.js
2. Rendering each page to a canvas
3. Converting each page to a JPEG with adjustable quality
4. Creating a new PDF with pdf-lib containing the compressed images
5. Preserving the original page dimensions

This approach significantly reduces file size while maintaining readability for both humans and LLMs. The text remains searchable and selectable as it is rasterized at a high enough quality.

## Usage

1. Open `index.html` in a web browser
2. Drag and drop PDF files onto the drop area or click "Select Files" to choose files
3. Arrange the files in your desired order using drag and drop
4. Adjust compression settings as needed:
   - Lower image quality for smaller file size
   - Lower DPI for further size reduction
5. Optionally check "Combine all PDFs into a single file" if you want a merged document
6. Click "Compress Files" to start the compression process
7. Once compression is complete, you can:
   - Download individual compressed files
   - Compare the original and compressed versions side by side
   - Download all compressed files at once with the "Download All" button
   - Download the combined PDF (if you selected that option)

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

## Dependencies

- [PDF.js](https://mozilla.github.io/pdf.js/) - For rendering PDF pages
- [pdf-lib](https://pdf-lib.js.org/) - For creating new PDF files
- [SortableJS](https://github.com/SortableJS/Sortable) - For drag and drop reordering

## Notes

- All processing is done client-side; no files are uploaded to a server
- Large PDFs may take more time to process
- Text quality is dependent on the selected DPI and image quality settings 