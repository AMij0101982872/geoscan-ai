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
- **Export Excel** — fichier `.xlsx` formaté (couleurs, sections, en-têtes) identique au document officiel
- **Tableau de bord** — historique des rapports, graphiques d'activité et de statuts
- **Thème clair / sombre** — toggle persistent par utilisateur
- **Paramètres** — nom d'affichage, apparence, en-tête Excel personnalisé
- **Comptes gérés par l'admin** — pas d'inscription publique, accès sur invitation

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Hébergement | Vercel (Hobby — gratuit) |
| Base de données | Supabase (PostgreSQL + Storage + Auth) |
| IA | Google Gemini API (`gemini-2.0-flash`, fallback cascade) |
| Export | xlsx-js-style |
| Graphiques | Recharts |

> L'extraction Gemini se fait **directement depuis le navigateur** — aucune fonction serverless, aucune limite de timeout.

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

L'app tourne sur `http://localhost:5173`.

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Gemini (Google AI Studio — gratuit)
VITE_GEMINI_API_KEY=AIzaSy...
```

Les mêmes variables doivent être déclarées dans **Vercel → Settings → Environment Variables**.

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

4. Dans **Authentication → Users**, créer les comptes manuellement (pas d'inscription publique).

---

## Déploiement Vercel

1. Importer le repo sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement dans **Settings → Environment Variables** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
3. Déployer — **plan Hobby (gratuit) suffisant**, aucune fonction serverless utilisée

---

## Architecture

```
geoscan-ai/
├── src/
│   ├── pages/
│   │   ├── Login.jsx        # Connexion uniquement (comptes gérés par admin)
│   │   ├── Dashboard.jsx    # Tableau de bord + graphiques
│   │   ├── Upload.jsx       # Upload PDF + extraction Gemini
│   │   ├── Validate.jsx     # Validation manuelle + export Excel
│   │   └── Settings.jsx     # Paramètres utilisateur
│   ├── components/
│   │   ├── Layout.jsx       # Sidebar navigation + thème toggle
│   │   ├── DataTable.jsx    # Tables éditables (Sections A, B1, B2)
│   │   └── StatusBadge.jsx  # Indicateurs de statut
│   └── lib/
│       ├── supabase.js      # Client Supabase
│       ├── gemini.js        # Appel API Gemini (fallback cascade, base64 browser)
│       ├── exportExcel.js   # Génération fichier Excel formaté
│       ├── theme.jsx        # ThemeContext (clair/sombre, localStorage)
│       └── settings.js      # Préférences utilisateur (localStorage)
└── api/
    └── extract.js           # Conservé pour référence (non utilisé en prod)
```

---

## Flux de traitement

```
PDF manuscrit (fichier local)
    ↓
Supabase Storage (upload)
    ↓
Conversion base64 dans le navigateur
    ↓
Gemini 2.0 Flash — appel direct depuis le browser
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

## Plan tarifaire — 100% gratuit pour 5 utilisateurs

| Service | Plan | Limite | Usage estimé |
|---------|------|--------|--------------|
| Vercel | Hobby (gratuit) | — | Hébergement statique uniquement |
| Gemini API | Free | 1 500 req/jour | ~50–100/jour |
| Supabase DB | Free | 500 MB | < 10 MB |
| Supabase Storage | Free | 1 GB | ~500 MB (PDFs) |
| Supabase Auth | Free | 50 000 MAU | 5 utilisateurs |

---

## Gestion des comptes

Les comptes sont créés manuellement par l'administrateur via **Supabase → Authentication → Users → Add user**.  
Aucune inscription publique n'est disponible dans l'interface.

Contact admin : akeivanjr10@gmail.com

---

## Licence

Propriétaire — tous droits réservés.
