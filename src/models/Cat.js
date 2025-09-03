import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Cat = sequelize.define("Cat", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  name: { type: DataTypes.STRING, allowNull: false },
  gender: { type: DataTypes.ENUM("male", "female"), allowNull: false },
  birthDate: { type: DataTypes.DATEONLY, allowNull: true },

  // status: pour les listings publics (surtout utile aux kittens, mais pas que)
  status: { 
    type: DataTypes.ENUM("available", "reserved", "sold"), 
    defaultValue: "available" 
  },

  // type: breeder (reproducteur) ou kitten (chaton)
  type: { type: DataTypes.ENUM("breeder", "kitten"), allowNull: false },

  // Parents liés (FK) — requis pour kitten, NULL pour breeder
  fatherId: { type: DataTypes.INTEGER, allowNull: true },
  motherId: { type: DataTypes.INTEGER, allowNull: true },

  // Parents externes (texte libre) — utiles pour breeder
  sireName: { type: DataTypes.STRING, allowNull: true },
  damName:  { type: DataTypes.STRING, allowNull: true },
  sireRegistration: { type: DataTypes.STRING, allowNull: true },
  damRegistration:  { type: DataTypes.STRING, allowNull: true },
}, {
  indexes: [
    { fields: ["type"] },
    { fields: ["fatherId"] },
    { fields: ["motherId"] },
  ]
});

export default Cat;
