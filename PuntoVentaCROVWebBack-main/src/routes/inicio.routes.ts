import express from "express";
import {
  obtenerInicios,
  obtenerIniciosPorRango,
  crearInicio,
  editarInicio,
  desactivarInicio,
} from "../controllers/inicio.controller";
import { verifyToken } from "../middlewares/verifyToken";

const router = express.Router();

router.get("/", verifyToken, obtenerInicios);
router.get("/rango", verifyToken, obtenerIniciosPorRango);
router.post("/", verifyToken, crearInicio);
router.put("/:id", verifyToken, editarInicio);
router.delete("/:id", verifyToken, desactivarInicio);

export default router;
