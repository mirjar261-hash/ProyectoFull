'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Eye, 
  HandCoins, 
  Loader2, 
  Search, 
  BookOpen, 
  ChevronDown, 
  Receipt, 
  User, 
  Lock, 
  AlertCircle,
  Package 
} from 'lucide-react';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

// === DEFINICIÓN DE LOS FLUJOS ===

// 1. FLUJO PRINCIPAL
const GUIDE_FLOW_MAIN: GuideStep[] = [
  {
    targetKey: "search-box",
    title: "1. Buscar Clientes",
    content: "Utiliza este filtro para encontrar clientes por nombre, razón social o teléfono.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "clients-list",
    title: "1.1 Listado de Clientes",
    content: "Aquí aparecerán los clientes que tienen compras a crédito activas. Selecciona uno para habilitar las opciones.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-view-info",
    title: "2. Ver Información Cliente",
    content: "Haz clic en este botón para desplegar la información detallada.",
    placement: "bottom",
    modalPosition: "bottom-left",
    disableNext: true 
  },
  {
    targetKey: "client-info-modal-title",
    title: "2.1 Ver Información",
    content: "En esta ventana podrás consultar la ficha técnica completa del cliente.",
    placement: "bottom",
    modalPosition: "center"
  },
  {
    targetKey: "info-general",
    title: "2.2 Información del Cliente",
    content: "Aquí se desglosan los datos de contacto, límites de crédito y días de plazo.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "info-fiscal",
    title: "2.3 Información de Facturación",
    content: "Datos fiscales registrados: RFC, Razón Social y Dirección.",
    placement: "top",
    modalPosition: "top-center"
  }
];

// 2. FLUJO DETALLE VENTA CRÉDITO
const GUIDE_FLOW_SALE_DETAIL: GuideStep[] = [
  {
    targetKey: "detail-info-cards",
    title: "1. Info del Cliente",
    content: "Resumen de la venta seleccionada: Cliente, Total y Saldo Pendiente.",
    placement: "bottom",
    modalPosition: "left"
  },
  {
    targetKey: "detail-abono-section",
    title: "2. Abonar a esta Venta",
    content: "Sección para registrar pagos a esta nota específica.",
    placement: "left",
    modalPosition: "left"
  },
  {
    targetKey: "input-abono-monto",
    title: "2.1 Monto a Abonar",
    content: "Ingresa la cantidad. No puede ser mayor al saldo pendiente.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "select-payment-method",
    title: "2.2.2 Efectivo o Tarjeta",
    content: "Selecciona el método. Si eliges 'Tarjeta', deberás ingresar la referencia bancaria obligatoriamente.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-card-reference",
    title: "2.2.3 Referencia Tarjeta",
    content: "Campo habilitado solo para pagos con tarjeta. Ingresa los últimos dígitos o autorización.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "abono-actions",
    title: "2.3 Abonar o Liquidar",
    content: "Usa 'Liquidar' para pagar el total restante automáticamente o 'Abonar' para el monto manual.",
    placement: "top",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "history-table",
    title: "3. Historial de Abonos",
    content: "Lista de pagos anteriores aplicados a esta venta.",
    placement: "top",
    modalPosition: "top-center"
  },
  // --- Columnas Historial ---
  { targetKey: "col-hist-date", title: "3.1 Fecha", content: "Fecha del abono.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-hist-amount", title: "3.2 Monto", content: "Cantidad pagada.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-hist-paid", title: "3.3 Saldo Abonado", content: "Acumulado pagado.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-hist-pending", title: "3.4 Saldo Pendiente", content: "Restante tras el pago.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-hist-note", title: "3.5 Notas", content: "Observaciones.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-hist-action", title: "3.6 Acciones", content: "Devolver pago.", placement: "top", modalPosition: "top-center" },
  
  {
    targetKey: "more-info-toggle",
    title: "4. Más Info",
    content: "Haz clic aquí para desplegar los productos.",
    placement: "top",
    modalPosition: "top-center",
    disableNext: true 
  },
  // --- DESGLOSE DE PRODUCTOS (Corregido para coincidir con data-guide) ---
  {
    targetKey: "products-table", // Este debe coincidir con <Table data-guide="products-table">
    title: "4.1 Tabla de Productos",
    content: "Aquí verás el detalle de los artículos.",
    placement: "top",
    modalPosition: "top-center"
  },
  { targetKey: "col-prod-name", title: "4.2 Producto", content: "Nombre del artículo vendido.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-prod-qty", title: "4.3 Cantidad", content: "Unidades vendidas.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-prod-price", title: "4.4 Precio Unitario", content: "Costo por unidad al momento de la venta.", placement: "top", modalPosition: "top-center" },
  { targetKey: "col-prod-total", title: "4.5 Importe", content: "Subtotal de este producto (Cantidad x Precio).", placement: "top", modalPosition: "top-center" },
];

// 3. FLUJO SECUNDARIO
const GUIDE_FLOW_NO_CLIENTS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Sin Clientes con Crédito",
    content: "Actualmente no tienes clientes con compras a crédito pendientes. Realiza una venta a crédito para ver información aquí.",
    placement: "bottom",
    modalPosition: "bottom-center"
  }
];

// --- INTERFACES (Sin cambios) ---
interface Cliente {
  id: number;
  razon_social: string;
  telefono?: string | null;
  movil?: string | null;
  email?: string | null;
  nom_contacto?: string | null;
  razon_social_facturacion?: string | null;
  rfc_facturacion?: string | null;
  curp_facturacion?: string | null;
  domicilio_facturacion?: string | null;
  no_ext_facturacion?: string | null;
  no_int_facturacion?: string | null;
  cp_facturacion?: string | null;
  colonia_facturacion?: string | null;
  ciudad_facturacion?: string | null;
  localidad_facturacion?: string | null;
  estado_facturacion?: string | null;
  pais_facturacion?: string | null;
  regimen_fiscal?: string | null;
  limite_credito?: number | null;
  dias_credito?: number | null;
  tipo_precio?: number | null;
}

interface UsuarioVenta {
  nombre?: string;
  apellidos?: string;
}

interface VentaResumen {
  id: number;
  numdoc?: string | null;
  total: number;
  saldo_pendiente: number;
  fecha?: string | null;
  fecha_limite?: string | null;
  usuario?: UsuarioVenta | null;
  cliente_id?: number | null;
  clienteId?: number | null;
  cliente?: Cliente | null;
}

interface VentaDetalleInfo extends VentaResumen {
  forma_pago?: string | null;
  metodo_pago?: string | null;
  uso_cfdi?: string | null;
  referencia?: string | null;
  comentarios?: string | null;
  cliente?: Cliente | null;
  folio?: string | null;
  ventasActivas?: number;
  productosTotales?: number;
}

interface VentaDetalle {
  id: number;
  producto?: { nombre?: string } | null;
  cantidad?: number | null;
  precio?: number | null;
  total?: number | null;
}

interface AbonoCxc {
  id: number;
  metodo_pago?:string | null;
  nota?: string | null;
  saldo_abonado?: number | null;
  saldo_pendiente?: number | null;
  fecha?: string | null;
  createdAt?: string | null;
  ventaId?: number | null;
  usuario?: UsuarioVenta | null;
}

interface VentaCreditoDetalle {
  venta: VentaResumen;
  detalles: VentaDetalle[];
  abonos: AbonoCxc[];
}

type MetodoPagoVenta = 'EFECTIVO' | 'TARJETA';
type TipoTarjeta = 'DEBITO' | 'CREDITO';

const obtenerNombreCliente = (cliente?: Cliente | null) => {
  if (!cliente) return '—';
  const nombre = cliente.nom_contacto?.trim();
  const razon = cliente.razon_social?.trim();
  if (nombre && nombre.length > 0) {
    return nombre;
  }
  return razon || '—';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0);

const formatCurrencyOrDash = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  return formatCurrency(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const nombreUsuario = (usuario?: UsuarioVenta | null) => {
  if (!usuario) return '—';
  const nombre = usuario.nombre?.trim() || '';
  const apellidos = usuario.apellidos?.trim() || '';
  const full = `${nombre} ${apellidos}`.trim();
  return full || '—';
};

const displayValue = (value?: string | number | null) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '—';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
};

const InfoCard = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div
    className={`rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm shadow-sm ${className}`.trim()}
  >
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 font-medium text-gray-800 whitespace-pre-wrap break-words">{value}</p>
  </div>
);

const obtenerIdsClienteVenta = (venta: VentaResumen) =>
  [venta.clienteId, venta.cliente_id, venta.cliente?.id]
    .map((valor) => (valor === null || valor === undefined ? null : Number(valor)))
    .filter((valor) => Number.isFinite(valor)) as number[];
    
const perteneceVentaAlCliente = (venta: VentaResumen, clienteId: number) => {
  const candidatos = obtenerIdsClienteVenta(venta);
  return candidatos.some((valor) => valor === Number(clienteId));
};

const transformarVentasCliente = (
  ventasOrigen: VentaResumen[],
  clienteId: number,
  diasCredito?: number | null,
) => {
  const normalizadas = ventasOrigen
    .filter((venta) => perteneceVentaAlCliente(venta, clienteId))
    .filter((venta) => Number(venta.saldo_pendiente || 0) > 0)
    .map((venta) => {
      const fechaLimiteServidor = venta.fecha_limite;
      let fechaLimite = fechaLimiteServidor;
      if (!fechaLimite && venta.fecha && diasCredito && diasCredito > 0) {
        const fechaBase = new Date(venta.fecha);
        if (!Number.isNaN(fechaBase.getTime())) {
          fechaBase.setDate(fechaBase.getDate() + diasCredito);
          fechaLimite = fechaBase.toISOString();
        }
      }
      return {
        ...venta,
        saldo_pendiente: Number(venta.saldo_pendiente || 0),
        total: Number(venta.total || 0),
        fecha_limite: fechaLimite || null,
      };
    });
  normalizadas.sort((a, b) => new Date(a.fecha || '').getTime() - new Date(b.fecha || '').getTime());
  return normalizadas;
};

export default function CxcClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true); 
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);

  const [ventaInfo, setVentaInfo] = useState<VentaDetalleInfo | null>(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaResumen | null>(null);
  const [ventaDetallada, setVentaDetallada] = useState<VentaCreditoDetalle | null>(null);
  const [modalDetallesAbierto, setModalDetallesAbierto] = useState(false);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [abonoProcesandoId, setAbonoProcesandoId] = useState<number | null>(null);
  const [seccionDetalleActiva, setSeccionDetalleActiva] = useState<'historial' | 'productos' | null>('historial');

  const [abonoModalAbierto, setAbonoModalAbierto] = useState(false);
  const [abonoNota, setAbonoNota] = useState('');
  const [abonoReferenciaGeneral, setAbonoReferenciaGeneral] = useState('');
  const [abonoMetodoGeneral, setAbonoMetodoGeneral] = useState<MetodoPagoVenta>('EFECTIVO');
  const [abonoTipoTarjetaGeneral, setAbonoTipoTarjetaGeneral] = useState<TipoTarjeta | null>(null);
  const [abonando, setAbonando] = useState(false);
  const [abonoVentaMonto, setAbonoVentaMonto] = useState('');
  const [abonoVentaNota, setAbonoVentaNota] = useState('');
  const [abonoVentaMetodo, setAbonoVentaMetodo] = useState<MetodoPagoVenta>('EFECTIVO');
  const [abonoVentaReferencia, setAbonoVentaReferencia] = useState('');
  const [abonoVentaTipoTarjeta, setAbonoVentaTipoTarjeta] = useState<TipoTarjeta | null>(null);
  const [abonandoVenta, setAbonandoVenta] = useState(false);
  const [infoClienteAbierto, setInfoClienteAbierto] = useState(false);

  // Estados de la Guía
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [hasClientsWithDebt, setHasClientsWithDebt] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) || 1 : 1;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = (flow: 'MAIN' | 'SALE_DETAIL') => {
    if (!hasClientsWithDebt) {
        if (flow === 'MAIN') {
            setCurrentSteps(GUIDE_FLOW_NO_CLIENTS);
            setGuideActive(true);
            setCurrentStepIndex(0);
            return;
        } else {
            toast.warning("No hay clientes con deuda.");
            return;
        }
    }

    if (flow === 'SALE_DETAIL') {
        if (!clienteSeleccionado) {
            toast.warning("Selecciona un cliente primero.");
            return;
        }
        if (ventas.length === 0) {
            toast.warning("Este cliente no tiene ventas para detallar.");
            return;
        }
        setCurrentSteps(GUIDE_FLOW_SALE_DETAIL);
        if (!modalDetallesAbierto && ventas.length > 0) {
            abrirDetallesCuenta(ventas[0]);
        }
    } else {
        // Flujo Principal
        setCurrentSteps(GUIDE_FLOW_MAIN);
    }
    
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
  };

  const closeGuide = () => setGuideActive(false);

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      if(currentSteps !== GUIDE_FLOW_NO_CLIENTS) toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    if (!loadingClientes) {
        const key = 'hasSeenCxcGuide_v15'; 
        if (!localStorage.getItem(key)) {
            const timer = setTimeout(() => {
                if (hasClientsWithDebt) {
                    startGuide('MAIN');
                } else {
                    setCurrentSteps(GUIDE_FLOW_NO_CLIENTS);
                    setGuideActive(true);
                }
                localStorage.setItem(key, 'true');
            }, 1500); 
            return () => clearTimeout(timer);
        }
    }
  }, [loadingClientes, hasClientsWithDebt]);

  // --- AUTO ACCIONES DE GUÍA (Abrir Modales / Transición) ---
  useEffect(() => {
    if (!guideActive) return;

    // FLUJO PRINCIPAL: Paso 2 -> 2.1 (Al abrir modal Info)
    if (currentSteps === GUIDE_FLOW_MAIN && currentStepIndex === 2 && infoClienteAbierto) {
        setTimeout(() => handleNextStep(), 300);
    }
    
    // FLUJO DETALLE: Paso 4 -> 4.1 (Al abrir sección Productos)
    const currentStep = currentSteps[currentStepIndex];
    if (currentStep?.targetKey === 'more-info-toggle' && seccionDetalleActiva === 'productos') {
        setTimeout(() => handleNextStep(), 300);
    }

  }, [guideActive, currentSteps, currentStepIndex, infoClienteAbierto, seccionDetalleActiva]);

  const toggleGuideMenu = () => setShowGuideMenu(!showGuideMenu);

  // ... [Resto de lógica de negocio - Sin cambios importantes] ...
  const manejarCuentaLiquidada = (clienteId: number) => {
    setVentas([]);
    setClientes((prevClientes) => {
      const restantes = prevClientes.filter((cliente) => cliente.id !== clienteId);
      if (restantes.length === prevClientes.length) {
        return prevClientes;
      }
      setClienteSeleccionado((actual) => {
        if (!actual) return restantes[0] ?? null;
        if (actual.id === clienteId) return restantes[0] ?? null;
        const sigueDisponible = restantes.some((cliente) => cliente.id === actual.id);
        if (!sigueDisponible) return restantes[0] ?? null;
        return actual;
      });
      if (restantes.length === 0) setHasClientsWithDebt(false);
      return restantes;
    });
  };

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        setLoadingClientes(true);
        const res = await axios.get(`${apiUrl}/cliente?sucursalId=${sucursalIdSession}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = Array.isArray(res.data) ? (res.data as Cliente[]) : [];
        data.sort((a, b) => a.razon_social.localeCompare(b.razon_social));
        let clientesConCredito = data;
        try {
          const params = new URLSearchParams({
            sucursalId: String(sucursalIdSession),
            estado: 'CREDITO',
          });
          const resVentas = await axios.get(`${apiUrl}/venta?${params.toString()}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const ventasCredito = Array.isArray(resVentas.data) ? (resVentas.data as VentaResumen[]) : [];
          const clientesConSaldo = new Set<number>();

          ventasCredito.forEach((venta) => {
            const saldo = Number(venta.saldo_pendiente || 0);
            if (saldo > 0) {
              obtenerIdsClienteVenta(venta).forEach((id) => clientesConSaldo.add(id));
            }
          });

          clientesConCredito = data.filter((cliente) => clientesConSaldo.has(cliente.id));
        } catch (error) {
          console.error(error);
          toast.error('No se pudieron filtrar los clientes con crédito activo');
        }

        setClientes(clientesConCredito);
        setHasClientsWithDebt(clientesConCredito.length > 0);

        setClienteSeleccionado((actual) => {
          if (actual && clientesConCredito.some((cliente) => cliente.id === actual.id)) {
            return actual;
          }
          return clientesConCredito[0] ?? null;
        }); 
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar clientes');
      } finally {
        setLoadingClientes(false);
      }
    };

    cargarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  useEffect(() => {
    const cargarVentas = async (clienteId: number, diasCredito?: number | null) => {
      try {
        setLoadingVentas(true);
        const params = new URLSearchParams({
          sucursalId: String(sucursalIdSession),
          estado: 'CREDITO',
          clienteId: String(clienteId),
        });
        const res = await axios.get(`${apiUrl}/venta?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = Array.isArray(res.data) ? (res.data as VentaResumen[]) : [];
        const normalizadas = transformarVentasCliente(
          data,
          clienteId,
          diasCredito ?? null,
        );
        if (normalizadas.length === 0) {
          manejarCuentaLiquidada(clienteId);
        } else {
          setVentas(normalizadas);
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al cargar ventas del cliente');
      } finally {
        setLoadingVentas(false);
      }
    };

    if (clienteSeleccionado) {
      cargarVentas(clienteSeleccionado.id, clienteSeleccionado.dias_credito ?? null);
    } else {
      setVentas([]);
    }
  }, [apiUrl, clienteSeleccionado, sucursalIdSession, token]);

  useEffect(() => {
    if (!clienteSeleccionado) {
      setInfoClienteAbierto(false);
    }
  }, [clienteSeleccionado]);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter((cliente) => {
      const nombre = cliente.razon_social?.toLowerCase() || '';
      const contacto = cliente.nom_contacto?.toLowerCase() || '';
      const telefono = cliente.telefono?.toLowerCase() || '';
      const movil = cliente.movil?.toLowerCase() || '';
      const email = cliente.email?.toLowerCase() || '';
      return (
        nombre.includes(termino) ||
        contacto.includes(termino) ||
        telefono.includes(termino) ||
        movil.includes(termino) ||
        email.includes(termino)
      );
    });
  }, [busqueda, clientes]);

  const totalSaldoPendiente = useMemo(
    () => ventas.reduce((acc, venta) => acc + Number(venta.saldo_pendiente || 0), 0),
    [ventas],
  );

  const totalVentas = useMemo(
    () => ventas.reduce((acc, venta) => acc + Number(venta.total || 0), 0),
    [ventas],
  );

  const primeraFechaVenta = useMemo(() => {
    const fechasValidas = ventas
      .map((venta) => {
        if (!venta.fecha) return null;
        const fecha = new Date(venta.fecha);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
      })
      .filter((fecha): fecha is Date => fecha !== null);
    if (fechasValidas.length === 0) return null;
    const masAntigua = fechasValidas.reduce((min, fecha) =>
      fecha.getTime() < min.getTime() ? fecha : min,
    );
    return masAntigua.toISOString();
  }, [ventas]);

  const fechaLimiteMasProxima = useMemo(() => {
    const limitesValidos = ventas
      .map((venta) => {
        if (!venta.fecha_limite) return null;
        const fecha = new Date(venta.fecha_limite);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
      })
      .filter((fecha): fecha is Date => fecha !== null);
    if (limitesValidos.length === 0) return null;
    const masProxima = limitesValidos.reduce((min, fecha) =>
      fecha.getTime() < min.getTime() ? fecha : min,
    );
    return masProxima.toISOString();
  }, [ventas]);

  const resumenAtendio = useMemo(() => {
    if (ventas.length === 0) return '—';
    const nombres = ventas
      .map((venta) => nombreUsuario(venta.usuario))
      .filter((nombre) => nombre && nombre !== '—');
    if (nombres.length === 0) return '—';
    const unicos = Array.from(new Set(nombres));
    return unicos.length === 1 ? unicos[0] : 'Múltiples';
  }, [ventas]);

  const cargarAbonosActivos = async (ventaId: number, headers?: Record<string, string>) => {
    try {
      const res = await axios.get(`${apiUrl}/cxcclientes/ventas/${ventaId}/abonos/activos`, { headers });
      const data = res.data as { abonos?: AbonoCxc[] } | AbonoCxc[];

      if (Array.isArray(data)) {
        return data;
      }

      return Array.isArray(data?.abonos) ? data.abonos : [];
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los abonos activos de la venta');
      return [];
    }
  };

  const cargarDetalleVenta = async (venta: VentaResumen) => {
    if (!venta) return;

    setCargandoDetalles(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`${apiUrl}/venta/${venta.id}`, { headers });
      const abonos = await cargarAbonosActivos(venta.id, headers);


      const data = res.data as VentaDetalleInfo & {
        detalles?: VentaDetalle[];
      };
      const detalles = Array.isArray(data.detalles) ? data.detalles : [];


      const ventaNormalizada: VentaResumen = {
        ...venta,
        saldo_pendiente: Number(venta.saldo_pendiente || 0),
        total: Number(venta.total || 0),
      };
      setVentaDetallada({
        venta: ventaNormalizada,
        detalles,
        abonos,
      });
      setVentaInfo((prev) =>
        prev
          ? {
              ...prev,
              productosTotales: detalles.reduce(
                (acc, detalle) => acc + Number(detalle.cantidad ?? 0),
                0,
              ),
            }
          : prev,
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los créditos del cliente');
      setVentaDetallada(null);
    } finally {
      setCargandoDetalles(false);
    }
  };

  const abrirDetallesCuenta = async (venta: VentaResumen) => {
    if (!clienteSeleccionado) return;
    const resumen: VentaDetalleInfo = {
      id: clienteSeleccionado.id,
      total: Number(venta.total || 0),
      saldo_pendiente: Number(venta.saldo_pendiente || 0),
      cliente: clienteSeleccionado,
      fecha: venta.fecha || null,
      fecha_limite: venta.fecha_limite || null,
      ventasActivas: 1,
    };

    setVentaInfo(resumen);
    setVentaSeleccionada(venta);
    setVentaDetallada(null);
    //setMostrarProductos(false);
    setAbonoVentaMonto('');
    setAbonoVentaNota('');
    setModalDetallesAbierto(true);
    await cargarDetalleVenta(venta);
  };

  const cerrarDetalles = () => {
    setModalDetallesAbierto(false);
    setVentaInfo(null);
    setVentaDetallada(null);
    setVentaSeleccionada(null);
    //setMostrarProductos(false);
    setAbonoVentaMonto('');
    setAbonoVentaNota('');
    setCargandoDetalles(false);
  };

  const iniciarAbono = () => {
    if (!clienteSeleccionado) return;
    setAbonoNota('');
    setAbonoMetodoGeneral('EFECTIVO');
    setAbonoTipoTarjetaGeneral(null);
    setAbonoModalAbierto(true);
  };

  const refrescarVentasCliente = async (cliente: Cliente) => {
    const params = new URLSearchParams({
      sucursalId: String(sucursalIdSession),
      estado: 'CREDITO',
      clienteId: String(cliente.id),
    });
    try {
      const res = await axios.get(`${apiUrl}/venta?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = Array.isArray(res.data) ? (res.data as VentaResumen[]) : [];
      const normalizadas = transformarVentasCliente(data, cliente.id, cliente.dias_credito ?? null);
      if (normalizadas.length === 0) {
        manejarCuentaLiquidada(cliente.id);
      } else {
        setVentas(normalizadas);
        if (ventaSeleccionada) {
          const actualizada = normalizadas.find((venta) => venta.id === ventaSeleccionada.id);
          if (actualizada) {
            setVentaSeleccionada(actualizada);
          }
        }
      }
      return normalizadas;
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron actualizar las ventas del cliente');
      return [];
    }
  };

  const registrarAbonoCxc = async ({
    monto,
    nota,
    venta,
    metodoPago,
    referencia,
    tipoTarjeta,
  }: {
    monto: number;
    nota?: string;
    venta?: VentaResumen;
    metodoPago?: MetodoPagoVenta;
    referencia?: string;
    tipoTarjeta?: TipoTarjeta | null;
  }) => {
    if (!clienteSeleccionado) {
      throw new Error('No hay cliente seleccionado para registrar el abono');
    }
    const notaLimpia = nota?.trim() || undefined;
    const referenciaPago = referencia?.trim() || undefined;
    const tarjetaTipo = metodoPago === 'TARJETA' ? tipoTarjeta : undefined;
    const payloadAbono = venta
      ? {
          idcliente: clienteSeleccionado.id,
          idsucursal: sucursalIdSession,
          idventa: venta.id,
          saldo_pendiente: Number(venta.saldo_pendiente ?? venta.total ?? 0),
          monto,
          metodo_pago: metodoPago || 'EFECTIVO',
          tarjeta_tipo: tarjetaTipo,
          nota: notaLimpia,
          referencia: referenciaPago,
        }
      : {
          idcliente: clienteSeleccionado.id,
          idsucursal: sucursalIdSession,
          monto,
          metodo_pago: metodoPago || 'EFECTIVO',
          tarjeta_tipo: tarjetaTipo,
          nota: notaLimpia,
          referencia: referenciaPago,
          ventas: ventas.map((ventaItem) => ventaItem.id),
        };

    await axios.post(`${apiUrl}/cxcclientes/`, payloadAbono, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  };

  const registrarAbonoGeneral = async () => {
    if (!clienteSeleccionado) return;
    const monto = Number(totalSaldoPendiente || 0);
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('No hay saldo pendiente para este cliente');
      return;
    }

    if (abonoMetodoGeneral === 'TARJETA' && !abonoTipoTarjetaGeneral) {
      toast.error('Selecciona el tipo de tarjeta para el abono con tarjeta');
      return;
    }
    if (abonoMetodoGeneral === 'TARJETA' && !abonoReferenciaGeneral.trim()) {
      toast.error('Ingresa la referencia del pago con tarjeta');
      return;
    }

    try {
      setAbonando(true);
      await registrarAbonoCxc({
        monto,
        nota: abonoNota,
        metodoPago: abonoMetodoGeneral,
        referencia: abonoReferenciaGeneral,
        tipoTarjeta: abonoMetodoGeneral === 'TARJETA' ? abonoTipoTarjetaGeneral : null,
      });
      toast.success('Abono registrado correctamente');
      setAbonoModalAbierto(false);
      setAbonoNota('');
      setAbonoMetodoGeneral('EFECTIVO');
       setAbonoReferenciaGeneral('');
      setAbonoTipoTarjetaGeneral(null);
      if (clienteSeleccionado) {
        const ventasActualizadas = await refrescarVentasCliente(clienteSeleccionado);
        if (modalDetallesAbierto && ventaSeleccionada) {
          const ventaRefrescada =
            ventasActualizadas?.find((venta) => venta.id === ventaSeleccionada.id) ||
            ventaSeleccionada;
          await cargarDetalleVenta(ventaRefrescada);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo registrar el abono de la venta');
    } finally {
      setAbonandoVenta(false);
    }
  };

  const registrarAbonoVenta = async (montoPersonalizado?: number) => {
    if (!clienteSeleccionado || !ventaSeleccionada || !ventaDetallada) return;
    const monto = montoPersonalizado ?? Number(abonoVentaMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Ingresa un monto válido para el abono');
      return;
    }
    if (monto > Number(ventaDetallada.venta.saldo_pendiente || 0) + 0.01) {
      const continuar = window.confirm(
        'El monto del abono es mayor al saldo pendiente de esta venta. ¿Deseas continuar?',
      );
      if (!continuar) return;
    }

    if (abonoVentaMetodo === 'TARJETA') {
      if (!abonoVentaReferencia.trim()) {
        toast.error('Ingresa la referencia del pago con tarjeta');
        return;
      }
      if (!abonoVentaTipoTarjeta) {
        toast.error('Selecciona el tipo de tarjeta (débito o crédito)');
        return;
      }
    }

    try {
      setAbonandoVenta(true);
      await registrarAbonoCxc({
        monto,
        nota: abonoVentaNota,
        venta: ventaDetallada.venta,
        metodoPago: abonoVentaMetodo,
        referencia: abonoVentaReferencia,
        tipoTarjeta: abonoVentaMetodo === 'TARJETA' ? abonoVentaTipoTarjeta : null,
      });
      toast.success('Abono registrado en la venta');

      // Limpiar formulario
      setAbonoVentaMonto('');
      setAbonoVentaNota('');
      setAbonoVentaMetodo('EFECTIVO');
      setAbonoVentaReferencia('');
      setAbonoVentaTipoTarjeta(null);

      // Actualizar ventas
      await refrescarVentasCliente(clienteSeleccionado);
      cerrarDetalles();

    } catch (error) {
      console.error(error);
      toast.error('No se pudo registrar el abono de la venta');
    } finally {
      setAbonandoVenta(false);
    }
  };

  const liquidarPagoCompleto = () => {
  if (!ventaDetallada) return;

  const saldoPendiente = Number(ventaDetallada.venta.saldo_pendiente || 0);
  if (saldoPendiente <= 0) {
    toast.error('Esta venta ya no tiene saldo pendiente');
    return;
  }
  // Solo rellena el campo, NO registra
  setAbonoVentaMonto(saldoPendiente.toFixed(2));
};

  const totalProductos = useMemo(
    () =>
      ventaDetallada?.detalles.reduce(
        (acc, detalle) => acc + Number(detalle.cantidad ?? 0),
        0,
      ) || 0,
    [ventaDetallada],
  );

  const nombreCompletoCliente = useMemo(() => {
    return obtenerNombreCliente(clienteSeleccionado);
  }, [clienteSeleccionado]);

  const direccionFiscalCliente = useMemo(() => {
    if (!clienteSeleccionado) return '—';
    const partes = [
      clienteSeleccionado.domicilio_facturacion,
      clienteSeleccionado.no_ext_facturacion,
      clienteSeleccionado.no_int_facturacion,
      clienteSeleccionado.colonia_facturacion,
      clienteSeleccionado.localidad_facturacion,
      clienteSeleccionado.ciudad_facturacion,
      clienteSeleccionado.estado_facturacion,
      clienteSeleccionado.cp_facturacion,
      clienteSeleccionado.pais_facturacion,
    ]
      .map((parte) => parte?.trim())
      .filter((parte) => parte && parte.length > 0);
    return partes.length > 0 ? partes.join(', ') : '—';
  }, [clienteSeleccionado]);

  const abrirInformacionCliente = () => {
    if (!clienteSeleccionado) return;
    setInfoClienteAbierto(true);
  };

  const cerrarInformacionCliente = () => {
    setInfoClienteAbierto(false);
  };

  const obtenerFechaAbono = (abono: AbonoCxc) => abono.fecha || abono.createdAt;

  const devolverAbono = async (abonoId: number) => {
    if (!abonoId) return;
    try {
      setAbonoProcesandoId(abonoId);
      await axios.post(
        `${apiUrl}/cxcclientes/abonos/${abonoId}/devolver`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      toast.success('Abono devuelto correctamente');
      if (clienteSeleccionado) {
        const ventasActualizadas = await refrescarVentasCliente(clienteSeleccionado);
        if (ventaDetallada) {
          const ventaRefrescada =
            ventasActualizadas?.find((venta) => venta.id === ventaDetallada.venta.id) ||
            ventaDetallada.venta;
          await cargarDetalleVenta(ventaRefrescada);
        }
      }
       if (modalDetallesAbierto) {
        cerrarDetalles();
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo devolver el abono');
    } finally {
      setAbonoProcesandoId(null);
    }
  };

  const bloqueEstadoDetalles =
    cargandoDetalles ? (
      <div className="border rounded-lg py-6 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando créditos...
        </div>
      </div>
    ) : !ventaDetallada ? (
      <div className="border rounded-lg py-6 text-center text-sm text-gray-500">
        No se encontró información de la venta seleccionada.
      </div>
    ) : null;
  const detalleListo = !cargandoDetalles && ventaDetallada;

  return (
    <div className="py-8 relative">
      
      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          <GuideArrowOverlay 
            activeKey={currentSteps[currentStepIndex].targetKey}
            placement={currentSteps[currentStepIndex].placement} 
          />
          <GuideModal 
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-600" data-guide="page-title">CXC Clientes</h1>
          <p className="text-gray-600">
            Consulta los clientes con crédito, revisa sus ventas y registra abonos generales a su cuenta.
          </p>
          
          {/* Botón de Guía */}
          <div className="mt-4 relative inline-block text-left">
            <Button 
                variant="outline" 
                size="sm"
                onClick={toggleGuideMenu}
                className="flex items-center gap-2"
            >
                {hasClientsWithDebt ? <BookOpen className="w-4 h-4" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                Guía
                <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
            </Button>

            {showGuideMenu && (
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95">
                    <div className="py-1">
                        <button
                            onClick={() => startGuide('MAIN')}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                            <Search className="w-4 h-4 text-blue-600" />
                            <span>Flujo Principal</span>
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                            onClick={() => startGuide('SALE_DETAIL')}
                            disabled={!clienteSeleccionado || ventas.length === 0}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${!clienteSeleccionado || ventas.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <Receipt className="w-4 h-4 text-green-600" />
                            <span>Detalle de Venta</span>
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
        {/* PROXIMAMENTE FUNCIONALIDAD DE ABONO GENERAL
        <Button
          onClick={iniciarAbono}
          disabled={!clienteSeleccionado || totalSaldoPendiente <= 0}
          className="flex items-center gap-2"
        >
          {abonando ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
          Abono general
        </Button>*/}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <section className="bg-white border rounded-xl shadow-sm p-4 flex flex-col max-h-[70vh]">
          <div className="relative mb-4" data-guide="search-box">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar cliente por nombre, teléfono o correo"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" data-guide="clients-list">
            {loadingClientes ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">Cargando clientes...</span>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No se encontraron clientes con el criterio de búsqueda.
              </p>
            ) : (
              clientesFiltrados.map((cliente) => {
                const seleccionado = clienteSeleccionado?.id === cliente.id;
                return (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => setClienteSeleccionado(cliente)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      seleccionado
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{cliente.razon_social}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {obtenerNombreCliente(cliente)|| 'Sin nombre'}
                    </div>  
                    <div className="mt-1 text-xs text-gray-500">
                      Teléfono: {cliente.telefono || cliente.movil || 'Sin teléfono'}
                    </div>  
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-white border rounded-xl shadow-sm p-6">
          {clienteSeleccionado ? (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                <div className="flex items-start gap-3" data-guide="client-header">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">{clienteSeleccionado.razon_social}</h2>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Nombre:</span>{" "}
                      {clienteSeleccionado.nom_contacto}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Límite de crédito:</span>{" "}
                      {clienteSeleccionado.limite_credito
                        ? formatCurrency(clienteSeleccionado.limite_credito)
                        : '—'}
                      {' • '}<span className="font-semibold">Días de crédito:</span>{' '}
                      {clienteSeleccionado.dias_credito ?? '—'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 flex items-center gap-2"
                    onClick={abrirInformacionCliente}
                    data-guide="btn-view-info"
                  >
                    <Eye className="h-4 w-4" />
                    Ver información
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3" data-guide="summary-cards">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total en ventas</p>
                    <p className="text-lg font-semibold text-gray-800">{formatCurrency(totalVentas)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Saldo pendiente</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(totalSaldoPendiente)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8 text-sm text-gray-600">
                Consulta la información completa del cliente en el diálogo de detalles.
              </div>

              <div className="border rounded-xl overflow-hidden" data-guide="sales-table">
                <Table>
                  <TableHeader className="bg-orange-100">
                    <TableRow>
                      <TableHead data-guide="col-folio">Folio</TableHead>
                      <TableHead data-guide="col-atendio">Atendió</TableHead>
                      <TableHead className="text-right" data-guide="col-total">Total</TableHead>
                      <TableHead className="text-right" data-guide="col-saldo">Saldo pendiente</TableHead>
                      <TableHead data-guide="col-fecha">Fecha</TableHead>
                      <TableHead data-guide="col-limite">Fecha límite</TableHead>
                      <TableHead className="text-center" data-guide="col-acciones">Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingVentas ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando ventas...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : ventas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-500">
                          Este cliente no tiene ventas a crédito con saldo pendiente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ventas.map((venta) => (
                        <TableRow key={venta.id}>
                          <TableCell className="font-medium text-gray-800">
                            {venta.numdoc || venta.id || '—'}
                          </TableCell>
                          <TableCell>{nombreUsuario(venta.usuario) || resumenAtendio}</TableCell>
                          <TableCell className="text-right">{formatCurrency(venta.total)}</TableCell>
                          <TableCell className="text-right text-orange-600 font-semibold">
                            {formatCurrency(venta.saldo_pendiente)}
                          </TableCell>
                          <TableCell>{formatDate(venta.fecha)}</TableCell>
                          <TableCell>{formatDate(venta.fecha_limite)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDetallesCuenta(venta)}
                              disabled={cargandoDetalles && ventaSeleccionada?.id === venta.id}
                            >
                              {cargandoDetalles && ventaSeleccionada?.id === venta.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-1" />
                              )}
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              Selecciona un cliente para consultar sus ventas a crédito.
            </div>
          )}
        </section>
      </div>

      {/* --- MODALES --- */}
      <Dialog open={infoClienteAbierto} onOpenChange={(open) => (open ? setInfoClienteAbierto(true) : cerrarInformacionCliente())}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600" data-guide="client-info-modal-title">
              Información del cliente
            </DialogTitle>
            <DialogDescription>
              Consulta los datos generales y de facturación del cliente seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-guide="info-general">
              <InfoCard label="Nombre completo" value={nombreCompletoCliente} />
              <InfoCard
                label="Nombre comercial"
                value={displayValue(clienteSeleccionado?.razon_social)}
              />
              <InfoCard label="Correo electrónico" value={displayValue(clienteSeleccionado?.email)} />
              <InfoCard label="Teléfono" value={displayValue(clienteSeleccionado?.telefono)} />
              <InfoCard label="Móvil" value={displayValue(clienteSeleccionado?.movil)} />
              <InfoCard label="Contacto" value={displayValue(clienteSeleccionado?.nom_contacto)} />
              <div className="contents" data-guide="info-credito">
                <InfoCard
                    label="Límite de crédito"
                    value={
                    clienteSeleccionado?.limite_credito !== null &&
                    clienteSeleccionado?.limite_credito !== undefined
                        ? formatCurrency(clienteSeleccionado.limite_credito)
                        : '—'
                    }
                />
                <InfoCard
                    label="Días de crédito"
                    value={displayValue(
                    clienteSeleccionado?.dias_credito !== null &&
                        clienteSeleccionado?.dias_credito !== undefined
                        ? `${clienteSeleccionado.dias_credito} días`
                        : null,
                    )}
                />
                <InfoCard
                    label="Tipo de precio"
                    value={displayValue(
                    clienteSeleccionado?.tipo_precio != null
                        ? String(clienteSeleccionado.tipo_precio)
                        : null,
                    )}
                />
              </div>
            </div>

            <div data-guide="info-fiscal">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-3">
                Información de facturación
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  label="Razón social facturación"
                  value={displayValue(clienteSeleccionado?.razon_social_facturacion)}
                />
                <InfoCard label="RFC" value={displayValue(clienteSeleccionado?.rfc_facturacion)} />
                <InfoCard label="CURP" value={displayValue(clienteSeleccionado?.curp_facturacion)} />
                <InfoCard
                  label="Régimen fiscal"
                  value={displayValue(clienteSeleccionado?.regimen_fiscal)}
                />
                <InfoCard label="Dirección fiscal" value={direccionFiscalCliente} className="sm:col-span-2 lg:col-span-3" />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={cerrarInformacionCliente}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalDetallesAbierto} onOpenChange={(open) => !open && cerrarDetalles()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
           <DialogTitle className="text-xl font-semibold text-orange-600">
            Detalle de venta a crédito
            <span className="ml-2 text-base font-medium text-gray-600">
              • Folio {displayValue(ventaSeleccionada?.numdoc || ventaSeleccionada?.id)}
            </span>
          </DialogTitle>
            <DialogDescription>
              Consulta el historial de abonos y la información de la venta. Usa la opción "Más" para ver los productos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 bg-gray-50 border rounded-lg p-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Cliente"
                  value={displayValue(
                    ventaInfo?.cliente?.razon_social ||
                      ventaInfo?.cliente?.nom_contacto ||
                      nombreCompletoCliente,
                  )}
                  className="sm:col-span-2 xl:col-span-3"
                />
                <InfoCard
                  label="Total venta"
                  value={formatCurrency(ventaInfo?.total ?? ventaSeleccionada?.total ?? 0)}
                />
                <InfoCard
                  label="Saldo pendiente"
                  value={formatCurrency(
                    ventaInfo?.saldo_pendiente ?? ventaSeleccionada?.saldo_pendiente ?? 0,
                  )}
                />
                <InfoCard
                  label="Fecha"
                  value={formatDate(ventaInfo?.fecha ?? ventaSeleccionada?.fecha)}
                />
                <InfoCard
                  label="Fecha límite"
                  value={formatDate(ventaInfo?.fecha_limite ?? ventaSeleccionada?.fecha_limite)}
                />
                <InfoCard
                  label="Productos"
                  value={cargandoDetalles
                    ? 'Cargando...'
                    : String(ventaInfo?.productosTotales ?? totalProductos)}
                />
              </div>
              <div className="h-full">
                {detalleListo ? (
                <div className="border rounded-lg p-4 space-y-3 h-full">
                  <h4 className="text-sm font-semibold text-gray-700">Abonar a esta venta</h4>

                  {/* Fila superior: Monto + Método */}
                  <div className="grid grid-cols-12 gap-3 items-end">
                    {/* Monto */}
                    <div className="col-span-12 sm:col-span-6 space-y-1">
                      <label htmlFor="abono-venta-monto" className="text-xs font-medium text-gray-700">
                        Monto
                      </label>
                      <Input
                        id="abono-venta-monto"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={abonoVentaMonto}
                        onChange={(event) => setAbonoVentaMonto(event.target.value)}
                        placeholder="Ej. 250.00"
                      />
                    </div>

                    {/* Método */}
                    <div className="col-span-12 sm:col-span-6 space-y-1">
                      <label className="text-xs font-medium text-gray-700">Método de pago</label>
                      <Select
                        value={abonoVentaMetodo}
                        onValueChange={(value) => {
                          const metodo = value as MetodoPagoVenta;
                          setAbonoVentaMetodo(metodo);
                          if (metodo === 'EFECTIVO') {
                            setAbonoVentaReferencia('');
                            setAbonoVentaTipoTarjeta(null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el método" />
                        </SelectTrigger>

                        <SelectContent position="popper" className="z-[60] bg-white text-gray-900 border shadow-md">
                          <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                          <SelectItem value="TARJETA">Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {abonoVentaMetodo === 'TARJETA' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Tipo de tarjeta</label>
                      <Select
                        value={abonoVentaTipoTarjeta || undefined}
                        onValueChange={(value) => setAbonoVentaTipoTarjeta(value as TipoTarjeta)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de tarjeta" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60] bg-white text-gray-900 border shadow-md">
                          <SelectItem value="DEBITO">Débito</SelectItem>
                          <SelectItem value="CREDITO">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {/* Nota */}
                  <div className="space-y-1">
                    <label htmlFor="abono-venta-nota" className="text-xs font-medium text-gray-700">
                      Nota u observaciones
                    </label>
                    <Input
                      id="abono-venta-nota"
                      value={abonoVentaNota}
                      onChange={(event) => setAbonoVentaNota(event.target.value)}
                      placeholder="Referencia del pago, método, etc."
                    />
                  </div>

                  {/* Referencia tarjeta: SIEMPRE visible abajo, pero desactivada si no es TARJETA */}
                  <div className="space-y-1">
                    <label htmlFor="abono-venta-referencia" className="text-xs font-medium text-gray-700">
                      Referencia de tarjeta
                    </label>
                    <Input
                      id="abono-venta-referencia"
                      value={abonoVentaReferencia}
                      onChange={(event) => setAbonoVentaReferencia(event.target.value)}
                      placeholder={abonoVentaMetodo === 'TARJETA' ? 'Ej. 123456 / autorización' : 'Selecciona “Tarjeta” para habilitar'}
                      disabled={abonoVentaMetodo !== 'TARJETA'}
                      className={abonoVentaMetodo !== 'TARJETA' ? 'opacity-60' : ''}
                    />
                    {abonoVentaMetodo !== 'TARJETA' && (
                      <p className="text-xs text-gray-500">
                        Este campo se habilita al seleccionar <span className="font-medium">Tarjeta</span>.
                      </p>
                    )}
                  </div>

                  {/* Botones: Liquidar SIEMPRE activo */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
                    <Button
                      variant="secondary"
                      onClick={liquidarPagoCompleto}
                      disabled={abonandoVenta || !ventaDetallada}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {abonandoVenta ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                      Liquidar pago
                    </Button>

                    <Button
                      onClick={() => registrarAbonoVenta()}
                      disabled={abonandoVenta || !ventaDetallada}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {abonandoVenta ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                      Abonar
                    </Button>
                  </div>
                </div>
                ) : (
                  bloqueEstadoDetalles
                )}
              </div>
            </div>

            {detalleListo ? (
              <div className="grid gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>Historial de abonos</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSeccionDetalleActiva((prev) => (prev === 'historial' ? null : 'historial'))
                      }
                      className="text-orange-600"
                    >
                      {seccionDetalleActiva === 'historial' ? 'Ocultar historial' : 'Ver historial'}
                    </Button>
                  </div>
                    {seccionDetalleActiva === 'historial' ? (
                    <Table>
                      <TableHeader className="bg-orange-100">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Saldo abonado</TableHead>
                          <TableHead className="text-right">Saldo pendiente</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalleListo.abonos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-4 text-center text-sm text-gray-500">
                              Sin abonos registrados para esta venta.
                            </TableCell>
                          </TableRow>
                        ) : (
                          detalleListo.abonos.map((abono) => (
                            <TableRow key={`${detalleListo.venta.id}-${abono.id}`}>
                              <TableCell>{formatDate(obtenerFechaAbono(abono))}</TableCell>
                              <TableCell className="text-right">{(abono.metodo_pago)}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrencyOrDash(abono.saldo_abonado)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrencyOrDash(abono.saldo_pendiente)}
                              </TableCell>
                              <TableCell className="max-w-xs">{abono.nota?.trim() || '—'}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => devolverAbono(abono.id)}
                                  disabled={abonoProcesandoId === abono.id}
                                  className="inline-flex items-center gap-2"
                                >
                                  {abonoProcesandoId === abono.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <HandCoins className="h-4 w-4" />
                                  )}
                                  Devolver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-4 text-sm text-gray-500">
                      Selecciona "Ver historial" para consultar los abonos registrados.
                    </div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>Más</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSeccionDetalleActiva((prev) => (prev === 'productos' ? null : 'productos'))
                      }
                      className="text-orange-600"
                    >
                      {seccionDetalleActiva === 'productos' ? 'Ocultar productos' : 'Ver productos'}
                    </Button>
                  </div>
                  {seccionDetalleActiva === 'productos' ? (
                    <Table>
                      <TableHeader className="bg-orange-100">
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Precio unitario</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalleListo.detalles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-4 text-center text-sm text-gray-500">
                              Sin productos registrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          detalleListo.detalles.map((detalle) => {
                            const cantidad = Number(detalle.cantidad || 0);
                            const importe = Number(detalle.total || 0);
                            const precioUnitario =
                              detalle.precio ?? (cantidad ? importe / cantidad : 0);
                            return (
                              <TableRow key={`${detalleListo.venta.id}-${detalle.id}-${detalle.producto?.nombre ?? ''}`}>
                                <TableCell>{detalle.producto?.nombre || '—'}</TableCell>
                                <TableCell className="text-center">{cantidad}</TableCell>
                                <TableCell className="text-right">{formatCurrency(precioUnitario)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(importe)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-4 text-sm text-gray-500">
                      Consulta los productos de la venta usando el botón "Ver productos".
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={cerrarDetalles}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={abonoModalAbierto} onOpenChange={setAbonoModalAbierto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">
              Abono general del cliente
            </DialogTitle>
            <DialogDescription>
              Registra un abono que se aplicará al saldo pendiente de todas las ventas de este cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 border rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-800">{clienteSeleccionado?.razon_social}</p>
              <p className="text-gray-600">
                Saldo pendiente actual:{' '}
                <span className="font-semibold text-orange-600">
                  {formatCurrency(totalSaldoPendiente)}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Monto del abono</label>
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {formatCurrency(totalSaldoPendiente)}
              </div>
              <p className="text-xs text-gray-500">Este monto corresponde al saldo pendiente y no es editable.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Método de pago</label>
              <Select
                value={abonoMetodoGeneral}
                onValueChange={(value) => {
                  const metodo = value as MetodoPagoVenta;
                  setAbonoMetodoGeneral(metodo);
                  setAbonoReferenciaGeneral('');
                  if (metodo === 'EFECTIVO') {
                    setAbonoTipoTarjetaGeneral(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el método" />
                </SelectTrigger>
                <SelectContent className="z-[60] bg-white text-gray-900 border shadow-md">
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {abonoMetodoGeneral === 'TARJETA' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tipo de tarjeta</label>
                <Select
                  value={abonoTipoTarjetaGeneral || undefined}
                  onValueChange={(value) => setAbonoTipoTarjetaGeneral(value as TipoTarjeta)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de tarjeta" />
                  </SelectTrigger>
                  <SelectContent className="z-[60] bg-white text-gray-900 border shadow-md">
                    <SelectItem value="DEBITO">Débito</SelectItem>
                    <SelectItem value="CREDITO">Crédito</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <label htmlFor="abono-referencia-general" className="text-sm font-medium text-gray-700">
                    Referencia del pago
                  </label>
                  <Input
                    id="abono-referencia-general"
                    placeholder="Últimos dígitos / autorización"
                    value={abonoReferenciaGeneral}
                    onChange={(event) => setAbonoReferenciaGeneral(event.target.value)}
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="abono-nota" className="text-sm font-medium text-gray-700">
                Nota u observaciones (opcional)
              </label>
              <textarea
                id="abono-nota"
                value={abonoNota}
                onChange={(event) => setAbonoNota(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Referencia del pago, método, etc."
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAbonoModalAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={registrarAbonoGeneral} disabled={abonando} className="flex items-center gap-2">
              {abonando ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
              Confirmar abono
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}