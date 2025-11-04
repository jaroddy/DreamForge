// Preview.js
'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { useFileUrl } from '../context/fileUrlContext';
import TokenDisplay from '../components/TokenDisplay';
import dynamic from 'next/dynamic';

// Dynamically import the GlbViewer with SSR turned off
const GlbViewer = dynamic(() => import('../components/glbViewer'), { ssr: false });
const PreviewOptions = dynamic(() => import('../components/PreviewOptions'), { ssr: false });

const Preview = () => {
  const router = useRouter();
  const { fileData } = useFileUrl();
  const { fileUrl, slicerApiResponse } = fileData;

  const handleNext = () => {
    router.push('/payment');
  };

  const handlePrevious = () => {
    router.push('/');
  };


  return (
    <div className="bg-gradient-to-bl from-blue-500 to-gray-100 h-screen transition-opacity duration-500">
      <TokenDisplay />
      
      <div className="flex justify-center items-center min-h-90">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center animate-fadeIn">
          <h1 className="text-center text-3xl font-bold text-white mb-6">Review Your Model</h1>

          <div className="border-4 border-white overflow-hidden rounded-lg shadow-lg">
            <GlbViewer fileURL={fileUrl} width="100%" height="400px" />
          </div>

          <PreviewOptions slicerResponse={slicerApiResponse} />

          <div className="flex justify-between w-full px-4 pb-10">
            <button
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 transition duration-300 text-white rounded-lg font-medium"
              onClick={() => router.push('/')}
            >
              ← Back
            </button>
            <button
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 transition duration-300 text-white rounded-lg font-medium"
              onClick={() => router.push('/payment')}
            >
              Continue to Payment →
            </button>
          </div>
        </div>
      </div>

    </div>
  );

};

export default Preview;

