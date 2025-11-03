import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class PreviewService {
    constructor() {
        this.stlLoader = new STLLoader();
        this.gltfLoader = new GLTFLoader();
    }
    loadModel(fileURL, fileExtension = null) {
        return new Promise((resolve, reject) => {
            // Determine file type from extension or URL
            let extension = fileExtension;
            if (!extension) {
                const urlPath = fileURL.split('?')[0]; // Remove query params
                extension = urlPath.split('.').pop().toLowerCase();
            } else {
                extension = extension.toLowerCase();
            }

            if (extension === 'glb' || extension === 'gltf') {
                // Load GLB/GLTF file
                this.gltfLoader.load(
                    fileURL,
                    (gltf) => {
                        // Extract geometry from the GLTF scene
                        let geometry = null;
                        gltf.scene.traverse((child) => {
                            if (child.isMesh && !geometry) {
                                geometry = child.geometry;
                            }
                        });
                        if (geometry) {
                            resolve(geometry);
                        } else {
                            reject(new Error('No mesh geometry found in GLB/GLTF file'));
                        }
                    },
                    undefined,
                    reject
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
                    reject
                );
            } else {
                reject(new Error(`Unsupported file format: ${extension}. Supported formats: STL, GLB, GLTF`));
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
