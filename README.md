# QMS Forge

An ISO 9001 record management web app, built with AI-assisted development. Prototype under active iteration.

Live app: https://qms-forge.vercel.app

## What it covers

Pages in `src/pages` include records (create, list, view), forms and a forms registry, procedures, the ISO manual, CAPA register, risk register, process interaction map, audit, activity log, notifications, projects and an admin panel.

## Tech stack

- React 18, TypeScript, Vite, Tailwind CSS
- TanStack Query, React Router, Recharts, Zod
- Supabase
- Small Express server (`server/`)
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and use your own values.

## Status

Prototype. Parts of the code were generated or edited with AI tools (Lovable and others) and then adjusted by hand. Example documents in the repository are working copies for development.
