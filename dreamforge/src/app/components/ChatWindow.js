'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '../context/conversationContext';

const ChatWindow = ({ onClose, onGenerateIdea, isModal = true }) => {
    const { messages, addMessage } = useConversation();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const [generatingPrompt, setGeneratingPrompt] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        console.log('[ChatWindow] Component mounted, current messages count:', messages.length);
        return () => {
            console.log('[ChatWindow] Component unmounting');
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Send initial greeting only once when component first mounts and there are no messages
        // If messages already exist, we've already greeted in a previous instance
        if (messages.length === 0 && !hasGreeted) {
            console.log('[ChatWindow] Adding initial greeting message');
            setHasGreeted(true);
            const greeting = "Hi! I'd love to learn more about the 3D model you're creating. What inspired you to make this model? Or, if you'd like, we can just chat about how you're doing today!";
            addMessage('assistant', greeting);
        } else if (messages.length > 0 && !hasGreeted) {
            // If there are already messages when this component mounts, mark as greeted
            console.log('[ChatWindow] Messages already exist, skipping greeting');
            setHasGreeted(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        console.log('[ChatWindow] Sending user message:', userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''));
        
        setInput('');
        addMessage('user', userMessage);
        setLoading(true);

        try {
            // Prepare message history for API call
            const messageHistory = [
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                {
                    role: 'user',
                    content: userMessage
                }
            ];

            console.log('[ChatWindow] Calling backend API with', messageHistory.length, 'messages');
            const startTime = Date.now();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messageHistory
                })
            });

            const elapsed = Date.now() - startTime;
            console.log('[ChatWindow] API response received in', elapsed, 'ms, status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[ChatWindow] API error response:', errorData);
                
                if (response.status === 500 && errorData.error?.includes('API key')) {
                    throw new Error("The OpenAI API key hasn't been configured. Please contact support.");
                }
                
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log('[ChatWindow] API response data received:', {
                messageLength: data.message?.length || 0,
                usage: data.usage
            });
            
            // Validate response structure
            if (!data.message) {
                console.error('[ChatWindow] Invalid response structure:', data);
                throw new Error('Invalid response from server');
            }
            
            const assistantMessage = data.message;
            console.log('[ChatWindow] Adding assistant response to chat');
            addMessage('assistant', assistantMessage);
            
        } catch (error) {
            console.error('[ChatWindow] Error in sendMessage:', {
                message: error.message,
                stack: error.stack
            });
            
            const errorMessage = error.message.includes('API key') 
                ? error.message
                : "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.";
            
            addMessage('assistant', errorMessage);
        } finally {
            setLoading(false);
            console.log('[ChatWindow] Message sending complete');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleGenerateIdea = async () => {
        // Get the last assistant message
        const lastAssistantMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'assistant');
        
        if (!lastAssistantMessage) {
            return;
        }

        setGeneratingPrompt(true);
        
        try {
            // Call ChatGPT to condense the idea into a Meshy-compatible prompt
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that converts conversational descriptions into concise 3D model generation prompts. Extract the core design elements and create a clear, descriptive prompt suitable for AI 3D model generation. Keep it under 600 characters and focus on physical attributes, style, and key features.'
                        },
                        {
                            role: 'user',
                            content: `Please convert this conversation snippet into a concise 3D model generation prompt (max 600 characters). Focus on the physical design, style, and key features:\n\n"${lastAssistantMessage.content}"`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate prompt');
            }

            const data = await response.json();
            const condensedPrompt = data.message;

            // Call the parent's generation handler with the condensed prompt
            if (onGenerateIdea) {
                await onGenerateIdea(condensedPrompt);
            }
        } catch (error) {
            console.error('Error generating idea:', error);
            addMessage('assistant', "Sorry, I couldn't generate a model from that idea. Please try describing it differently.");
        } finally {
            setGeneratingPrompt(false);
        }
    };

    const containerClass = isModal 
        ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        : "w-full h-full";
    
    const innerClass = isModal
        ? "bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col"
        : "bg-white rounded-xl shadow-lg w-full h-full flex flex-col";

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                {/* Header */}
                <div className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 ${isModal ? 'rounded-t-2xl' : 'rounded-t-xl'} flex justify-between items-center`}>
                    <div>
                        <h2 className="text-xl font-bold">Chat Assistant</h2>
                        <p className="text-sm opacity-90">Let's talk about your model</p>
                    </div>
                    {isModal && onClose && (
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition duration-200"
                            aria-label="Close chat"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                    msg.role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 text-gray-800 rounded-2xl px-4 py-2">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t p-4">
                    {onGenerateIdea && (
                        <div className="mb-3">
                            <button
                                onClick={handleGenerateIdea}
                                disabled={generatingPrompt || loading || messages.length === 0}
                                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-semibold transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                <span>✨</span>
                                <span>{generatingPrompt ? 'Generating...' : 'Generate This Idea'}</span>
                            </button>
                        </div>
                    )}
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        This conversation will help refine your model generation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
