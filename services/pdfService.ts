
import type { DetectedItem, TextItemWithCoords } from '../types';

// Use declare to inform TypeScript about global variables from CDN scripts
declare const pdfjsLib: any;
declare const PDFLib: any;

export const extractTextWithCoords = async (file: File): Promise<TextItemWithCoords[]> => {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async (e) => {
      if (!e.target?.result) {
        return reject(new Error("Failed to read file."));
      }
      try {
        const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        const allTextItems: TextItemWithCoords[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          textContent.items.forEach((item: any) => {
            if (!item.str.trim()) return; // Ignore whitespace-only items
            const tx = item.transform;
            // The transform matrix is [scaleX, skewY, skewX, scaleY, x, y]
            const x = tx[4];
            const y = tx[5];
            allTextItems.push({
              text: item.str,
              page: i,
              x: x,
              y: y,
              width: item.width,
              height: item.height,
            });
          });
        }
        resolve(allTextItems);
      } catch (error) {
        reject(error);
      }
    };
    fileReader.onerror = () => reject(new Error("FileReader error"));
    fileReader.readAsArrayBuffer(file);
  });
};

export const createRedactedPdf = async (
    originalPdfFile: File, 
    itemsToRedact: DetectedItem[]
): Promise<Uint8Array> => {
    const { PDFDocument, rgb } = PDFLib;
    const existingPdfBytes = await originalPdfFile.arrayBuffer();
    
    // Load the PDF with pdf-lib for modification
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // If there's nothing to redact, just return the original file bytes
    if (itemsToRedact.length === 0) {
        return await pdfDoc.save();
    }

    // Group items by page to know which pages need to be flattened
    const pagesToRedact = new Set<number>();
    itemsToRedact.forEach(item => pagesToRedact.add(item.page));

    // We need pdf.js to render pages to an image
    const pdfjsDoc = await pdfjsLib.getDocument(existingPdfBytes).promise;

    for (const pageNumber of pagesToRedact) {
        const pageIndex = pageNumber - 1;
        
        // Get the page from pdf.js for rendering
        const pdfjsPage = await pdfjsDoc.getPage(pageNumber);
        
        // Use a high-quality scale for rendering to avoid pixelation
        const scale = 2.0; 
        const viewport = pdfjsPage.getViewport({ scale });

        // Create an offscreen canvas to render the page
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) {
            console.warn(`Could not get 2D context for canvas on page ${pageNumber}`);
            continue;
        }

        // Render the page content to the canvas
        await pdfjsPage.render({ canvasContext: context, viewport: viewport }).promise;

        // Convert the canvas content to a PNG image byte array
        const imageBytes = await new Promise<Uint8Array>((resolve) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    resolve(new Uint8Array()); 
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result instanceof ArrayBuffer) {
                        resolve(new Uint8Array(reader.result));
                    } else {
                        resolve(new Uint8Array());
                    }
                };
                reader.readAsArrayBuffer(blob);
            }, 'image/png');
        });
        
        if (imageBytes.length === 0) {
            console.warn(`Could not convert canvas to image for page ${pageNumber}.`);
            continue;
        }

        // Embed the PNG image into the pdf-lib document
        const embeddedImage = await pdfDoc.embedPng(imageBytes);

        // Get the original page from pdf-lib to get its dimensions
        const originalPage = pdfDoc.getPage(pageIndex);
        const { width, height } = originalPage.getSize();
        
        // Remove the original page and insert a new blank one in its place.
        // This is the most reliable way to clear all content.
        pdfDoc.removePage(pageIndex);
        const newPage = pdfDoc.insertPage(pageIndex, [width, height]);
        
        // Draw the rendered image onto the new blank page, covering it entirely
        newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: newPage.getWidth(),
            height: newPage.getHeight(),
        });

        // Now, draw the opaque redaction boxes over the image on the new page
        const itemsOnThisPage = itemsToRedact.filter(item => item.page === pageNumber);
        for (const item of itemsOnThisPage) {
            if (isNaN(item.x) || isNaN(item.y) || isNaN(item.width) || isNaN(item.height) || item.width <= 0 || item.height <= 0) {
                console.warn('Skipping redaction for item with invalid dimensions:', item);
                continue;
            }
            
            const padding = 1;
            // The y-coordinate from pdf.js is the baseline. The box needs to cover the full character height.
            // An estimated 'descent' helps position the box correctly below the baseline.
            const descent = item.height * 0.25;

            const box = {
                x: item.x - padding,
                y: item.y - descent - padding, // pdf-lib y-origin is bottom-left, same as pdf.js
                width: item.width + (padding * 2),
                height: item.height + (padding * 2),
            };

            newPage.drawRectangle({
                ...box,
                color: rgb(0, 0, 0),
            });
        }
    }

    return await pdfDoc.save();
};
