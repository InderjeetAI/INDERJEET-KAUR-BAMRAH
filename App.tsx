
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PdfUploader } from './components/PdfUploader';
import { RedactionPanel } from './components/RedactionPanel';
import { PdfPreview } from './components/PdfPreview';
import { Spinner } from './components/Spinner';
import { analyzeTextForSensitiveInfo } from './services/geminiService';
import { extractTextWithCoords, createRedactedPdf } from './services/pdfService';
import { DetectedItem, ProcessingState, TextItemWithCoords } from './types';
import { AlertTriangleIcon } from './components/Icons';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle', message: '' });
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  const resetState = () => {
    setFile(null);
    setProcessingState({ status: 'idle', message: '' });
    setDetectedItems([]);
  };

  const matchSensitiveInfoWithCoords = (
    infos: { type: string; text: string }[],
    textItems: TextItemWithCoords[],
    fullText: string
  ): DetectedItem[] => {
    const matched: DetectedItem[] = [];
    let idCounter = 0;
  
    // Create a map from each character index in the full text back to its source text item.
    // This allows us to find the exact source coordinates for any string found by the AI.
    const charToItemMap: (TextItemWithCoords | null)[] = [];
    let currentIndex = 0;
    textItems.forEach((item, itemIndex) => {
      for (let i = 0; i < item.text.length; i++) {
        charToItemMap[currentIndex + i] = item;
      }
      currentIndex += item.text.length;
      // Account for the space character used in join()
      if (itemIndex < textItems.length - 1) {
        charToItemMap[currentIndex] = null; 
        currentIndex++;
      }
    });
  
    // Remove duplicate findings from the AI to prevent redundant processing
    const uniqueInfos = Array.from(new Map(infos.map(info => [info.text.trim(), info])).values());
  
    uniqueInfos.forEach(info => {
      const sensitiveText = info.text.trim();
      if (!sensitiveText) return;
  
      // Create a regex that's robust to whitespace changes and escapes special characters.
      // This ensures we find the text even if spacing in the PDF extract is inconsistent.
      const escapedText = sensitiveText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedText.replace(/\s+/g, '\\s+'), 'g');
      
      let match;
      // Find all occurrences of the sensitive text using the regex
      while ((match = searchRegex.exec(fullText)) !== null) {
        const lastIndex = match.index;
        const matchedText = match[0];
        const matchEndIndex = lastIndex + matchedText.length;
        
        // Find the unique set of text items that make up this match
        const itemsInMatchSet = new Set<TextItemWithCoords>();
        for (let i = lastIndex; i < matchEndIndex; i++) {
          const item = charToItemMap[i];
          if (item) {
            itemsInMatchSet.add(item);
          }
        }
  
        const itemsInMatch = Array.from(itemsInMatchSet);
  
        if (itemsInMatch.length > 0) {
          // Group items by page and by line (using similar y-coordinate)
          // This correctly handles multi-line text like addresses.
          const lines: { [key: string]: TextItemWithCoords[] } = {};
          itemsInMatch.forEach(item => {
            const lineKey = `${item.page}-${item.y.toFixed(0)}`;
            if (!lines[lineKey]) lines[lineKey] = [];
            lines[lineKey].push(item);
          });
  
          // Create a separate, combined redaction box for each line of the match
          Object.values(lines).forEach(lineItems => {
            if (lineItems.length === 0) return;
            lineItems.sort((a, b) => a.x - b.x); // Ensure horizontal order
  
            const firstItem = lineItems[0];
            const lastItem = lineItems[lineItems.length - 1];
            
            const x = firstItem.x;
            const width = (lastItem.x + lastItem.width) - firstItem.x;
            
            matched.push({
              id: `item-${idCounter++}`,
              type: info.type,
              text: sensitiveText, // Use original sensitiveText for display
              page: firstItem.page,
              x: x,
              y: firstItem.y,
              width: width,
              height: Math.max(...lineItems.map(i => i.height)),
            });
          });
        }
      }
    });
  
    // Deduplicate based on final position to avoid overlapping boxes
    return Array.from(new Map(matched.map(item => [`${item.page}-${item.x.toFixed(2)}-${item.y.toFixed(2)}-${item.width.toFixed(2)}`, item])).values());
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;
    resetState();
    setFile(selectedFile);
    setProcessingState({ status: 'parsing', message: 'Parsing PDF and extracting text...' });

    try {
      const allTextItems = await extractTextWithCoords(selectedFile);
      if (allTextItems.length === 0) {
        throw new Error("No text could be extracted from this PDF. It might be an image-only PDF.");
      }
      
      // Join with spaces instead of newlines for more reliable text matching across items.
      const fullText = allTextItems.map(item => item.text).join(' ');

      setProcessingState({ status: 'analyzing', message: 'AI is analyzing text for sensitive information...' });
      const sensitiveInfos = await analyzeTextForSensitiveInfo(fullText);

      const matchedItems = matchSensitiveInfoWithCoords(sensitiveInfos, allTextItems, fullText);
      setDetectedItems(matchedItems);

      setProcessingState({ status: 'done', message: `Analysis complete. Found ${matchedItems.length} items.` });
    } catch (error) {
      console.error("Processing failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
      setProcessingState({ status: 'error', message: errorMessage });
    }
  }, []);

  const handleDownload = async () => {
    if (!file) return;

    try {
      const redactedPdfBytes = await createRedactedPdf(file, detectedItems);
      const blob = new Blob([redactedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `redacted-${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to create redacted PDF:", error);
      setProcessingState({ status: 'error', message: 'Failed to generate the redacted PDF.' });
    }
  };

  const renderContent = () => {
    if (processingState.status === 'parsing' || processingState.status === 'analyzing') {
      return (
        <div className="flex flex-col items-center justify-center text-center h-full">
          <Spinner />
          <p className="mt-4 text-lg text-cyan-300">{processingState.message}</p>
        </div>
      );
    }
    
    if (processingState.status === 'error') {
      return (
         <div className="flex flex-col items-center justify-center text-center h-full bg-red-900/20 border border-red-500 rounded-lg p-8">
            <AlertTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-red-300 mb-2">An Error Occurred</h2>
            <p className="text-red-200 mb-6 max-w-md">{processingState.message}</p>
            <button onClick={resetState} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Start Over
            </button>
        </div>
      );
    }

    if (file && processingState.status === 'done') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-1 h-full flex flex-col">
            <RedactionPanel
              items={detectedItems}
              onDownload={handleDownload}
              onReset={resetState}
            />
          </div>
          <div className="lg:col-span-2 bg-gray-900 rounded-lg overflow-hidden h-full">
            <PdfPreview file={file} itemsToRedact={detectedItems} />
          </div>
        </div>
      );
    }

    return <PdfUploader onFileSelect={handleFileSelect} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-2xl shadow-black/30 p-6 h-[85vh]">
          {renderContent()}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
