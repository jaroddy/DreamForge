# ChatGPT Integration

## Overview
The ChatGPT integration allows users to have interactive conversations about their 3D models. The assistant helps users refine their ideas and provides a more engaging experience.

## Architecture

### Backend API Route
The ChatGPT integration now uses a secure backend API route at `/api/chat` to handle all OpenAI API calls. This protects the API key from being exposed in the frontend code.

**Location:** `pages/api/chat.js`

### Frontend Component
The ChatWindow component provides the user interface for the chat functionality.

**Location:** `src/app/components/ChatWindow.js`

### Conversation Context
The conversation state is managed globally using React Context.

**Location:** `src/app/context/conversationContext.js`

## Configuration

### Environment Variables
Add your OpenAI API key to your `.env.local` file:

```bash
# Recommended for production (server-side only)
OPENAI_API_KEY=sk-...your-key-here

# For backwards compatibility (can be accessed from client-side)
NEXT_PUBLIC_OPENAI_API_KEY=sk-...your-key-here
```

The API route will check for `OPENAI_API_KEY` first, then fall back to `NEXT_PUBLIC_OPENAI_API_KEY` if not found.

## Logging

Comprehensive logging has been added throughout the ChatGPT integration to help with debugging:

### Log Prefixes
- `[ChatWindow]` - Frontend component logs
- `[ConversationContext]` - Context state management logs
- `[ChatGPT API]` - Backend API route logs

### What's Logged

#### Frontend (ChatWindow)
- Component mount/unmount events
- Message sending with preview (first 50 characters)
- API request timing
- API response status and data
- Error details with stack traces

#### Backend (API Route)
- Request receipt with message count
- API key validation
- OpenAI API request timing
- Response status and data
- Error details with full context

#### Context (ConversationContext)
- Message additions with role and preview
- Conversation clearing with message count

### Viewing Logs
Open your browser's Developer Console (F12) to view all logs in real-time:
- Chrome/Edge: F12 → Console tab
- Firefox: F12 → Console tab
- Safari: Cmd+Option+I → Console tab

For server-side logs (API route), check your terminal/console where the Next.js development server is running.

## Troubleshooting

### Duplicate Greeting Message
**Fixed:** The greeting message should now only appear once when opening the chat window. The useEffect hook now depends only on `hasGreeted` state instead of both `hasGreeted` and `messages.length`.

### API Errors
Check the console logs for detailed error messages. Common issues:
- **API key not configured**: Add your OpenAI API key to `.env.local`
- **Invalid API key**: Verify your API key is correct
- **Rate limiting**: You may have exceeded OpenAI's rate limits
- **Network errors**: Check your internet connection

### Logs Show What's Happening
With the comprehensive logging in place, you can:
1. See exactly when messages are sent and received
2. Track API request/response timing
3. Identify specific error messages and stack traces
4. Verify the greeting message is only added once
5. Monitor conversation state changes

## API Response Format

The `/api/chat` endpoint returns:

```json
{
  "message": "The assistant's response text",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 45,
    "total_tokens": 168
  }
}
```

Error responses:
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

## Security

- API key is stored server-side and never exposed to the client
- CORS headers are properly configured
- Input validation on all requests
- Error messages don't expose sensitive information
