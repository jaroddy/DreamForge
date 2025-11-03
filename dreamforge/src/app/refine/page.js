'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MeshyService from '../services/meshyService';
import ApiService from '../services/apiService';
import { useFileUrl } from '../context/fileUrlContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PreviewComponent = dynamic(() => import('../components/previewComponent'), { ssr: false });

const RefinePage = () => {
    const router = useRouter();
    const { fileData, setFileData } = useFileUrl();
    const [texturePrompt, setTexturePrompt] = useState('');
    const [enablePBR, setEnablePBR] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [costEstimate, setCostEstimate] = useState(null);

    useEffect(() => {
        // Check if we have model data
        if (!fileData?.fileUrl && !fileData?.meshyTaskId) {
            toast.error('No model data found. Please generate a model first.');
            router.push('/generate');
        }
    }, [fileData, router]);

    const handleRefine = async () => {
        if (!fileData?.meshyTaskId) {
            toast.error('No preview task ID found');
            return;
        }

        setRefining(true);
        setLoading(true);

        try {
            const meshyService = new MeshyService();
            
            const refineData = {
                preview_task_id: fileData.meshyTaskId,
                enable_pbr: enablePBR
            };
            
            if (texturePrompt && texturePrompt.trim()) {
                refineData.texture_prompt = texturePrompt.trim();
            }
            
            const result = await meshyService.createRefine(refineData);
            
            if (result.success && result.task_id) {
                toast.info('Refining model texture... This will take 1-2 minutes.');
                
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    toast.success('Model refined successfully!');
                    
                    // Update file data
                    setFileData({
                        ...fileData,
                        fileUrl: completedTask.model_urls?.glb || completedTask.model_urls?.obj || fileData.fileUrl,
                        meshyData: completedTask,
                        textureUrl: completedTask.texture_urls?.base_color || null
                    });
                    
                    setRefining(false);
                    setLoading(false);
                } else {
                    toast.error('Model refinement failed');
                    setRefining(false);
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error refining model:', error);
            toast.error(error.response?.data?.detail || error.message || 'Failed to refine model');
            setRefining(false);
            setLoading(false);
        }
    };

    const handleGetEstimate = async () => {
        if (!fileData?.fileUrl) {
            toast.error('No model URL found');
            return;
        }

        setEstimating(true);

        try {
            const apiService = new ApiService();
            const result = await apiService.estimateCost(fileData.fileUrl);
            
            if (result.success && result.estimate) {
                setCostEstimate(result.estimate);
                setFileData({
                    ...fileData,
                    slicerApiResponse: result.estimate
                });
                toast.success('Cost estimated successfully!');
            }
        } catch (error) {
            console.error('Error estimating cost:', error);
            toast.error('Failed to estimate cost');
        } finally {
            setEstimating(false);
        }
    };

    const handleProceedToPayment = () => {
        if (!costEstimate) {
            toast.error('Please get a cost estimate first');
            return;
        }
        router.push('/preview');
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-white text-center mb-8">
                    Refine Your Model
                </h1>
                
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Preview Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">Preview</h2>
                        
                        {fileData?.fileUrl && (
                            <div className="border-4 border-gray-200 rounded-lg">
                                <PreviewComponent fileURL={fileData.fileUrl} />
                            </div>
                        )}
                        
                        {fileData?.fileUrl && (
                            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                <h3 className="font-bold text-blue-800 mb-2">Model File</h3>
                                <div className="flex items-center space-x-2">
                                    <a 
                                        href={fileData.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-lg transition duration-300 text-sm font-medium"
                                    >
                                        Download GLB File
                                    </a>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(fileData.fileUrl);
                                            toast.success('URL copied to clipboard!');
                                        }}
                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition duration-300 text-sm font-medium"
                                        title="Copy URL to clipboard"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 break-all">
                                    {fileData.fileUrl}
                                </p>
                            </div>
                        )}
                        
                        {costEstimate && (
                            <div className="mt-4 p-4 bg-green-100 rounded-lg">
                                <h3 className="font-bold text-green-800">Cost Estimate</h3>
                                <p className="text-2xl font-bold text-green-600 mt-2">
                                    ${costEstimate.totalPrice || 'N/A'}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Options Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-4">Refinement Options</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">
                                    Texture Description (Optional)
                                </label>
                                <textarea
                                    value={texturePrompt}
                                    onChange={(e) => setTexturePrompt(e.target.value)}
                                    placeholder="e.g., metallic silver finish, wooden texture, colorful paint..."
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="3"
                                    maxLength="600"
                                    disabled={refining}
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    {texturePrompt.length}/600 characters
                                </p>
                            </div>
                            
                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={enablePBR}
                                        onChange={(e) => setEnablePBR(e.target.checked)}
                                        className="w-4 h-4"
                                        disabled={refining}
                                    />
                                    <span className="text-gray-700">
                                        Enable PBR Materials (metallic, roughness, normal maps)
                                    </span>
                                </label>
                            </div>
                            
                            {refining && (
                                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                                    <p className="font-bold">Refining model...</p>
                                    <p className="text-sm">This will take 1-2 minutes</p>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                <button
                                    onClick={handleRefine}
                                    disabled={refining || !fileData?.meshyTaskId}
                                    className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300"
                                >
                                    {refining ? 'Refining...' : 'Refine Texture'}
                                </button>
                                
                                <button
                                    onClick={handleGetEstimate}
                                    disabled={estimating || !fileData?.fileUrl}
                                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300"
                                >
                                    {estimating ? 'Estimating...' : 'Get Cost Estimate'}
                                </button>
                                
                                <button
                                    onClick={handleProceedToPayment}
                                    disabled={!costEstimate}
                                    className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300"
                                >
                                    Proceed to Order
                                </button>
                            </div>
                            
                            <div className="flex justify-between mt-4">
                                <button
                                    onClick={() => router.push('/generate')}
                                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300"
                                    disabled={loading}
                                >
                                    Regenerate
                                </button>
                                
                                <button
                                    onClick={() => router.push('/my-models')}
                                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300"
                                >
                                    My Models
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefinePage;
