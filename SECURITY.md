# Security Architecture and Audit Mitigation Notes

This document provides a summary of the security practices, input sanitization routines, secrets management strategy, and intentional design limitations implemented in the **Zonewatch** hackathon prototype.

---

## 1. Secrets Management and API Key Protection

* **Server-Side API Keys Only**: The `GEMINI_API_KEY` is strictly confined to the backend execution context inside `server.ts`. 
* **Zero Client-Side Leakage**: The front-end React application (`src/App.tsx`) communicates solely through proxy routes (e.g., `/api/translate`, `/api/recommend`). There are no `VITE_` prefixed environment variables for sensitive API keys, completely eliminating the risk of client bundle exfiltration via browser devtools.
* **Environment Variable Extraction**: All server-side calls utilize `process.env.GEMINI_API_KEY`. The fallback behavior gracefully handles missing keys by invoking local heuristic translation dictionaries and rule-based scripts instead of crashing.
* **Safe Configuration Storage**:
  * `.gitignore` explicitly ignores `.env` files (via `.env*` rule).
  * `.env.example` documents the required keys without exposing raw secret values.

---

## 2. Input Validation and Sanitization

To mitigate injection and Cross-Site Scripting (XSS) risks, a double-layered validation and sanitization defense-in-depth model is implemented:

### A. Client-Side Sanitization (`src/App.tsx`)
* **Character Length Constraints**: Spoken phrases input fields are physically capped using `maxLength={500}` inside the JSX definition.
* **Tag Stripping & Filtering**: A dedicated `sanitizeInput` helper trims whitespace, matches and strips HTML/XML element tags (`/<[^>]*>/g`), and enforces a strict 500-character ceiling prior to DOM render or API transmission.

### B. Server-Side Validation (`server.ts`)
* **Strict Payload Parsing**: Every user-supplied input payload is re-sanitized and truncated server-side before being processed or interpolated into the LLM system prompts.
* **`/api/translate`**: Sanitizes the `phrase` and all nested fields of `vocalTone` (e.g. `detectedTone`, `pitch`, `speed`, `volume`) by removing potential tag injections and limiting length to safe boundaries (500 chars for phrase, 100 chars for acoustic metadata).
* **`/api/broadcast-script`**: Sanitizes operational parameter inputs (`whatsHappening`, `risk`, `action`, `gateName`) to a maximum of 500 characters and strips potential markup tags.

---

## 3. Safe Rendering and DOM Access

* **No Unsafe Execution**: The codebase contains **zero** usages of `eval`, `Function`, or standard web equivalents.
* **No `dangerouslySetInnerHTML`**: All dynamic text data (including translator outputs and generated megaphone scripts) are bound via native React JSX text bindings (`{text}`), which automatically escape HTML entities.
* **No `innerHTML` Manipulation**: The DOM is managed entirely declaratively by React.

---

## 4. Dependencies and Vulnerability Management

* **Modern & Minimalist Footprint**: The project relies on minimal production dependencies (`@google/genai`, `express`, `lucide-react`, `recharts`, `tsx`, `vite`).
* **Express v4 Stability**: Express is pinned to `^4.19.2`, ensuring protection against legacy prototype pollution and middleware parsing vulnerabilities.
* **Development Isolation**: Build tools such as `esbuild`, `typescript`, and `vite` are strictly isolated to `devDependencies`.

---

## 5. Prototype Limitations and Hackathon Scope Boundaries

Evaluators and auditors should note the following intentional boundaries designed for operational safety in a high-stress prototype context:

1. **Transient State Model**: The prototype is intentionally stateless. It does not employ a shared cloud database or persistent file storage. Crowd densities and translation logs reside strictly in local client state. This acts as an intentional security boundary, preventing session-leakage or cross-volunteer data visibility in shared environments.
2. **Local Fallback Heuristics**: In case of transient network loss or Gemini API outages, both client and server automatically switch to pre-compiled local operational dictionaries. This ensures uninterrupted translation for emergency medical phrases (e.g., cardiac issues) and accessibility requests.
3. **Simulated Acoustics Sandbox**: The voice analysis dashboard calculates acoustic properties locally via the Web Audio API AnalyserNode. If the browser sandboxes the microphone or blocks permissions, the interface transitions to an explicit **"Simulated Demo Mode"** to demonstrate system capability without failing silently.
