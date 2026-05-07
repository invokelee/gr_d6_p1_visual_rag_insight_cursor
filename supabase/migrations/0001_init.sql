-- Visual RAG Insight Platform — initial schema
-- Run with: psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql

create extension if not exists vector;

create table if not exists rag_chunks (
  id              text primary key,
  document_id     text not null,
  chunk_index     int  not null,
  content         text not null,
  token_estimate  int  not null default 0,
  embedding       vector(1536) not null,
  created_at      timestamptz not null default now()
);

create index if not exists rag_chunks_document_idx
  on rag_chunks (document_id);

-- ivfflat cosine index. Run `analyze rag_chunks;` after large inserts.
create index if not exists rag_chunks_embedding_idx
  on rag_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function rag_match_chunks(
  query_embedding   vector(1536),
  match_count       int,
  filter_document_id text
) returns table (
  id              text,
  document_id     text,
  chunk_index     int,
  content         text,
  token_estimate  int,
  similarity      float
) language sql stable as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.token_estimate,
    1 - (c.embedding <=> query_embedding) as similarity
  from rag_chunks c
  where c.document_id = filter_document_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
