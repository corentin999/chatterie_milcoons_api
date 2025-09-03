import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer, opts = {}) {
  // upload_stream pour éviter d’écrire un fichier sur le disque
  const folder = process.env.CLOUDINARY_FOLDER || "cattery";
  const options = {
    folder,
    resource_type: "image",
    // transformations par défaut (tu peux ajuster)
    // ex: créer une version optimisée pour miniatures
    transformation: opts.transformation || [],
    // ex: format auto + qualité auto
    format: "jpg",
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result); // { secure_url, public_id, width, height, ... }
    });
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    // On loggue mais on n'échoue pas la requête principale à cause de ça
    console.error("Cloudinary destroy error:", e?.message || e);
  }
}

async function testUpload() {
  try {
    const result = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/sample.jpg", {
      folder: process.env.CLOUDINARY_FOLDER || "cattery"
    });
    console.log("✅ Uploaded:", result.secure_url);
  } catch (e) {
    console.error("❌ Error:", e);
  }
}

//testUpload();
