import { Router } from 'express';
import {
  listarClientesCrovDirectorioPublic,
  buscarClienteCrovPorTelefonoPublic,
  crearTicketSoporteCrovPublic,
} from '../controllers/public_ticket_crov.controller';

const router = Router();

router.get('/clientes-crov/directorio', listarClientesCrovDirectorioPublic);
router.post('/clientes-crov/buscar-telefono', buscarClienteCrovPorTelefonoPublic);
router.post('/tickets-soporte-crov', crearTicketSoporteCrovPublic);

export default router;
