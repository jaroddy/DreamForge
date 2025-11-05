/**
 * Parse and format error messages from API responses
 * @param {Error} error - The error object from the API call
 * @param {string} defaultMessage - Default message if parsing fails
 * @returns {string} - Formatted error message
 */
export const parseErrorMessage = (error, defaultMessage = 'An error occurred') => {
    if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        if (typeof detail === 'string') {
            return detail;
        }
        
        if (Array.isArray(detail)) {
            return detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
        }
    }
    
    if (error.message) {
        return error.message;
    }
    
    return defaultMessage;
};

/**
 * Sanitize a string to be used as a filename
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum length of the filename (default 30)
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (input, maxLength = 30) => {
    if (!input) return 'model';
    
    // Trim and truncate
    let filename = input.trim().substring(0, maxLength);
    
    // Replace invalid filename characters with underscores
    // This includes: < > : " / \ | ? * and ASCII control characters (0x00-0x1F)
    filename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Replace multiple spaces with single underscore
    filename = filename.replace(/\s+/g, '_');
    
    // Remove leading/trailing underscores and dots
    filename = filename.replace(/^[._]+|[._]+$/g, '');
    
    // Ensure filename is not empty after sanitization
    if (!filename) return 'model';
    
    // Handle reserved names on Windows
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                     'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                     'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    
    if (reserved.includes(filename.toUpperCase())) {
        filename = '_' + filename;
    }
    
    return filename;
};
