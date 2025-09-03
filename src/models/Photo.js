import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Photo = sequelize.define("Photo", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  url: { type: DataTypes.STRING, allowNull: false },
  publicId: { type: DataTypes.STRING, allowNull: true }, // Cloudinary public_id
  cover: { type: DataTypes.BOOLEAN, defaultValue: false },
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
});

export default Photo;
