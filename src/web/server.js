const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const uploadRoutes = require("./routes/uploads");
const { startCleanupJob } = require("./services/cleanup");

function createWebServer(client) {
  const app = express();

  const PUBLIC_DIR = path.join(__dirname, "public");
  const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

  console.log("📂 __dirname:", __dirname);
  console.log("📂 PUBLIC_DIR:", PUBLIC_DIR);
  console.log(
    "📂 index.html existe:",
    fs.existsSync(path.join(PUBLIC_DIR, "index.html")),
  );
  console.log(
    "📂 app.js existe:",
    fs.existsSync(path.join(PUBLIC_DIR, "app.js")),
  );
  console.log(
    "📂 style.css existe:",
    fs.existsSync(path.join(PUBLIC_DIR, "style.css")),
  );
  console.log("📂 uploads/ existe:", fs.existsSync(UPLOADS_DIR));

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log("📂 Carpeta uploads/ creada");
  }

  // Middlewares base
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Sesiones
  app.use(
    session({
      secret: process.env.DASHBOARD_SECRET || "dev-secret-cambiar",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
    }),
  );

  // Estáticos
  app.use(express.static(PUBLIC_DIR));
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Rutas API
  app.set("discordClient", client);
  app.use("/api", authRoutes);
  app.use("/api", uploadRoutes());
  app.use("/api", apiRoutes(client));

  // Ruta raíz
  app.get("/", (req, res) => {
    const indexPath = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("Falta src/web/public/index.html");
    }
  });

  // 404 (silenciando ruido del navegador)
  app.use((req, res) => {
    // Ignorar favicon y Chrome DevTools
    if (
      req.url === "/favicon.ico" ||
      req.url === "/favicon.png" ||
      req.url.startsWith("/.well-known/")
    ) {
      return res.status(204).end();
    }
    console.log("❓ 404:", req.method, req.url);
    res.status(404).json({ error: "Ruta no encontrada", path: req.url });
  });

  // Puerto
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🌐 Dashboard: http://localhost:${port}`);
  });

  // Iniciar limpieza automática
  startCleanupJob(30);

  return app;
}

module.exports = { createWebServer };
