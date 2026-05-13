# Solar PV Simulator

A web app for simulating solar panel power output using real pvlib physics modeling. Users adjust panel specs, location, tilt, and date to see interactive power output charts and daily energy estimates.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Node.js API server (port 8080, proxied at /api)
- `PORT=25799 BASE_PATH=/ pnpm --filter @workspace/solar-app run dev` — run the React frontend (port 25799)
- `SOLAR_SIM_PORT=5001 python artifacts/solar-sim/sim_service.py` — run the Python pvlib simulation service (port 5001)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (Node.js, proxies to Python)
- Python: Flask + pvlib + pandas (physics simulation engine)
- Frontend: React + Vite + Tailwind CSS + Recharts
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `artifacts/api-server/src/routes/simulation.ts` — Node.js proxy routes to Python sim service
- `artifacts/solar-sim/sim_service.py` — Python Flask + pvlib simulation engine
- `artifacts/solar-app/src/pages/home.tsx` — Main simulator UI
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas

## Architecture decisions

- Python Flask microservice handles pvlib simulation because pvlib is Python-only. Node.js API server acts as a validated proxy (Zod validation on both input and output).
- OpenAPI spec defines the contract → codegen produces typed React Query hooks and Zod schemas used by both the frontend and API server.
- pvlib `ModelChain` with `clear-sky` (Ineichen) model gives fast, deterministic results without needing real weather data.
- Temperature model: `open_rack_glass_glass` (key changed from `open_rack_cell_glass_glass` in pvlib 0.15+).
- 5-minute intervals over the simulation day give 288 data points — enough resolution for accurate daily totals.

## Product

- Left panel: controls for location (lat/lng), panel orientation (tilt 0–90°, azimuth 0–360°), system specs (capacity in W), and time (date, timezone).
- Right panel: Recharts line chart of AC power (W) vs time of day; stat cards for total energy (kWh), peak power (W), peak time, and sunshine hours.
- "Find Optimal Tilt" runs a sweep from 0–90° in 5° steps and returns a bar chart; automatically sets the tilt control to the optimal angle.

## Gotchas

- Always restart `Solar Sim Service` workflow after editing `sim_service.py`.
- Always restart `artifacts/api-server: API Server` workflow after editing any route files.
- pvlib 0.15+ uses `open_rack_glass_glass` not `open_rack_cell_glass_glass`.
- The Node.js API server proxies to `SOLAR_SIM_URL` (default `http://localhost:5001`). Set this env var if running the Python service on a different port.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
