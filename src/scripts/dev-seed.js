import "dotenv/config.js";
import bcrypt from "bcrypt";
import sequelize from "../config/database.js";
import { User, Cat } from "../models/index.js";

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // sécurité: s'il n'a pas encore tourné

    // 1) Admin par défaut
    const passwordHash = await bcrypt.hash("admin123", 12);
    await User.findOrCreate({
      where: { username: "admin" },
      defaults: { passwordHash, role: "admin" },
    });

    // 2) Reproducteurs
    const [luna] = await Cat.findOrCreate({
      where: { name: "Luna" },
      defaults: {
        gender: "female",
        birthDate: "2021-03-10",
        status: "available",
        type: "breeder",
        sireName: "Ch. Silver Moon",
        damName: "Lady Bella",
      },
    });

    const [simba] = await Cat.findOrCreate({
      where: { name: "Simba" },
      defaults: {
        gender: "male",
        birthDate: "2020-07-22",
        status: "available",
        type: "breeder",
        sireName: "King Leo",
        damName: "Queen Zara",
      },
    });

    const [nala] = await Cat.findOrCreate({
      where: { name: "Nala" },
      defaults: {
        gender: "female",
        birthDate: "2021-05-18",
        status: "available",
        type: "breeder",
        sireName: "Golden Star",
        damName: "Princess Mia",
      },
    });

    // 3) Chatons (en utilisant les IDs des parents créés)
    await Cat.findOrCreate({
      where: { name: "Milo" },
      defaults: {
        gender: "male",
        birthDate: "2024-06-01",
        status: "available",
        type: "kitten",
        fatherId: simba.id,
        motherId: luna.id,
      },
    });

    await Cat.findOrCreate({
      where: { name: "Cleo" },
      defaults: {
        gender: "female",
        birthDate: "2024-06-01",
        status: "reserved",
        type: "kitten",
        fatherId: simba.id,
        motherId: luna.id,
      },
    });

    await Cat.findOrCreate({
      where: { name: "Oreo" },
      defaults: {
        gender: "male",
        birthDate: "2024-06-10",
        status: "available",
        type: "kitten",
        fatherId: simba.id,
        motherId: nala.id,
      },
    });

    await Cat.findOrCreate({
      where: { name: "Misty" },
      defaults: {
        gender: "female",
        birthDate: "2024-06-10",
        status: "sold",
        type: "kitten",
        fatherId: simba.id,
        motherId: nala.id,
      },
    });

    await Cat.findOrCreate({
      where: { name: "Leo" },
      defaults: {
        gender: "male",
        birthDate: "2024-07-05",
        status: "available",
        type: "kitten",
        fatherId: simba.id,
        motherId: luna.id,
      },
    });

    console.log("✅ Dev seed done");
    await sequelize.close();
  } catch (e) {
    console.error("❌ Dev seed error:", e);
    process.exit(1);
  }
}

main();
