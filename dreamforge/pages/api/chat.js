export default async function handler(req, res) {
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.log('[ChatGPT API] Invalid request method:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;
        
        console.log('[ChatGPT API] Received chat request with', messages?.length || 0, 'messages');
        
        if (!messages || !Array.isArray(messages)) {
            console.error('[ChatGPT API] Invalid request body - messages must be an array');
            return res.status(400).json({ error: 'Invalid request body - messages must be an array' });
        }

        const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        
        if (!apiKey || apiKey === 'your_openai_api_key_here') {
            console.error('[ChatGPT API] OpenAI API key not configured');
            return res.status(500).json({ 
                error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
            });
        }

        console.log('[ChatGPT API] Making request to OpenAI API...');
        const startTime = Date.now();

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
                    ...messages
                ],
                temperature: 0.8,
                max_tokens: 150
            })
        });

        const elapsed = Date.now() - startTime;
        console.log('[ChatGPT API] OpenAI API response received in', elapsed, 'ms, status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ChatGPT API] OpenAI API error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.statusText}`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log('[ChatGPT API] OpenAI API response parsed successfully');

        // Validate response structure
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
            console.error('[ChatGPT API] Invalid response structure from OpenAI:', data);
            return res.status(500).json({ 
                error: 'Invalid response from OpenAI API',
                details: 'Response missing expected fields'
            });
        }

        const assistantMessage = data.choices[0].message.content;
        console.log('[ChatGPT API] Successfully generated response, length:', assistantMessage.length, 'characters');

        return res.status(200).json({
            message: assistantMessage,
            usage: data.usage
        });

    } catch (error) {
        console.error('[ChatGPT API] Unexpected error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return res.status(500).json({ 
            error: 'Failed to process chat request',
            details: error.message
        });
    }
}
