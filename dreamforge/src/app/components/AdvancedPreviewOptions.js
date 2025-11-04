'use client'
import React, { useState } from 'react';

const AdvancedPreviewOptions = ({ options, onChange, disabled }) => {
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
                <span className="font-bold text-gray-700">Advanced Options</span>
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
                            AI Model
                        </label>
                        <select
                            value={options.ai_model || 'meshy-5'}
                            onChange={(e) => handleChange('ai_model', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        >
                            <option value="meshy-4">Meshy 4</option>
                            <option value="meshy-5">Meshy 5 (Default)</option>
                            <option value="latest">Meshy 6 Preview (20 tokens)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Meshy 6 costs 20 tokens, others cost 5 tokens
                        </p>
                    </div>

                    {/* Topology */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Topology
                        </label>
                        <select
                            value={options.topology || 'triangle'}
                            onChange={(e) => handleChange('topology', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        >
                            <option value="triangle">Triangle (Default)</option>
                            <option value="quad">Quad-dominant</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Mesh structure type
                        </p>
                    </div>

                    {/* Target Polycount */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Target Polycount: {options.target_polycount || 30000}
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="300000"
                            step="1000"
                            value={options.target_polycount || 30000}
                            onChange={(e) => handleChange('target_polycount', parseInt(e.target.value))}
                            className="w-full"
                            disabled={disabled}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>100</span>
                            <span>300,000</span>
                        </div>
                    </div>

                    {/* Remesh */}
                    <div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={options.should_remesh !== false}
                                onChange={(e) => handleChange('should_remesh', e.target.checked)}
                                className="w-4 h-4"
                                disabled={disabled}
                            />
                            <span className="text-sm text-gray-700">
                                Enable Remesh (applies topology and polycount)
                            </span>
                        </label>
                    </div>

                    {/* Symmetry Mode */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Symmetry Mode
                        </label>
                        <select
                            value={options.symmetry_mode || 'auto'}
                            onChange={(e) => handleChange('symmetry_mode', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        >
                            <option value="off">Off</option>
                            <option value="auto">Auto (Default)</option>
                            <option value="on">On</option>
                        </select>
                    </div>

                    {/* A/T Pose */}
                    <div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={options.is_a_t_pose || false}
                                onChange={(e) => handleChange('is_a_t_pose', e.target.checked)}
                                className="w-4 h-4"
                                disabled={disabled}
                            />
                            <span className="text-sm text-gray-700">
                                Generate in A/T Pose (for character models)
                            </span>
                        </label>
                    </div>

                    {/* Seed */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Seed (Optional)
                        </label>
                        <input
                            type="number"
                            value={options.seed || ''}
                            onChange={(e) => handleChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Leave empty for random"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={disabled}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Use same seed to reproduce similar results
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedPreviewOptions;
