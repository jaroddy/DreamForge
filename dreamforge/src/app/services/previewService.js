import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export class PreviewService {
    constructor() {
        this.stlLoader = new STLLoader();
        this.gltfLoader = new GLTFLoader();
        
        // Configure DRACOLoader for compressed GLB files
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        this.gltfLoader.setDRACOLoader(dracoLoader);
    }
    loadModel(fileURL, fileExtension = null) {
        return new Promise((resolve, reject) => {
            // Determine file type from extension or URL
            let extension = fileExtension;
            if (!extension) {
                const urlPath = fileURL.split('?')[0]; // Remove query params
                const parts = urlPath.split('.');
                if (parts.length > 1) {
                    extension = parts.pop().toLowerCase();
                } else {
                    reject(new Error('Unable to determine file format from URL. Please provide fileExtension parameter.'));
                    return;
                }
            } else {
                extension = extension.toLowerCase();
            }

            // Validate extension
            const supportedFormats = ['stl', 'glb', 'gltf'];
            if (!supportedFormats.includes(extension)) {
                reject(new Error(`Unsupported file format: ${extension}. Supported formats: ${supportedFormats.join(', ').toUpperCase()}`));
                return;
            }

            if (extension === 'glb' || extension === 'gltf') {
                // Load GLB/GLTF file
                // Set cross-origin to allow loading from external domains
                this.gltfLoader.setCrossOrigin('anonymous');
                
                this.gltfLoader.load(
                    fileURL,
                    (gltf) => {
                        // Return the scene as Object3D for GLB/GLTF files
                        // This preserves the hierarchy and allows proper rendering
                        const scene = gltf.scene || gltf.scenes?.[0];
                        if (!scene) {
                            reject(new Error('No scene found in GLB/GLTF file'));
                            return;
                        }
                        resolve(scene);
                    },
                    undefined,
                    (error) => {
                        console.error('GLB/GLTF loading error:', error);
                        reject(error);
                    }
                );
            } else if (extension === 'stl') {
                // Load STL file
                this.stlLoader.load(
                    fileURL,
                    (geometry) => {
                        // STL loader returns a Geometry or BufferGeometry
                        resolve(geometry);
                    },
                    undefined,
                    (error) => {
                        console.error('STL loading error:', error);
                        reject(error);
                    }
                );
            }
        });
    }

    getDimensions(geometry) {
        geometry.computeBoundingBox();
        const { min, max } = geometry.boundingBox;

        return {
            width: max.x - min.x,
            height: max.y - min.y,
            depth: max.z - min.z
        };
    }

    checkModelDimensions(geometry) {
        const mesh = new THREE.Mesh(geometry);
        const boundingBox = new THREE.Box3().setFromObject(mesh);
        const size = boundingBox.getSize(new THREE.Vector3());
        return {
            length: parseFloat(size.x.toFixed(2)),
            width: parseFloat(size.y.toFixed(2)),
            height: parseFloat(size.z.toFixed(2)),
        };
    }
}
