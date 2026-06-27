# 4Wall

Where great spaces begin with a thought.

4Wall is an AI-first architectural visualization app built with React Router, TypeScript, and Tailwind CSS. Upload floor plans, explore curated interior renders, and visualize projects in a warm, minimal workspace.

## Features

- Responsive navbar with Puter authentication
- Floor plan upload with drag-and-drop
- Project gallery with featured inspiration renders
- Visualizer route for reviewing saved work
- Local project storage fallback when no Puter worker is configured

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment

Copy `.env.example` to `.env.local` and set your Puter worker URL when ready:

```env
VITE_PUTER_WORKER_URL=
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run typecheck` — run TypeScript checks

## Deployment

Docker is supported via the included `Dockerfile`:

```bash
docker build -t 4wall .
docker run -p 3000:3000 4wall
```

Built with React Router.
