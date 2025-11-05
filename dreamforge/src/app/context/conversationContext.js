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
        setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
    }, []);
    
    const clearConversation = useCallback(() => {
        setMessages([]);
    }, []);
    
    const getConversationText = useCallback(() => {
        return messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'ChatGPT'}: ${msg.content}`)
            .join('\n\n');
    }, [messages]);
    
    const getAugmentedPrompt = useCallback((basePrompt) => {
        // Compute conversation text inline to avoid dependency on getConversationText
        let conversationText = messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'ChatGPT'}: ${msg.content}`)
            .join('\n\n');
        
        if (!conversationText) {
            return basePrompt;
        }
        
        // Trim conversation text to stay within 600 character limit
        if (conversationText.length > MAX_CONVERSATION_LENGTH) {
            // Truncate at word boundary for better readability
            const truncated = conversationText.substring(0, MAX_CONVERSATION_LENGTH);
            const lastSpaceIndex = truncated.lastIndexOf(' ');
            conversationText = (lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated) + '...';
        }
        
        if (artisticMode) {
            return `${basePrompt}\n\nPlease use the conversation below to form an artistic understanding of the user and how they are feeling, and express that as a beautiful and professionally created 3D model that represents them:\n\n${conversationText}`;
        } else {
            return `${basePrompt}\n\nPlease use the conversation below to form a better understanding of the model that you should be supplying, and based on that conversation amend the model:\n\n${conversationText}`;
        }
    }, [messages, artisticMode]);
    
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
