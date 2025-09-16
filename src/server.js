import "dotenv/config.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import sequelize from "./config/database.js";
import "./models/index.js";

import authRouter from "./routes/Auth.js";
import catsRouter from "./routes/Cats.js";
import photosRouter from "./routes/Photos.js";
import  errorHandler from "./middlewares/errorHandler.js";

const app = express();

// Middleware globaux
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Swagger docs
const swaggerDocument = YAML.load("./src/docs/openapi.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use("/auth", authRouter);
app.use("/cats", catsRouter);
app.use("/photos", photosRouter);
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Error handler global
app.use(errorHandler);

/* ----------------------------- DB INIT LOGIC ----------------------------- */
async function initDatabase() {
  const isProd = process.env.NODE_ENV === "production";
  const doSync = process.env.DB_SYNC === "true" && !isProd;

  await sequelize.authenticate();
  console.log("[DB] Connected");

  if (doSync) {
    const alter = process.env.DB_SYNC_ALTER === "true";
    const force = process.env.DB_SYNC_FORCE === "true";
    console.log(`[DB] Sync starting (alter=${alter}, force=${force})`);
    await sequelize.sync({ alter, force });
    console.log("[DB] Sync done");
  } else {
    console.log("[DB] Sync skipped (production or DB_SYNC not true)");
    if (isProd) {
      await assertTablesExist(["Users", "Cats", "Photos"]);
    }
  }
}

async function assertTablesExist(expected) {
  const qi = sequelize.getQueryInterface();
  const schemas = await qi.showAllSchemas();
  const tables = schemas.map((t) => {
    if (typeof t === "string") return t;
    return t.tableName || t.TABLE_NAME || Object.values(t)[0];
  });

  const missing = expected.filter((name) => !tables.includes(name));
  if (missing.length) {
    throw new Error(
      `[DB] Missing tables in production: ${missing.join(", ")}. ` +
      `Create them before starting the app (ex: run your SQL init or migrations).`
    );
  }
}

/* ------------------------------- BOOTSTRAP ------------------------------- */
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[Server] Startup failed:", err);
    process.exit(1);
  }
})();

export default app;
