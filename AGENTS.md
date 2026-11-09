# AGENTS.md

## Project Context

SecondLife Go: a React + Three.js/WebXR Second Life viewer (`src/`) and the Node bridge that logs in
to Second Life and serves the app (`railway/`). It deploys as one Railway service from the root
`Dockerfile`. Treat it as user-owned application code and keep changes focused on the user's request.

Start with `README.md` for local setup, variables and deployment.

## Key Files

- `src/pages/SLLogin.jsx`: avatar login (through the bridge's `POST /login`) and the login page theme.
- `src/pages/Viewer.jsx`, `src/components/viewer/`: the 3D/WebXR viewer.
- `src/hooks/useWorldStream.js`: WebSocket world stream from the bridge.
- `railway/src/server.js`: bridge HTTP/WebSocket server; serves the built app from `web/`.
- `vite.config.js`: `npm run dev` proxies bridge routes to `BRIDGE_URL` (default `http://localhost:8080`).

## Working Notes

- Test against the demo world (`cd railway && npm run demo`); never log in to a real grid with real credentials.
- Run `npm run lint`, `npm run build` and `cd railway && npm test` before finishing code changes.
- Settings that are per user (login theme, inventory list, last session) live in `localStorage` (`src/lib/localStore.js`).
