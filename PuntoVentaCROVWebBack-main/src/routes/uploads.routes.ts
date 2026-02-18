import express from 'express';
import {
  getPresignedPost,
  confirmUpload,
  getProductImage,
  getClienteCrovLogo,
  getUserFile,
  getSucursalFile,
  getPresignedPostForSucursalCSDPair,
  getPresignedUploadUrlImgForNewJiraTasks
} from '../controllers/s3.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.post('/presigned-url', verifyToken, getPresignedPost);
router.post('/confirm', verifyToken, confirmUpload);
router.get('/product-image/:productId', verifyToken, getProductImage);
router.get('/cliente-crov-logo/:clienteId', verifyToken, getClienteCrovLogo);
router.get('/user-file/:userId/:fileKey', verifyToken, getUserFile);
router.get('/sucursal-file/:sucursalId/:fileKey', verifyToken, getSucursalFile);
router.post('/getPresignedPostForSucursalCSDPair', verifyToken, getPresignedPostForSucursalCSDPair);
router.post('/getPresignedUploadUrlImgForNewJiraTasks', verifyToken, getPresignedUploadUrlImgForNewJiraTasks);

export default router;