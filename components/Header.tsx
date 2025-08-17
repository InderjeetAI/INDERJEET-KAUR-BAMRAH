
import React from 'react';
import { ShieldCheckIcon } from './Icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <ShieldCheckIcon className="h-8 w-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI PDF Redactor
            </h1>
          </div>
          <p className="hidden md:block text-sm text-gray-400">
            Securely redact sensitive data with AI.
          </p>
        </div>
      </div>
    </header>
  );
};
