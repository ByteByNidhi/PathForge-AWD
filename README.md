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

## Environment

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Never commit `.env` files.

Required server values for Sprint 1:

- `PORT`
- `MONGODB_URI` — MongoDB Atlas connection string (never expose this to React)
- `JWT_SECRET`
- `CLIENT_ORIGIN`

## Seed data

The Atlas database starts empty. Seed published learning paths and the skill catalogue (no fake users or XP):

```bash
cd server
npm run seed
```

The seed is idempotent. Re-running it updates the same path and skill records instead of duplicating them.

## Health endpoint

`GET /api/health`

```json
{
  "success": true,
  "message": "PathForge API is running",
  "database": "connected"
}
```
