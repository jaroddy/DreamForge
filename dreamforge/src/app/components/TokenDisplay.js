'use client'
import React from 'react';
import { useAuth } from '../context/authContext';

const TokenDisplay = () => {
    const { userTokens } = useAuth();

    return (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-lg p-4 z-40 border-2 border-blue-200">
            <div className="flex items-center space-x-2">
                <div className="text-2xl">🪙</div>
                <div>
                    <p className="text-xs text-gray-600 font-medium">Tokens Remaining</p>
                    <p className="text-2xl font-bold text-blue-600">{userTokens}</p>
                </div>
            </div>
        </div>
    );
};

export default TokenDisplay;
