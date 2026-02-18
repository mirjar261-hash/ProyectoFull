import express from 'express';
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerClientePorId,
  buscarClientesPorSucursal,
  asignarClienteAVenta,
  crearYAsignarClienteAVenta
} from '../controllers/cliente.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerClientes);
router.post('/', verifyToken, crearCliente);
router.put('/:id', verifyToken, actualizarCliente);
router.delete('/:id', verifyToken, eliminarCliente);
router.get('/clientes/:id', verifyToken, obtenerClientePorId);
router.get('/buscar', verifyToken, buscarClientesPorSucursal);
router.post('/asignar-a-venta', verifyToken, asignarClienteAVenta);
router.post('/crear-y-asignar', verifyToken, crearYAsignarClienteAVenta);

export default router;