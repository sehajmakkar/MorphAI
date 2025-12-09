-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings table for vector storage
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(768), -- Gemini embeddings are 768 dimensions (text-embedding-004 or embedding-001)
  chunk_index INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  summary_type VARCHAR(50), -- 'decision', 'task', 'action_point', 'question', null
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_project_id ON rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_conversations_room_id ON conversations(room_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Create vector similarity search index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms in their projects"
  ON rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms in their projects"
  ON rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rooms in their projects"
  ON rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rooms in their projects"
  ON rooms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their rooms"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = documents.room_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their rooms"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = documents.room_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their rooms"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = documents.room_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for embeddings
CREATE POLICY "Users can view embeddings in their documents"
  ON embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN rooms ON rooms.id = documents.room_id
      JOIN projects ON projects.id = rooms.project_id
      WHERE documents.id = embeddings.document_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create embeddings in their documents"
  ON embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN rooms ON rooms.id = documents.room_id
      JOIN projects ON projects.id = rooms.project_id
      WHERE documents.id = embeddings.document_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations in their rooms"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = conversations.room_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their rooms"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = conversations.room_id
      AND projects.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_room_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.metadata
  FROM embeddings e
  JOIN documents d ON d.id = e.document_id
  WHERE 
    (filter_room_id IS NULL OR d.room_id = filter_room_id)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

