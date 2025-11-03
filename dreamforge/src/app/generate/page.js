'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MeshyService from '../services/meshyService';
import { useFileUrl } from '../context/fileUrlContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FILENAME_MAX_LENGTH = 30;

const GeneratePage = () => {
    const router = useRouter();
    const { setFileData } = useFileUrl();
    const [prompt, setPrompt] = useState('');
    const [artStyle, setArtStyle] = useState('realistic');
    const [loading, setLoading] = useState(false);
    const [taskId, setTaskId] = useState(null);
    const [progress, setProgress] = useState('');

    const handleGenerate = async () => {
        if (!prompt || prompt.trim().length < 3) {
            toast.error('Please enter a detailed prompt (at least 3 characters)');
            return;
        }

        if (prompt.length > 600) {
            toast.error('Prompt must be less than 600 characters');
            return;
        }

        setLoading(true);
        setProgress('Creating preview task...');

        try {
            const meshyService = new MeshyService();
            
            // Create preview task
            const result = await meshyService.createPreview({
                prompt: prompt.trim(),
                art_style: artStyle,
                ai_model: 'meshy-5',
                should_remesh: true,
                target_polycount: 30000
            });

            if (result.success && result.task_id) {
                setTaskId(result.task_id);
                setProgress('Generating 3D model... This may take 1-2 minutes.');
                
                // Poll for completion
                toast.info('Generating your 3D model. This will take 1-2 minutes...');
                
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    toast.success('Model generated successfully!');
                    
                    // Store data in context
                    setFileData({
                        fileUrl: completedTask.model_urls?.glb || completedTask.model_urls?.obj || '',
                        meshyTaskId: result.task_id,
                        meshyData: completedTask,
                        filename: `${prompt.substring(0, FILENAME_MAX_LENGTH).replace(/\s+/g, '_')}.glb`,
                        isMeshyModel: true
                    });
                    
                    // Navigate to refine page
                    router.push('/refine');
                } else {
                    toast.error('Model generation failed');
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error generating model:', error);
            toast.error(error.response?.data?.detail || error.message || 'Failed to generate model');
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold text-white text-center mb-8">
                        Generate 3D Model with AI
                    </h1>
                    
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">
                                Describe your 3D model
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., a cute robot toy with big eyes, a medieval castle tower, a modern coffee mug..."
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="4"
                                maxLength="600"
                                disabled={loading}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {prompt.length}/600 characters
                            </p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">
                                Art Style
                            </label>
                            <select
                                value={artStyle}
                                onChange={(e) => setArtStyle(e.target.value)}
                                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                <option value="realistic">Realistic</option>
                                <option value="sculpture">Sculpture</option>
                            </select>
                        </div>
                        
                        {loading && (
                            <div className="mb-6">
                                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
                                    <p className="font-bold">Processing...</p>
                                    <p className="text-sm">{progress}</p>
                                    {taskId && (
                                        <p className="text-xs mt-2">Task ID: {taskId}</p>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                            <button
                                onClick={() => router.push('/')}
                                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300"
                                disabled={loading}
                            >
                                Back
                            </button>
                            
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Generating...' : 'Generate Model'}
                            </button>
                        </div>
                        
                        <div className="mt-6 text-sm text-gray-600">
                            <p className="font-bold mb-2">Tips for better results:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Be specific about the object you want</li>
                                <li>Include details about style, size, or features</li>
                                <li>Generation typically takes 1-2 minutes</li>
                                <li>You can refine the texture after generation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratePage;
