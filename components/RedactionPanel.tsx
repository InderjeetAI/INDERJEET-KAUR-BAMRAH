
import React, { useMemo } from 'react';
import { DetectedItem } from '../types';
import { DownloadIcon, Trash2Icon } from './Icons';

interface RedactionPanelProps {
  items: DetectedItem[];
  onDownload: () => void;
  onReset: () => void;
}

export const RedactionPanel: React.FC<RedactionPanelProps> = ({ items, onDownload, onReset }) => {
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const { type } = item;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {} as Record<string, DetectedItem[]>);
  }, [items]);

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col h-full overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Detected Items</h2>
        <p className="text-sm text-gray-400">Found {items.length} items to be permanently redacted.</p>
      </div>

      <div className="flex-grow overflow-y-auto">
        {Object.keys(groupedItems).length > 0 ? (
          Object.entries(groupedItems).map(([type, groupItems]) => (
            <div key={type} className="border-b border-gray-700 last:border-b-0">
              <h3 className="bg-gray-700/50 px-4 py-2 text-sm font-semibold text-cyan-300 sticky top-0">{type} ({groupItems.length})</h3>
              <ul>
                {groupItems.map(item => (
                  <li key={item.id} className="px-4 py-2 hover:bg-gray-700/30">
                     <span className="text-sm text-gray-300 truncate block" title={item.text}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No sensitive information was detected in this document.</p>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700 mt-auto bg-gray-800 space-y-4">
        <div className="flex space-x-2">
            <button
              onClick={onDownload}
              disabled={items.length === 0}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
            >
              <DownloadIcon className="w-5 h-5 mr-2"/>
              Download Redacted PDF
            </button>
            <button
              onClick={onReset}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-base font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900"
            >
              <Trash2Icon className="w-5 h-5"/>
            </button>
        </div>
         <p className="text-xs text-gray-500 text-center italic">
          <strong>Permanent Deletion Guaranteed:</strong> To ensure data is unrecoverable, pages with redactions are converted into images, completely destroying the original text. Text on other pages remains searchable.
        </p>
      </div>
    </div>
  );
};