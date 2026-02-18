import express from 'express';
import { obtenerMarca, crearMarca, editarMarca, desactivarMarca } from '../controllers/marca.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

// Obtener marca activas, opcionalmente por sucursalId
router.get('/', verifyToken, obtenerMarca);

// Crear nueva marca
router.post('/', verifyToken, crearMarca);

// Editar marca por ID
router.put('/:id', verifyToken, editarMarca);

// Desactivar (baja lógica) clase por ID
router.delete('/:id', verifyToken, desactivarMarca);

export default router;