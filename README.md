# GeoScan AI

Extraction automatique de données géotechniques manuscrites — PDF vers Excel en quelques secondes.

> Dépose un procès-verbal Atterberg (ISO 17892-12) manuscrit, l'IA lit les données, tu valides, tu exportes en Excel formaté.

**Live :** [geoscanai.netlify.app](https://geoscanai.netlify.app) &nbsp;·&nbsp; **Repo :** [github.com/AMij0101982872/geoscan-ai](https://github.com/AMij0101982872/geoscan-ai)

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
| Hébergement | Netlify |
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

Les mêmes variables doivent être déclarées dans **Netlify → Project configuration → Environment variables** (ne pas cocher "Contains secret values" — ces clés doivent être intégrées au bundle client par Vite).

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

## Déploiement Netlify

1. Sur [app.netlify.com](https://app.netlify.com), **Add new project → Import an existing project** et connecter le repo GitHub
2. Netlify détecte automatiquement `netlify.toml` :
   - Build command : `npm run build`
   - Publish directory : `dist`
3. Ajouter les variables d'environnement dans **Project configuration → Environment variables** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
4. Passer le projet en **Public** (Project overview → "Make public"), sinon il reste accessible uniquement aux membres de l'équipe Netlify
5. Déployer — le plan **Free** suffit (usage commercial autorisé par Netlify, contrairement au plan Hobby de Vercel)

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
└── api/                      # Fonctions serverless Vercel — conservées pour référence, non utilisées (hébergement Netlify)
    ├── extract.js
    └── reports.js
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

## Plan tarifaire — 10 utilisateurs

Avec ~10 utilisateurs actifs et un volume d'extractions élevé (15+/jour/utilisateur), le free tier ne suffit plus partout :

| Service | Plan | Coût estimé |
|---------|------|--------------|
| Netlify | Free | 0$/mois (usage commercial autorisé) |
| Supabase | Pro | ~25$/mois (évite la mise en pause après 7 jours d'inactivité) |
| Gemini API | Pay-as-you-go au-delà du quota gratuit | ~5–15$/mois |
| Nom de domaine (optionnel) | — | ~1$/mois |
| **Total** | | **~30–40$/mois** |

> Le plan Supabase Free suffit pour des tests/une démo, mais il **met le projet en pause après 7 jours d'inactivité** — d'où le passage en Pro pour un usage en production.

---

## Gestion des comptes

Aucune inscription publique — les comptes sont créés et gérés manuellement par l'administrateur via **Supabase → SQL Editor**.

Contact admin : akeivanjr10@gmail.com

### Créer un utilisateur

```sql
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'utilisateur@exemple.com',
  crypt('MotDePasse123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now()
);
```

### Modifier le mot de passe

```sql
UPDATE auth.users
SET encrypted_password = crypt('nouveauMDP123', gen_salt('bf'))
WHERE email = 'utilisateur@exemple.com';
```

### Modifier l'email

```sql
UPDATE auth.users
SET email = 'nouvel@email.com'
WHERE email = 'ancien@email.com';
```

---

## Licence

Propriétaire — tous droits réservés.
