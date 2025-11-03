'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MeshyService from '../services/meshyService';
import { useFileUrl } from '../context/fileUrlContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FILENAME_MAX_LENGTH = 30;

const MyModelsPage = () => {
    const router = useRouter();
    const { setFileData } = useFileUrl();
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageNum, setPageNum] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        loadModels();
    }, [pageNum]);

    const loadModels = async () => {
        setLoading(true);
        try {
            const meshyService = new MeshyService();
            const result = await meshyService.listTasks(pageNum, pageSize);
            
            if (result.success && result.tasks) {
                setModels(result.tasks);
            }
        } catch (error) {
            console.error('Error loading models:', error);
            toast.error('Failed to load models');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectModel = async (model) => {
        try {
            // If model is not succeeded, fetch latest status
            if (model.status !== 'SUCCEEDED') {
                const meshyService = new MeshyService();
                const taskData = await meshyService.getTask(model.task_id);
                
                if (taskData.status === 'SUCCEEDED') {
                    const modelUrl = taskData.model_urls?.glb || taskData.model_urls?.obj || '';
                    setFileData({
                        fileUrl: modelUrl,
                        meshyTaskId: model.task_id,
                        meshyData: taskData,
                        filename: `${model.prompt?.substring(0, FILENAME_MAX_LENGTH).replace(/\s+/g, '_') || 'model'}.glb`,
                        isMeshyModel: true
                    });
                    router.push('/refine');
                } else if (taskData.status === 'PENDING' || taskData.status === 'IN_PROGRESS') {
                    toast.info('Model is still being generated. Please wait...');
                } else {
                    toast.error('Model generation failed');
                }
            } else {
                // Model is ready, use it
                setFileData({
                    fileUrl: model.model_url,
                    meshyTaskId: model.task_id,
                    filename: `${model.prompt?.substring(0, FILENAME_MAX_LENGTH).replace(/\s+/g, '_') || 'model'}.glb`,
                    isMeshyModel: true
                });
                router.push('/refine');
            }
        } catch (error) {
            console.error('Error selecting model:', error);
            toast.error('Failed to load model');
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'SUCCEEDED':
                return 'bg-green-100 text-green-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            case 'PENDING':
            case 'IN_PROGRESS':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100">
            <ToastContainer position={toast.POSITION.TOP_RIGHT} />
            
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold text-white">
                            My 3D Models
                        </h1>
                        
                        <div className="space-x-4">
                            <button
                                onClick={() => router.push('/generate')}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-300"
                            >
                                Generate New Model
                            </button>
                            
                            <button
                                onClick={() => router.push('/')}
                                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-300"
                            >
                                Home
                            </button>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-white text-xl">Loading models...</div>
                        </div>
                    ) : models.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                            <p className="text-gray-600 text-xl mb-6">
                                You haven't generated any models yet.
                            </p>
                            <button
                                onClick={() => router.push('/generate')}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-300"
                            >
                                Generate Your First Model
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {models.map((model) => (
                                    <div
                                        key={model.task_id}
                                        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 cursor-pointer"
                                        onClick={() => handleSelectModel(model)}
                                    >
                                        <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                            {model.status === 'SUCCEEDED' && model.model_url ? (
                                                <div className="text-white text-6xl">🎨</div>
                                            ) : (
                                                <div className="text-white text-6xl">⏳</div>
                                            )}
                                        </div>
                                        
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(model.status)}`}>
                                                    {model.status}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {model.task_type}
                                                </span>
                                            </div>
                                            
                                            <p className="text-gray-800 font-medium mb-2 line-clamp-2">
                                                {model.prompt || 'No description'}
                                            </p>
                                            
                                            {model.status === 'SUCCEEDED' && model.model_url && (
                                                <div className="mb-2">
                                                    <a
                                                        href={model.model_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                    >
                                                        📥 Download GLB
                                                    </a>
                                                </div>
                                            )}
                                            
                                            <p className="text-xs text-gray-500">
                                                Created: {formatDate(model.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Pagination */}
                            <div className="flex justify-center items-center space-x-4 mt-8">
                                <button
                                    onClick={() => setPageNum(Math.max(1, pageNum - 1))}
                                    disabled={pageNum === 1}
                                    className="px-4 py-2 bg-white text-blue-500 rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
                                >
                                    Previous
                                </button>
                                
                                <span className="text-white font-bold">
                                    Page {pageNum}
                                </span>
                                
                                <button
                                    onClick={() => setPageNum(pageNum + 1)}
                                    disabled={models.length < pageSize}
                                    className="px-4 py-2 bg-white text-blue-500 rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyModelsPage;
