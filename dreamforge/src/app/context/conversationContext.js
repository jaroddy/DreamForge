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
        // Find the last assistant (ChatGPT) message in the conversation
        // We only send the last ChatGPT message to Meshy, not the entire conversation
        const lastAssistantMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.role === 'assistant');
        
        if (!lastAssistantMessage) {
            console.log('[ConversationContext] No assistant message found, using base prompt only');
            return basePrompt;
        }
        
        // Extract only the last assistant message content
        let conversationText = lastAssistantMessage.content;
        console.log('[ConversationContext] Using last assistant message for Meshy:', conversationText.substring(0, 50) + (conversationText.length > 50 ? '...' : ''));
        
        // Trim conversation text to stay within 600 character limit
        if (conversationText.length > MAX_CONVERSATION_LENGTH) {
            // Truncate at word boundary for better readability
            const truncated = conversationText.substring(0, MAX_CONVERSATION_LENGTH);
            const lastSpaceIndex = truncated.lastIndexOf(' ');
            // Use word boundary if found with meaningful content (>10 chars), otherwise use full truncated length
            conversationText = (lastSpaceIndex > 10 ? truncated.substring(0, lastSpaceIndex) : truncated) + '...';
        }
        
        if (artisticMode) {
            return `${basePrompt}\n\nPlease use the following ChatGPT message to form an artistic understanding of the user and how they are feeling, and express that as a beautiful and professionally created 3D model that represents them:\n\n${conversationText}`;
        } else {
            return `${basePrompt}\n\nPlease use the following ChatGPT message to form a better understanding of the model that you should be supplying, and based on that message amend the model:\n\n${conversationText}`;
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
