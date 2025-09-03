import { z } from "zod";

/** Coercion helpers (multipart/form-data arrive souvent en string) */
const zBool = z.union([z.boolean(), z.string()]).transform((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  // fallback: toute string non vide → true
  return Boolean(v);
});

const zInt = z.union([z.number().int(), z.string()]).transform((v) => {
  if (typeof v === "number") return Math.trunc(v);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Expected integer");
  return Math.trunc(n);
});

/** GET /photos?catId=... (optionnel) */
export const photosListQuerySchema = z.object({
  catId: z.union([zInt, z.undefined()]).optional(),
  page: zInt.optional(),
  limit: zInt.optional(),
  // ex: "position:asc", "createdAt:desc"
  sort: z.string().regex(/^[a-zA-Z_]+:(asc|desc)$/i).optional(),
});


/** POST /photos (create by URL) */
export const photoCreateByUrlSchema = z.object({
  catId: zInt,
  url: z.string().url(),
  cover: z.union([zBool, z.undefined()]).default(false),
  position: z.union([zInt, z.undefined()]).default(0),
});

/** POST /photos/bulk (create by multiple URLs) */
export const photoBulkCreateSchema = z.object({
  catId: zInt,
  urls: z.array(z.string().url()).min(1),
  startPosition: z.union([zInt, z.undefined()]).default(0),
});

/** POST /photos/upload (multipart) — on valide les champs texte.
 *  Le fichier est validé par Multer. */
export const photoUploadSchema = z.object({
  catId: zInt,
  cover: z.union([zBool, z.undefined()]).default(false),
  position: z.union([zInt, z.undefined()]).default(0),
});

/** POST /photos/upload-bulk (multipart) */
export const photoUploadBulkSchema = z.object({
  catId: zInt,
  startPosition: z.union([zInt, z.undefined()]).default(0),
});

/** PATCH /photos/:id */
export const photoUpdateSchema = z.object({
  url: z.union([z.string().url(), z.undefined()]),
  cover: z.union([zBool, z.undefined()]),
  position: z.union([zInt, z.undefined()]),
});

/** POST /photos/reorder */
export const photoReorderSchema = z.object({
  items: z.array(
    z.object({
      id: zInt,
      position: zInt,
    })
  ).min(1),
});
