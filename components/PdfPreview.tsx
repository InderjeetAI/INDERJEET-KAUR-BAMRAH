
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DetectedItem } from '../types';
import { ZoomInIcon, ZoomOutIcon } from './Icons';

// Use declare to inform TypeScript about global variables from CDN scripts
declare const pdfjsLib: any;

interface PdfPreviewProps {
  file: File;
  itemsToRedact: DetectedItem[];
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ file, itemsToRedact }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    setIsLoading(true);
    const page = await pdfDoc.getPage(pageNum);
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const viewport = page.getViewport({ scale: zoom });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    // Draw redaction boxes
    const itemsOnPage = itemsToRedact.filter(item => item.page === pageNum);
    itemsOnPage.forEach(item => {
      const itemViewport = page.getViewport({ scale: zoom });
      const transform = itemViewport.transform; // [scaleX, 0, 0, scaleY, tx, ty]

      const padding = 1;
      const descent = item.height * 0.25; 
      const boxPdf = {
        x: item.x - padding,
        y: item.y - descent - padding,
        width: item.width + (padding * 2),
        height: item.height + (padding * 2),
      };

      const pdfTopLeft = {
          x: boxPdf.x,
          y: boxPdf.y + boxPdf.height
      };

      const canvasTopLeft = {
          x: transform[0] * pdfTopLeft.x + transform[4],
          y: transform[3] * pdfTopLeft.y + transform[5]
      };
      
      const canvasWidth = boxPdf.width * transform[0];
      const canvasHeight = boxPdf.height * Math.abs(transform[3]);

      // Draw the black rectangle on the canvas.
      context.fillStyle = 'rgb(0, 0, 0)';
      context.fillRect(
        canvasTopLeft.x,
        canvasTopLeft.y,
        canvasWidth,
        canvasHeight
      );
    });

    setIsLoading(false);
  }, [pdfDoc, zoom, itemsToRedact]);

  useEffect(() => {
    const loadPdf = async () => {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        if (e.target?.result) {
          const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
          const loadingTask = pdfjsLib.getDocument(typedarray);
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
        }
      };
      fileReader.readAsArrayBuffer(file);
    };
    if (file) {
      loadPdf();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  const goToPrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(numPages, prev + 1));
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev + 0.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.2));

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      <div className="flex-shrink-0 bg-gray-800 p-2 flex items-center justify-center space-x-4 border-b border-gray-700">
        <button onClick={goToPrevPage} disabled={currentPage <= 1} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white">&lt;</button>
        <span className="text-white">Page {currentPage} of {numPages}</span>
        <button onClick={goToNextPage} disabled={currentPage >= numPages} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white">&gt;</button>
        <div className="w-px h-6 bg-gray-600 mx-2"></div>
        <button onClick={handleZoomOut} className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"><ZoomOutIcon className="w-5 h-5"/></button>
        <span className="text-white w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
        <button onClick={handleZoomIn} className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"><ZoomInIcon className="w-5 h-5"/></button>
      </div>
      <div ref={containerRef} className="flex-grow overflow-auto p-4 flex justify-center items-start">
         {isLoading && <div className="text-white">Loading preview...</div>}
        <canvas ref={canvasRef} className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`} />
      </div>
    </div>
  );
};
