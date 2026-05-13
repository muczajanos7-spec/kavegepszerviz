import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import apiRouter from "./src/server/routes/api.ts";
import { supabase } from "./src/server/lib/supabase.ts";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/api", apiRouter);

  app.get("/api/health", async (req, res) => {
    try {
      const { data, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: error ? "error" : "connected",
        db_error: error ? error.message : null
      });
    } catch (err: any) {
      res.json({ status: "degraded", error: err.message });
    }
  });

  // Proxy/Wrapper for common data needs could go here
  // For example, fetching machine status or managing appointments server-side
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer();
