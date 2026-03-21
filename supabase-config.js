/* ================================================================
   SUPABASE CONFIGURATION — supabase-config.js
   ─────────────────────────────────────────────────────────────
   ▶ STEP 1: Go to https://supabase.com → Your Project
   ▶ STEP 2: Settings → API
   ▶ STEP 3: Copy "Project URL" and "anon public" key
   ▶ STEP 4: Paste them below and save this file
   ================================================================ */

const SUPABASE_URL  = "https://uaowucpwcphkdwuxjfoa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3d1Y3B3Y3Boa2R3dXhqZm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzc3MzQsImV4cCI6MjA4OTY1MzczNH0.0HvPx77F93estcD9pczvF3OnmJ4SCOz63bGlZWXs6n8";

/* ── Create the shared Supabase client ── */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/*
  ── TABLE NAME ──
  Your Supabase table should be named exactly: properties
  Run this SQL in Supabase SQL Editor to create it:

  CREATE TABLE properties (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title       text NOT NULL,
    price       text NOT NULL,
    location    text NOT NULL,
    image_url   text DEFAULT '',
    tags        text DEFAULT '',
    badge       text DEFAULT '',
    created_at  timestamptz DEFAULT now()
  );

  ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Public read"   ON properties FOR SELECT USING (true);
  CREATE POLICY "Public insert" ON properties FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public update" ON properties FOR UPDATE USING (true);
  CREATE POLICY "Public delete" ON properties FOR DELETE USING (true);

  ── STORAGE BUCKET ──
  1. Go to Storage → New bucket
  2. Name it: property-images
  3. Set to PUBLIC (toggle ON)
  4. Save

  Then in Bucket Policies → Add policy:
  - Operation: SELECT / INSERT / UPDATE / DELETE → All users
*/