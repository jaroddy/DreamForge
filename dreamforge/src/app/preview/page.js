// Preview.js
'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFileUrl } from '../context/fileUrlContext';
import { useTokens } from '../context/tokenContext';
import { useConversation } from '../context/conversationContext';
import TokenDisplay from '../components/TokenDisplay';
import ChatWindow from '../components/ChatWindow';
import MeshyService, { getProxiedUrl } from '../services/meshyService';
import { ToastContainer, toast } from 'react-toastify';
import { parseErrorMessage, sanitizeFilename } from '../utils/errorHandling';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';

// Dynamically import the GlbViewer with SSR turned off
const GlbViewer = dynamic(() => import('../components/glbViewer'), { ssr: false });
const PreviewOptions = dynamic(() => import('../components/PreviewOptions'), { ssr: false });

const Preview = () => {
  const router = useRouter();
  const { fileData, setFileData } = useFileUrl();
  const { fileUrl, slicerApiResponse } = fileData;
  const { addTokens } = useTokens();
  const { getAugmentedPrompt } = useConversation();
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    router.push('/payment');
  };

  const handlePrevious = () => {
    router.push('/');
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

    setLoading(true);

    try {
        const meshyService = new MeshyService();
        
        // Get augmented prompt with conversation context
        const finalPrompt = getAugmentedPrompt(condensedPrompt.trim());
        
        // Create new preview task
        const requestData = {
            prompt: finalPrompt,
            art_style: 'realistic',
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
                
                setLoading(false);
            } else {
                toast.error('Model generation failed');
                setLoading(false);
            }
        }
    } catch (error) {
        console.error('Error generating model from chat:', error);
        console.error('Error details:', error.response?.data);
        
        toast.error(parseErrorMessage(error, 'Failed to generate model from chat'));
        setLoading(false);
    }
  };


  return (
    <div className="bg-gradient-to-bl from-blue-500 to-gray-100 min-h-screen transition-opacity duration-500">
      <ToastContainer position={toast.POSITION.TOP_RIGHT} />
      <TokenDisplay />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Review Your Model</h1>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="border-4 border-gray-200 rounded-xl overflow-hidden shadow-inner">
                <GlbViewer fileURL={fileUrl} width="100%" height="400px" />
              </div>

              <PreviewOptions slicerResponse={slicerApiResponse} />

              <div className="flex justify-between w-full mt-6">
                <button
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 transition duration-300 text-white rounded-lg font-medium"
                  onClick={() => router.push('/')}
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 transition duration-300 text-white rounded-lg font-medium"
                  onClick={() => router.push('/payment')}
                  disabled={loading}
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          </div>

          {/* Chat Sidebar - 1/3 width on large screens */}
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

export default Preview;

