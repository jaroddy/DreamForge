'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MeshyService, { getProxiedUrl } from '../services/meshyService';
import { useFileUrl } from '../context/fileUrlContext';
import { useAuth } from '../context/authContext';
import { useConversation } from '../context/conversationContext';
import TokenDisplay from '../components/TokenDisplay';
import AdvancedPreviewOptions from '../components/AdvancedPreviewOptions';
import ChatWindow from '../components/ChatWindow';
import { ToastContainer, toast } from 'react-toastify';
import { parseErrorMessage, sanitizeFilename } from '../utils/errorHandling';
import 'react-toastify/dist/ReactToastify.css';

const FILENAME_MAX_LENGTH = 30;

const GeneratePage = () => {
    const router = useRouter();
    const { setFileData } = useFileUrl();
    const { addTokens } = useAuth();
    const { artisticMode, setArtisticMode, getAugmentedPrompt } = useConversation();
    const [prompt, setPrompt] = useState('');
    const [artStyle, setArtStyle] = useState('realistic');
    const [loading, setLoading] = useState(false);
    const [taskId, setTaskId] = useState(null);
    const [progress, setProgress] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        ai_model: 'meshy-5',
        topology: 'triangle',
        target_polycount: 30000,
        should_remesh: true,
        symmetry_mode: 'auto',
        is_a_t_pose: false
    });

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
            
            // Get augmented prompt if conversation exists
            const finalPrompt = getAugmentedPrompt(prompt.trim());
            
            // Prepare request data with advanced options
            const requestData = {
                prompt: finalPrompt,
                art_style: artStyle,
                ...advancedOptions
            };
            
            // Remove undefined values
            Object.keys(requestData).forEach(key => {
                if (requestData[key] === undefined || requestData[key] === '') {
                    delete requestData[key];
                }
            });
            
            // Create preview task
            const result = await meshyService.createPreview(requestData);

            if (result.success && result.task_id) {
                setTaskId(result.task_id);
                
                // Calculate and add tokens based on model
                const tokenCost = advancedOptions.ai_model === 'latest' ? 20 : 5;
                addTokens(tokenCost);
                
                setProgress('Generating 3D model... This may take 1-2 minutes.');
                
                // Show chat window during generation
                setShowChat(true);
                
                // Poll for completion
                toast.info('Generating your 3D model. This will take 1-2 minutes...');
                
                const completedTask = await meshyService.pollTask(result.task_id);
                
                if (completedTask.status === 'SUCCEEDED') {
                    setShowChat(false); // Close chat when done
                    toast.success('Model generated successfully!');
                    
                    // Store data in context with proxied URLs to fix CORS issues
                    const modelUrl = completedTask.model_urls?.glb || completedTask.model_urls?.obj || '';
                    setFileData({
                        fileUrl: getProxiedUrl(modelUrl),
                        meshyTaskId: result.task_id,
                        meshyData: completedTask,
                        filename: `${sanitizeFilename(prompt, FILENAME_MAX_LENGTH)}.glb`,
                        isMeshyModel: true
                    });
                    
                    // Navigate to refine page with transition
                    setTimeout(() => {
                        router.push('/refine');
                    }, 500);
                } else {
                    setShowChat(false);
                    toast.error('Model generation failed');
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error generating model:', error);
            console.error('Error details:', error.response?.data);
            setShowChat(false);
            
            toast.error(parseErrorMessage(error, 'Failed to generate model'));
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100 transition-opacity duration-500">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            <TokenDisplay />
            
            {showChat && <ChatWindow onClose={() => setShowChat(false)} />}
            
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold text-white text-center mb-8 animate-fadeIn">
                        Generate Your 3D Model
                    </h1>
                    
                    <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideIn">
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
                        
                        <div className="mb-6">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={artisticMode}
                                    onChange={(e) => setArtisticMode(e.target.checked)}
                                    className="w-5 h-5"
                                    disabled={loading}
                                />
                                <div>
                                    <span className="text-gray-700 font-bold">Artistic Mode</span>
                                    <p className="text-xs text-gray-500">
                                        {artisticMode 
                                            ? 'Model will reflect your personality and feelings from conversations'
                                            : 'Conversations will refine the model description'
                                        }
                                    </p>
                                </div>
                            </label>
                        </div>
                        
                        <div className="mb-6">
                            <button
                                onClick={() => setShowChat(true)}
                                className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition duration-200 flex items-center justify-center space-x-2"
                                disabled={loading}
                            >
                                <span>💬</span>
                                <span>Chat to Refine Your Ideas</span>
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <AdvancedPreviewOptions
                                options={advancedOptions}
                                onChange={setAdvancedOptions}
                                disabled={loading}
                            />
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
