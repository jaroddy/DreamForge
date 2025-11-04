'use client'
import React, { createContext, useState, useContext } from 'react';

const TokenContext = createContext();

export const useTokens = () => {
    const context = useContext(TokenContext);
    if (!context) {
        throw new Error('useTokens must be used within a TokenProvider');
    }
    return context;
};

export const TokenProvider = ({ children }) => {
    const [totalTokens, setTotalTokens] = useState(0);
    
    const addTokens = (amount) => {
        setTotalTokens(prev => prev + amount);
    };
    
    const resetTokens = () => {
        setTotalTokens(0);
    };
    
    return (
        <TokenContext.Provider value={{ totalTokens, addTokens, resetTokens }}>
            {children}
        </TokenContext.Provider>
    );
};
