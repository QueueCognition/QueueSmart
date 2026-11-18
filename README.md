# QueueSmart

## Prerequisites

Node.js **22.23.5** (see `.nvmrc`). The client declares `engines.node >= 22.22.2`
and ships an `engine-strict` `.npmrc`, so an older runtime fails at `npm ci`
instead of at test time.

```bash
nvm use        # or: fnm use
```

## Setup

Install each package separately. There is no workspace root.

```bash
cd server && npm ci
cd client && npm ci
```

## Development

```bash
cd server && npm run dev   # API on http://localhost:4000
cd client && npm run dev   # Vite dev server, proxies /api to the server
```

## Checks

Both packages expose the same gates that CI runs.

```bash
npm run format:check
npm run lint
npm run build
```

The server also has `npm run typecheck` and `npm run test:coverage`; the client
has `npm run test`.
