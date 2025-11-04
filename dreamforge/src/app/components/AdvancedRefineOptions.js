'use client'
import React, { useState } from 'react';

const AdvancedRefineOptions = ({ options, onChange, disabled }) => {
    const [expanded, setExpanded] = useState(false);

    const handleChange = (key, value) => {
        onChange({ ...options, [key]: value });
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center transition duration-200"
                disabled={disabled}
            >
                <span className="font-bold text-gray-700">Advanced Refinement Options</span>
                <svg
                    className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {expanded && (
                <div className="p-4 space-y-4 bg-white">
                    {/* AI Model */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Refine AI Model
                        </label>
                        <select
                            value={options.ai_model || 'meshy-5'}
                            onChange={(e) => handleChange('ai_model', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        >
                            <option value="meshy-4">Meshy 4</option>
                            <option value="meshy-5">Meshy 5 (Default)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Model version for texture refinement
                        </p>
                    </div>

                    {/* Texture Image URL */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Texture Image URL (Optional)
                        </label>
                        <input
                            type="text"
                            value={options.texture_image_url || ''}
                            onChange={(e) => handleChange('texture_image_url', e.target.value)}
                            placeholder="https://example.com/image.jpg or data:image/jpeg;base64,..."
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Provide a 2D image to guide texturing (JPG, JPEG, PNG). Will override texture prompt if both are provided.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedRefineOptions;
