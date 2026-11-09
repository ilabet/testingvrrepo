# SecondLife Go — Railway backend

The live-world bridge for the viewer. A browser cannot speak Second Life's UDP protocol, so this
service logs in as your avatar with [`@caspertech/node-metaverse`](https://github.com/CasperTech/node-metaverse),
keeps the region's terrain, objects and avatars, converts textures (JPEG2000 → WebP) and meshes
(LLMesh → JSON), and streams everything to the app over a WebSocket. Movement, chat and
interactions from the app (including WebXR on Quest, Vive, Index…) are sent back to the simulator.

```
 App (React, Three.js / WebXR)   --POST /login-->  this service  --LLUDP + caps-->  Second Life
                                 <--WS /stream---
```

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness check (`/healthz` also works) |
| `POST /login` | Logs in (`first_name`, `last_name`, `password`, `grid`, `custom_login_uri`) and keeps the session alive. Returns `success`, `ws_url`, `agent_id`, `avatar_name`, `region` |
| `WS /stream?session=…` | The app attaches to the logged-in session; re-attaching (page reload) resends the whole region. A session with no viewer attached logs out after 2 minutes |
| `GET /asset/texture/<token>/<uuid>` | Texture as WebP (`X-Alpha-Mode`: none / mask / blend) |
| `GET /asset/mesh/<token>/<uuid>` | Mesh geometry as JSON |
| `GET /` | The React app, when built into `web/` by the root `Dockerfile`; otherwise the standalone viewer |
| `GET /standalone/` + `WS /ws` | A minimal standalone WebXR viewer, handy for testing |
| `POST /alert/stream-drop` | Discord ping (needs `DISCORD_WEBHOOK_URL`) when a viewer's stream drops; body `{ session, reason }`, session must be one this bridge issued |

Grids: `agni` (main), `aditi` (beta), `osgrid`, `demo` (a local test world, no account needed) and
custom login URIs when `ALLOW_CUSTOM_GRIDS=1`.

## Deploy

```bash
cd railway
railway login
railway init            # create a project
railway up              # builds the Dockerfile and deploys
railway domain          # gives you https://<name>.up.railway.app
```

To deploy only the bridge (no React app), set the Railway service **Root Directory** to `railway`;
the usual deployment is the whole repository with the root `Dockerfile` (see the main README). The image installs `opj_decompress` (OpenJPEG) for textures.

### Environment variables

| Name | Default | Notes |
| --- | --- | --- |
| `PORT` | auto | Railway injects it |
| `PROXY_TOKEN` | unset | Shared secret. When set, `/login` needs an `x-proxy-token` header (the bundled app does not send it: API-only use) |
| `DEMO_ONLY` | unset | `1` serves only the demo world (no Second Life logins) |
| `ALLOW_CUSTOM_GRIDS` | unset | `1` allows arbitrary login URIs (OpenSim grids) |
| `MAX_SESSIONS` | `20` | Simultaneous logins |
| `MAX_TEXTURE_SIZE` | `512` | Largest texture edge sent to the app |
| `DETACHED_TIMEOUT_MS` | `120000` | Logout delay for a session with no viewer attached |

## Point the app at it

1. Open the app's login screen.
2. Under **Live world proxy (optional)**, paste the Railway URL (`https://<name>.up.railway.app`).
3. Sign in (or pick **Demo World** to try it without an account). The viewer switches from the
   sandbox scene to the live region: terrain, prims, textures, mesh, avatars, chat, IMs, teleport
   offers and script dialogs.

Controls in the live world — desktop: W/S move, A/D turn, Q/E strafe, Space jump/up, C down,
F fly, Shift run, click to touch, double-click to sit. VR (VRChat-style): left stick moves where
you look (push to the edge to run), right stick turns (snap or smooth, per the VR controls
settings), A/X jump and a double-tap toggles flying (while flying hold A to rise, X to descend),
B/Y opens the quick menu (chat with keyboard, travel, fly/run/stand, alerts), trigger interacts
(touch objects, press menu buttons), grip sits on the object you point at, and moving or jumping
while seated stands up. Chat commands: `/tp Region/x/y/z`, `/home`, `/shout`, `/whisper`,
`/<channel> text`.

## Local development

```bash
cd railway
npm install
npm start        # http://localhost:8080
npm run demo     # demo world only
npm test
```

Requires Node.js 20+ and `opj_decompress` (`apt install libopenjp2-tools` / `brew install openjpeg`).

## Security

Credentials travel app → this service → the grid login server. They are never
stored or logged. Whoever runs this service can see them, so only use a bridge you deploy yourself.
Each session gets a random token that scopes its stream and asset URLs.

## Limitations

Avatars are simple figures (no baked appearance or animations) and attachments are hidden; prim
shapes are approximated, sculpties drawn as spheres; no materials, particles, media, sound or
neighbouring regions yet.
