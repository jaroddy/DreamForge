'use client'
import React, { createContext, useState, useContext, useCallback } from 'react';

const ConversationContext = createContext();

// Maximum length for conversation text in augmented prompts to stay within 600 char limit
const MAX_CONVERSATION_LENGTH = 200;

export const useConversation = () => {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error('useConversation must be used within a ConversationProvider');
    }
    return context;
};

export const ConversationProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [artisticMode, setArtisticMode] = useState(false);
    
    const addMessage = useCallback((role, content) => {
        console.log('[ConversationContext] Adding message:', { 
            role, 
            contentLength: content.length,
            preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        });
        setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
    }, []);
    
    const clearConversation = useCallback(() => {
        setMessages(prev => {
            console.log('[ConversationContext] Clearing conversation, previous message count:', prev.length);
            return [];
        });
    }, []);
    
    const getConversationText = useCallback(() => {
        return messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'ChatGPT'}: ${msg.content}`)
            .join('\n\n');
    }, [messages]);
    
    const getAugmentedPrompt = useCallback((basePrompt) => {
        // According to the problem statement, we should NOT amend prompts sent to Meshy
        // The prompt should be limited to 600 characters total without any augmentation
        console.log('[ConversationContext] Using base prompt only (no augmentation) for Meshy');
        
        // Ensure the prompt is within 600 character limit
        let finalPrompt = basePrompt;
        if (finalPrompt.length > 600) {
            console.log('[ConversationContext] Prompt exceeds 600 characters, truncating from', finalPrompt.length, 'to 600');
            finalPrompt = finalPrompt.substring(0, 600).trim();
        }
        
        return finalPrompt;
    }, []);
    
    return (
        <ConversationContext.Provider value={{ 
            messages, 
            addMessage, 
            clearConversation, 
            getConversationText,
            getAugmentedPrompt,
            artisticMode,
            setArtisticMode
        }}>
            {children}
        </ConversationContext.Provider>
    );
};
