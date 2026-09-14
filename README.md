# PathForge AWD

React + Node.js + MongoDB implementation of PathForge-WFS.

PathForge-WFS remains the functional source of truth. This project is a complete AWD port, not a new product.

## Structure

- `client/` — React (Vite) frontend
- `server/` — Node.js + Express API

## Development

Install dependencies in each package, then start both processes.

### Client

```bash
cd client
npm install
npm run dev
```

Runs at `http://localhost:5173`.

### Server

```bash
cd server
npm install
npm run dev
```

Runs at `http://localhost:5000`.

Production-style start:

```bash
cd server
npm start
```

## Health endpoint

`GET /api/health`

```json
{
  "success": true,
  "message": "PathForge API is running"
}
```

## Environment

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Never commit `.env` files.

Phase 0 stops at this foundation. Authentication, models, and product features are added in later phases.
