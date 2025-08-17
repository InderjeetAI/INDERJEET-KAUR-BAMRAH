import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} All Rights Reserved.</p>
      </div>
    </footer>
  );
};