'use client';
import React, { useEffect, useRef } from 'react';

/**
 * Simple GLB/GLTF viewer component using model-viewer web component
 * This provides an easy way to display and interact with 3D models
 * 
 * The model-viewer web component is loaded from Google's CDN and provides:
 * - Automatic CORS handling
 * - Built-in camera controls (rotation, zoom, pan)
 * - Auto-rotate functionality
 * - Shadow rendering
 * - No complex Three.js setup required
 */
const GlbViewer = ({ fileURL, width = '600px', height = '400px' }) => {
  const viewerRef = useRef(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

  useEffect(() => {
    // Check if model-viewer is already defined
    if (typeof window !== 'undefined' && customElements.get('model-viewer')) {
      setScriptLoaded(true);
      return;
    }

    // Dynamically load the model-viewer script if not already loaded
    if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      // Using Google's CDN for model-viewer
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        console.error('Failed to load model-viewer library');
        setError('Failed to load 3D viewer library. Please check your internet connection.');
      };
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
      {!scriptLoaded && !error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            zIndex: 10
          }}
        >
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>Loading 3D viewer...</p>
        </div>
      )}
      
      {scriptLoaded && !isLoaded && !error && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            zIndex: 10
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #ddd', 
            borderTop: '4px solid #4299e1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px'
          }} />
          <p style={{ color: '#666', fontSize: '14px' }}>Loading 3D model...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
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
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fee',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#c00', fontSize: '14px', marginBottom: '10px' }}>{error}</p>
          {fileURL && (
            <a 
              href={fileURL}
              download
              style={{ 
                color: '#4299e1', 
                textDecoration: 'underline',
                fontSize: '12px'
              }}
            >
              Download GLB file instead
            </a>
          )}
        </div>
      )}
      
      {scriptLoaded && (
        <model-viewer
          ref={viewerRef}
          src={fileURL}
          alt="3D model preview"
          auto-rotate
          camera-controls
          shadow-intensity="1"
          exposure="1"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px'
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default GlbViewer;
