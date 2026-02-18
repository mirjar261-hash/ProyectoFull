import express from 'express';
import {
  createPaymentIntent,
  recordPayment,
  obtenerPayments,
  obtenerPaymentsStripe,
  updateCard,
} from '../controllers/payments.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.post('/create-payment-intent', createPaymentIntent);
router.post('/record', recordPayment);
router.get('/', verifyToken, obtenerPayments);
router.get('/stripe-payments', verifyToken, obtenerPaymentsStripe);
router.post('/update-card', verifyToken, updateCard);

export default router;
