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

## Step 3: Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the API key → `GEMINI_API_KEY`

**Note**: The code will try to use `text-embedding-004` model first, and fallback to `embedding-001` if needed. Both models produce 768-dimensional embeddings, but we're storing them as 1536 in the database schema for future compatibility. If you encounter embedding errors, check which models are available in your Google AI Studio.

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

## Next Steps

Once Phase 1 is working correctly, you're ready for:
- **Phase 2**: Meeting UI with voice controls
- **Phase 3**: AI conversation loop and summarization
- **Phase 4**: Task assignment system
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

