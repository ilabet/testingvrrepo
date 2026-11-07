# SecondLife Go — Railway backend

Deploy-ready service for the viewer. It handles the part a browser can never do on its own:
the grid login handshake, plus a persistent WebSocket relay for world-stream traffic.

## What it does

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness check Railway uses to keep the service healthy |
| `POST /login` | XML-RPC `login_to_simulator` against Agni / Aditi / OSGrid / a custom URI. Returns `ws_url` + session info |
| `WS /stream` | Relay: `agent_update`, `chat`, `ping`. Broadcasts `region_update` snapshots back |

## Deploy

```bash
cd railway
railway login
railway init            # create a project
railway up              # builds the Dockerfile and deploys
railway domain          # gives you https://<name>.up.railway.app
```

If you deploy from the whole repo instead, set the Railway service **Root Directory** to `railway`
and keep the builder on Dockerfile.

### Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `PORT` | auto | Railway injects it; the server reads it |
| `PROXY_TOKEN` | optional | Shared secret. When set, `/login` needs an `x-proxy-token` header and `/stream` needs `?token=` |

## Point the app at it

1. Open the app's login screen.
2. Under **Live world proxy (optional)**, paste the Railway URL (`https://<name>.up.railway.app`).
3. Sign in — the app forwards credentials through this service and stores the returned `ws_url`,
   which the viewer connects to for the live stream.

## Honest scope

Grid login, session tokens, presence and chat all run here. The simulator's world geometry and
avatar updates travel over Second Life's raw UDP protocol, which needs a protocol client
(LibreMetaverse) running as a session worker. Run that worker alongside this service when it is
ready — it connects to `/stream` as a WebSocket client and publishes `region_update` frames, which
this relay fans out to every viewer. Until then, the viewer falls back to its built-in sandbox scene.