# GeoScan AI

Extraction automatique de données depuis des procès-verbaux géotechniques manuscrits (PDF → JSON → Excel).

## Stack
- **Frontend** : React + Vite + TailwindCSS
- **Backend** : Vercel Serverless Functions (Node.js)
- **Base de données** : Supabase (PostgreSQL + Storage + Auth)
- **IA** : Claude API (claude-sonnet-4-6)
- **Export** : SheetJS (xlsx)

## Installation

```bash
git clone https://github.com/ton-user/geoscan-ai
cd geoscan-ai
npm install
cp .env.example .env.local
# Remplir les variables dans .env.local
npm run dev
```

## Configuration

### 1. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le SQL dans `supabase/migrations/001_init.sql`
3. Créer un bucket Storage nommé `pdfs` (privé)
4. Copier `Project URL` et `anon key` dans `.env.local`

### 2. Vercel
1. Connecter le repo GitHub sur [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement dans Settings → Environment Variables
3. Passer au plan Pro pour le timeout 60s

### 3. Anthropic
1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com)
2. Générer une API key
3. Ajouter dans `.env.local`

## Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_URL` | URL Supabase (côté serveur) |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (côté serveur) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |

## Structure

```
geoscan-ai/
├── src/
│   ├── pages/         # Login, Dashboard, Upload, Validate
│   ├── components/    # Layout, DataTable, StatusBadge, ExportBtn
│   └── lib/           # supabase.js, exportExcel.js
├── api/               # Vercel Serverless Functions
│   ├── extract.js     # PDF → Claude → JSON
│   └── reports.js     # CRUD rapports
└── supabase/
    └── migrations/    # Schéma SQL
```

## Fonctionnement

1. **Upload** : L'utilisateur dépose un PDF → stocké dans Supabase Storage
2. **Extraction** : La Vercel Function `/api/extract` télécharge le PDF, l'envoie à Claude API, et sauvegarde le JSON structuré
3. **Validation** : L'utilisateur vérifie et corrige les données dans l'interface (chaque correction est tracée)
4. **Export** : Export en fichier Excel multi-feuilles (une feuille par section)
