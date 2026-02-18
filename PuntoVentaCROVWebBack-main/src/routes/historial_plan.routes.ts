import express from 'express';
import { crearHistorialPlan, obtenerUltimoHistorialPlanPorFecha } from '../controllers/historial_plan.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.post('/', verifyToken, crearHistorialPlan);
router.get('/ultimo', verifyToken, obtenerUltimoHistorialPlanPorFecha);

export default router;
