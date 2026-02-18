import { Router } from 'express';
import { enviarSolicitudDemo } from '../controllers/demo.controller';

const router = Router();

router.post('/', enviarSolicitudDemo);

export default router;
