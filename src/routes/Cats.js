import express from "express";
import { Cat, Photo } from "../models/index.js";
import { validate } from "../middlewares/validate.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { catCreateSchema, catUpdateSchema, catListQuerySchema } from "../validation/catSchemas.js";

const router = express.Router();

/**
 * Normalize & validate payload:
 * - Kittens: require fatherId & motherId; no sireName/damName
 * - Breeders: no fatherId/motherId; optional sireName/damName
 */
function normalizePayload(body, existingType = null) {
  const allowed = [
    "name", "gender", "birthDate", "status", "type",
    "fatherId", "motherId",
    "sireName", "damName", "sireRegistration", "damRegistration"
  ];

  const data = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  if (!data.type && existingType) data.type = existingType;

  if (data.type === "kitten") {
    if (!data.fatherId || !data.motherId) {
      throw new Error("For a kitten, fatherId and motherId are required.");
    }
    data.sireName = null;
    data.damName = null;
    data.sireRegistration = null;
    data.damRegistration = null;
  }

  if (data.type === "breeder") {
    data.fatherId = null;
    data.motherId = null;
  }

  return data;
}

/* ------------------------------- PUBLIC GET ------------------------------ */
// ...

router.get("/", async (req, res, next) => {
  try {
    const parsed = catListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const err = new Error("Validation failed");
      err.statusCode = 400;
      err.details = parsed.error.format();
      return next(err);
    }

    const {
      page = 1,
      limit = 20,
      type,
      status,
      gender,
      sort = "createdAt:desc",
    } = parsed.data;

    // bornes raisonnables
    const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
    const safePage = Math.max(1, Number(page));
    const offset = (safePage - 1) * safeLimit;

    // filtres
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (gender) where.gender = gender;

    // tri
    const [field, dir] = sort.split(":");
    const order = [[field, dir.toUpperCase()]];

    const { rows, count } = await Cat.findAndCountAll({
      where,
      include: [{ model: Photo }],
      order,
      limit: safeLimit,
      offset,
    });

    const totalPages = Math.ceil(count / safeLimit);

    res.json({
      meta: {
        page: safePage,
        limit: safeLimit,
        total: count,
        totalPages,
        sort,
        filters: { type, status, gender },
      },
      data: rows,
    });
  } catch (e) {
    next(e);
  }
});


// Get one cat
router.get("/:id", async (req, res) => {
  try {
    const cat = await Cat.findByPk(req.params.id, {
      include: [{ model: Photo }],
    });
    if (!cat) return res.status(404).json({ error: "Cat not found" });
    res.json(cat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch cat" });
  }
});

/* ------------------------------ ADMIN-ONLY ------------------------------- */

// Create
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validate(catCreateSchema),
  async (req, res) => {
    try {
      const data = normalizePayload(req.body);
      const newCat = await Cat.create(data);
      res.status(201).json(newCat);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: error.message || "Failed to create cat" });
    }
  }
);

// Update
router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(catUpdateSchema),
  async (req, res) => {
    try {
      const cat = await Cat.findByPk(req.params.id);
      if (!cat) return res.status(404).json({ error: "Cat not found" });

      const data = normalizePayload(req.body, cat.type);
      await cat.update(data);
      res.json(cat);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: error.message || "Failed to update cat" });
    }
  }
);

// Delete
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const cat = await Cat.findByPk(req.params.id);
      if (!cat) return res.status(404).json({ error: "Cat not found" });

      await cat.destroy();
      res.json({ message: "Cat deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete cat" });
    }
  }
);

export default router;
