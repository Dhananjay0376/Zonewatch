# 🏟️ Zonewatch

**Volunteer Copilot for FIFA World Cup 2026 Stadium Operations**

Zonewatch is an intelligent, real-time stadium operations platform that equips volunteers and coordinators with GenAI-powered tools to manage crowd safety, assist multilingual fans, provide wayfinding, track sustainability impact, and coordinate swift gate-management actions — all from a single, beautifully designed dashboard.

---

## 🎯 Problem Statement Alignment

Zonewatch directly addresses all pillars of the FIFA World Cup 2026 challenge:

| Pillar | Feature | Status |
|---|---|---|
| Crowd Management | Live gate density telemetry, surge alerts, AI redirect advisories | ✅ Active |
| Operational Intelligence | Gemini Copilot tactical engine, historical trend analysis | ✅ Active |
| Multilingual Assistance | Real-time supporter translation + triage in 9+ languages | ✅ Active |
| Accessibility | Medical/Accessibility triage, wheelchair route assistance | ✅ Active |
| Real-time Decision Support | Live megaphone scripts, TTS broadcast, acoustic tone analysis | ✅ Active |
| Navigation | GenAI-powered fan wayfinding in 6 languages | ✅ Active |
| Transportation | Shuttle/metro connection info, ride-share zones | ✅ Active |
| Sustainability | Live crowd flow efficiency, CO₂ & energy savings tracking | ✅ Active |

---

## ✨ Core Features

### 🚦 Crowd Management & Copilot Intelligence Engine
- **Live Density Telemetry**: Monitors real-time crowd density (%) at Gates B, C, D, E with 5-second update intervals
- **Hysteresis Alerting**: Triggers Gemini advisories at ≥80% density; resolves when density drops below 75%
- **Gemini Tactical Plans**: Each alert includes operational telemetry, risk matrix, and tactical redirection with AI reasoning
- **Simulate Rush**: Demo button that smoothly ramps two gates to critical thresholds over 18 seconds
- **Mock Telemetry Upload**: Drag-and-drop CSV/PDF upload — CSVs parsed locally; PDFs processed via Gemini file API

### 🗺️ Fan Navigation Assistant (NEW)
- **GenAI Wayfinding**: Volunteers answer fan location queries with Gemini-generated step-by-step directions
- **6 Output Languages**: English, Spanish, French, German, Japanese, Portuguese
- **Quick Presets**: One-click answers for restrooms, medical, accessibility, transport, food, parking
- **Accessibility-First**: Highlights elevator/ramp routes for mobility-impaired fans
- **Transportation Info**: Shows bus, metro, and ride-share pickup points relative to the fan's location

### 🌍 Multilingual Fan Translator
- **9+ Language Detection**: Supports Spanish, French, German, Japanese, Hindi, Portuguese, Arabic, Chinese, and more
- **Urgency Triage**: Classifies each phrase as Casual / Urgent / Medical / Accessibility
- **Acoustic Tone Analysis**: Uses Web Audio API to measure dB, Hz, and speech cadence; Gemini interprets emotional state
- **Suggested Replies**: Provides the volunteer with a ready-to-say response in the fan's language
- **TTS Playback**: All text rendered with speech synthesis at the correct language pitch/rate

### 📢 Megaphone Broadcast System
- **3-Language Scripts**: AI-generated English / Spanish / French megaphone announcements per alert
- **Simulated Broadcast**: TTS playback of the selected script with animated audio-level indicator
- **Clipboard Copy**: One-click copy for scripts — usable on physical megaphones or PA systems
- **Focus-Trapped Modal**: Fully keyboard-navigable with Escape key dismissal

### 🌱 Sustainability Impact Tracker (NEW)
- **Live Flow Efficiency**: Calculated as inverse of crowd imbalance across all active gates
- **CO₂ Savings**: Estimates kilograms of emissions saved via reduced congestion dwell times
- **Energy Savings**: Tracks kWh saved through reduced HVAC and lighting load in crowd-cleared zones
- **AI Impact Statement**: Contextual explanation of how routing decisions reduce environmental footprint

### 🗃️ Telemetry Ingestion (CSV / PDF)
- **Structured CSV Parsing**: Handled entirely via local regex-based parsing for maximum speed and reliability
- **PDF Parsing**: Sent to Gemini file API for unstructured text extraction
- **Automatic History Generation**: Reconstructs 5-point trend windows from parsed data

---

## 🛡️ Resilience Architecture (Multi-Tier Fallbacks)

Zonewatch maintains 100% operational uptime even when Gemini is unavailable:

| Endpoint | Primary | Fallback |
|---|---|---|
| `/api/recommend` | Gemini 2.0 Flash | Rule-based gate selection algorithm |
| `/api/broadcast-script` | Gemini 2.0 Flash | Pre-written high-clarity 3-language scripts |
| `/api/translate` | Gemini 2.0 Flash | Keyword-based multilingual detection engine |
| `/api/navigation` | Gemini 2.0 Flash | Facility-type pattern matching |
| `/api/parse-mock-file` | Local CSV parser → Gemini | Realistic surge scenario dataset |

---

## 💻 Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Configuration** — create `.env` in the project root:
   ```env
   GEMINI_API_KEY=your_api_key_here
   DEBUG=false
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
4. **Run Tests**:
   ```bash
   npm test
   ```

---

## ♿ Accessibility & WCAG 2.1 AA Compliance

1. **Semantic HTML**: All interactive elements use `<button>`, `<select>`, `<input>`, and `<a>` with proper roles
2. **Keyboard Navigation**: Full keyboard operability (`Tab`, `Space`, `Enter`, `Escape`) throughout
3. **Focus Trapping**: Megaphone modal traps focus and restores it on close
4. **ARIA Labels**: All icon-only buttons carry descriptive `aria-label` attributes
5. **Live Regions**: Alerts and AI results wrapped in `aria-live="polite"` for screen-reader announcements
6. **High Contrast**: All text meets 4.5:1 contrast ratio against dark backgrounds
7. **Non-Color Indicators**: Gate status uses text labels alongside colour codes

---

## 🏗️ Architecture

```
zonewatch/
├── server/
│   ├── routes/api.ts          # Express routes (typed, no `any`)
│   ├── services/gemini.ts     # Gemini model retry with cooldown
│   ├── services/fallbacks.ts  # Fully-typed rule-based fallbacks
│   └── types.ts               # Server-side TypeScript interfaces
├── src/
│   ├── components/            # Lazy-loaded React components
│   │   ├── GateRadarMap.tsx   # SVG radar map with flow vectors
│   │   ├── TranslationConsole.tsx
│   │   ├── MegaphoneControl.tsx
│   │   ├── NavigationPanel.tsx      # GenAI fan wayfinding
│   │   ├── SustainabilityWidget.tsx # Live sustainability metrics
│   │   ├── HowItWorks.tsx
│   │   └── ConsoleLogs.tsx
│   ├── hooks/                 # Custom React hooks
│   │   ├── useStadiumGates.ts    # Core simulation + Gemini alerts
│   │   ├── useAcousticSensor.ts  # Web Audio API + speech recognition
│   │   ├── useSpeechSynthesis.ts # TTS playback
│   │   ├── useTelemetryUpload.ts # File upload lifecycle
│   │   ├── useBroadcastManager.ts # Megaphone state
│   │   └── useAlertExpansion.ts  # Per-alert UI state
│   ├── utils/
│   │   ├── gateUtils.ts  # Pure utilities + density config
│   │   └── math.ts       # Simulation math
│   ├── types.ts          # Shared TypeScript interfaces
│   └── App.tsx           # Root composition layer (~380 lines)
```

---

## 🔐 Security

- Server-side HTML sanitisation on all API inputs (strip tags, max-length enforcement)
- No API keys exposed client-side — all Gemini calls go through the Express proxy
- See [SECURITY.md](./SECURITY.md) for the full responsible disclosure policy
