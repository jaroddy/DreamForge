'use client';
import React, { useEffect, useRef } from 'react';

/**
 * Simple GLB/GLTF viewer component using model-viewer web component
 * This provides an easy way to display and interact with 3D models
 */
const GlbViewer = ({ fileURL, width = '600px', height = '400px' }) => {
  const viewerRef = useRef(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    // Dynamically load the model-viewer script if not already loaded
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      document.head.appendChild(script);
      
      return () => {
        // Cleanup: remove script if component unmounts before loading
        if (script.parentNode) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    setError(null);
  };

  const handleError = (event) => {
    console.error('Model viewer error:', event);
    setError('Failed to load 3D model. Please check the file URL.');
  };

  if (!fileURL) {
    return (
      <div 
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px'
        }}
      >
        <p style={{ color: '#666', fontSize: '14px' }}>No model URL provided</p>
      </div>
    );
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      {!isLoaded && !error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            zIndex: 10
          }}
        >
          <p style={{ color: '#666', fontSize: '14px' }}>Loading 3D model...</p>
        </div>
      )}
      
      {error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fee',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#c00', fontSize: '14px' }}>{error}</p>
        </div>
      )}
      
      <model-viewer
        ref={viewerRef}
        src={fileURL}
        alt="3D model"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px'
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default GlbViewer;
