import express from 'express';
import { obtenerModelo, crearModelo, editarModelo, desactivarModelo } from '../controllers/modelo.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

// Obtener modelo activas, opcionalmente por sucursalId
router.get('/', verifyToken, obtenerModelo);

// Crear nueva modelo
router.post('/', verifyToken, crearModelo);

// Editar modelo por ID
router.put('/:id', verifyToken, editarModelo);

// Desactivar (baja lógica) clase por ID
router.delete('/:id', verifyToken, desactivarModelo);
export default router;