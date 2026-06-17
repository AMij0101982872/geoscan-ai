-- ============================================================
-- GeoScan AI — Schéma initial
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Projets (multi-tenant) ───────────────────────────────────
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rapports extraits ────────────────────────────────────────
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id),
  filename     TEXT,
  pdf_path     TEXT,            -- chemin dans Supabase Storage
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  raw_json     JSONB,           -- données brutes extraites par Claude
  validated    BOOLEAN DEFAULT FALSE,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Corrections manuelles ────────────────────────────────────
CREATE TABLE corrections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id    UUID REFERENCES reports(id) ON DELETE CASCADE,
  field_path   TEXT NOT NULL,   -- ex: "section_b1.mesures[0].teneur_eau"
  old_value    TEXT,
  new_value    TEXT,
  corrected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_owner"    ON projects    USING (auth.uid() = user_id);
CREATE POLICY "reports_owner"     ON reports     USING (auth.uid() = user_id);
CREATE POLICY "corrections_owner" ON corrections
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()));

-- ── Storage bucket ───────────────────────────────────────────
-- À créer manuellement dans Supabase > Storage > New bucket
-- Nom: "pdfs", Public: false
