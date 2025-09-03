import express from "express";
import { Op } from "sequelize";
import { Cat, Photo } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { uploadSingleImage } from "../middlewares/upload.js";
import { uploadImage, deleteImage } from "../services/cloudinaryService.js";

import {
  photosListQuerySchema,
  photoUploadSchema,
  photoUpdateSchema,
} from "../validation/photoSchemas.js";

const router = express.Router();

/* --------------------------------- Utils --------------------------------- */
function boom(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

/* ------------------------------- PUBLIC GET ------------------------------ */
/**
 * GET /photos?catId=1&page=1&limit=20&sort=position:asc
 * - Public
 * - Pagination + tri (par défaut: position asc)
 */
router.get("/", async (req, res, next) => {
  try {
    const parsed = photosListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const err = boom("Validation failed", 400);
      err.details = parsed.error.format();
      return next(err);
    }

    const {
      catId,
      page = 1,
      limit = 20,
      sort = "position:asc",
    } = parsed.data;

    const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
    const safePage = Math.max(1, Number(page));
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (catId) where.catId = catId;

    const [field, dir] = sort.split(":");
    const order = [[field, dir.toUpperCase()], ["id", "ASC"]];

    const { rows, count } = await Photo.findAndCountAll({
      where,
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
        filters: { catId: catId ?? null },
      },
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ ADMIN-ONLY ------------------------------- */
/**
 * POST /photos/upload
 * - Admin
 * - multipart/form-data: fields { catId, cover?, position? }, file field "file"
 * - Upload vers Cloudinary puis création en DB
 */
router.post(
  "/upload",
  requireAuth,
  requireRole("admin"),
  uploadSingleImage, // -> req.file, req.body (strings)
  (req, _res, next) => {
    const parsed = photoUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = boom("Validation failed", 400);
      err.details = parsed.error.format();
      return next(err);
    }
    req.body = parsed.data;
    next();
  },
  async (req, res, next) => {
    try {
      const { catId, cover, position } = req.body;

      if (!req.file) throw boom("file is required (multipart field 'file')");

      const cat = await Cat.findByPk(catId);
      if (!cat) throw boom("Cat not found", 404);

      const result = await uploadImage(req.file.buffer); // -> { secure_url, public_id }
      const photo = await Photo.create({
        catId,
        url: result.secure_url,
        publicId: result.public_id,
        cover,
        position,
      });

      if (photo.cover) {
        await Photo.update(
          { cover: false },
          { where: { catId, id: { [Op.ne]: photo.id } } }
        );
      }

      res.status(201).json(photo);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /photos/:id
 * - Admin
 * - body JSON: { url?, cover?, position? }
 * - Permet de changer la cover (unique par chat) et la position
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(photoUpdateSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { url, cover, position } = req.body;

      const photo = await Photo.findByPk(id);
      if (!photo) throw boom("Photo not found", 404);

      if (url !== undefined) photo.url = url;
      if (position !== undefined) photo.position = position;

      if (cover === true) {
        await Photo.update(
          { cover: false },
          { where: { catId: photo.catId, id: { [Op.ne]: photo.id } } }
        );
        photo.cover = true;
      } else if (cover === false) {
        photo.cover = false;
      }

      await photo.save();
      res.json(photo);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /photos/:id/set-cover
 * - Admin
 * - Raccourci pour forcer la cover unique sur un chat
 */
router.post(
  "/:id/set-cover",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const photo = await Photo.findByPk(id);
      if (!photo) throw boom("Photo not found", 404);

      await Photo.update(
        { cover: false },
        { where: { catId: photo.catId, id: { [Op.ne]: photo.id } } }
      );
      await photo.update({ cover: true });

      res.json({ message: "Cover updated", photo });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /photos/:id
 * - Admin
 * - Supprime l’enregistrement et tente de supprimer l’asset Cloudinary
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const photo = await Photo.findByPk(id);
      if (!photo) throw boom("Photo not found", 404);

      await deleteImage(photo.publicId); // best-effort
      await photo.destroy();

      res.json({ message: "Photo deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
