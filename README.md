# GeoScan AI

Extraction automatique de données géotechniques manuscrites — PDF vers Excel en quelques secondes.

> Dépose un procès-verbal Atterberg (ISO 17892-12) manuscrit, l'IA lit les données, tu valides, tu exportes en Excel formaté.

**Live :** [geoscan-ai.vercel.app](https://geoscan-ai.vercel.app) &nbsp;·&nbsp; **Repo :** [github.com/AMij0101982872/geoscan-ai](https://github.com/AMij0101982872/geoscan-ai)

---

## Fonctionnalités

- **Upload PDF** — glisser-déposer ou parcourir, max 10 Mo
- **Extraction IA** — Gemini 2.0 Flash lit les données manuscrites et les structure en JSON
- **Fallback automatique** — si un modèle est surchargé, bascule sur le suivant (4 modèles en cascade)
- **Validation manuelle** — interface éditable cellule par cellule, corrections tracées
- **Export Excel** — fichier `.xlsx` formaté (couleurs, sections, entêtes) identique au document officiel
- **Tableau de bord** — historique des rapports, graphiques d'activité et de statuts
- **Authentification** — comptes utilisateurs sécurisés via Supabase Auth

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Base de données | Supabase (PostgreSQL + Storage + Auth) |
| IA | Google Gemini API (`gemini-2.0-flash`) |
| Export | xlsx-js-style |
| Graphiques | Recharts |

---

## Installation locale

```bash
git clone https://github.com/AMij0101982872/geoscan-ai.git
cd geoscan-ai
npm install
cp .env.local.example .env.local
# Remplir les variables dans .env.local
npm run dev
```

L'app tourne sur `http://localhost:5173`, l'API sur `http://localhost:3001`.

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Gemini (Google AI Studio — gratuit)
GEMINI_API_KEY=AIzaSy...
```

---

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter :

```sql
-- Table rapports
create table reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  filename text not null,
  pdf_path text not null,
  status text default 'processing',
  raw_json jsonb,
  validated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table corrections
create table corrections (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references reports not null,
  field_path text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- RLS
alter table reports enable row level security;
alter table corrections enable row level security;

create policy "Users own reports" on reports for all using (auth.uid() = user_id);
create policy "Users own corrections" on corrections for all
  using (report_id in (select id from reports where user_id = auth.uid()));
```

3. Dans **Storage**, créer un bucket `pdfs` (privé) avec la policy :

```sql
create policy "Users access own pdfs" on storage.objects for all
  using (bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Déploiement Vercel

1. Importer le repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement dans **Settings → Environment Variables**
3. Passer au plan **Pro** (20$/mois) — nécessaire car l'extraction prend ~30s (limite gratuit : 10s)

> **Note :** Le fichier `vercel.json` configure déjà `maxDuration: 60` pour les fonctions API.

---

## Architecture

```
geoscan-ai/
├── api/
│   └── extract.js          # Serverless function : PDF → Gemini → JSON → Supabase
├── src/
│   ├── pages/
│   │   ├── Login.jsx        # Authentification
│   │   ├── Dashboard.jsx    # Tableau de bord + graphiques
│   │   ├── Upload.jsx       # Upload PDF + lancement extraction
│   │   └── Validate.jsx     # Validation manuelle + export
│   ├── components/
│   │   ├── Layout.jsx       # Sidebar navigation
│   │   ├── DataTable.jsx    # Tables éditables (Sections A, B1, B2)
│   │   ├── StatusBadge.jsx  # Indicateurs de statut
│   │   └── ExportBtn.jsx    # Bouton export Excel
│   └── lib/
│       ├── supabase.js      # Client Supabase
│       └── exportExcel.js   # Génération fichier Excel formaté
├── dev-server.mjs           # Serveur API local (développement)
└── vercel.json              # Config déploiement Vercel
```

---

## Flux de traitement

```
PDF manuscrit
    ↓
Supabase Storage (upload)
    ↓
Gemini 2.0 Flash (extraction IA)
    ↓  [fallback automatique si 503/429]
gemini-2.0-flash-lite → gemini-2.5-flash-lite → gemini-2.5-flash
    ↓
JSON structuré (meta + section_a + section_b1 + section_b2)
    ↓
Supabase PostgreSQL (sauvegarde)
    ↓
Interface validation (corrections tracées)
    ↓
Export Excel (.xlsx) formaté
```

---

## Limites du plan gratuit

| Service | Limite gratuite | Usage estimé (5 users) |
|---------|----------------|----------------------|
| Gemini API | 1 500 req/jour | ~150/jour |
| Supabase DB | 500 MB | < 10 MB |
| Supabase Storage | 1 GB | ~750 MB (PDFs) |
| Vercel | 10s timeout | **Insuffisant** → Pro requis |

---

## Licence

Propriétaire — tous droits réservés.
