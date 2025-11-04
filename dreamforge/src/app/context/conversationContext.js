'use client'
import React, { createContext, useState, useContext } from 'react';

const ConversationContext = createContext();

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
    
    const addMessage = (role, content) => {
        setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
    };
    
    const clearConversation = () => {
        setMessages([]);
    };
    
    const getConversationText = () => {
        return messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'ChatGPT'}: ${msg.content}`)
            .join('\n\n');
    };
    
    const getAugmentedPrompt = (basePrompt) => {
        const conversationText = getConversationText();
        
        if (!conversationText) {
            return basePrompt;
        }
        
        if (artisticMode) {
            return `${basePrompt}\n\nPlease use the conversation below to form an artistic understanding of the user and how they are feeling, and express that as a beautiful and professionally created 3D model that represents them:\n\n${conversationText}`;
        } else {
            return `${basePrompt}\n\nPlease use the conversation below to form a better understanding of the model that you should be supplying, and based on that conversation amend the model:\n\n${conversationText}`;
        }
    };
    
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
