import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Convert a Meshy.ai asset URL to a proxied URL through our backend
 * This fixes CORS issues when loading GLB files from Meshy's servers
 * @param {string} meshyUrl - The original Meshy.ai asset URL
 * @returns {string} - The proxied URL through our backend
 */
export function getProxiedUrl(meshyUrl) {
    if (!meshyUrl) return meshyUrl;
    
    // Only proxy Meshy.ai URLs
    if (meshyUrl.startsWith('https://assets.meshy.ai/')) {
        return `${BACKEND_URL}/api/meshy/proxy?url=${encodeURIComponent(meshyUrl)}`;
    }
    
    return meshyUrl;
}

class MeshyService {
    constructor() {
        this.client = axios.create({
            baseURL: BACKEND_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        
        // Add response interceptor to handle session ID
        // NOTE: Using localStorage for session management. In production,
        // consider using httpOnly cookies for better XSS protection
        this.client.interceptors.response.use(
            (response) => {
                const sessionId = response.headers['x-session-id'];
                if (sessionId && typeof window !== 'undefined') {
                    localStorage.setItem('session_id', sessionId);
                }
                return response;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
        
        // Add request interceptor to include session ID
        this.client.interceptors.request.use(
            (config) => {
                if (typeof window !== 'undefined') {
                    const sessionId = localStorage.getItem('session_id');
                    if (sessionId) {
                        config.headers['X-Session-ID'] = sessionId;
                    }
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }
    
    async createPreview(promptData) {
        try {
            const response = await this.client.post('/api/meshy/preview', promptData);
            return response.data;
        } catch (error) {
            console.error('Error creating preview:', error);
            throw error;
        }
    }
    
    async createRefine(refineData) {
        try {
            const response = await this.client.post('/api/meshy/refine', refineData);
            return response.data;
        } catch (error) {
            console.error('Error creating refine:', error);
            throw error;
        }
    }
    
    async getTask(taskId) {
        try {
            const response = await this.client.get(`/api/meshy/task/${taskId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting task:', error);
            throw error;
        }
    }
    
    async listTasks(pageNum = 1, pageSize = 10) {
        try {
            const response = await this.client.get('/api/meshy/list', {
                params: { page_num: pageNum, page_size: pageSize }
            });
            return response.data;
        } catch (error) {
            console.error('Error listing tasks:', error);
            throw error;
        }
    }
    
    async pollTask(taskId, maxAttempts = 60, intervalMs = 15000) {
        /**
         * Poll a task until it's complete or fails
         * maxAttempts: 60 attempts * 15 seconds = 15 minutes max
         */
        for (let i = 0; i < maxAttempts; i++) {
            const task = await this.getTask(taskId);
            
            if (task.status === 'SUCCEEDED') {
                return task;
            } else if (task.status === 'FAILED') {
                throw new Error('Task failed');
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        
        throw new Error('Task timeout - took too long to complete');
    }
}

export default MeshyService;
