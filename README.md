
# TrekkingTime Pro

Production-grade client-side GPX route analytics for hiking, trekking, and trail planning.

## 1. Project Overview

### What this app does

TrekkingTime Pro ingests a GPX track, computes terrain-aware route statistics, estimates moving time using multiple classic and scientific hiking models, and renders a synchronized map/profile planning dashboard.

The application is intended for:

1. Day hikers and trekkers planning route duration.
2. Trail runners comparing pace assumptions against terrain complexity.
3. Outdoor guides and trip leaders who need conservative ETA and daylight-risk checks.

### Problem it solves

Manual GPX inspection often underestimates terrain impact and ignores uncertainty between pacing models. TrekkingTime Pro solves this by:

1. Parsing track geometry and elevation directly from GPX.
2. Running five independent time-estimation methods.
3. Producing a robust aggregate estimate that resists outlier formulas.
4. Combining route data with forecast and sunset data for operational planning.

### High-level data sources

Current implementation uses:

1. Uploaded GPX files (required): source of track points, elevation profile, and route geometry.
2. Open-Meteo Forecast API (optional but integrated): daily and hourly weather on selected trip date for the route start point.

Not currently used:

1. CSV ingestion.
2. Local JSON datasets for route history.
3. Authentication-protected APIs.
4. Persistent server-side storage.

### Key features

1. Multi-model hike duration estimation:
    1. Naismith.
    2. Tobler.
    3. Munter.
    4. Swiss DIN 33466 style hybrid.
    5. Petzoldt Energy Mile.
2. Smart aggregate estimate using mean/median switching based on disagreement threshold.
3. Interactive map with base-layer switching and route hover synchronization.
4. Elevation profile with slope heat-gradient and configurable smoothing levels.
5. Difficulty scoring with route-characteristics tagging.
6. Bio-planning metrics: calories and water.
7. Safety signal: night-hiking warning based on planned start time and sunset.
8. Print-friendly report output for field use.

## 2. Architecture and System Design

### Architectural style

The system is a browser-only, single-page React + TypeScript application with deterministic local computation and optional remote weather enrichment.

Execution model:

1. Presentation and orchestration in React components.
2. Domain logic in pure service modules.
3. External API call isolated in weather service.

### Module boundaries

1. App shell and orchestration:
    1. `App.tsx`.
2. Domain services:
    1. `services/geoUtils.ts` for GPX parsing, geodesic distance, smoothing, and slope breakdown.
    2. `services/calcService.ts` for timing models, aggregate selection, difficulty, biometrics, safety.
    3. `services/weatherService.ts` for Open-Meteo integration and weather-code decoding.
3. Visualization components:
    1. `components/MapDisplay.tsx`.
    2. `components/ElevationProfile.tsx`.
    3. `components/StatsCards.tsx`.
4. Shared contracts:
    1. `types.ts`.

### Data-flow lifecycle

1. User uploads GPX via file input.
2. `parseGPX` parses XML and emits normalized `RouteStats` + point array.
3. App state updates trigger recomputation effects:
    1. Difficulty and algorithm estimates.
    2. Aggregate estimate selection.
    3. Biometrics and safety metrics.
4. `useMemo` computes smoothed points and dynamic slope breakdown for selected smoothing level.
5. Date/stat changes trigger weather fetch from Open-Meteo.
6. UI renders map, profile, weather, metrics, and warnings from current state snapshot.

### ETL pipeline (implemented in-browser)

Although there is no server ETL job, the app performs a full mini-ETL pipeline at runtime.

1. Ingestion:
    1. Read GPX text from local file.
    2. Parse XML track points (`trkpt`) and elevation (`ele`).
2. Cleaning:
    1. Validate non-empty trackpoint set.
    2. Ignore micro-elevation changes (`|delta ele| <= 0.5m`) when accumulating gain/loss to reduce sensor jitter impact.
3. Transformation:
    1. Compute cumulative distance using Haversine over sequential points.
    2. Compute per-segment slope percentages.
    3. Produce summary route stats (distance, ascent, descent, min/max elevation, average absolute slope).
4. Feature extraction:
    1. Slope bucket distances (flat, mild/moderate/steep up/down).
    2. Difficulty features (effort score, high-altitude tags, steep start detection, uphill finish detection).
    3. Planning features (estimated finish time, daylight risk, hydration and caloric demand).
5. Visualization delivery:
    1. Downsample + smooth elevation for chart stability/performance.
    2. Render synchronized map polyline and elevation area chart.

### State management

State is local React state (`useState`) and memoized derivations (`useMemo`). No Redux/store library is required due to bounded complexity.

Primary state groups:

1. Route data: `stats`.
2. User profile and scenario controls: `fitness`, `pace`, `weight`, `includeBreaks`, `selectedDate`, `startTime`, `smoothingLevel`.
3. External enrichment: `weather`, `weatherLoading`, `weatherError`.
4. Derived analytics: `estimations`, `aggregate`, `difficulty`, `bioMetrics`, `safety`, `currentSlopeBreakdown`.
5. Interaction state: `hoveredPoint` for cross-highlighting between map and chart.

### Chart generation strategy

Elevation chart pipeline:

1. Downsample points to target approximately 1000 samples for rendering performance.
2. Recompute slope on downsampled stream.
3. Apply moving-average smoothing with window size by user level:
    1. Raw: no smoothing.
    2. Low: 5-point.
    3. Medium: 15-point.
    4. High: 40-point.
    5. Max: 80-point.
4. Render Recharts `AreaChart` with gradient color stops interpolated from slope.
5. Keep Y-domain pinned to raw min/max (with margin) to avoid visual frame jumping across smoothing levels.

### Filter and control behavior

Control changes trigger deterministic recalculation:

1. Fitness, pace, pack, breaks change all time models and derived outputs.
2. Date triggers weather re-fetch.
3. Start time updates finish-time and night-warning logic.
4. Smoothing modifies profile and slope-distribution visual summary.

### API behavior, authentication, limits, caching, pagination

1. API endpoint: Open-Meteo forecast endpoint with single-day range.
2. Authentication: none required.
3. Pagination: not applicable (single request returns requested day arrays).
4. Caching: no explicit app-level cache; browser/network cache semantics apply.
5. Rate limiting: no local throttling for weather calls beyond dependency-triggered effect cadence; operational deployments should still respect provider fair-use policies.

## 3. Detailed Feature Breakdown

### A. Upload and initialization section

What users see:

1. A focused upload card with GPX file selector.
2. Validation error message if parsing fails.

Data used:

1. Local GPX file content.

Behind-the-scenes processing:

1. FileReader loads text.
2. XML parse and track-point extraction.
3. Route-stat derivation and state reset for old weather/hover/smoothing context.

User insight:

1. Immediate conversion from raw GPX to actionable stats.

Interactive elements:

1. File picker.

### B. Route summary cards

What users see:

1. Distance.
2. Elevation gain.
3. Elevation loss.
4. Max altitude.
5. Min altitude.

Data used:

1. `RouteStats` scalar fields from GPX parse.

Behind-the-scenes processing:

1. Precomputed route-level aggregations from parser.

User insight:

1. Fast objective route profile before deeper planning.

Interactive elements:

1. Pure display; no controls.

### C. Plan and profile controls

What users see:

1. Trip date selector.
2. Start time selector.
3. Fitness level selection.
4. Pace/style selection.
5. Pack weight selection.
6. Include-rest-breaks toggle.

Data used:

1. User-selected scenario values.
2. Existing route stats and weather.

Behind-the-scenes processing:

1. Speed model synthesis from fitness x pace x pack modifiers.
2. Full re-evaluation of all time models and dependent metrics.

User insight:

1. Scenario testing (conservative vs aggressive assumptions).

Interactive elements:

1. Date/time inputs.
2. Select dropdowns.
3. Break toggle switch.

### D. Time-estimation panel

What users see:

1. Primary estimated moving time (aggregate).
2. Optional finish-time display.
3. Per-method estimate list.
4. Night-hiking warning if finish occurs after sunset.

Data used:

1. Outputs from all timing algorithms.
2. Smart aggregate output.
3. Start time and sunset.

Behind-the-scenes processing:

1. Mean and median disagreement test.
2. Break-time augmentation rule unless running pace.
3. Safety comparison between projected finish and sunset timestamp.

User insight:

1. Robust ETA plus spread across methodologies.

Interactive elements:

1. Inputs in control panel indirectly update this panel.

### E. Terrain slope analysis block

What users see:

1. Horizontal bar distribution across slope classes.
2. Percentage and absolute km per class.

Data used:

1. Smoothed point stream.
2. Current total route distance.

Behind-the-scenes processing:

1. Segment-level slope classification into seven bins.
2. Aggregate segment distances per bin.

User insight:

1. Terrain character composition (flat, climbing, descending, technical).

Interactive elements:

1. Responds to smoothing level changes.

### F. Map section

What users see:

1. Route polyline.
2. Start and finish markers.
3. Hover marker when synchronized with profile/map cursor.
4. Selectable base maps (Topo, OSM, CyclOSM, Satellite).

Data used:

1. Original GPX points.

Behind-the-scenes processing:

1. Auto fit-bounds on route.
2. Throttled pointer events.
3. Nearest-point search (every second point heuristic) for hover linking.

User insight:

1. Spatial context and terrain interpretation with map style switching.

Interactive elements:

1. Pan/zoom.
2. Layer control.
3. Hover synchronization.

### G. Weather forecast widget

What users see:

1. Max/min/feels-like temperature.
2. Description and precipitation probability.
3. Wind and gusts.
4. Precipitation volume.
5. UV index.
6. Pressure, cloud cover, humidity proxy via aggregated hourly fields.
7. Sunrise and sunset times.

Data used:

1. Open-Meteo daily fields.
2. Open-Meteo hourly arrays averaged for key atmosphere values.

Behind-the-scenes processing:

1. One-day forecast request keyed by route start lat/lon and selected date.
2. WMO weather-code translation.
3. Fallback defaults if hourly arrays absent.

User insight:

1. Operational weather feasibility and hydration/UV awareness.

Interactive elements:

1. Date selector drives refresh.

### H. Difficulty panel

What users see:

1. Difficulty label from Very Easy to Extreme.
2. Numeric effort points.
3. Descriptive route tag (for example, High Altitude, Steep Start).
4. Equivalent flat distance statement.

Data used:

1. Route distance, gain, elevation extrema, and slope distribution.

Behind-the-scenes processing:

1. Effort score = distance + gain/100.
2. Rule-based route-characteristic extraction.
3. Threshold-based label mapping.

User insight:

1. Difficulty framing that is easy to communicate and compare across routes.

Interactive elements:

1. Recomputed with new GPX upload.

### I. Elevation profile section

What users see:

1. Elevation area chart over cumulative distance.
2. Slope-colored gradient (descent -> flat -> climb).
3. Tooltip with km, altitude, slope percent, and textual terrain cue.
4. Vertical reference marker linked to hovered map point.
5. Smoothing control cycling through levels.

Data used:

1. Raw points for axis range stability.
2. Smoothed points for rendered series.

Behind-the-scenes processing:

1. Moving-average smoothing.
2. Dynamic RGB interpolation by slope value.
3. Bidirectional hover coordination with map.

User insight:

1. Fine-grained understanding of where hard climbs/descents occur.

Interactive elements:

1. Hover tooltips.
2. Smoothing switch.

## 4. Data Engineering Details

### Cleaning and quality controls

1. Missing point protection: hard fail when no `trkpt` elements exist.
2. Noise suppression in gain/loss: tiny elevation oscillations under 0.5m ignored.
3. Numerical guards:
    1. Segment distance threshold checks to avoid division instability.
    2. Tobler velocity clamp at minimum 0.5 km/h to prevent infinite/unstable times on extreme slope artifacts.

### Outliers and jitter handling

1. GPS jitter impact is reduced through:
    1. Elevation delta thresholding for ascent/descent accumulation.
    2. Downsampling prior to smoothing for profile rendering.
2. Estimation-model outliers are addressed by aggregate fallback to median when disagreement exceeds 10%.

### Transformations and aggregations

1. Geodesic aggregation via Haversine per segment.
2. Cumulative distance emission for every point.
3. Slope segmentation and class-bucket distance totals.
4. Hourly weather arrays aggregated by arithmetic mean for pressure/cloud/humidity signals.

### Rolling windows and smoothing

Smoothing uses centered moving-average windows over downsampled series:

1. 5-point, 15-point, 40-point, 80-point modes.
2. Both elevation and slope are smoothed for visual coherence.

### Normalization and scaling

1. Tobler output scales route-segment integrated velocity by user-specific base speed ratio.
2. Swiss model scales horizontal/vertical timing terms with relative speed factor.

### Domain-specific metrics

Implemented:

1. Pace-aware estimated moving time across five domain methods.
2. Slope-class distribution by route distance.
3. Equivalent flat kilometers (`distance + gain/100`).
4. Difficulty category and route-characteristic tags.
5. Caloric expenditure proxy based on MET-like heuristics and load.
6. Hydration requirement proxy adjusted by heat, pace, and grade.
7. Sunset risk boolean from finish-time projection.

Not implemented in current version:

1. Heart-rate zones.
2. Segment clustering.
3. PCA dimensionality reduction.
4. Historical trend analytics over multiple activities.

## 5. Machine Learning and Analytics

### ML scope in current build

This version does not run statistical learning models (regression, clustering, PCA, SHAP, VDOT, Riegel fitting). The analytics layer is deterministic and rule/formula-based, which is appropriate for transparent route planning and low-latency browser execution.

### Why this approach was chosen

1. Explainability: each estimate is physically interpretable and user-auditable.
2. Reliability with small/no historical datasets: avoids overfitting and model drift.
3. Operational simplicity: no training pipeline, no model artifacts, no backend inference service.
4. Privacy: no route data leaves device except optional weather lookup using start coordinates/date.

### Future ML extensions (recommended)

1. Personalized pace regression from historical GPX traces.
2. Terrain-segment clustering to classify route micro-patterns.
3. Bayesian uncertainty bands around ETA.
4. Feature attribution of ETA drivers (distance vs gain vs steepness mix).

## 6. Visualizations

### Map visualization

Technology:

1. Leaflet via React-Leaflet.

What it computes/displays:

1. Route polyline from GPX coordinates.
2. Start/end markers.
3. Hovered route point marker for cross-view context.

Why useful:

1. Geographic orientation and terrain map interpretation by layer style.

Interactivity:

1. Layer switcher.
2. Mousemove nearest-point sync to chart.
3. Auto-recenter/fit bounds on route load.

### Elevation profile visualization

Technology:

1. Recharts `AreaChart`.

What it computes/displays:

1. Elevation over cumulative distance.
2. Slope-colored line/fill gradient using interpolation over defined slope stops.
3. Context-aware tooltip with slope semantics.

Why useful:

1. Identifies effort hotspots and pacing breakpoints along route progression.

Interactivity:

1. Smoothing-level cycling.
2. Hover details and map-linked reference line/dot.

### Statistical cards and categorical meters

Technology:

1. React components + utility-first styling.

What they compute/display:

1. Route scalar stats.
2. Slope distribution percentages.
3. Difficulty grade and equivalent flat distance.

Why useful:

1. Compresses complex route geometry into planning-ready indicators.

## 7. Technical Stack

### Languages and frameworks

1. TypeScript.
2. React 19.
3. Vite build/dev tooling.

### Libraries

1. `react-leaflet` + `leaflet` for maps.
2. `recharts` for profile charting.
3. `lucide-react` for iconography.

### Frontend/backend split

1. Frontend: complete application logic and UI.
2. Backend: none in current architecture.
3. External dependency: Open-Meteo public API.

### Deployment profile

1. Static deploy compatible (for example: GitHub Pages, Netlify, Vercel static hosting).
2. No server runtime required.

## 8. How to Run the Project

### Prerequisites

1. Node.js 18+ recommended.
2. npm (or compatible package manager).

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview production build locally

```bash
npm run preview
```

### Environment variables and API keys

1. No environment variables are required in the current implementation.
2. No API key is required for the configured Open-Meteo usage pattern.

### Input requirements

1. Upload a valid GPX file containing at least one track segment with `trkpt` nodes.

## 9. Advanced Notes

### Performance considerations

1. Profile rendering optimization:
    1. Downsampling to about 1000 points keeps chart responsive on large tracks.
    2. Map mousemove processing is throttled (~50ms cadence).
    3. Nearest-point search checks every second point for speed/latency balance.
2. Computation model:
    1. Heavy computations are local and deterministic.
    2. Memoization avoids redundant smoothing work across unrelated state changes.

### Current limitations

1. Weather uses route start coordinate only; no route-wide microclimate sampling.
2. No offline weather cache.
3. No persistent user profiles.
4. Difficulty and biometrics are heuristic, not laboratory-calibrated.
5. No timezone edge-case hardening beyond provider `timezone=auto` behavior.

### Known issues and edge cases

1. Extremely noisy GPX elevation can still affect slope-sensitive methods despite filtering.
2. Very sparse GPX tracks may under-represent true terrain variability.
3. Sunset logic currently aligns sunset date to local day from start-time context and may need stricter timezone normalization for cross-timezone usage.

### Recommended future improvements

1. Add route weather sampling at regular waypoints and compute worst-case envelope.
2. Add local/session caching for weather responses.
3. Introduce uncertainty intervals and confidence scoring for ETA.
4. Add GPX quality diagnostics (point density, elevation noise score, anomalous jumps).
5. Add optional export (PDF/JSON) for field plans.
6. Add test suites for parsers, formulas, and edge-case date/time handling.

## 10. Engineering Notes and Best-Practice Positioning

This repository already follows a strong separation between UI orchestration and domain computation. For production hardening, prioritize:

1. Unit tests around formula implementations and slope bucketing.
2. Integration tests for GPX ingestion and weather-failure handling.
3. Observability hooks (structured logging around parse/API failures).
4. Defensive date/time handling for locale/timezone consistency.
5. Optional Web Worker offloading for very large GPX files.

## Formula Appendix

### Naismith variant

Time is modeled as:
$$
t = \frac{d}{v} + \frac{gain}{c}
$$
where $d$ is distance in km, $v$ is profile speed, and $c$ is climb factor (600m/h default, 800m/h for top fitness tiers).

### Tobler function

Per-segment velocity:
$$
V = 6e^{-3.5|m+0.05|}
$$
where $m$ is segment slope ratio. Segment times are integrated across the route and scaled to user profile speed.

### Swiss hybrid

Horizontal and vertical terms are combined by:
$$
t = \max(t_h, t_v) + 0.5\min(t_h, t_v)
$$

### Smart aggregate rule

Given per-model estimates:

1. Compute mean and median.
2. If relative disagreement exceeds 10%, choose median.
3. Otherwise choose mean.

## Disclaimer

This software provides planning estimates, not safety guarantees. Real-world outcomes vary due to weather shifts, trail conditions, navigation decisions, fatigue, load, group dynamics, and emergency constraints. Always carry appropriate equipment, map/compass backup, and contingency time.
