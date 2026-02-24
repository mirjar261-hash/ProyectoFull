import { Router } from 'express';
import {
  obtenerTicketsInternos,
  obtenerEmpresasInternas,
  crearDistribuidor,
  actualizarDistribuidor,
  eliminarDistribuidor,
  listarDistribuidores,
  borrarFisicoDistribuidor,
  obtenerPagosInternos,
  listarClientesCROV,
  obtenerClienteCROV,
  crearClienteCROV,
  actualizarClienteCROV,
  actualizarFechaFinSoporteClienteCROV,
  eliminarClienteCROV,
  listarMantenimientosClientesCROV,
  obtenerMantenimientoClienteCROV,
  crearMantenimientoClienteCROV,
  actualizarMantenimientoClienteCROV,
  eliminarMantenimientoClienteCROV,
  listarProspectosCROV,
  obtenerProspectoCROV,
  crearProspectoCROV,
  actualizarProspectoCROV,
  registrarUltimaNotificacionProspectoCROV,
  eliminarProspectoCROV,
  obtenerProspectosPorClienteCROV,
  listarEmpleadosCROV,
  obtenerEmpleadoCROV,
  crearEmpleadoCROV,
  actualizarEmpleadoCROV,
  eliminarEmpleadoCROV,
  listarTicketsSoporteCROV,
  obtenerTicketSoporteCROV,
  crearTicketSoporteCROV,
  actualizarTicketSoporteCROV,
  eliminarTicketSoporteCROV,
  listarSistemasCROV,
  obtenerSistemaCROV,
  crearSistemaCROV,
  actualizarSistemaCROV,
  eliminarSistemaCROV,
  listarSprintsCROV,
  obtenerSprintCROV,
  crearSprintCROV,
  actualizarSprintCROV,
  activarSprintCROV,
  eliminarSprintCROV,
  listarTareasCROV,
  obtenerTareaCROV,
  crearTareaCROV,
  actualizarTareaCROV,
  eliminarTareaCROV,
  optenertareassprintactual,
  obtenerReportePuntosListoPorSprintCROV,
  obtenerComparativaPuntosListoUltimos4SprintsCROV,
  getHistorialAhorrosEmpleados,
  getAhorroEmpleado,
  crearAhorroEmpleado,
  modificarAhorroEmpleado,
  eliminarAhorroEmpleado,
  getEmpleadosActivosNoResidentes,
  getEmpleadosInfoParaRetiroAhorros,
  retirarAhorroEmpleado,
  getHistorialAhorrosEmpleado,
  getTotalAhorrosGeneralOPorEmpleadoBuscado,
  obtenerSistemasCROVConTareasYEmpleados,
  getTiposIncidencias,
  crearSolicitudIncidencia,
  getSolicitudesIncidenciaPorEmpleado,
  eliminarSolicitudIncidencia,
  actualizarSolicitudIncidencia,
  getSolicitudesIncidenciaPendientes,
  aprobarRechazarSolicitudIncidencia,
  getCumpleaniosEmpleados,
} from '../controllers/crovinternal.controller';
import {
  obtenerTodosPermisosInternal,
  obtenerPermisosEmpleadoInternal,
  actualizarPermisosEmpleadoInternal,
} from '../controllers/permiso-internal.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.get('/tickets', verifyToken, obtenerTicketsInternos);
router.get('/empresas', verifyToken, obtenerEmpresasInternas);
router.get('/empresas/:empresaId/pagos', verifyToken, obtenerPagosInternos);

router.get("/",verifyToken, listarDistribuidores);          // ?sucursalId=1&activo=1&nivel=PLATA&q=juan
router.post("/",verifyToken, crearDistribuidor);            // body con sucursalId, nombre_completo, etc.
router.put("/:id",verifyToken, actualizarDistribuidor);     // body con campos a actualizar
router.delete("/:id",verifyToken, eliminarDistribuidor);    // borrado lógico (activo=0)
router.delete('/:id/force',verifyToken, borrarFisicoDistribuidor);  // borrado físico

router.get('/clientes-crov', verifyToken, listarClientesCROV);
router.get('/clientes-crov/:id', verifyToken, obtenerClienteCROV);
router.post('/clientes-crov', verifyToken, crearClienteCROV);
router.put('/clientes-crov/:id', verifyToken, actualizarClienteCROV);
router.patch('/clientes-crov/:id/fecha-fin-soporte', verifyToken, actualizarFechaFinSoporteClienteCROV);
router.delete('/clientes-crov/:id', verifyToken, eliminarClienteCROV);

router.get('/mantenimientos-clientes-crov', verifyToken, listarMantenimientosClientesCROV);
router.get('/mantenimientos-clientes-crov/:id', verifyToken, obtenerMantenimientoClienteCROV);
router.post('/mantenimientos-clientes-crov', verifyToken, crearMantenimientoClienteCROV);
router.put('/mantenimientos-clientes-crov/:id', verifyToken, actualizarMantenimientoClienteCROV);
router.delete('/mantenimientos-clientes-crov/:id', verifyToken, eliminarMantenimientoClienteCROV);

router.get('/prospectos-crov', verifyToken, listarProspectosCROV);
router.get('/prospectos-crov/cliente/:idCliente', verifyToken, obtenerProspectosPorClienteCROV);
router.get('/prospectos-crov/:id', verifyToken, obtenerProspectoCROV);
router.post('/prospectos-crov', verifyToken, crearProspectoCROV);
router.put('/prospectos-crov/:id', verifyToken, actualizarProspectoCROV);
router.post('/prospectos-crov/:id/ultima-notificacion', verifyToken, registrarUltimaNotificacionProspectoCROV);
router.delete('/prospectos-crov/:id', verifyToken, eliminarProspectoCROV);

router.get('/empleados-crov', verifyToken, listarEmpleadosCROV);
router.get('/empleados-crov-activos-no-residentes', verifyToken, getEmpleadosActivosNoResidentes);
router.get('/empleados-crov-retiro-ahorros', verifyToken, getEmpleadosInfoParaRetiroAhorros);
router.get('/empleados-crov/:id', verifyToken, obtenerEmpleadoCROV);
router.post('/empleados-crov', verifyToken, crearEmpleadoCROV);
router.put('/empleados-crov/:id', verifyToken, actualizarEmpleadoCROV);
router.delete('/empleados-crov/:id', verifyToken, eliminarEmpleadoCROV);

router.get('/cumpleanios-empleados/todos', verifyToken, getCumpleaniosEmpleados);

router.get('/tickets-soporte-crov', verifyToken, listarTicketsSoporteCROV);
router.get('/tickets-soporte-crov/:id', verifyToken, obtenerTicketSoporteCROV);
router.post('/tickets-soporte-crov', verifyToken, crearTicketSoporteCROV);
router.put('/tickets-soporte-crov/:id', verifyToken, actualizarTicketSoporteCROV);
router.delete('/tickets-soporte-crov/:id', verifyToken, eliminarTicketSoporteCROV);

router.get('/sistemas-crov', verifyToken, listarSistemasCROV);
router.get('/sistemas-crov/con-tareas-y-empleados', verifyToken, obtenerSistemasCROVConTareasYEmpleados);
router.get('/sistemas-crov/:id', verifyToken, obtenerSistemaCROV);
router.post('/sistemas-crov', verifyToken, crearSistemaCROV);
router.put('/sistemas-crov/:id', verifyToken, actualizarSistemaCROV);
router.delete('/sistemas-crov/:id', verifyToken, eliminarSistemaCROV);

router.get('/sprints-crov', verifyToken, listarSprintsCROV);
router.get('/sprints-crov/:id', verifyToken, obtenerSprintCROV);
router.post('/sprints-crov', verifyToken, crearSprintCROV);
router.put('/sprints-crov/:id', verifyToken, actualizarSprintCROV);
router.post('/sprints-crov/:id/activar', verifyToken, activarSprintCROV);
router.delete('/sprints-crov/:id', verifyToken, eliminarSprintCROV);

router.get('/tareas-crov', verifyToken, listarTareasCROV);
router.get('/tareas-crov-obtener-tareas-sprint-actual', verifyToken, optenertareassprintactual);
router.get('/jira/reportes/sprints/:idSprint/puntos-listo-por-empleado', verifyToken, obtenerReportePuntosListoPorSprintCROV);
router.get('/jira/reportes/puntos-listo-comparativa-ultimos-4-sprints', verifyToken, obtenerComparativaPuntosListoUltimos4SprintsCROV);
router.get('/tareas-crov/:id', verifyToken, obtenerTareaCROV);
router.post('/tareas-crov', verifyToken, crearTareaCROV);
router.put('/tareas-crov/:id', verifyToken, actualizarTareaCROV);
router.delete('/tareas-crov/:id', verifyToken, eliminarTareaCROV);

router.get('/permisos-internal', verifyToken, obtenerTodosPermisosInternal);
router.get('/permisos-internal/:id', verifyToken, obtenerPermisosEmpleadoInternal);
router.put('/permisos-internal/:id', verifyToken, actualizarPermisosEmpleadoInternal);

router.get('/historial-ahorros', verifyToken, getHistorialAhorrosEmpleados);
router.get('/historial-ahorros/:id/mi-ahorro', verifyToken, getHistorialAhorrosEmpleado);
router.get('/historial-ahorros/total-ahorros', verifyToken, getTotalAhorrosGeneralOPorEmpleadoBuscado);
router.get('/historial-ahorros/:id', verifyToken, getAhorroEmpleado);
router.post('/historial-ahorros', verifyToken, crearAhorroEmpleado);
router.patch('/historial-ahorros/:id', verifyToken, modificarAhorroEmpleado);
router.delete('/historial-ahorros/:id', verifyToken, eliminarAhorroEmpleado);
router.post('/historial-ahorros/:id/retirar-ahorro', verifyToken, retirarAhorroEmpleado);

router.get('/tipos-incidencia', verifyToken, getTiposIncidencias);

router.get('/solicitudes-incidencia/empleado/:idEmpleado', verifyToken, getSolicitudesIncidenciaPorEmpleado);
router.get('/solicitudes-incidencia', verifyToken, getSolicitudesIncidenciaPendientes);
router.post('/solicitudes-incidencia', verifyToken, crearSolicitudIncidencia);
router.put('/solicitudes-incidencia/:idSolicitud', verifyToken, actualizarSolicitudIncidencia);
router.patch('/solicitudes-incidencia/:idSolicitud/estado', verifyToken, aprobarRechazarSolicitudIncidencia);
router.delete('/solicitudes-incidencia/:idSolicitud', verifyToken, eliminarSolicitudIncidencia);


export default router;
