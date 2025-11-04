# GLB Viewer Implementation

## Overview
This document explains the new GLB file viewing implementation for the DreamForge application.

## Problem
The previous implementation used a custom Three.js-based `PreviewComponent` that had issues rendering GLB files from external URLs, particularly from the Meshy API.

## Solution
Replaced the Three.js implementation with Google's `<model-viewer>` web component, which provides:

- **Automatic CORS handling**: Works seamlessly with cross-origin GLB files
- **Built-in camera controls**: Users can rotate, zoom, and pan the model
- **Auto-rotate feature**: Models automatically rotate when not being interacted with
- **Shadow rendering**: Realistic shadow effects
- **Simple implementation**: Minimal code required compared to custom Three.js setup
- **Well-maintained**: Actively maintained by Google
- **Browser compatibility**: Works in all modern browsers

## Implementation Details

### New Component: `glbViewer.js`
Located at: `src/app/components/glbViewer.js`

This component:
1. Dynamically loads the model-viewer library from Google's CDN
2. Displays loading states while the library and model are loading
3. Handles errors gracefully with fallback to download link
4. Provides a clean, simple API for displaying GLB files

### Usage

```jsx
import GlbViewer from '../components/glbViewer';

<GlbViewer 
  fileURL="https://your-domain.com/path/to/model.glb" 
  width="100%" 
  height="400px" 
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileURL` | string | required | URL to the GLB/GLTF file |
| `width` | string | `'600px'` | Width of the viewer |
| `height` | string | `'400px'` | Height of the viewer |

### Features

1. **Camera Controls**: Click and drag to rotate, scroll to zoom, right-click and drag to pan
2. **Auto-Rotate**: Model automatically rotates when idle
3. **Loading States**: Shows appropriate loading indicators
4. **Error Handling**: Displays error messages and provides download fallback
5. **Responsive**: Adapts to container size

## Updated Pages

The following pages have been updated to use the new `GlbViewer` component:

1. **Refine Page** (`src/app/refine/page.js`): Main page for viewing and refining 3D models
2. **Preview Page** (`src/app/preview/page.js`): Preview page before payment

## Testing

### Test with Sample URL
```
https://assets.meshy.ai/f333117a-420f-437a-8687-8b49a5660076/tasks/019a4c21-dd86-78d1-b3ce-7f4b4fa04b1f/output/model.glb?Expires=4915728000&Signature=...
```

### Expected Behavior
1. Component loads the model-viewer library from Google's CDN
2. Shows "Loading 3D viewer..." while library loads
3. Shows "Loading 3D model..." while model loads
4. Displays the 3D model with camera controls enabled
5. Model auto-rotates when not being interacted with

### Troubleshooting

**Problem**: Model doesn't load
- Check browser console for CORS errors
- Verify the GLB file URL is accessible
- Ensure the URL returns a valid GLB file

**Problem**: Viewer shows error
- Check internet connection (requires CDN access)
- Verify GLB file is not corrupted
- Try downloading the file using the fallback link

## Dependencies

- **External**: Google's model-viewer web component (loaded via CDN)
- **No NPM packages required**: The component loads dynamically from CDN

## Browser Support

Works in all modern browsers that support:
- Web Components (Custom Elements)
- ES Modules
- WebGL

Supported browsers:
- Chrome/Edge 67+
- Firefox 63+
- Safari 12.1+
- Opera 54+

## Migration Notes

### From PreviewComponent to GlbViewer

**Before:**
```jsx
import PreviewComponent from '../components/previewComponent';

<PreviewComponent fileURL={fileData.fileUrl} />
```

**After:**
```jsx
import GlbViewer from '../components/glbViewer';

<GlbViewer fileURL={fileData.fileUrl} width="100%" height="400px" />
```

### Key Differences

1. **Simpler API**: No need to handle Three.js scene setup
2. **Better CORS**: Automatically handles cross-origin requests
3. **Built-in controls**: No need to implement OrbitControls
4. **Loading states**: Built-in loading and error handling
5. **Auto-rotate**: Native support for auto-rotation
6. **Shadows**: Better shadow rendering out of the box

## Future Enhancements

Possible future improvements:
- Add AR viewing support (model-viewer supports AR)
- Add poster images for faster initial display
- Add environment lighting customization
- Add animation controls if models contain animations
- Add screenshot/snapshot functionality
- Add model info display (polygon count, dimensions, etc.)

## Resources

- [model-viewer documentation](https://modelviewer.dev/)
- [model-viewer GitHub](https://github.com/google/model-viewer)
- [GLB format specification](https://www.khronos.org/gltf/)
