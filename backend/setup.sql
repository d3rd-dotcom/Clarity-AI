-- ============================================================
-- CLARITY-ELIGIBILITY AI — SUPABASE SETUP
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run — all statements use IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- Step 1: Enable the pgvector extension
create extension if not exists vector;

-- Step 2: Create the benefit chunks table
-- Cohere embed-english-v3.0 produces 1024 dimensions
create table if not exists benefit_chunks (
  id            uuid primary key default gen_random_uuid(),
  benefit_name  text not null,
  chunk_type    text not null,
  content       text not null,
  embedding     vector(1024),          -- matches Cohere embed-english-v3.0
  source_url    text not null,
  last_updated  text not null,
  created_at    timestamptz default now()
);

-- Step 3: Create HNSW index for fast cosine similarity search
-- HNSW is the recommended index type for 2025+ (faster than IVFFlat for small datasets)
create index if not exists benefit_chunks_embedding_idx
  on benefit_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Step 4: Create the RPC function used by retrieve.ts
-- This is required because Supabase JS client cannot use pgvector operators directly
create or replace function match_benefit_chunks(
  query_embedding  vector(1024),
  match_count      int     default 10,
  match_threshold  float   default 0.3
)
returns table (
  id            uuid,
  benefit_name  text,
  chunk_type    text,
  content       text,
  source_url    text,
  last_updated  text,
  similarity    float
)
language sql stable
as $$
  select
    id,
    benefit_name,
    chunk_type,
    content,
    source_url,
    last_updated,
    1 - (embedding <=> query_embedding) as similarity
  from benefit_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Step 5: Create an explicit truncate RPC for clean re-indexing
-- ------------------------------------------------------------
-- STR-005: Previously, seed.ts and api/index.ts cleared the table using:
--     .delete().neq("id", "00000000-0000-0000-0000-000000000000")
-- This relies on the implicit assumption that no row will ever have the
-- all-zeros UUID, which is semantically unclear and easy to misread as a
-- bug. TRUNCATE is the explicit, idiomatic way to clear a table for a
-- full re-index, and RESTART IDENTITY keeps row numbering predictable
-- across re-seeds. SECURITY DEFINER lets the service-role-authenticated
-- caller execute it without needing direct TRUNCATE privileges granted
-- via RLS policy.
create or replace function truncate_benefit_chunks()
returns void
language sql
security definer
as $$
  truncate table benefit_chunks restart identity;
$$;

-- Step 6: Row Level Security — lock it down
-- Only the service role key (server-side) can read/write
alter table benefit_chunks enable row level security;

-- Allow the service role to do everything (server-side only)
drop policy if exists "Service role full access" on benefit_chunks;
create policy "Service role full access"
  on benefit_chunks
  for all
  using (auth.role() = 'service_role');

-- ============================================================
-- VERIFY SETUP
-- After running seed.ts, check this returns rows:
--   select benefit_name, chunk_type, left(content, 60) from benefit_chunks limit 10;
--
-- Verify the truncate RPC exists:
--   select proname from pg_proc where proname = 'truncate_benefit_chunks';
-- ============================================================
