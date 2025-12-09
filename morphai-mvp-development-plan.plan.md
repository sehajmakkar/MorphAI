<!-- ad676bb7-f35c-4745-a98c-b1f3018596ff 1af7766e-6098-4c93-ab82-8f0751ddec58 -->
# MorphAI MVP Development Plan

## Technology Stack Overview

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector for embeddings)
- **AI**: Google Gemini AI (for conversation) + Oumi (for RL-based decision improvement)
- **Workflow**: Kestra (for task-triggered automation)
- **Deployment**: Vercel (with Edge Runtime where applicable)
- **Voice**: Web Speech API (SpeechRecognition) + Web Speech Synthesis API

## Phase 1: Project + Room Creation

### 1.1 Project Setup

- Initialize Next.js 14+ project with TypeScript and Tailwind
- Configure Supabase client and environment variables
- Set up Vercel deployment configuration

### 1.2 Authentication (Supabase Auth)

- **Files**: `app/auth/page.tsx`, `app/api/auth/[...supabase]/route.ts`
- Implement email/password authentication via Supabase Auth
- Create protected route middleware for authenticated pages
- User profile management

### 1.3 Database Schema (Supabase)

- **Tables**:
  - `projects` (id, user_id, name, created_at, updated_at)
  - `rooms` (id, project_id, name, created_at, updated_at)
  - `documents` (id, room_id, file_path, file_type, uploaded_at)
  - `embeddings` (id, document_id, chunk_text, embedding vector, metadata)
  - `conversations` (id, room_id, user_id, message, role, created_at)
- Enable pgvector extension in Supabase
- Create vector similarity search functions

### 1.4 Project & Room Management UI

- **Files**: 
  - `app/dashboard/page.tsx` (project list)
  - `app/dashboard/[projectId]/page.tsx` (room list)
  - `app/dashboard/[projectId]/[roomId]/page.tsx` (room view)
- Create project creation modal/form
- Create room creation within projects
- Display projects and rooms in dashboard

### 1.5 Document Upload & Processing

- **Files**: 
  - `app/api/documents/upload/route.ts` (API route)
  - `components/DocumentUpload.tsx`
- File upload to Supabase Storage
- PDF text extraction (using pdf-parse or similar)
- Text chunking for embeddings
- Generate embeddings using Gemini Embeddings API
- Store embeddings in Supabase vector store
- Context retrieval function for RAG

## Phase 2: Meeting UI (Baseline)

### 2.1 Dual-Screen Meeting Interface Layout

- **Files**: `app/dashboard/[projectId]/[roomId]/meeting/page.tsx`
- Split-screen layout:
  - Left panel: Developer view (voice input area, status)
  - Right panel: AI Manager view (avatar, response display)
- Responsive design with Tailwind

### 2.2 Right Sidebar Component

- **Files**: `components/MeetingSidebar.tsx`
- Display live tasks list
- Display decisions list
- Real-time updates via Supabase Realtime subscriptions
- Scrollable, categorized sections

### 2.3 Voice Chat Controls

- **Files**: `components/VoiceControls.tsx`
- Microphone toggle button (on/off state)
- Visual indicator for recording status
- Browser permissions handling
- Error states for unsupported browsers

### 2.4 AI Voice Output

- **Files**: `components/AIVoiceOutput.tsx`
- Text-to-speech using Web Speech Synthesis API
- Queue management for multiple responses
- Visual waveform/animation during speech
- Voice selection and settings

## Phase 3: AI Interaction Logic (Conversation Loop)

### 3.1 Voice Input Processing

- **Files**: 
  - `hooks/useVoiceRecognition.ts`
  - `app/api/ai/transcribe/route.ts` (if using server-side transcription)
- Capture audio using Web Speech API or MediaRecorder
- Convert speech to text
- Handle interruptions and errors

### 3.2 AI Manager Agent Core

- **Files**: 
  - `app/api/ai/chat/route.ts` (Edge Runtime)
  - `lib/ai/manager-agent.ts`
- Integrate Gemini AI API for conversation
- Build system prompt for "Manager Agent" persona
- Context retrieval from vector store (RAG)
- Conversation history management
- Streaming responses for real-time feel

### 3.3 Summarization System

- **Files**: `lib/ai/summarizer.ts`
- Track conversation turn count
- Trigger summarization every N turns (configurable)
- Extract and categorize:
  - Decisions (with reasoning)
  - Tasks (actionable items)
  - Action points (follow-ups)
  - Questions (unresolved)
- Store summaries in database

### 3.4 Memory Storage

- **Files**: `lib/memory/storage.ts`
- Store summaries in `conversations` table
- Link summaries to room context
- Update vector embeddings for new context
- Retrieval function for context-aware responses

### 3.5 Oumi Integration (Reinforcement Learning)

- **Files**: `lib/ai/oumi-integration.ts`
- Research Oumi API/SDK during implementation
- Integrate Oumi for:
  - Task prioritization decisions
  - Summary quality improvement
  - Response reasoning enhancement
- Create feedback loop mechanism
- Store decision outcomes for RL training

## Phase 4: Task Assignment System

### 4.1 Task Detection & Creation

- **Files**: 
  - `lib/ai/task-detector.ts`
  - `app/api/tasks/create/route.ts`
- AI analyzes conversation for actionable items
- Extract task details: title, description, owner, due date
- Create tasks automatically via API
- Link tasks to conversations/rooms

### 4.2 Task Database Schema

- **Tables**: `tasks` (id, room_id, title, description, owner_id, due_date, status, created_at, updated_at, conversation_id)
- Status enum: pending, in_progress, completed, blocked
- Relationships to users, rooms, conversations

### 4.3 Live Task Display

- **Files**: `components/TaskList.tsx`
- Real-time task updates via Supabase Realtime
- Task cards with all metadata
- Status badges and filters
- Click to expand details

### 4.4 Task Management API

- **Files**: `app/api/tasks/[taskId]/route.ts`
- CRUD operations for tasks
- Status updates
- Assignment changes
- Due date modifications

## Phase 5: Workflow Automation with Kestra

### 5.1 Kestra Integration Setup

- **Files**: `lib/workflows/kestra-client.ts`
- Research Kestra REST API during implementation
- Create Kestra client wrapper
- Handle authentication and API calls
- Error handling and retries

### 5.2 Workflow Trigger System

- **Files**: 
  - `lib/workflows/trigger-handler.ts`
  - `app/api/workflows/trigger/route.ts`
- Define workflow templates:
  - Reminder scheduling
  - GitHub PR checks
  - Slack notifications
- Task-to-workflow mapping logic
- Trigger workflows on task creation/updates

### 5.3 AI Agent Workflow Interaction

- **Files**: `lib/ai/workflow-agent.ts`
- Enable AI to request data from Kestra
- Parse workflow execution results
- Summarize workflow outputs
- Adjust AI actions based on workflow data
- Store workflow results in database

### 5.4 Workflow Management UI

- **Files**: `components/WorkflowStatus.tsx`
- Display triggered workflows in sidebar
- Show execution status
- Display results/summaries
- Link workflows to tasks

## Implementation Order & Dependencies

1. **Phase 1** (Foundation): Auth → DB Schema → Projects/Rooms → Document Upload
2. **Phase 2** (UI): Meeting Layout → Sidebar → Voice Controls
3. **Phase 3** (Core AI): Voice Input → AI Chat → Summarization → Memory → Oumi
4. **Phase 4** (Tasks): Detection → Creation → Display → Management
5. **Phase 5** (Automation): Kestra Setup → Triggers → AI Integration → UI

## Key Technical Decisions

- **Voice**: Use Web Speech API for MVP (can upgrade to WebRTC/third-party later)
- **Vector Store**: Supabase pgvector (1536-dim embeddings from Gemini)
- **Real-time**: Supabase Realtime subscriptions for live updates
- **Edge Runtime**: Use for AI API routes to reduce latency
- **Oumi**: Will need to research API during implementation (may require custom integration)
- **Kestra**: Will need to research API/self-hosted vs cloud options during implementation

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
OUMI_API_KEY= (to be researched)
KESTRA_URL=
KESTRA_API_KEY= (to be researched)
```

## Testing Strategy

- Unit tests for AI logic and utilities
- Integration tests for API routes
- E2E tests for critical user flows (auth, meeting, task creation)
- Manual testing for voice features (browser compatibility)

## Deployment Checklist

- Configure Vercel environment variables
- Set up Supabase production database
- Enable pgvector extension
- Configure CORS for API routes
- Set up monitoring/logging
- Test voice features on production domain (HTTPS required)

### To-dos

- [ ] Phase 1: Initialize Next.js project, configure Supabase, set up authentication, create database schema (projects, rooms, documents, embeddings, conversations), implement project/room creation UI, and document upload with vector storage
- [ ] Phase 2: Build dual-screen meeting interface (AI manager + developer views), implement right sidebar for tasks/decisions, add voice chat controls with mic toggle, and implement AI voice output using Web Speech Synthesis
- [ ] Phase 3: Implement voice input processing, build AI Manager Agent with Gemini AI, create summarization system (decisions/tasks/action points/questions), set up memory storage in vector DB, and integrate Oumi for RL-based decision improvement
- [ ] Phase 4: Build task detection system, create task database schema and CRUD APIs, implement live task display in sidebar with real-time updates, and add task management features
- [ ] Phase 5: Research and integrate Kestra API, build workflow trigger system (reminders, GitHub PR checks, Slack), enable AI agent to request/summarize Kestra data, and create workflow management UI