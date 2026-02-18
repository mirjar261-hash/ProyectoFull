import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import type { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import sucursalRoutes from "./routes/sucursal.routes";
import departamentoRoutes from "./routes/departamento.routes";
import marcaRoutes from "./routes/marca.routes";
import modeloRoutes from "./routes/modelo.routes";
import proveedorRoutes from "./routes/proveedor.routes";
import clientesRoutes from "./routes/cliente.routes";
import medicosRoutes from "./routes/medico.routes";
import productosRoutes from "./routes/producto.routes";
import gastosRoutes from "./routes/gasto.routes";
import inversionesRoutes from "./routes/inversion.routes";
import iniciosRoutes from "./routes/inicio.routes";
import retirosRoutes from "./routes/retiro.routes";
import cortesDiaRoutes from "./routes/corte_dia.routes";
import detallesCorteDiaRoutes from "./routes/corte_dia_detalle.routes";
import actividadesRoutes from "./routes/actividad.routes";
import comprasRoutes from "./routes/compra.routes";
import detalleComprasRoutes from "./routes/detalle_compra.routes";
import ventasRoutes from "./routes/venta.routes";
import detalleVentasRoutes from "./routes/detalle_venta.routes";
import inventarioESARoutes from "./routes/inventario_esa.routes";
import cxcClientesRoutes from "./routes/cxcclientes.routes";
import paymentsRoutes from "./routes/payments.routes";
import empresaRoutes from "./routes/empresa.routes";
import datosTaecelRoutes from "./routes/datos_cliente_taecel.routes";
import recargaRoutes from "./routes/recarga.routes";
import ticketRoutes from "./routes/ticket.routes";
import permisoRoutes from "./routes/permiso.routes";
import gerenteRoutes from "./routes/gerente.routes";
import productosInsumosRoutes from "./routes/insumos.routes";
import crovInternalRoutes from "./routes/crovinternal.routes";
import crovInternalAuthRoutes from "./routes/crovinternal_auth.routes";
import historialPlanRoutes from "./routes/historial_plan.routes";
import { scheduleDailyKpis } from "./jobs/dailyKpis";
import { scheduleWeeklyKpis } from "./jobs/weeklyKpis";
import { scheduleMonthlyKpis } from "./jobs/monthlyKpis";
import { scheduleAutoRenewals } from "./jobs/autoRenewal";
import { scheduleDailyAgendaEmails } from "./jobs/dailyAgenda";
import { scheduleLicenseRenewalReminders } from "./jobs/licenseRenewalReminder";
import uploadsRoutes from "./routes/uploads.routes";
import solicitudSpinRoutes from "./routes/spinnegocios.routes";
import promocionRoutes from "./routes/promocion.routes";
import crmRoutes from "./routes/crm.routes";
import demoRoutes from "./routes/demo.routes";
import publicTicketCrovRoutes from "./routes/public_ticket_crov.routes";
import giroComercialRoutes from "./routes/giro_comercial.routes";
import { watchDefaultInternalPermissionsFile } from "./services/internal-permissions-sync";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/sucursales", sucursalRoutes);
app.use("/departamento", departamentoRoutes);
app.use("/marca", marcaRoutes);
app.use("/modelo", modeloRoutes);
app.use("/proveedor", proveedorRoutes);
app.use("/cliente", clientesRoutes);
app.use("/medico", medicosRoutes);
app.use("/producto", productosRoutes);
app.use("/gasto", gastosRoutes);
app.use("/inversion", inversionesRoutes);
app.use("/retiro", retirosRoutes);
app.use("/corte-dia", cortesDiaRoutes);
app.use("/corte-dia-detalle", detallesCorteDiaRoutes);
app.use("/inicio", iniciosRoutes);
app.use("/actividad", actividadesRoutes);
app.use("/compra", comprasRoutes);
app.use("/venta", ventasRoutes);
app.use("/detalle-compra", detalleComprasRoutes);
app.use("/detalle-venta", detalleVentasRoutes);
app.use("/cxcclientes", cxcClientesRoutes);
app.use("/inventario-esa", inventarioESARoutes);
app.use("/promocion", promocionRoutes);
app.use("/crm", crmRoutes);
app.use("/demo-request", demoRoutes);
app.use("/payments", paymentsRoutes);
app.use("/empresa", empresaRoutes);
app.use("/empresas", empresaRoutes);
app.use("/giro-comercial", giroComercialRoutes);
app.use("/datos-cliente-taecel", datosTaecelRoutes);
app.use("/recarga", recargaRoutes);
app.use("/tickets", ticketRoutes);
app.use("/permisos", permisoRoutes);
app.use("/gerente", gerenteRoutes);
app.use("/insumos", productosInsumosRoutes);
app.use("/recarga", recargaRoutes);
app.use("/crovinternal", crovInternalRoutes);
app.use("/crovinternal_auth", crovInternalAuthRoutes);
app.use("/historial-planes", historialPlanRoutes);
app.use("/facturacion", require("./routes/facturacion.routes").default);

app.use("/public", publicTicketCrovRoutes);

app.use("/uploadsRoutes", uploadsRoutes);
app.use(uploadsRoutes);
app.use("/solicitud-spin-negocios", solicitudSpinRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

scheduleDailyKpis();
scheduleWeeklyKpis();
scheduleMonthlyKpis();
scheduleAutoRenewals();
scheduleDailyAgendaEmails();
scheduleLicenseRenewalReminders();
watchDefaultInternalPermissionsFile();
