import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import { User, Cat, Photo } from "./models/index.js";
import catsRouter from "./routes/Cats.js";
import photosRouter from "./routes/Photos.js";
import authRouter from "./routes/Auth.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middlewares/errorHandler.js";

const openapiDocument = YAML.load("./src/docs/openapi.yaml");


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(express.json()); // ✅ pour lire le JSON dans req.body

app.get("/", (req, res) => {
  res.send("Cattery backend is running 🚀");
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get("/docs.json", (_req, res) => res.json(openapiDocument));

app.use("/cats", catsRouter); // ✅ brancher la route
app.use("/photos", photosRouter);
app.use("/auth", authRouter);

app.use(errorHandler);

// DB init
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true }); // crée/altère les tables en dev
    }
    console.log("✅ Tables synced with DB.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
})();

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
