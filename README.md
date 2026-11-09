# SecondLife Go

A Second Life viewer for the browser, phones and VR headsets (WebXR: standalone Meta Quest in the
Quest Browser, Vive / Index / Pico through a WebXR browser). A small Node service on Railway logs in
to Second Life for you and streams the region to the app.

```
 Browser / Quest Browser  --POST /login, WS /stream-->  Railway service  --LLUDP + caps-->  Second Life
        (React + Three.js / WebXR, served by the same Railway service)
```

The code lives on GitHub; Railway builds and runs it from this repository. There is no other backend.

## Deploy on Railway

1. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo → this repository**.
   Leave **Root Directory** empty: Railway uses the root `Dockerfile` and `railway.json`
   (it builds the app, then runs the bridge that serves it).
2. **Settings → Networking → Generate Domain**. You get `https://<name>.up.railway.app`.
3. Check `https://<name>.up.railway.app/health` answers `{"ok":true,...}`.
4. Open `https://<name>.up.railway.app/` (on a Quest: in the Quest Browser), pick **Demo World**
   to try it without an account, then **Enter VR**. Leave "Bridge server" empty: the page logs in
   through the service it came from.

Every push to `main` redeploys automatically.

### Variables (all optional)

| Variable | Purpose |
| --- | --- |
| `DEMO_ONLY=1` | Only the demo world; no real Second Life logins |
| `ALLOW_CUSTOM_GRIDS=1` | Allow custom grid login URIs |
| `MAX_SESSIONS` | Concurrent logins (default 20) |
| `PROXY_TOKEN` | Require `x-proxy-token` on `POST /login` |
| `DISCORD_WEBHOOK_URL` | Discord ping when a viewer's world stream drops (at most one a minute) |

**Security:** your Second Life password goes from the page to this service and on to Linden Lab's
login server. Only use a service you deployed yourself.

## Local development

```bash
npm install
(cd railway && npm install && npm run demo)   # bridge on http://localhost:8080, demo world only
npm run dev                                   # app on http://localhost:5173, bridge routes proxied
```

`npm run lint`, `npm run build` and `(cd railway && npm test)` are what CI runs, plus a Docker build.
The bridge's own docs (endpoints, protocol, VR controls) are in [`railway/README.md`](railway/README.md).

## VR controls (VRChat style)

Left stick moves (full push runs), right stick turns, A jumps (double-tap to fly, hold A / X to rise
or sink), B/Y opens the quick menu, trigger clicks menu items and touches objects, grip sits or stands.
