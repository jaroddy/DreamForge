'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MeshyService, { getProxiedUrl } from '../services/meshyService';
import ApiService from '../services/apiService';
import { useFileUrl } from '../context/fileUrlContext';
import { useAuth } from '../context/authContext';
import { useConversation } from '../context/conversationContext';
import TokenDisplay from '../components/TokenDisplay';
import AdvancedRefineOptions from '../components/AdvancedRefineOptions';
import ChatWindow from '../components/ChatWindow';
import { ToastContainer, toast } from 'react-toastify';
import { parseErrorMessage, sanitizeFilename } from '../utils/errorHandling';
import 'react-toastify/dist/ReactToastify.css';

const GlbViewer = dynamic(() => import('../components/glbViewer'), { ssr: false });

const RefinePage = () => {
    const router = useRouter();
    const { fileData, setFileData } = useFileUrl();
    const { addTokens } = useAuth();
    const { getAugmentedPrompt } = useConversation();
    const [texturePrompt, setTexturePrompt] = useState('');
    const [enablePBR, setEnablePBR] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [costEstimate, setCostEstimate] = useState(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');
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
            toast.error('No preview task ID found. This model may not support texture refinement.');
            return;
        }

        // Validate that we have something to refine
        if (!texturePrompt.trim() && !enablePBR) {
            toast.error('Please provide a texture description or enable PBR materials');
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
            console.error('Error details:', error.response?.data);
            
            toast.error(parseErrorMessage(error, 'Failed to refine model'));
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

    const handleRegenerateModel = async () => {
        const trimmedPrompt = refinementPrompt?.trim() || '';
        
        if (!trimmedPrompt || trimmedPrompt.length < 3) {
            toast.error('Please enter a refinement prompt (at least 3 characters)');
            return;
        }

        if (trimmedPrompt.length > 600) {
            toast.error('Prompt must be less than 600 characters');
            return;
        }

        setRegenerating(true);
        setLoading(true);

        try {
            const meshyService = new MeshyService();
            
            // Get augmented prompt with conversation context
            const finalPrompt = getAugmentedPrompt(trimmedPrompt);
            
            // Create new preview task with refinement prompt
            const requestData = {
                prompt: finalPrompt,
                art_style: fileData.meshyData?.art_style || 'realistic',
                ai_model: 'meshy-5',
                topology: 'triangle',
                target_polycount: 30000,
                should_remesh: true
            };
            
            const result = await meshyService.createPreview(requestData);

            if (result.success && result.task_id) {
                // Calculate and add tokens
                addTokens(5);
                
                toast.info('Regenerating model with your refinements... This will take 1-2 minutes.');
                
                // Poll for completion
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    toast.success('Model regenerated successfully!');
                    
                    // Update file data with new model
                    const modelUrl = completedTask.model_urls?.glb || completedTask.model_urls?.obj || '';
                    setFileData({
                        fileUrl: getProxiedUrl(modelUrl),
                        meshyTaskId: result.task_id,
                        meshyData: completedTask,
                        filename: `${sanitizeFilename(refinementPrompt)}.glb`,
                        isMeshyModel: true
                    });
                    
                    // Clear cost estimate as model changed
                    setCostEstimate(null);
                    setRefinementPrompt('');
                    setRegenerating(false);
                    setLoading(false);
                } else {
                    toast.error('Model regeneration failed');
                    setRegenerating(false);
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error regenerating model:', error);
            console.error('Error details:', error.response?.data);
            
            toast.error(parseErrorMessage(error, 'Failed to regenerate model'));
            setRegenerating(false);
            setLoading(false);
        }
    };

    const handleGenerateIdeaFromChat = async (condensedPrompt) => {
        if (!condensedPrompt || condensedPrompt.trim().length < 3) {
            toast.error('Generated prompt is too short');
            return;
        }

        if (condensedPrompt.length > 600) {
            // Truncate if still too long
            condensedPrompt = condensedPrompt.substring(0, 600);
        }

        setRegenerating(true);
        setLoading(true);

        try {
            const meshyService = new MeshyService();
            
            // Get augmented prompt with conversation context
            const finalPrompt = getAugmentedPrompt(condensedPrompt.trim());
            
            // Create new preview task
            const requestData = {
                prompt: finalPrompt,
                art_style: fileData.meshyData?.art_style || 'realistic',
                ai_model: 'meshy-5',
                topology: 'triangle',
                target_polycount: 30000,
                should_remesh: true
            };
            
            const result = await meshyService.createPreview(requestData);

            if (result.success && result.task_id) {
                // Calculate and add tokens
                addTokens(5);
                
                toast.info('Generating model from chat idea... This will take 1-2 minutes.');
                
                // Poll for completion
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    toast.success('Model generated successfully from chat!');
                    
                    // Update file data with new model
                    const modelUrl = completedTask.model_urls?.glb || completedTask.model_urls?.obj || '';
                    setFileData({
                        fileUrl: getProxiedUrl(modelUrl),
                        meshyTaskId: result.task_id,
                        meshyData: completedTask,
                        filename: `${sanitizeFilename(condensedPrompt)}.glb`,
                        isMeshyModel: true
                    });
                    
                    // Clear cost estimate as model changed
                    setCostEstimate(null);
                    setRegenerating(false);
                    setLoading(false);
                } else {
                    toast.error('Model generation failed');
                    setRegenerating(false);
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error generating model from chat:', error);
            console.error('Error details:', error.response?.data);
            
            toast.error(parseErrorMessage(error, 'Failed to generate model from chat'));
            setRegenerating(false);
            setLoading(false);
        }
    };

    const handlePurchaseTokens = async () => {
        try {
            const apiService = new ApiService();
            
            // Create a checkout session for 200 credits at $10
            const amount = 1000; // $10 in cents
            const description = '200 DreamForge Credits';
            const metadata = {
                credits: 200,
                type: 'token_purchase'
            };
            
            // Construct success URL with token_purchase flag
            const successUrl = `${window.location.origin}/success?token_purchase=true&session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${window.location.origin}/refine?canceled=true`;
            
            const result = await apiService.createCheckoutSession(
                amount, 
                description, 
                'usd', 
                metadata,
                successUrl,
                cancelUrl
            );
            
            if (result.success && result.url) {
                // Open Stripe checkout in a new tab so users can keep their session
                window.open(result.url, '_blank');
                toast.info('Payment page opened in new tab. Complete the payment to receive 200 tokens.');
            } else {
                toast.error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            toast.error('Failed to initiate token purchase');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100 transition-opacity duration-500">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            <TokenDisplay />
            
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-white text-center mb-8 animate-fadeIn">
                    Refine Your Model
                </h1>
                
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Refinement Options - 1/5 width on large screens, left side */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideUp">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">Refinement Options</h2>
                        
                                <div className="space-y-6">
                                    {/* Purchase Tokens Section */}
                                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800">💳 Purchase Credits</h3>
                                        <p className="text-xs text-gray-600 mb-3">
                                            Get 200 credits for $10 to continue generating and refining models.
                                        </p>
                                        <button
                                            onClick={handlePurchaseTokens}
                                            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-300 font-bold shadow-md text-sm"
                                        >
                                            💳 Purchase 200 Credits - $10
                                        </button>
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className="border-t-2 border-gray-200 my-4"></div>
                                    
                                    {/* Regenerate Model Section */}
                                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800">🔄 Regenerate Model</h3>
                                        <p className="text-xs text-gray-600 mb-3">
                                            Describe improvements or modifications.
                                        </p>
                                        <textarea
                                            value={refinementPrompt}
                                            onChange={(e) => setRefinementPrompt(e.target.value)}
                                            placeholder="e.g., make it bigger, add more details..."
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 text-sm"
                                            rows="3"
                                            maxLength="600"
                                            disabled={regenerating}
                                        />
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs text-gray-500">
                                                {refinementPrompt.length}/600
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRegenerateModel}
                                            disabled={regenerating || !refinementPrompt.trim()}
                                            className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md text-sm"
                                        >
                                            {regenerating ? 'Regenerating...' : '🔄 Regenerate'}
                                        </button>
                                        {regenerating && (
                                            <div className="mt-2 bg-purple-100 border border-purple-400 text-purple-700 px-3 py-2 rounded-lg">
                                                <p className="font-bold text-xs">Regenerating...</p>
                                                <p className="text-xs">1-2 mins. Cost: 5 tokens</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t-2 border-gray-200 my-4"></div>

                                    {/* Texture Refinement Section */}
                                    <div>
                                        <h3 className="text-lg font-bold mb-2 text-gray-800">🎨 Refine Texture</h3>
                                        <label className="block text-gray-700 font-bold mb-2 text-sm">
                                            Texture Description (Optional)
                                        </label>
                                        <textarea
                                            value={texturePrompt}
                                            onChange={(e) => setTexturePrompt(e.target.value)}
                                            placeholder="e.g., metallic silver finish..."
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            rows="3"
                                            maxLength="600"
                                            disabled={refining}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {texturePrompt.length}/600
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
                                            <span className="text-gray-700 font-medium text-sm">
                                                Enable PBR Materials
                                            </span>
                                        </label>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <AdvancedRefineOptions
                                            options={advancedOptions}
                                            onChange={setAdvancedOptions}
                                            disabled={refining}
                                        />
                                    </div>
                                    
                                    {refining && (
                                        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded-lg">
                                            <p className="font-bold text-xs">Refining...</p>
                                            <p className="text-xs">1-2 mins. Cost: 15 tokens</p>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={handleRefine}
                                            disabled={refining || !fileData?.meshyTaskId}
                                            className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md text-sm"
                                        >
                                            {refining ? 'Refining...' : '✨ Refine Texture'}
                                        </button>
                                        
                                        <button
                                            onClick={handleGetEstimate}
                                            disabled={estimating || !fileData?.fileUrl}
                                            className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md text-sm"
                                        >
                                            {estimating ? 'Estimating...' : '💰 Get Estimate'}
                                        </button>
                                        
                                        <button
                                            onClick={handleProceedToPayment}
                                            disabled={!costEstimate}
                                            className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-300 disabled:bg-gray-300 font-bold shadow-md text-sm"
                                        >
                                            🛒 Place Order
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between pt-4 border-t gap-2">
                                        <button
                                            onClick={() => router.push('/generate')}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300 font-medium text-sm"
                                            disabled={loading}
                                        >
                                            ← Start Over
                                        </button>
                                        
                                        <button
                                            onClick={() => router.push('/my-models')}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300 font-medium text-sm"
                                        >
                                            📁 My Models
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Main content - Model Preview - 3/5 width on large screens, wider and taller */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 animate-slideIn">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">3D Model</h2>
                                {costEstimate && (
                                    <div className="bg-green-100 px-4 py-2 rounded-lg">
                                        <p className="text-xs text-green-700 font-medium">Estimated Cost</p>
                                        <p className="text-lg font-bold text-green-600">
                                            ${costEstimate.totalPrice || 'N/A'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {fileData?.fileUrl && (
                                <div className="border-4 border-gray-200 rounded-xl overflow-hidden shadow-inner" style={{ height: 'calc(100vh - 20rem)' }}>
                                    <GlbViewer fileURL={fileData.fileUrl} width="100%" height="100%" />
                                </div>
                            )}
                            
                            {fileData?.fileUrl && (
                                <div className="mt-4 flex flex-col space-y-2">
                                    <a 
                                        href={fileData.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-center rounded-lg transition duration-300 font-medium shadow-md text-sm"
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
                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition duration-300 font-medium shadow-md text-sm"
                                        title="Copy URL to clipboard"
                                    >
                                        📋 Copy URL
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Chat Sidebar - 1/5 width on large screens, right side */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8" style={{ height: 'calc(100vh - 8rem)' }}>
                            <ChatWindow 
                                onGenerateIdea={handleGenerateIdeaFromChat}
                                isModal={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefinePage;
