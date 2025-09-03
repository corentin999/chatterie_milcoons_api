import { z } from "zod";

/* ----------------------------- Coercion helpers ----------------------------- */
const zInt = z.union([z.number().int(), z.string()]).transform((v) => {
  if (typeof v === "number") return Math.trunc(v);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error("Expected integer");
  return Math.trunc(n);
});

const zEnum = (values) => z.union([z.enum(values), z.string()]).transform((v) => {
  const s = String(v);
  if (!values.includes(s)) throw new Error(`Invalid enum value. Expected one of: ${values.join(", ")}`);
  return s;
});

/** YYYY-MM-DD (MySQL/MariaDB DATE) */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const zDateOnly = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)))
  .refine((s) => s === "" || dateRegex.test(s), { message: "Invalid date format (expected YYYY-MM-DD)" })
  .transform((s) => (s === "" ? undefined : s));

/* ------------------------------ Base properties ----------------------------- */
const baseCat = {
  name: z.string().min(1, "name is required"),
  gender: zEnum(["male", "female"]),
  type: zEnum(["breeder", "kitten"]),
  birthDate: zDateOnly.optional(),
  status: zEnum(["available", "reserved", "sold"]).optional(),

  // Parents FK (utiles pour kitten)
  fatherId: zInt.optional(),
  motherId: zInt.optional(),

  // Parents externes (utiles pour breeder)
  sireName: z.string().optional(),
  damName: z.string().optional(),
  sireRegistration: z.string().optional(),
  damRegistration: z.string().optional(),
};

/* ------------------------------- Create schema ------------------------------ */
export const catCreateSchema = z
  .object(baseCat)
  .superRefine((data, ctx) => {
    if (data.type === "kitten") {
      // kitten -> nécessite fatherId & motherId
      if (!data.fatherId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fatherId"], message: "fatherId is required for kittens" });
      }
      if (!data.motherId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["motherId"], message: "motherId is required for kittens" });
      }
      // pas de parents “texte”
      if (data.sireName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sireName"], message: "sireName not allowed for kittens" });
      }
      if (data.damName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["damName"], message: "damName not allowed for kittens" });
      }
      if (data.sireRegistration) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sireRegistration"], message: "sireRegistration not allowed for kittens" });
      }
      if (data.damRegistration) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["damRegistration"], message: "damRegistration not allowed for kittens" });
      }
    }

    if (data.type === "breeder") {
      // breeder -> interdit fatherId/motherId
      if (data.fatherId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fatherId"], message: "fatherId is not allowed for breeders" });
      }
      if (data.motherId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["motherId"], message: "motherId is not allowed for breeders" });
      }
      // sireName/damName/registrations autorisés (facultatifs)
    }
  });

/* ------------------------------- Update schema ------------------------------ */
/**
 * Pour l'update, on accepte des partials.
 * On garde les règles métier via superRefine, mais on ne force pas les champs non fournis.
 * Si tu veux figer le type (interdire de changer breeder<->kitten), gère-le dans la route en conservant le type existant.
 */
export const catUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    gender: zEnum(["male", "female"]).optional(),
    type: zEnum(["breeder", "kitten"]).optional(),
    birthDate: zDateOnly.optional(),
    status: zEnum(["available", "reserved", "sold"]).optional(),

    fatherId: zInt.optional(),
    motherId: zInt.optional(),
    sireName: z.string().optional(),
    damName: z.string().optional(),
    sireRegistration: z.string().optional(),
    damRegistration: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // On ne peut valider complètement sans connaître le type final.
    // Deux stratégies :
    // 1) Si "type" est fourni dans la requête → on applique les règles.
    // 2) Sinon, laisse la route fusionner { ...existing, ...body } puis re-valider (ou appliquer tes règles métier côté route).
    if (!data.type) return;

    if (data.type === "kitten") {
      if (data.fatherId === undefined && data.motherId === undefined) {
        // Ok si non fournis (on ne force pas en update partiel)
      } else {
        if (data.fatherId === undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fatherId"], message: "fatherId is required when updating a kitten's parents" });
        }
        if (data.motherId === undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["motherId"], message: "motherId is required when updating a kitten's parents" });
        }
      }
      if (data.sireName !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sireName"], message: "sireName not allowed for kittens" });
      }
      if (data.damName !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["damName"], message: "damName not allowed for kittens" });
      }
      if (data.sireRegistration !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sireRegistration"], message: "sireRegistration not allowed for kittens" });
      }
      if (data.damRegistration !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["damRegistration"], message: "damRegistration not allowed for kittens" });
      }
    }

    if (data.type === "breeder") {
      if (data.fatherId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fatherId"], message: "fatherId is not allowed for breeders" });
      }
      if (data.motherId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["motherId"], message: "motherId is not allowed for breeders" });
      }
    }
  });

/* ---------------------------- List (query) schema --------------------------- */
/**
 * Facultatif mais pratique pour /cats listing :
 * - pagination: page, limit
 * - filtres simples: type, status, gender
 * - tri: sort (ex "createdAt:desc" ou "name:asc")
 */
export const catListQuerySchema = z.object({
  page: zInt.optional(),
  limit: zInt.optional(),
  type: z.union([zEnum(["breeder", "kitten"]), z.undefined()]).optional(),
  status: z.union([zEnum(["available", "reserved", "sold"]), z.undefined()]).optional(),
  gender: z.union([zEnum(["male", "female"]), z.undefined()]).optional(),
  sort: z
    .string()
    .regex(/^[a-zA-Z_]+:(asc|desc)$/i, "sort must look like field:asc|desc")
    .optional(),
});
