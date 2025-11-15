import React from 'react';

interface FullScreenLoaderProps {
  isOpen: boolean;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ isOpen }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-999999 flex flex-col items-center justify-center bg-black bg-opacity-60"
      aria-labelledby="loading-spinner"
      role="dialog"
      aria-modal="true"
    >
      <svg
        className="h-16 w-16 animate-spin text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        id="loading-spinner"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="mt-4 text-lg text-white">Processando, por favor aguarde...</p>
    </div>
  );
};

export default FullScreenLoader;
