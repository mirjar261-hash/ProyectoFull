import express from 'express';
import { obtenerClases, crearClase, editarClase, desactivarClase } from '../controllers/departamento.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

// Obtener clases activas, opcionalmente por sucursalId
router.get('/', verifyToken, obtenerClases);

// Crear nueva clase
router.post('/', verifyToken, crearClase);

// Editar clase por ID
router.put('/:id', verifyToken, editarClase);

// Desactivar (baja lógica) clase por ID
router.delete('/:id', verifyToken, desactivarClase);

export default router;