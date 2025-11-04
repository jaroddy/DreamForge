'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MeshyService, { getProxiedUrl } from '../services/meshyService';
import ApiService from '../services/apiService';
import { useFileUrl } from '../context/fileUrlContext';
import { useTokens } from '../context/tokenContext';
import { useConversation } from '../context/conversationContext';
import TokenDisplay from '../components/TokenDisplay';
import AdvancedRefineOptions from '../components/AdvancedRefineOptions';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GlbViewer = dynamic(() => import('../components/glbViewer'), { ssr: false });

const RefinePage = () => {
    const router = useRouter();
    const { fileData, setFileData } = useFileUrl();
    const { addTokens } = useTokens();
    const { getAugmentedPrompt } = useConversation();
    const [texturePrompt, setTexturePrompt] = useState('');
    const [enablePBR, setEnablePBR] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [costEstimate, setCostEstimate] = useState(null);
    const [advancedOptions, setAdvancedOptions] = useState({
        ai_model: 'meshy-5'
    });

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
            
            // Get augmented prompt if conversation exists and texturePrompt is provided
            const finalTexturePrompt = texturePrompt && texturePrompt.trim() 
                ? getAugmentedPrompt(texturePrompt.trim())
                : '';
            
            const refineData = {
                preview_task_id: fileData.meshyTaskId,
                enable_pbr: enablePBR,
                ...advancedOptions
            };
            
            if (finalTexturePrompt) {
                refineData.texture_prompt = finalTexturePrompt;
            }
            
            // Remove undefined values
            Object.keys(refineData).forEach(key => {
                if (refineData[key] === undefined || refineData[key] === '') {
                    delete refineData[key];
                }
            });
            
            const result = await meshyService.createRefine(refineData);
            
            if (result.success && result.task_id) {
                // Add 15 tokens for refinement
                addTokens(15);
                
                toast.info('Refining model texture... This will take 1-2 minutes.');
                
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    toast.success('Model refined successfully!');
                    
                    // Update file data with proxied URLs to fix CORS issues
                    const modelUrl = completedTask.model_urls?.glb || completedTask.model_urls?.obj || fileData.fileUrl;
                    setFileData({
                        ...fileData,
                        fileUrl: getProxiedUrl(modelUrl),
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
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100 transition-opacity duration-500">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            <TokenDisplay />
            
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-white text-center mb-8 animate-fadeIn">
                    Refine Your Model
                </h1>
                
                <div className="max-w-7xl mx-auto">
                    {/* Dominant Model Preview */}
                    <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 animate-slideIn">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-gray-800">3D Model Preview</h2>
                            {costEstimate && (
                                <div className="bg-green-100 px-6 py-3 rounded-lg">
                                    <p className="text-sm text-green-700 font-medium">Estimated Cost</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        ${costEstimate.totalPrice || 'N/A'}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {fileData?.fileUrl && (
                            <div className="border-4 border-gray-200 rounded-xl overflow-hidden shadow-inner" style={{ minHeight: '600px' }}>
                                <GlbViewer fileURL={fileData.fileUrl} width="100%" height="600px" />
                            </div>
                        )}
                        
                        {fileData?.fileUrl && (
                            <div className="mt-6 flex items-center space-x-3">
                                <a 
                                    href={fileData.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-lg transition duration-300 font-medium shadow-md"
                                >
                                    📥 Download Model
                                </a>
                                <button
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(fileData.fileUrl);
                                            toast.success('URL copied to clipboard!');
                                        } catch (error) {
                                            console.error('Failed to copy URL:', error);
                                            toast.error('Failed to copy URL. Please copy manually.');
                                        }
                                    }}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition duration-300 font-medium shadow-md"
                                    title="Copy URL to clipboard"
                                >
                                    📋 Copy URL
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Options Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideUp">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Refinement Options</h2>
                        
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
                                        className="w-5 h-5"
                                        disabled={refining}
                                    />
                                    <span className="text-gray-700 font-medium">
                                        Enable PBR Materials (metallic, roughness, normal maps)
                                    </span>
                                </label>
                            </div>
                            
                            <div className="mb-6">
                                <AdvancedRefineOptions
                                    options={advancedOptions}
                                    onChange={setAdvancedOptions}
                                    disabled={refining}
                                />
                            </div>
                            
                            {refining && (
                                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
                                    <p className="font-bold">Refining model...</p>
                                    <p className="text-sm">This will take 1-2 minutes. Cost: 15 tokens</p>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={handleRefine}
                                    disabled={refining || !fileData?.meshyTaskId}
                                    className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md"
                                >
                                    {refining ? 'Refining...' : '✨ Refine Texture'}
                                </button>
                                
                                <button
                                    onClick={handleGetEstimate}
                                    disabled={estimating || !fileData?.fileUrl}
                                    className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md"
                                >
                                    {estimating ? 'Estimating...' : '💰 Get Estimate'}
                                </button>
                                
                                <button
                                    onClick={handleProceedToPayment}
                                    disabled={!costEstimate}
                                    className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md"
                                >
                                    🛒 Place Order
                                </button>
                            </div>
                            
                            <div className="flex justify-between pt-6 border-t">
                                <button
                                    onClick={() => router.push('/generate')}
                                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300 font-medium"
                                    disabled={loading}
                                >
                                    ← Start Over
                                </button>
                                
                                <button
                                    onClick={() => router.push('/my-models')}
                                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300 font-medium"
                                >
                                    📁 My Models
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
