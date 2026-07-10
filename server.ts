/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes/api";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount API router
app.use("/api", apiRouter);

async function init() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Prevent starting port listening when running as a Vercel serverless function
  if (!process.env.VERCEL) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Zonewatch custom full-stack server running on http://0.0.0.0:${PORT}`);
    });
  }
}

init().catch(console.error);

export default app;
