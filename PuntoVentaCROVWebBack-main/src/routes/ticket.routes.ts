import express from 'express';
import {
  obtenerTickets,
  obtenerTicketPorId,
  crearTicket,
  actualizarEstado,
  obtenerRespuestas,
  crearRespuesta,
  actualizarTicket
} from '../controllers/ticket.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();obtenerTicketPorId

router.get('/', verifyToken, obtenerTickets);
router.get('/:id', verifyToken, obtenerTicketPorId);
router.post('/', verifyToken, crearTicket);
router.put('/:id', verifyToken, actualizarTicket);
router.put('/:id/estado', verifyToken, actualizarEstado);
router.get('/:id/respuestas', verifyToken, obtenerRespuestas);
router.post('/:id/respuestas', verifyToken, crearRespuesta);

export default router;