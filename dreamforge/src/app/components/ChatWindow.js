'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '../context/conversationContext';

const ChatWindow = ({ onClose }) => {
    const { messages, addMessage } = useConversation();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasGreeted, setHasGreeted] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Send initial greeting if no messages yet
        if (!hasGreeted && messages.length === 0) {
            setHasGreeted(true);
            const greeting = "Hi! I'd love to learn more about the 3D model you're creating. What inspired you to make this model? Or, if you'd like, we can just chat about how you're doing today!";
            addMessage('assistant', greeting);
        }
    }, [hasGreeted, messages.length, addMessage]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        addMessage('user', userMessage);
        setLoading(true);

        try {
            const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
            
            if (!apiKey || apiKey === 'your_openai_api_key_here') {
                addMessage('assistant', "I'm sorry, but the OpenAI API key hasn't been configured yet. Please add your API key to the .env.local file.");
                setLoading(false);
                return;
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a friendly and creative assistant helping users create 3D models. Ask thoughtful questions about their model ideas or engage in casual conversation if they prefer. Be encouraging and helpful. Keep responses concise (2-3 sentences).'
                        },
                        ...messages.map(msg => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response from ChatGPT');
            }

            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;
            addMessage('assistant', assistantMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('assistant', "I'm sorry, I encountered an error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Chat Assistant</h2>
                        <p className="text-sm opacity-90">Let's talk about your model</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition duration-200"
                        aria-label="Close chat"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
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
