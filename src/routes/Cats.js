import express from "express";
import { Cat, Photo } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  catListQuerySchema,
  catCreateSchema,
  catUpdateSchema,
} from "../validation/catSchemas.js";

const router = express.Router();

/* --------------------------------- Utils --------------------------------- */
function boom(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

/* ------------------------------- PUBLIC GET ------------------------------ */
/**
 * GET /cats
 * Query: page, limit, sort (ex: createdAt:desc), filters: type|status|gender
 */
router.get("/", async (req, res, next) => {
  try {
    const parsed = catListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const err = boom("Validation failed", 400);
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

    const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
    const safePage = Math.max(1, Number(page));
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (gender) where.gender = gender;

    const [field, dir] = sort.split(":");
    const order = [[field, (dir || "DESC").toUpperCase()]];

    const { rows, count } = await Cat.findAndCountAll({
      where,
      include: [{ model: Photo }],
      order,
      limit: safeLimit,
      offset,
    });

    res.json({
      meta: {
        page: safePage,
        limit: safeLimit,
        total: count,
        totalPages: Math.ceil(count / safeLimit),
        sort,
        filters: { type: type ?? null, status: status ?? null, gender: gender ?? null },
      },
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /cats/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const cat = await Cat.findByPk(req.params.id, {
      include: [{ model: Photo }],
    });
    if (!cat) return res.status(404).json({ error: "Cat not found" });
    res.json(cat);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ ADMIN-ONLY ------------------------------- */
/**
 * POST /cats
 */
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validate(catCreateSchema),
  async (req, res, next) => {
    try {
      const cat = await Cat.create(req.body);
      res.status(201).json(cat);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /cats/:id
 */
router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(catUpdateSchema),
  async (req, res, next) => {
    try {
      const cat = await Cat.findByPk(req.params.id);
      if (!cat) return res.status(404).json({ error: "Cat not found" });

      await cat.update(req.body);
      res.json(cat);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /cats/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const cat = await Cat.findByPk(req.params.id);
      if (!cat) return res.status(404).json({ error: "Cat not found" });

      await cat.destroy();
      res.json({ message: "Cat deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
