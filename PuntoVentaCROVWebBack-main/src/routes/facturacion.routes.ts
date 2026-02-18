import { Router } from 'express';
import {
  listarRegimenFiscal,
  obtenerRegimenFiscalPorClave,
  listarClaveUnidad,
  obtenerClaveUnidadPorClave,
  autocompleteClaveUnidad,
  listarClaveProdServ,
  obtenerClaveProdServPorClave,
  autocompleteClaveProdServ,
  listarRegimenFiscalCliFront,
  actualizarPasswordCsd,
  obtenerRegimenFiscalDeCliente,
  listarFormaPago,
  listarFormaPagoCliFront,
  obtenerFormaPagoPorClave,
  listarMetodoPago,
  obtenerMetodoPagoPorClave,
  listarMetodoPagoCliFront,
  listarUsoCFDI,
  listarUsoCFDICliFront,
  obtenerUsoCFDIPorClave,
  listarRegimenesPermitidosPorUso,
  validarUsoCFDIParaCliente,
  verificarPasswordCsd,
  statusPasswordCsd
} from '../controllers/facturacion.controller';
import { validarCsdHandler } from '../controllers/validarCsd.controller';
import { verifyToken } from '../middlewares/verifyToken';
// import { generarCfdi40Firmado } from '../controllers/cfdi40.generar.controller';
// import { timbrarFactura } from '../controllers/timbrar.controller';


const router = Router();

// Regímenes Fiscales
router.get('/regimen-fiscal', verifyToken, listarRegimenFiscal);
router.get('/regimen-fiscal/cli', verifyToken, listarRegimenFiscalCliFront);
router.get('/regimen-fiscal/:clave', verifyToken, obtenerRegimenFiscalPorClave);
router.get('/cliente/:id/regimen-fiscal', verifyToken, obtenerRegimenFiscalDeCliente);

// Clave Unidad
router.get('/clave-unidad', verifyToken, listarClaveUnidad);
router.get('/clave-unidad/autocomplete', verifyToken, autocompleteClaveUnidad);
router.get('/clave-unidad/:clave', verifyToken, obtenerClaveUnidadPorClave);

// Clave Producto/Servicio
router.get('/clave-prodserv', verifyToken, listarClaveProdServ);
router.get('/clave-prodserv/autocomplete', verifyToken, autocompleteClaveProdServ);
router.get('/clave-prodserv/:clave', verifyToken, obtenerClaveProdServPorClave);

// Catálogo c_FormaPago
router.get('/forma-pago', verifyToken, listarFormaPago);
router.get('/forma-pago/front', verifyToken, listarFormaPagoCliFront);
router.get('/forma-pago/:clave', verifyToken, obtenerFormaPagoPorClave);

// Catálogo c_MetodoPago
router.get('/metodo-pago', verifyToken, listarMetodoPago);
router.get('/metodo-pago/front', verifyToken, listarMetodoPagoCliFront);
router.get('/metodo-pago/:clave', verifyToken, obtenerMetodoPagoPorClave);

// Catálogo c_UsoCFDI
router.get('/uso-cfdi', verifyToken, listarUsoCFDI);
router.get('/uso-cfdi/front', verifyToken, listarUsoCFDICliFront);
router.get('/uso-cfdi/:clave', verifyToken, obtenerUsoCFDIPorClave);
router.get('/uso-cfdi/:clave/regimenes', verifyToken, listarRegimenesPermitidosPorUso);

// Validación para un cliente
router.get('/cliente/:id/uso-cfdi/:uso/validar', verifyToken, validarUsoCFDIParaCliente);
router.post('/csd/password/verify', verifyToken, verificarPasswordCsd);
router.get('/csd/password/status', verifyToken, statusPasswordCsd);

// Validar .cer/.key/contraseña (local y SF )
router.post('/validar-csd', verifyToken, validarCsdHandler);

// Guardar / limpiar password cifrada del CSD
router.put('/csd/password', verifyToken, actualizarPasswordCsd);

// router.post('/cfdi40/generar-xml', verifyToken, generarCfdi40Firmado);
// router.post('/timbrar',verifyToken, timbrarFactura);

export default router;
