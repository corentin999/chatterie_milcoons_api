import User from "./User.js";
import Cat from "./Cat.js";
import Photo from "./Photo.js";

// Relations Cat ↔ Photo (1-n)
Cat.hasMany(Photo, { foreignKey: "catId", onDelete: "CASCADE" });
Photo.belongsTo(Cat, { foreignKey: "catId" });

// Relations reproducteurs pour les chatons
Cat.belongsTo(Cat, { as: "father", foreignKey: "fatherId" });
Cat.belongsTo(Cat, { as: "mother", foreignKey: "motherId" });

export { User, Cat, Photo };
