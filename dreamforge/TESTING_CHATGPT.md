# Testing Guide for ChatGPT Integration Fixes

## Overview
This document outlines how to test the fixes made to the ChatGPT integration.

## Prerequisites
1. Set up your OpenAI API key in `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the browser Developer Console (F12) to view logs

## Test Cases

### Test 1: Duplicate Greeting Message (FIXED)
**Issue:** Greeting message was appearing twice in the Chat Assistant

**Steps to Test:**
1. Navigate to the Generate or Refine page
2. Click to open the Chat Assistant
3. Observe the greeting message
4. Check the console for `[ChatWindow] Adding initial greeting message`

**Expected Result:**
- ✅ Greeting message should appear ONLY ONCE
- ✅ Console should show the greeting log ONLY ONCE
- ✅ Console should show `[ChatWindow] Component mounted, current messages count: 0`

**What Was Fixed:**
- Changed useEffect dependency from `[hasGreeted, messages.length]` to `[hasGreeted]`
- This prevents the effect from running multiple times when messages change

### Test 2: ChatGPT API Call Logging
**Issue:** No logging for debugging ChatGPT calls

**Steps to Test:**
1. Open Chat Assistant
2. Send a message (e.g., "I want to create a spaceship")
3. Watch the console logs

**Expected Result:**
You should see comprehensive logging with clear prefixes:

**Frontend Logs (`[ChatWindow]`):**
```
[ChatWindow] Component mounted, current messages count: 1
[ChatWindow] Sending user message: I want to create a spaceship
[ChatWindow] Calling backend API with 2 messages
[ChatWindow] API response received in XXX ms, status: 200
[ChatWindow] API response data received: {messageLength: XX, usage: {...}}
[ChatWindow] Adding assistant response to chat
[ChatWindow] Message sending complete
```

**Backend Logs (`[ChatGPT API]`):**
Check your terminal where the dev server is running:
```
[ChatGPT API] Received chat request with 2 messages
[ChatGPT API] Making request to OpenAI API...
[ChatGPT API] OpenAI API response received in XXX ms, status: 200
[ChatGPT API] OpenAI API response parsed successfully
[ChatGPT API] Successfully generated response, length: XX characters
```

**Context Logs (`[ConversationContext]`):**
```
[ConversationContext] Adding message: {role: 'user', contentLength: XX, preview: '...'}
[ConversationContext] Adding message: {role: 'assistant', contentLength: XX, preview: '...'}
```

### Test 3: API Error Handling
**Issue:** ChatGPT integration keeps encountering errors without details

**Steps to Test:**

#### Test 3a: Missing API Key
1. Remove or comment out `OPENAI_API_KEY` in `.env.local`
2. Restart the dev server
3. Try to send a chat message

**Expected Result:**
- ✅ User-friendly error message in chat
- ✅ Console shows: `[ChatGPT API] OpenAI API key not configured`
- ✅ Detailed error in backend console

#### Test 3b: Invalid API Key
1. Set `OPENAI_API_KEY=sk-invalid-key` in `.env.local`
2. Restart the dev server
3. Try to send a chat message

**Expected Result:**
- ✅ Error message in chat
- ✅ Console shows full error details with status code
- ✅ Backend logs show OpenAI API error response

#### Test 3c: Network Error
1. Disconnect from the internet
2. Try to send a chat message

**Expected Result:**
- ✅ Generic error message to user
- ✅ Console shows detailed error with stack trace
- ✅ Logs show: `[ChatWindow] Error in sendMessage:`

### Test 4: Backend API Route Security
**What Was Fixed:**
- API key is now stored server-side only
- Removed unnecessary CORS headers
- Added comprehensive input validation

**Steps to Verify:**
1. Open DevTools → Network tab
2. Send a chat message
3. Inspect the `/api/chat` request

**Expected Result:**
- ✅ No API key visible in request headers or body
- ✅ Request goes to `/api/chat` (not directly to OpenAI)
- ✅ Response contains only the message, not the full OpenAI response

### Test 5: Conversation Persistence
**Steps to Test:**
1. Open Chat Assistant
2. Send multiple messages
3. Close Chat Assistant
4. Reopen Chat Assistant

**Expected Result:**
- ✅ Previous messages should still be visible
- ✅ Only ONE greeting message at the top (not duplicated)
- ✅ Console shows: `[ChatWindow] Component mounted, current messages count: X`

### Test 6: Clear Conversation
**Steps to Test:**
1. Send some messages in the chat
2. Clear the conversation (if implemented) or navigate away and back
3. Check console logs

**Expected Result:**
- ✅ Console shows: `[ConversationContext] Clearing conversation, previous message count: X`
- ✅ Messages are cleared properly

## Success Criteria
All tests should pass with:
- ✅ No duplicate greeting messages
- ✅ Comprehensive logging visible in console
- ✅ Clear error messages when issues occur
- ✅ API key protected on backend
- ✅ Detailed timing information for debugging

## Troubleshooting

If tests fail:
1. Check that you restarted the dev server after changing `.env.local`
2. Clear browser cache and refresh
3. Check console for any errors
4. Verify Node.js version is compatible with Next.js 14
5. Ensure all dependencies are installed (`npm install`)

## Additional Notes
- All logging uses clear prefixes for easy filtering
- Server-side logs appear in the terminal
- Client-side logs appear in the browser console
- Timing information helps identify performance issues
