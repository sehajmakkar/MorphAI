# MorphAI Phase 1 - Setup and Testing Guide

This guide will walk you through setting up and testing all Phase 1 features locally.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier works)
- A Google Gemini API key

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:

- Next.js 14+
- Supabase client libraries
- Google Generative AI SDK
- PDF parsing library
- TypeScript and Tailwind CSS

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `morphai` (or any name you prefer)
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to you
4. Wait for the project to be created (takes ~2 minutes)

### 2.2 Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2.3 Enable pgvector Extension

1. In Supabase dashboard, go to **SQL Editor**
2. Run this SQL command:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.4 Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify success - you should see "Success. No rows returned"

This creates:

- `projects` table
- `rooms` table
- `documents` table
- `embeddings` table (with vector support)
- `conversations` table
- All necessary indexes and RLS policies

### 2.5 Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `documents`
4. Make it **Public**: No (private bucket)
5. Click **Create bucket**

### 2.6 Set Up Storage Policies

**Option 1: Using SQL Editor (Recommended)**

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/002_storage_policies.sql`
3. Paste and run it

**Option 2: Using Dashboard UI**

1. In the `documents` bucket, go to **Policies**
2. Click **New Policy** → **For full customization**
3. Create policies for INSERT, SELECT, and DELETE (see SQL file for exact policies)

## Step 3: Get API Keys

### 3.1 Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the API key → `GEMINI_API_KEY`

**Note**: The code will try to use `text-embedding-004` model first, and fallback to `embedding-001` if needed. Both models produce 768-dimensional embeddings, but we're storing them as 1536 in the database schema for future compatibility. If you encounter embedding errors, check which models are available in your Google AI Studio.

### 3.2 MurfAI API Key

1. Go to [MurfAI API Dashboard](https://murf.ai/api)
2. Sign up or log in to your MurfAI account
3. Navigate to API settings and create/generate your API key
4. Copy the API key → `MURF_API_KEY`

**Note**: MurfAI is used for high-quality text-to-speech generation for the AI Manager's voice. The API key is stored securely on the server-side only.

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
MURF_API_KEY=your_murf_api_key_here
```

**Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 5: Run the Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000`

## Step 6: Testing Phase 1 Features

### Test 1: Authentication

1. **Sign Up**:

   - Navigate to `http://localhost:3000`
   - You should be redirected to `/auth`
   - Click "Don't have an account? Sign up"
   - Enter an email and password
   - Click "Sign up"
   - Check your email for confirmation link (if email confirmation is enabled)
   - After confirmation, sign in

2. **Sign In**:

   - Enter your email and password
   - Click "Sign in"
   - You should be redirected to `/dashboard`

3. **Sign Out**:
   - Click "Sign out" in the top right
   - You should be redirected to `/auth`

### Test 2: Project Creation

1. **Create a Project**:

   - On the dashboard, click "+ New Project"
   - Enter a project name (e.g., "My First Project")
   - Click "Create"
   - The project should appear in the dashboard

2. **View Projects**:
   - You should see your project card
   - Click on the project card
   - You should navigate to the project's room list page

### Test 3: Room Creation

1. **Create a Room**:

   - In a project, click "+ New Room"
   - Enter a room name (e.g., "Sprint Planning")
   - Click "Create"
   - The room should appear in the list

2. **Navigate to Room**:
   - Click on a room card
   - You should see the room page with document upload section

### Test 4: Document Upload

1. **Prepare Test Files**:

   - Create a test PDF file (or use any PDF)
   - Or create a `.txt` file with some text content
   - Example `.txt` content:

     ```
     Project Requirements Document

     We need to build a new feature for user authentication.
     The feature should support email/password login.
     Deadline: End of Q1 2024.
     ```

2. **Upload Document**:

   - In a room page, find the "Upload Document" section
   - Click "Choose File" and select your test file
   - Click "Upload"
   - Wait for processing (may take 10-30 seconds depending on file size)
   - You should see a success message

3. **Verify Upload**:

   - The document should appear in the "Documents" list below
   - Check that file name, type, size, and upload date are displayed correctly

4. **Verify Database**:
   - Go to Supabase dashboard → **Table Editor**
   - Check `documents` table - you should see your uploaded document
   - Check `embeddings` table - you should see chunks with vector embeddings
   - Each chunk should have an `embedding` column with 1536 dimensions

### Test 5: Vector Search (Optional - Database Query)

You can test the vector similarity search function directly in Supabase:

1. Go to Supabase → **SQL Editor**
2. First, get a test embedding:

```sql
-- Get an embedding ID from your embeddings table
SELECT id, chunk_text FROM embeddings LIMIT 1;
```

3. Use that embedding to search for similar chunks:

```sql
-- Replace 'your_embedding_id' with an actual ID from step 2
SELECT
  e.chunk_text,
  1 - (e.embedding <=> (SELECT embedding FROM embeddings WHERE id = 'your_embedding_id')) AS similarity
FROM embeddings e
WHERE e.id != 'your_embedding_id'
ORDER BY similarity DESC
LIMIT 5;
```

This should return the most similar text chunks.

## Troubleshooting

### Issue: "Unauthorized" errors

**Solution**:

- Check that your Supabase credentials in `.env.local` are correct
- Verify RLS policies are set up correctly
- Make sure you're signed in

### Issue: Document upload fails

**Solution**:

- Check browser console for errors
- Verify `GEMINI_API_KEY` is set correctly
- Check Supabase Storage bucket exists and policies are set
- Verify file size is reasonable (< 10MB recommended)

### Issue: Embeddings not being created

**Solution**:

- Check that `GEMINI_API_KEY` is valid
- Verify pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- Check Supabase logs for errors
- Verify the document text was extracted correctly

### Issue: "Module not found" errors

**Solution**:

- Run `npm install` again
- Delete `node_modules` and `.next` folders, then run `npm install`
- Check Node.js version: `node --version` (should be 18+)

### Issue: Port 3000 already in use

**Solution**:

- Change port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

## Verification Checklist

- [ ] Dependencies installed successfully
- [ ] Supabase project created and configured
- [ ] Database migrations run successfully
- [ ] Storage bucket created with policies
- [ ] Environment variables configured
- [ ] Development server runs without errors
- [ ] Can sign up and sign in
- [ ] Can create projects
- [ ] Can create rooms
- [ ] Can upload documents (PDF/TXT)
- [ ] Documents appear in the UI
- [ ] Embeddings are created in database
- [ ] Vector search function works

## Phase 2: Meeting UI Testing

### Prerequisites for Phase 2

- Phase 1 must be completed and working
- A modern browser with Web Speech API support (Chrome, Edge, or Safari recommended)
- Microphone access permissions enabled
- HTTPS connection (required for microphone access in production; localhost works for development)

### Test 1: Access Meeting Interface

1. **Navigate to Meeting**:

   - Sign in to your account
   - Go to a project → room
   - Click "Start Meeting" button
   - You should see the dual-screen meeting interface

2. **Verify Layout**:
   - **Left Panel**: Should show "Developer View" with conversation area
   - **Right Panel**: Should show "AI Manager" with avatar and response area
   - **Right Sidebar**: Should show "Meeting Notes" with Decisions and Tasks sections
   - **Bottom**: Should show voice controls with microphone button

### Test 2: Voice Controls

1. **Microphone Button**:

   - Click the microphone button at the bottom
   - Browser should prompt for microphone permission
   - Click "Allow" when prompted
   - Button should turn red and show "Listening..." status
   - Visual indicator should show animated pulse

2. **Speech Recognition**:

   - With microphone on, speak clearly: "Hello, this is a test"
   - Wait a few seconds
   - Your speech should appear as a message in the Developer View (left panel)
   - Message should be in a blue/indigo bubble on the right side

3. **Stop Listening**:

   - Click the microphone button again
   - Button should return to indigo color
   - Status should show "Microphone off"
   - Animation should stop

4. **Error Handling**:
   - If microphone is denied, you should see an error message
   - If browser doesn't support speech recognition, you should see a warning
   - Try speaking when microphone is off - nothing should happen

### Test 3: AI Voice Output

1. **AI Response Display**:

   - After speaking, wait for AI response (currently placeholder)
   - AI response should appear in the AI Manager panel (right side)
   - Response should be in a white card/bubble

2. **Text-to-Speech**:

   - When AI responds, you should hear the text being spoken
   - Visual waveform animation should appear during speech
   - Speech should use a natural-sounding voice

3. **Multiple Responses**:
   - Speak multiple times
   - Each response should be spoken in sequence
   - Previous responses should remain visible in the conversation

### Test 4: Meeting Sidebar

1. **Decisions Section**:

   - Currently empty (will be populated in Phase 3)
   - Should show "No decisions yet" message
   - Section should have a green indicator dot

2. **Tasks Section**:

   - Currently empty (will be populated in Phase 4)
   - Should show "No tasks yet" message
   - Section should have a blue indicator dot

3. **Real-time Updates**:
   - Sidebar is set up for real-time updates via Supabase Realtime
   - Will be tested when Phase 3 and 4 add actual data

### Test 5: Conversation Flow

1. **Multiple Messages**:

   - Speak several messages in sequence
   - Each message should appear in chronological order
   - Timestamps should be displayed for each message
   - Conversation should scroll automatically

2. **Message Persistence**:

   - Refresh the page
   - Previous messages should be loaded from database
   - Conversation history should be preserved

3. **Message Roles**:
   - User messages should appear on the right (blue/indigo)
   - AI messages should appear on the left (white/gray)
   - Roles should be clearly distinguishable

### Test 6: Browser Compatibility

1. **Chrome/Edge**:

   - Full support expected
   - Speech recognition should work immediately
   - Text-to-speech should work

2. **Safari**:

   - Should work but may have slight differences
   - May require additional permissions

3. **Firefox**:
   - Speech recognition may not work (not fully supported)
   - Text-to-speech should still work
   - You should see a warning message

### Test 7: Responsive Design

1. **Window Resize**:

   - Resize browser window
   - Layout should adapt appropriately
   - Sidebar may collapse on smaller screens
   - Voice controls should remain accessible

2. **Mobile View** (if applicable):
   - Test on mobile device or mobile view
   - Layout should stack appropriately
   - Touch interactions should work

### Troubleshooting Phase 2

#### Issue: Microphone button doesn't work

**Solution**:

- Check browser console for errors
- Verify microphone permissions in browser settings
- Try refreshing the page
- Ensure you're using Chrome, Edge, or Safari
- Check if microphone is being used by another application

#### Issue: Speech not being recognized

**Solution**:

- Speak clearly and wait a few seconds
- Check microphone volume levels
- Ensure microphone is not muted
- Try speaking in a quieter environment
- Check browser console for recognition errors

#### Issue: No AI voice output

**Solution**:

- Check browser console for errors
- Verify text-to-speech is enabled in browser settings
- Try a different browser
- Check system volume

#### Issue: Messages not appearing

**Solution**:

- Check browser console for errors
- Verify Supabase connection
- Check network tab for API errors
- Ensure you're signed in

#### Issue: Sidebar not updating

**Solution**:

- This is expected in Phase 2 (no data yet)
- Real-time updates will work in Phase 3 and 4
- Check Supabase Realtime is enabled in your project

### Phase 2 Verification Checklist

- [ ] Can access meeting interface from room page
- [ ] Dual-screen layout displays correctly
- [ ] Microphone button toggles on/off
- [ ] Browser prompts for microphone permission
- [ ] Speech is recognized and appears as message
- [ ] AI responses appear in AI Manager panel
- [ ] Text-to-speech works for AI responses
- [ ] Visual indicators show listening/speaking states
- [ ] Sidebar displays (even if empty)
- [ ] Messages persist after page refresh
- [ ] Conversation history loads correctly
- [ ] Layout is responsive

### Phase 2 Notes

- **Current AI Responses**: Phase 2 uses placeholder responses. Full AI integration will be in Phase 3.
- **Tasks and Decisions**: These sections are set up but will be populated in later phases.
- **Real-time Updates**: Infrastructure is in place but will be fully functional in Phase 3 and 4.
- **Voice Quality**: Depends on browser and system settings. Chrome typically provides the best experience.

## Phase 3: AI Interaction Logic Testing

### Prerequisites for Phase 3

- Phase 1 and Phase 2 must be completed and working
- At least one document uploaded to a room (for RAG context retrieval)
- Valid `GEMINI_API_KEY` configured in `.env.local`
- Meeting interface accessible and voice controls working

### Test 1: AI Response Generation

1. **Basic AI Conversation**:

   - Navigate to a meeting in a room
   - Turn on microphone
   - Say: "Hello, what can you help me with?"
   - Wait for AI response (may take 2-5 seconds)
   - You should see a thoughtful response from the AI Manager
   - Response should appear in both Developer View and AI Manager panel

2. **Context-Aware Responses**:

   - Upload a document to the room first (e.g., a project requirements PDF)
   - In the meeting, ask: "What are the main requirements from the documents?"
   - AI should reference content from uploaded documents
   - Response should show awareness of room context

3. **Conversation Continuity**:
   - Ask a follow-up question: "Can you elaborate on that?"
   - AI should remember previous conversation context
   - Response should be coherent with earlier messages

### Test 2: RAG (Retrieval-Augmented Generation)

1. **Document Context Retrieval**:

   - Upload a document with specific content (e.g., "Project deadline is Q1 2024")
   - In meeting, ask: "What is the project deadline?"
   - AI should reference the document content in its response
   - Check browser console for any errors (should be none)

2. **Multiple Documents**:

   - Upload 2-3 different documents to the room
   - Ask questions that require information from different documents
   - AI should be able to synthesize information from multiple sources

3. **No Relevant Context**:
   - Ask a question completely unrelated to uploaded documents
   - AI should still respond but indicate if no relevant context was found
   - Response should still be helpful and professional

### Test 3: Summarization System

1. **Automatic Summarization**:

   - Have a conversation with at least 5 back-and-forth exchanges
   - After the 5th exchange, the system should automatically summarize
   - Check the database: Go to Supabase → Table Editor → `conversations` table
   - Look for entries with `summary_type` field populated:
     - `decision` - Decisions made
     - `task` - Actionable tasks identified
     - `action_point` - Follow-up actions
     - `question` - Unresolved questions

2. **Summary Categories**:

   - During conversation, make a clear decision (e.g., "We'll use React for the frontend")
   - Mention actionable tasks (e.g., "We need to set up the database")
   - Ask questions (e.g., "What's the budget for this project?")
   - After 5 turns, check if these were correctly categorized in summaries

3. **Sidebar Updates**:
   - After summarization, check the Meeting Sidebar
   - Decisions section should show extracted decisions
   - Tasks section should show identified tasks (if Phase 4 is implemented)
   - Items should appear in real-time via Supabase Realtime

### Test 4: Memory and Context Storage

1. **Conversation History**:

   - Have a conversation with multiple exchanges
   - Refresh the page
   - Previous messages should be loaded and displayed
   - AI should remember context from previous session

2. **Vector Storage**:

   - After summarization, check Supabase → `embeddings` table
   - Look for entries with `metadata->>'type' = 'conversation_summary'`
   - These summaries are stored as vectors for future retrieval

3. **Context Retrieval from Summaries**:
   - Have a conversation that gets summarized
   - In a new conversation session, ask about previous decisions
   - AI should be able to reference past summaries

### Test 5: AI Manager Persona

1. **Manager Behavior**:

   - Ask: "What should we do next?"
   - AI should respond as a manager would:
     - Suggest actionable next steps
     - Ask clarifying questions if needed
     - Focus on moving the project forward

2. **Professional Tone**:

   - AI responses should be professional but friendly
   - Should be concise and actionable
   - Should avoid being overly casual or technical jargon

3. **Decision Facilitation**:
   - Present a problem: "We're not sure which framework to use"
   - AI should help guide toward a decision
   - Should ask relevant questions to clarify requirements

### Test 6: Error Handling

1. **API Errors**:

   - Temporarily set an invalid `GEMINI_API_KEY` in `.env.local`
   - Try to get an AI response
   - Should show a user-friendly error message
   - Should not crash the application

2. **Network Issues**:

   - Disconnect internet temporarily
   - Try to get AI response
   - Should handle gracefully with error message
   - Should allow retry

3. **Empty Context**:
   - Create a new room with no documents
   - Ask questions in meeting
   - AI should still respond (without document context)
   - Should indicate when no relevant documents are available

### Test 7: Performance

1. **Response Time**:

   - AI responses should appear within 2-5 seconds typically
   - Longer responses may take up to 10 seconds
   - Check browser console for any performance warnings

2. **Concurrent Requests**:

   - Send multiple messages quickly
   - System should handle them sequentially
   - No duplicate responses should appear

3. **Large Conversations**:
   - Have a long conversation (20+ exchanges)
   - System should still respond quickly
   - Conversation history should be managed efficiently

### Troubleshooting Phase 3

#### Issue: AI responses are not appearing

**Solution**:

- Check browser console for errors
- Verify `GEMINI_API_KEY` is set correctly in `.env.local`
- Check network tab for API call failures
- Ensure you're signed in and have room access
- Check Supabase logs for database errors

#### Issue: AI doesn't reference uploaded documents

**Solution**:

- Verify documents were uploaded successfully in Phase 1
- Check that embeddings were created (Supabase → `embeddings` table)
- Ensure documents are in the same room as the meeting
- Check browser console for context retrieval errors
- Verify `match_embeddings` function exists in database

#### Issue: Summarization not working

**Solution**:

- Ensure you've had at least 5 conversation turns
- Check Supabase → `conversations` table for summary entries
- Verify `GEMINI_API_KEY` is valid
- Check browser console and server logs for errors
- Ensure the summarization API call is being made

#### Issue: "Edge runtime" errors

**Solution**:

- If you see edge runtime errors, the API route may need Node.js runtime
- Edit `app/api/ai/chat/route.ts` and ensure `export const runtime = 'edge'` is commented out
- Restart the dev server

#### Issue: Context retrieval returns empty

**Solution**:

- Verify pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- Check that embeddings have valid vector data
- Verify the `match_embeddings` function exists in database
- Check similarity threshold (default 0.7) - try lowering it
- Ensure room_id matches between documents and meeting

### Phase 3 Verification Checklist

- [ ] AI generates responses to user messages
- [ ] Responses are contextually relevant
- [ ] AI references uploaded documents when appropriate
- [ ] Conversation history is maintained across messages
- [ ] Summarization triggers every 5 turns
- [ ] Decisions are extracted and stored correctly
- [ ] Tasks are identified (stored as conversations with summary_type='task')
- [ ] Action points are captured
- [ ] Questions are tracked
- [ ] Summaries appear in sidebar (via realtime)
- [ ] Vector storage works for conversation summaries
- [ ] AI maintains manager persona
- [ ] Error handling works gracefully
- [ ] Performance is acceptable (< 10s response time)

### Phase 3 Notes

- **Summarization Frequency**: Currently set to every 5 turns. This can be adjusted in `app/api/ai/chat/route.ts`
- **Context Window**: AI uses last 8 messages for context. This can be adjusted in `lib/ai/manager-agent.ts`
- **RAG Retrieval**: Top 5 most relevant document chunks are retrieved. Threshold is 0.7 similarity.
- **Gemini Model**: Using `gemini-pro`. You can switch to `gemini-pro-vision` if needed for image analysis.
- **Oumi Integration**: Skipped for now as requested. Can be added later for RL-based improvements.

### Advanced Testing

1. **Test with Multiple Rooms**:

   - Create different rooms with different documents
   - Verify AI context is room-specific
   - Ensure no cross-contamination between rooms

2. **Test Long Conversations**:

   - Have 30+ message exchanges
   - Verify multiple summaries are created
   - Check that context doesn't degrade over time

3. **Test Complex Queries**:
   - Ask multi-part questions
   - Request comparisons between documents
   - Ask for recommendations based on context

## Next Steps

Once Phase 3 is working correctly, you're ready for:

- **Phase 4**: Task assignment system (automatic task creation from conversations)
- **Phase 5**: Workflow automation with Kestra

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## Support

If you encounter issues not covered here:

1. Check the browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all environment variables are set correctly
4. Ensure database schema matches the migration file
