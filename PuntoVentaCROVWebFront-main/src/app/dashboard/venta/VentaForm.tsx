'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Trash2,
  PlusCircle,
  Eye,
  Banknote,
  CreditCard,
  CheckSquare,
  Ticket,
  ArrowLeftRight,
  Minus,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  History
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatFecha } from '@/lib/date';
import { getUserPermissions } from '@/lib/permissions';
import type { Producto, ProductoTransferEvent } from './types';

// --- UTILIDADES ---
const getErrorMessage = (error: unknown, fallback = 'Error al guardar'): string => {
  const visited = new Set<unknown>();
  const extract = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (visited.has(value)) return null;
    if (Array.isArray(value)) {
      visited.add(value);
      const parts = value.map((item) => extract(item)).filter((item): item is string => Boolean(item));
      return parts.length > 0 ? parts.join(', ') : null;
    }
    if (typeof value === 'object') {
      visited.add(value);
      const obj = value as Record<string, unknown>;
      const keys: (keyof typeof obj)[] = ['message', 'error', 'detail', 'msg', 'errors'];
      for (const key of keys) {
        const result = extract(obj[key]);
        if (result) return result;
      }
      try {
        const json = JSON.stringify(value);
        return json === '{}' ? null : json;
      } catch {
        return null;
      }
    }
    return null;
  };
  const err = error as { response?: { data?: unknown }; message?: unknown };
  return (
    extract(err?.response?.data) ??
    (typeof err?.message === 'string' ? err.message : null) ??
    extract(err?.message) ??
    extract(error) ??
    fallback
  );
};

// --- INTERFACES ---
interface VentaFormProps {
  active: boolean;
  onPaymentStart?: () => void;
  onSearchOpen?: () => void;
  onDetailsOpen?: () => void;
  onProductModalChange?: (isOpen: boolean) => void;
}

interface Cliente {
  id: number;
  razon_social: string;
  tipo_precio?: number | null;
}

interface ItemVenta {
  id: number;
  nombre: string;
  cantidad: number;
  existencia: number;
  costo?: number;
  precio: number;
  precioBase: number;
  descuento: number;
  total: number;
  promociones?: number[];
  servicio?: number;
  tipo_medicamento?: string | null;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precio4?: number;
}

interface Promocion {
  id: number;
  tipo: 'POR_PRODUCTO' | 'POR_CANTIDAD' | 'AL_MAYOREO' | 'GENERAL';
  productoId?: number;
  cantidad?: number;
  monto?: number;
  porcentaje?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  descripcion?: string;
}

declare global {
  interface WindowEventMap {
    'venta:agregar-producto': CustomEvent<ProductoTransferEvent>;
  }
}

interface Venta {
  id: number;
  numdoc: string;
  cliente?: { razon_social: string } | null;
  numitems: number;
  estado: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  activo?: number;
  fecha_devolucion?: string | null;
}

interface DetalleVenta {
  id: number;
  producto?: { 
    nombre: string;
    servicio?: number;
  };
  id_producto: number;
  cantidad: number;
  cantidad_existente?: number;
  servicio?: number;
  costo?: number;
  total: number;
  activo?: number;
  descuento?:number;
  descuentoind?:number;
  descuentogeneral?: number;
  fecha_devolucion?: string | null;
}

const obtenerPrecioPreferente = (
  precios: Partial<Pick<Producto, 'precio1' | 'precio2' | 'precio3' | 'precio4'>>,
  tipoPrecio?: number | null,
) => {
  const preferencia = Number(tipoPrecio ?? 1);
  if (preferencia === 2 && precios.precio2 !== undefined) return Number(precios.precio2);
  if (preferencia === 3 && precios.precio3 !== undefined) return Number(precios.precio3);
  if (preferencia === 4 && precios.precio4 !== undefined) return Number(precios.precio4);
  if (precios.precio1 !== undefined) return Number(precios.precio1);
  if (precios.precio2 !== undefined) return Number(precios.precio2);
  if (precios.precio3 !== undefined) return Number(precios.precio3);
  if (precios.precio4 !== undefined) return Number(precios.precio4);
  return 0;
};

// === COMPONENTE PRINCIPAL ===
export default function VentaForm({ active, onPaymentStart, onSearchOpen, onDetailsOpen, onProductModalChange }: VentaFormProps) {
  const [numdoc, setFolio] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [estado, setEstado] = useState<'CONTADO' | 'CREDITO' | 'TARJETA' | 'COTIZACION'>('CONTADO');
  const [observaciones, setObservaciones] = useState('');
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState<Producto[]>([]);
  const [indiceProductoSeleccionado, setIndiceProductoSeleccionado] = useState(-1);
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [indiceItemSeleccionado, setIndiceItemSeleccionado] = useState<number>(-1);
  const [cotizacionId, setCotizacionId] = useState<number | null>(null);
  
  // Modales
  const [modalBusquedaOpen, setModalBusquedaOpen] = useState(false);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [modalDetallesOpen, setModalDetallesOpen] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [detalles, setDetalles] = useState<DetalleVenta[]>([]);
  const [ventaDetalleId, setVentaDetalleId] = useState<number | null>(null);
  const [ventaDetalleFolio, setVentaDetalleFolio] = useState<string | null>(null);
  const [ventaDevuelta, setVentaDevuelta] = useState(false);
  
  const [descuentoGeneral, setDescuentoGeneral] = useState(0);
  const [descuentoGeneralTexto, setDescuentoGeneralTexto] = useState('0');
  const [inventarioNegativo, setInventarioNegativo] = useState(false);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [promocionesGeneralesIds, setPromocionesGeneralesIds] = useState<number[]>([]);
  const [descuentoGeneralBase, setDescuentoGeneralBase] = useState(0);

  // Pagos
  const [detalleEfectivo, setDetalleEfectivo] = useState(0);
  const [detalleTarjeta, setDetalleTarjeta] = useState(0);
  const [detalleVale, setDetalleVale] = useState(0);
  const [detalleCheque, setDetalleCheque] = useState(0);
  const [detalleTransferencia, setDetalleTransferencia] = useState(0);

  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [modalRecetaOpen, setModalRecetaOpen] = useState(false);
  const [efectivo, setEfectivo] = useState(0);
  const [tarjeta, setTarjeta] = useState(0);
  const [cheque, setCheque] = useState(0);
  const [vale, setVale] = useState(0);
  const [transferencia, setTransferencia] = useState(0);
  const [tarjetaTipo, setTarjetaTipo] = useState<'DEBITO' | 'CREDITO'>('DEBITO');
  const [referencia, setReferencia] = useState('');
  
  // Receta
  const [receta, setReceta] = useState('');
  const [medicoCedula, setMedicoCedula] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [medicoDireccion, setMedicoDireccion] = useState('');
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [medicoCedulaConfirmada, setMedicoCedulaConfirmada] = useState<string | null>(null);
  const [buscandoMedico, setBuscandoMedico] = useState(false);
  const [procesandoReceta, setProcesandoReceta] = useState(false);
  const [accionRecetaPendiente, setAccionRecetaPendiente] = useState<{ imprimirTicket: boolean } | null>(null);

  // --- NUEVOS ESTADOS DE VALIDACIÓN ---
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);
  const [hasSales, setHasSales] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // Fechas
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fechaInicio, setFechaInicio] = useState(monday.toISOString().substring(0, 10));
  const [fechaFin, setFechaFin] = useState(sunday.toISOString().substring(0, 10));

  const [folioBusqueda, setFolioBusqueda] = useState('');
  const [estadoBusqueda, setEstadoBusqueda] = useState('');
  const buscarRef = useRef<HTMLInputElement>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
  const agregarProductoRef = useRef<(producto: Producto, cantidad?: number) => Promise<void> | void>(async () => {});

  const clienteSeleccionado = useMemo(() => clientes.find((c) => c.id === Number(clienteId)), [clientes, clienteId]);
  const ultimoProductoTransferido = useRef(0);
  const focusBusqueda = () => buscarRef.current?.focus();

  // COMUNICACIÓN CON LA GUÍA
  useEffect(() => {
    if (onProductModalChange) {
        onProductModalChange(modalProductoOpen);
    }
  }, [modalProductoOpen, onProductModalChange]);

  // --- VERIFICACIÓN DE SISTEMA (INVENTARIO Y VENTAS) ---
  useEffect(() => {
    const checkSystem = async () => {
      try {
        // 1. Verificar Inventario
        const paramsInv = new URLSearchParams({
          pagina: "1",
          limite: "1",
          sucursalId: sucursalIdSession.toString(),
        });
        const resInv = await axios.get(
          `${apiUrl}/producto/productosPaginacion?${paramsInv.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const prods = resInv.data?.productos || [];
        setIsInventoryEmpty(prods.length === 0);

        // 2. Verificar Ventas
        const paramsVentas = new URLSearchParams({
            sucursalId: sucursalIdSession.toString(),
            limit: "1"
        });
        const resVentas = await axios.get(
            `${apiUrl}/venta?${paramsVentas.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setHasSales(Array.isArray(resVentas.data) && resVentas.data.length > 0);

      } catch (error) {
        console.error("Error verificando sistema:", error);
        // Fallback seguro
        setIsInventoryEmpty(true);
        setHasSales(false);
      } finally {
        setCheckingSystem(false);
      }
    };
    if (active) checkSystem();
  }, [active, apiUrl, sucursalIdSession, token]);

  // --- HANDLER PARA ABRIR BÚSQUEDA DE PRODUCTOS (F2) ---
  const handleOpenProductSearch = () => {
    if (checkingSystem) return;
    if (isInventoryEmpty) {
        toast.error('No hay productos registrados', {
            description: 'Registra productos en el inventario para poder buscarlos.',
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            duration: 4000,
        });
        return;
    }
    setModalProductoOpen(true);
    if (onSearchOpen) onSearchOpen();
  };

  // --- HANDLER PARA ABRIR BÚSQUEDA DE VENTAS ---
  const handleOpenSalesSearch = () => {
    if (checkingSystem) return;
    if (!hasSales) {
        toast.warning('No hay historial de ventas', {
            description: 'Realiza una venta primero para ver el historial.',
            icon: <History className="w-5 h-5 text-orange-500" />,
            duration: 4000,
        });
        return;
    }
    setModalBusquedaOpen(true);
    cargarVentas();
    if (onSearchOpen) onSearchOpen();
  };

  const construirProductoDesdePayload = useCallback(
    async (payload: ProductoTransferEvent): Promise<Producto | null> => {
      if (!payload) return null;
      let producto: Producto | null = payload.producto ?? null;

      const mezclar = (datos: Partial<Producto> | null | undefined) => {
        if (!datos) return;
        const limpias = Object.fromEntries(
          Object.entries(datos).filter(([, value]) => value !== undefined)
        ) as Partial<Producto>;
        producto = {
          ...(producto ?? ({} as Producto)),
          ...limpias,
          tipo_medicamento:
            limpias.tipo_medicamento ?? producto?.tipo_medicamento ?? null,
        };
      };

      if (!producto && payload.productoId) {
        producto = { id: payload.productoId } as Producto;
      }
      mezclar({
        codigo: payload.codigo ?? undefined,
        cod_barras: payload.codBarras ?? undefined,
      });

      const axiosConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      if (!apiUrl) return producto;

      const requiereDetalleGeneral = !producto || producto.precio1 === undefined;
      if (payload.productoId && requiereDetalleGeneral) {
        try {
          const res = await axios.get(`${apiUrl}/producto/productos/${payload.productoId}`, axiosConfig);
          mezclar(res.data as Partial<Producto>);
        } catch (err) { console.error(err); }
      }

      const requiereDetalleSucursal = !producto || producto.cantidad_existencia === undefined;
      if (requiereDetalleSucursal) {
        const codigo = payload.codBarras || payload.codigo || producto?.cod_barras || producto?.codigo;
        if (codigo) {
           try {
            const res = await axios.get(`${apiUrl}/producto/codigo/${codigo}?sucursalId=${sucursalIdSession}`, axiosConfig);
            mezclar(res.data as Partial<Producto>);
           } catch(err) { console.error(err); }
        }
      }
      return producto;
    },
    [apiUrl, sucursalIdSession, token]
  );

  const [permisos, setPermisos] = useState<Record<string, boolean>>({})
  const cargarPermisosUser = async () => {
    const data = await getUserPermissions(userIdSession, token || undefined)
    const tienePermiso = (permiso: string) => {
      if (Array.isArray(data)) {
        return data.some((p: any) => p.nombre === permiso || p.permiso === permiso || String(p.id) === permiso)
      }
      return data?.[permiso] === 1 || data?.[permiso] === true
    }
    setPermisos({ 'Compra-Venta/Devolución Producto': tienePermiso('Compra-Venta/Devolución Producto') });
  }

 const cargarInventarioNegativo = async () => {
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalIdSession}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setInventarioNegativo(res.data.inventario_negativo === 1 || res.data.inventario_negativo === true);
    } catch (err) { console.error(err); }
  };

  const cargarPromociones = async () => {
    try {
      const res = await axios.get(`${apiUrl}/promocion/promociones/aplicables?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: Promocion[] = res.data;
      setPromociones(data);
      const hoy = new Date();
      const enFecha = (p: Promocion) => {
        const inicio = p.fecha_inicio ? new Date(p.fecha_inicio) : null;
        const fin = p.fecha_fin ? new Date(p.fecha_fin) : null;
        if (inicio && hoy < inicio) return false;
        if (fin && hoy > fin) return false;
        return true;
      };
      const generales = data.filter((p) => p.tipo === 'GENERAL' && enFecha(p));
      const ids = generales.map((g) => g.id);
      setPromocionesGeneralesIds(ids);
      const descuento = generales.reduce((s, g) => s + (g.porcentaje || 0), 0);
      setDescuentoGeneralBase(descuento);
      actualizarDescuentoGeneral(descuento);
    } catch (err) {
      console.error(err);
    }
  };

  const aplicarPromociones = useCallback((
    productoId: number,
    precioBase: number,
    cantidad: number,
  ) => {
    let descuento = 0;
    const aplicadas: number[] = [...promocionesGeneralesIds];
    const hoy = new Date();

    const enFecha = (p: Promocion) => {
      const inicio = p.fecha_inicio ? new Date(p.fecha_inicio) : null;
      const fin = p.fecha_fin ? new Date(p.fecha_fin) : null;
      if (inicio && hoy < inicio) return false;
      if (fin && hoy > fin) return false;
      return true;
    };

    promociones.forEach((p) => {
      if (p.tipo === 'POR_PRODUCTO' && p.productoId === productoId && enFecha(p)) {
        descuento += p.porcentaje || 0;
        aplicadas.push(p.id);
      }
    });

    const packs = promociones
      .filter(
        (p) =>
          p.tipo === 'POR_CANTIDAD' &&
          p.productoId === productoId &&
          enFecha(p) &&
          (p.cantidad || 0) > 0 &&
          (p.monto || 0) > 0
      )
      .map((p) => ({
        id: p.id,
        size: p.cantidad as number,
        cost: p.monto as number,
        desc: p.descripcion || `Promoción ${p.id}`,
      }));
    
    const dp: number[] = new Array(cantidad + 1).fill(Infinity);
    const choice: Array<{type: 'unit' | 'pack'; id?: number; size: number; cost: number} | null> =
      new Array(cantidad + 1).fill(null);

    dp[0] = 0;
    choice[0] = null;

    for (let i = 1; i <= cantidad; i++) {
      dp[i] = dp[i - 1] + precioBase;
      choice[i] = { type: 'unit', size: 1, cost: precioBase };
      for (const pk of packs) {
        if (i >= pk.size) {
          const candidate = dp[i - pk.size] + pk.cost;
          const current = dp[i];
          const tieBreakPackSize = choice[i]?.type === 'pack' ? (choice[i]!.size) : 0;

          if (candidate < current || (candidate === current && pk.size > tieBreakPackSize)) {
            dp[i] = candidate;
            choice[i] = { type: 'pack', id: pk.id, size: pk.size, cost: pk.cost };
          }
        }
      }
    }

    const usados: number[] = [];
    let i = cantidad;
    while (i > 0 && choice[i]) {
      const c = choice[i]!;
      if (c.type === 'pack' && c.id) {
        usados.push(c.id);
        i -= c.size;
      } else {
        i -= 1;
      }
    }

    const totalPacks = dp[cantidad];

    const promosMayoreo = promociones.filter(
      (p) =>
        p.tipo === 'AL_MAYOREO' &&
        p.productoId === productoId &&
        enFecha(p) &&
        cantidad >= (p.cantidad || 0) &&
        (p.monto || 0) > 0
    );

    let totalMayoreo = Infinity;
    let mayoreoId: number | null = null;
    if (promosMayoreo.length) {
      const mejor = promosMayoreo.reduce((prev, curr) =>
        (curr.monto || precioBase) < (prev.monto || precioBase) ? curr : prev
      );
      const unit = Math.min(mejor.monto || precioBase, precioBase);
      totalMayoreo = cantidad * unit;
      mayoreoId = mejor.id;
    }

    let total = totalPacks;
    let promosAplicadas = [...aplicadas];

    if (totalMayoreo < total) {
      total = totalMayoreo;
      if (mayoreoId) promosAplicadas.push(mayoreoId);
    } else {
      promosAplicadas = [...promosAplicadas, ...usados];
    }

    return { total, descuento, promociones: promosAplicadas };
  }, [promociones, promocionesGeneralesIds]);

  const actualizarDescuentoGeneral = (valor: number, texto?: string) => {
    setDescuentoGeneral(valor);
    setDescuentoGeneralTexto(
      texto !== undefined ? texto : Number.isFinite(valor) ? String(valor) : ''
    );
    setItems((prevItems) =>
      prevItems.map((it) => {
        const promo = aplicarPromociones(it.id, it.precioBase, it.cantidad);
        return {
          ...it,
          total: promo.total * (1 - ((valor + (it.descuento || 0)) / 100)),
        };
      })
    );
  };

  useEffect(() => {
    focusBusqueda();
    cargarPermisosUser();
    cargarPromociones();
    cargarInventarioNegativo();
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setIndiceItemSeleccionado(-1);
    } else if (indiceItemSeleccionado === -1) {
      setIndiceItemSeleccionado(0);
    } else if (indiceItemSeleccionado >= items.length) {
      setIndiceItemSeleccionado(items.length - 1);
    }
  }, [items, indiceItemSeleccionado]);

  function actualizarItem(index: number, campo: keyof ItemVenta, valor: number) {
    const itemActual = items[index];
    if (
      campo === 'cantidad' &&
      !inventarioNegativo &&
      itemActual.servicio !== 1 &&
      valor > itemActual.existencia
    ) {
      toast.error('Tienes productos sin existencia');
      return;
    }
    const nuevos = [...items];
    (nuevos[index] as any)[campo] = valor;
    const it = nuevos[index];
    const promo = aplicarPromociones(it.id, it.precioBase, it.cantidad);
    if (campo === 'cantidad') {
      it.precio = it.precioBase;
      it.descuento = promo.descuento;
      it.promociones = promo.promociones;
    }
    const descuento = descuentoGeneral + (it.descuento || 0);
    it.total = promo.total * (1 - descuento / 100);
    setItems(nuevos);
  }

  // --- EFECTO DE TECLADO (MODIFICADO) ---
  useEffect(() => {
    if (!active) return;
    const handleNavigation = (e: KeyboardEvent) => {
      if (modalProductoOpen || modalBusquedaOpen || modalDetallesOpen || modalPagoOpen) return;
      
      // BLOQUEO DE TECLAS DE FUNCIÓN
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenProductSearch(); 
        return;
      }
      
      if (e.key === 'F3') {
        e.preventDefault();
        if (modalPagoOpen) {
          confirmarPago();
        } else {
          abrirModalPago();
        }
        return;
      }

      if (items.length === 0) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceItemSeleccionado((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceItemSeleccionado((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === '+' || e.key === '=') {
        if (indiceItemSeleccionado >= 0) {
          e.preventDefault();
          const it = items[indiceItemSeleccionado];
          actualizarItem(indiceItemSeleccionado, 'cantidad', it.cantidad + 1);
        }
      } else if (e.key === '-' || e.key === '_') {
        if (indiceItemSeleccionado >= 0) {
          e.preventDefault();
          const it = items[indiceItemSeleccionado];
          const nuevaCantidad = Math.max(1, it.cantidad - 1);
          actualizarItem(indiceItemSeleccionado, 'cantidad', nuevaCantidad);
        }
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [active, items, indiceItemSeleccionado, modalProductoOpen, modalBusquedaOpen, modalDetallesOpen, modalPagoOpen, isInventoryEmpty, checkingSystem]);

  const cargarFolio = async () => {
    try {
      const res = await axios.get(`${apiUrl}/venta/ultimoFolio?sucursalId=${sucursalIdSession}`, { headers: { Authorization: `Bearer ${token}` } });
      const consecutivo = (res.data?.consecutivo || 0) + 1;
      const anio = new Date().getFullYear();
      setFolio(`VV-${consecutivo.toString().padStart(5, '0')}-${anio}`);
    } catch {
      setFolio(`VV-00001-${new Date().getFullYear()}`);
    }
    return numdoc;
  };

  const cargarClientes = async () => {
    try {
      const res = await axios.get(`${apiUrl}/cliente?sucursalId=${sucursalIdSession}`, { headers: { Authorization: `Bearer ${token}` } });
      setClientes(res.data);
    } catch (err) { console.error(err); }
  };

  const cargarVentas = async () => {
    try {
      const params = new URLSearchParams({
        sucursalId: sucursalIdSession.toString(),
        fechaInicio: `${fechaInicio}T00:00:00.000Z`,
        fechaFin: `${fechaFin}T23:59:59.999`,
      });
      if (folioBusqueda) params.append('numdoc', folioBusqueda);
      if (estadoBusqueda) params.append('estado', estadoBusqueda);

      const headers = { Authorization: `Bearer ${token}` };
      const [resActivos, resDevueltos] = await Promise.all([
        axios.get(`${apiUrl}/venta?${params.toString()}`, { headers }),
        axios.get(`${apiUrl}/venta?${params.toString()}&activo=0`, { headers }),
      ]);

      const merged = [...resActivos.data, ...resDevueltos.data];
      let data: Venta[] = Array.from(new Map(merged.map((v: Venta) => [v.id, v])).values());

      if (estadoBusqueda) {
        data = data.filter((v) => v.estado === estadoBusqueda);
      }
      if (folioBusqueda) {
        const term = folioBusqueda.trim().toLowerCase();
        data = data.filter((v) => v.numdoc.toString().trim().toLowerCase().includes(term));
      }
      setVentas(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ventas');
    }
  };

  const cargarDetalles = async (id: number) => {
    try {
      const res = await axios.get(`${apiUrl}/venta/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setVentaDetalleFolio(res.data?.numdoc || null);
      const detsRaw = (res.data.detalles || []) as any[];
      const detsConServicio: DetalleVenta[] = await Promise.all(
        detsRaw.map(async (d) => {
          let servicio: number | undefined = d.servicio;
          if (servicio === undefined && d.id_producto) {
            try {
              const prodRes = await axios.get(`${apiUrl}/producto/productos/${d.id_producto}`, { headers: { Authorization: `Bearer ${token}` } });
              servicio = prodRes.data.servicio;
            } catch (e) { console.error('Error obteniendo producto', e); }
          }
          return {
            ...d,
            servicio,
            producto: {
              ...(d.producto || {}),
              servicio: servicio ?? d.producto?.servicio,
            },
          } as DetalleVenta;
        })
      );
      setDetalles(detsConServicio);
      setDetalleEfectivo(res.data.efectivo || 0);
      setDetalleTarjeta(res.data.tarjeta || 0);
      setDetalleVale(res.data.vale || 0);
      setDetalleCheque(res.data.cheque || 0);
      setDetalleTransferencia(res.data.transferencia || 0);
      setVentaDetalleId(id);
      setVentaDevuelta(!!res.data.fecha_devolucion);
      setModalDetallesOpen(true);
      if (onDetailsOpen) setTimeout(() => onDetailsOpen(), 100);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles');
    }
  };

  const registrarMovimientosDevolucionVenta = async (detallesDevueltos: DetalleVenta[], folio?: string) => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const movimientos = detallesDevueltos
      .filter((detalle) => (detalle.servicio ?? detalle.producto?.servicio) !== 1)
      .map((detalle) => ({
        id_producto: detalle.id_producto,
        comentario: folio ? `Devolución de venta - Folio ${folio}` : 'Devolución de venta',
        tipo_esa: 'DEVOLUCION_VENTA',
        cantidad: detalle.cantidad,
        cantidad_antigua: detalle.cantidad_existente ?? detalle.cantidad,
        fecha: new Date().toISOString(),
        id_user: userIdSession,
        costo: detalle.costo ?? 0,
        sucursalId: sucursalIdSession,
      }));
    await Promise.all(
      movimientos.map((movimiento) =>
        axios.post(`${apiUrl}/inventario-esa`, movimiento, { headers }).catch((err) => {
          console.error('Error registrando movimiento de devolución', err);
        })
      )
    );
  };

  const devolverDetalle = async (id: number) => {
    const confirmar = window.confirm('¿Está seguro de devolver este detalle?');
    if (!confirmar) return;
    try {
      await axios.post(`${apiUrl}/detalle-venta/${id}/devolucion?correo=1`, null, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Detalle devuelto');
      if (ventaDetalleId) cargarDetalles(ventaDetalleId);
      cargarVentas();
    } catch (err) {
      console.error(err);
      toast.error('Error al devolver detalle');
    }
  };

  const devolverVenta = async (id: number) => {
    const confirmar = window.confirm('¿Está seguro de devolver la venta?');
    if (!confirmar) return;
    try {
      await axios.post(`${apiUrl}/venta/${id}/devolucion`, null, { headers: { Authorization: `Bearer ${token}` } });
      try {
        const res = await axios.get(`${apiUrl}/venta/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        await registrarMovimientosDevolucionVenta(res.data.detalles || [], res.data?.numdoc);
      } catch (registroError) { console.error('Error registrando movimientos', registroError); }
      toast.success('Venta devuelta');
      cargarVentas();
    } catch (err) {
      console.error(err);
      toast.error('Error al devolver venta');
    }
  };

  const seleccionarCotizacion = async (id: number) => {
    try {
      const res = await axios.get(`${apiUrl}/venta/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const v = res.data;
      setCotizacionId(id);
      setFolio(v.numdoc);
      setClienteId(v.id_cliente ? String(v.id_cliente) : '');
      setObservaciones(v.observaciones || '');
      const dets = v.detalles || [];
      const itemsCot = dets.map((d: any) => ({
        id: d.id_producto,
        nombre: d.producto?.nombre || '',
        cantidad: d.cantidad,
        existencia: d.cantidad_existente || 0,
        precio: d.precio,
        precioBase: d.precio,
        precio1: d.producto?.precio1,
        precio2: d.producto?.precio2,
        precio3: d.producto?.precio3,
        precio4: d.producto?.precio4,
        descuento: d.descuento,
        servicio: d.producto?.servicio,
        tipo_medicamento: d.producto?.tipo_medicamento,
        promociones: d.promociones ? d.promociones.map((p: any) => p.id_promocion || p.promocionId) : [],
        total: d.precio * d.cantidad * (1 - (d.descuento || 0) / 100),
      }));
      setItems(itemsCot);
      setDescuentoGeneral(0);
      setDescuentoGeneralTexto('0');
      setModalBusquedaOpen(false);
      setEstado('CONTADO');
      focusBusqueda();
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar cotización');
    }
  };

  const buscarProductos = async (termino: string) => {
    try {
      const params = new URLSearchParams({
        pagina: "1",
        limite: "20",
        sucursalId: sucursalIdSession.toString(),
        termino,
      });
      const res = await fetch(`${apiUrl}/producto/productosPaginacion?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResultadosProducto(data?.productos || []);
    } catch (err) { console.error('Error al buscar productos', err); }
  };

  const buscarPorCodigoBarras = async () => {
    if (!busqueda) return;
    
    // BLOQUEO EN BÚSQUEDA DIRECTA POR CÓDIGO
    if (isInventoryEmpty) {
       toast.error('Inventario Vacío', { description: 'Registra productos antes de vender.' });
       return;
    }

    let codigo = busqueda;
    let cantidad = 1;
    const match = busqueda.match(/^(\d+)\*(.+)$/);
    if (match) {
      cantidad = Number(match[1]);
      codigo = match[2];
    }
    try {
      const res = await axios.get(`${apiUrl}/producto/codigo/${codigo}?sucursalId=${sucursalIdSession}`, { headers: { Authorization: `Bearer ${token}` } });
      await agregarProducto(res.data, cantidad);
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Producto no encontrado');
      } else { console.error(err); }
      focusBusqueda();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      buscarPorCodigoBarras();
    }
  };

  const agregarProducto = async (p: Producto, cantidad = 1) => {
    let prod = p;
    if (prod.precio1 === undefined) {
      try {
        const res = await axios.get(`${apiUrl}/producto/productos/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const dataProd = res.data || {};
        prod = { ...p, ...dataProd, tipo_medicamento: dataProd.tipo_medicamento ?? p.tipo_medicamento } as Producto;
      } catch (err) { console.error(err); }
    }
    const precioPreferente = obtenerPrecioPreferente(prod, clienteSeleccionado?.tipo_precio);
    const existente = items.find((it) => it.id === prod.id);
    
    if (existente) {
      if (!inventarioNegativo && existente.servicio !== 1 && existente.cantidad + cantidad > existente.existencia) {
        toast.error('Tienes productos sin existencia');
        setResultadosProducto([]);
        setBusqueda('');
        focusBusqueda();
        return;
      }
      const nuevaCantidad = existente.cantidad + cantidad;
      const promo = aplicarPromociones(prod.id, precioPreferente, nuevaCantidad);
      const nuevos = items.map((it) =>
        it.id === prod.id
          ? {
              ...it,
              cantidad: nuevaCantidad,
              costo: it.costo ?? prod.costo,
              precio: precioPreferente,
              precioBase: precioPreferente,
              precio1: prod.precio1,
              precio2: prod.precio2,
              precio3: prod.precio3,
              precio4: prod.precio4,
              descuento: promo.descuento,
              promociones: promo.promociones,
              total: promo.total * (1 - (descuentoGeneral + promo.descuento) / 100),
            }
          : it
      );
      setItems(nuevos);
    } else {
      if (!inventarioNegativo && prod.servicio !== 1 && cantidad > Number(prod.cantidad_existencia)) {
        toast.error('Tienes productos sin existencia');
        setResultadosProducto([]);
        setBusqueda('');
        focusBusqueda();
        return;
      }
      const promo = aplicarPromociones(prod.id, precioPreferente, cantidad);
      setItems([
        ...items,
        {
          id: prod.id,
          nombre: prod.nombre,
          cantidad,
          existencia: Number(prod.cantidad_existencia),
          costo: prod.costo,
          precio: precioPreferente,
          precioBase: precioPreferente,
          precio1: prod.precio1,
          precio2: prod.precio2,
          precio3: prod.precio3,
          precio4: prod.precio4,
          descuento: promo.descuento,
          servicio: prod.servicio,
          tipo_medicamento: prod.tipo_medicamento,
          promociones: promo.promociones,
          total: promo.total * (1 - (descuentoGeneral + promo.descuento) / 100),
        },
      ]);
    }
    setResultadosProducto([]);
    setBusqueda('');
    focusBusqueda();
  };

  useEffect(() => {
    agregarProductoRef.current = agregarProducto;
  }, [agregarProducto]);

  useEffect(() => {
    const tipoPrecio = clienteSeleccionado?.tipo_precio;
    setItems((prevItems) =>
      prevItems.map((it) => {
        const preciosDisponibles = [it.precio1, it.precio2, it.precio3, it.precio4].filter((p) => p !== undefined);
        if (preciosDisponibles.length === 0) return it;
        const nuevoPrecioBase = obtenerPrecioPreferente(
          { precio1: it.precio1 ?? undefined, precio2: it.precio2 ?? undefined, precio3: it.precio3 ?? undefined, precio4: it.precio4 ?? undefined },
          tipoPrecio,
        );
        if (nuevoPrecioBase === it.precioBase) return it;
        const promo = aplicarPromociones(it.id, nuevoPrecioBase, it.cantidad);
        const descuento = descuentoGeneral + promo.descuento;
        return {
          ...it,
          precio: nuevoPrecioBase,
          precioBase: nuevoPrecioBase,
          descuento: promo.descuento,
          promociones: promo.promociones,
          total: promo.total * (1 - descuento / 100),
        };
      })
    );
  }, [clienteSeleccionado?.tipo_precio, descuentoGeneral, aplicarPromociones]);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    const storageKey = 'ventaProductoPendiente';
    const procesar = async (data?: ProductoTransferEvent | null) => {
      if (!data) return;
      const timestamp = data.timestamp ?? Date.now();
      if (timestamp <= ultimoProductoTransferido.current) return;
      const anterior = ultimoProductoTransferido.current;
      ultimoProductoTransferido.current = timestamp;
      let agregado = false;
      try {
        const producto = await construirProductoDesdePayload(data);
        if (!producto) {
          ultimoProductoTransferido.current = anterior;
          return;
        }
        if (agregarProductoRef.current) {
          await agregarProductoRef.current(producto, data.cantidad ?? 1);
        }
        agregado = true;
      } catch (err) { console.error(err); }
      if (agregado) {
        try { localStorage.removeItem(storageKey); } catch (err) { console.error(err); }
      } else { ultimoProductoTransferido.current = anterior; }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as ProductoTransferEvent;
        void procesar(parsed);
      } catch (err) { console.error(err); }
    };
    const handleCustom = (event: CustomEvent<ProductoTransferEvent>) => {
      void procesar(event.detail);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('venta:agregar-producto', handleCustom);
    try {
      const pendiente = localStorage.getItem(storageKey);
      if (pendiente) {
        void procesar(JSON.parse(pendiente) as ProductoTransferEvent);
      }
    } catch (err) { console.error(err); }
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('venta:agregar-producto', handleCustom);
    };
  }, [active, construirProductoDesdePayload]);

  const eliminarItem = (id: number) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const total = Number(items.reduce((sum, it) => sum + it.total, 0));
  const iva = total - total / 1.16;
  const subtotal = total / 1.16;
  const numitems = items.reduce((sum, it) => sum + it.cantidad, 0);
  const totalPagos = efectivo + tarjeta + cheque + vale + transferencia;
  const cambio = totalPagos > total ? totalPagos - total : 0;
  const restante = Math.max(total - (tarjeta + cheque + vale + transferencia), 0);
  const efectivoCalc = Math.min(efectivo, restante);

  const requiereReceta = useMemo(() =>
    items.some((it) => {
      const tipo = (it.tipo_medicamento || '').toString().toUpperCase();
      return tipo === 'ANTIBIOTICO' || tipo === 'CONTROLADO';
    }), [items]);

  const abrirModalPago = () => {
    if (items.length === 0) {
      toast.error('Agrega productos a la venta');
      return;
    }
    setEfectivo(0);
    setTarjeta(0);
    setCheque(0);
    setVale(0);
    setTransferencia(0);
    setTarjetaTipo('DEBITO');
    setReferencia('');
    if (estado === 'TARJETA' || estado === 'CREDITO') {
       setTarjeta(Number(total));
       if (estado === 'CREDITO') setTarjetaTipo('CREDITO');
       else setTarjetaTipo('DEBITO');
    } else {
       setEfectivo(Number(total));
    }
    setModalPagoOpen(true);
    if (onPaymentStart) setTimeout(() => onPaymentStart(), 100);
  };

  const confirmarPago = async () => {
    const suma = totalPagos;
    if (Math.abs(suma - total) > 0.01 && suma < total) { 
      toast.error('El pago no cubre el total de la venta');
      return;
    }
    if (requiereReceta) {
      setAccionRecetaPendiente({ imprimirTicket: true });
      setModalPagoOpen(false);
      setModalRecetaOpen(true);
      return;
    }
    const exito = await guardarVenta(true);
    if (exito) setModalPagoOpen(false);
  };

  const confirmarPagoSinTicket = async () => {
    const suma = totalPagos;
    if (Math.abs(suma - total) > 0.01 && suma < total) {
      toast.error('El pago no cubre el total de la venta');
      return;
    }
    if (requiereReceta) {
      setAccionRecetaPendiente({ imprimirTicket: false });
      setModalPagoOpen(false);
      setModalRecetaOpen(true);
      return;
    }
    const exito = await guardarVenta(false);
    if (exito) setModalPagoOpen(false);
  };

  const regresarAPago = () => {
    setModalRecetaOpen(false);
    setModalPagoOpen(true);
    setAccionRecetaPendiente(null);
  };

  const confirmarVentaDesdeReceta = async () => {
    if (!accionRecetaPendiente) {
      setModalRecetaOpen(false);
      return;
    }
    if (!receta.trim()) {
      toast.error('Captura la información de la receta');
      return;
    }
    setProcesandoReceta(true);
    const exito = await guardarVenta(accionRecetaPendiente.imprimirTicket);
    setProcesandoReceta(false);
    if (exito) {
      setAccionRecetaPendiente(null);
      setModalRecetaOpen(false);
    }
  };

  const handleCedulaKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarMedicoPorCedula();
    }
  };

  const handleCedulaChange = (value: string) => {
    setMedicoCedula(value);
    setMedicoId(null);
    setMedicoCedulaConfirmada(null);
  };

  const handleModalRecetaChange = (open: boolean) => {
    if (!open) {
      setModalRecetaOpen(false);
      if (accionRecetaPendiente) {
        setAccionRecetaPendiente(null);
        setModalPagoOpen(true);
      }
    } else {
      setModalRecetaOpen(true);
    }
  };

  const extraerMedicoDeRespuesta = (data: any) => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    if (Array.isArray(data?.data)) return data.data[0] || null;
    if (Array.isArray(data?.result)) return data.result[0] || null;
    if (Array.isArray(data?.rows)) return data.rows[0] || null;
    if (Array.isArray(data?.medicos)) return data.medicos[0] || null;
    if (data?.medico) return data.medico;
    if (data?.id || data?.cedula) return data;
    return null;
  };

  const buscarMedicoPorCedula = async () => {
    const cedula = medicoCedula.trim();
    if (!cedula) {
      toast.error('Ingresa la cédula del médico');
      return;
    }
    setBuscandoMedico(true);
    try {
      const res = await axios.get(`${apiUrl}/medico/cedula/${encodeURIComponent(cedula)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: { sucursalId: sucursalIdSession },
      });
      const medico = extraerMedicoDeRespuesta(res.data);
      if (medico) {
        setMedicoId(medico.id ?? null);
        setMedicoNombre(medico.nombre_completo || '');
        setMedicoDireccion(medico.direccion || '');
        setMedicoCedula(medico.cedula || cedula);
        setMedicoCedulaConfirmada((medico.cedula || cedula)?.toString().trim() || null);
        toast.success('Médico encontrado');
      } else {
        setMedicoId(null);
        setMedicoCedulaConfirmada(null);
        toast.info('No se encontró un médico con esa cédula');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setMedicoId(null);
        setMedicoCedulaConfirmada(null);
        toast.info('No se encontró un médico con esa cédula');
      } else {
        console.error(error);
        toast.error('Error al buscar médico');
        setMedicoCedulaConfirmada(null);
      }
    } finally {
      setBuscandoMedico(false);
    }
  };

  const asegurarMedico = async (): Promise<number | null> => {
    const cedula = medicoCedula.trim();
    const nombre = medicoNombre.trim();
    const direccion = medicoDireccion.trim();
    if (!cedula || !nombre || !direccion) {
      toast.error('Completa los datos del médico (cédula, nombre y dirección)');
      throw new Error('Datos de médico incompletos');
    }
    setMedicoCedula(cedula);
    setMedicoNombre(nombre);
    setMedicoDireccion(direccion);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const payload = { cedula, nombre_completo: nombre, direccion, sucursalId: sucursalIdSession };
    const actualizar = async (id: number) => {
      await axios.put(`${apiUrl}/medico/${id}`, payload, { headers });
      setMedicoId(id);
      setMedicoCedulaConfirmada(cedula);
      return id;
    };
    const puedeActualizar = medicoId !== null && medicoCedulaConfirmada === cedula;
    if (!puedeActualizar && medicoId !== null && medicoCedulaConfirmada !== cedula) {
      setMedicoId(null);
      setMedicoCedulaConfirmada(null);
    }
    if (puedeActualizar && medicoId !== null) {
      return actualizar(medicoId);
    }
    try {
      const res = await axios.get(`${apiUrl}/medico/cedula/${encodeURIComponent(cedula)}`, { headers, params: { sucursalId: sucursalIdSession } });
      const existente = extraerMedicoDeRespuesta(res.data);
      const cedulaExistente = existente?.cedula ? existente.cedula.toString().trim() : null;
      if (existente?.id && cedulaExistente && cedulaExistente === cedula) {
        return actualizar(existente.id);
      }
    } catch (error) {
       if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
         console.error('Error al buscar médico por cédula', error);
       }
    }
    try {
      const res = await axios.post(`${apiUrl}/medico`, payload, { headers });
      const creado = extraerMedicoDeRespuesta(res.data) || res.data;
      const nuevoId = creado?.id ?? creado?.medicoId ?? creado?.medico?.id ?? creado?.data?.id ?? creado?.insertId ?? null;
      if (nuevoId) {
        setMedicoId(nuevoId);
        setMedicoCedulaConfirmada(cedula);
      }
      return nuevoId;
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el médico');
      throw error;
    }
  };

  const limpiarDatosReceta = () => {
    setReceta('');
    setMedicoCedula('');
    setMedicoNombre('');
    setMedicoDireccion('');
    setMedicoId(null);
    setMedicoCedulaConfirmada(null);
    setAccionRecetaPendiente(null);
    setProcesandoReceta(false);
    setBuscandoMedico(false);
  };

  const guardarVenta = async (imprimirTicket = true): Promise<boolean> => {
    if (items.length === 0) {
      toast.error('Agrega productos a la venta');
      return false;
    }
    if (!inventarioNegativo && items.some((it) => it.servicio !== 1 && it.cantidad > it.existencia)) {
      toast.error('Tienes productos sin existencia');
      return false;
    }
    const suma = totalPagos;
    if (Math.abs(suma - total) > 0.01 && suma < total) {
      toast.error('La suma de los pagos debe ser igual al total');
      return false;
    }
    let medicoVentaId: number | null = null;
    let recetaVenta: string | null = null;
    if (requiereReceta) {
      const recetaTrim = receta.trim();
      if (!recetaTrim) {
        toast.error('Captura la información de la receta');
        return false;
      }
      try {
        const id = await asegurarMedico();
        if (!id) {
          toast.error('No se pudo registrar la información del médico');
          return false;
        }
        medicoVentaId = id;
        recetaVenta = recetaTrim;
      } catch (error) {
        console.error(error);
        return false;
      }
    }

    const folioActual = cotizacionId ? numdoc : await cargarFolio();
    const nuevoEstado = cotizacionId ? 'CONTADO' : estado;
    const detallesPayload = items.filter((it) => !isNaN(Number(it.id))).map((it) => ({
      id_producto: Number(it.id),
      cantidad: it.cantidad,
      cantidad_existente: it.existencia,
      iva: it.total - it.total / 1.16,
      ieps: 0,
      precio: it.precio,
      descuento: it.descuento + descuentoGeneral,
      total: it.total,
      descuentoind: it.descuento,
      descuentogeneral: descuentoGeneral,
      promociones: it.promociones || [],
    }));

    const payload = {
      numdoc: folioActual,
      id_cliente: Number(clienteId) || null,
      observaciones,
      estado: nuevoEstado,
      numitems,
      subtotal,
      iva,
      total,
      efectivo: efectivoCalc,
      tarjeta,
      cheque,
      transferencia,
      vale,
      tarjeta_tipo: tarjeta > 0 ? tarjetaTipo : null,
      referencia: tarjeta > 0 || transferencia > 0 ? referencia : null,
      fecha: new Date().toISOString(),
      activo: 1,
      saldo_pendiente: nuevoEstado === 'CREDITO' ? total : 0,
      fecha_devolucion: null,
      id_usuario_devolucion: null,
      sucursalId: sucursalIdSession,
      id_usuario: userIdSession,
      descuento: descuentoGeneral,
      tipo_descuento: "N/A",
      ahorro: 0,
      receta: recetaVenta,
      medico_id: medicoVentaId,
      detalles: cotizacionId ? { deleteMany: {}, create: detallesPayload } : detallesPayload,
    };

    const registrarMovimientosInventario = async () => {
      const movimientos = items
        .filter((it) => it.servicio !== 1 && !Number.isNaN(Number(it.id)))
        .map((it) => ({
          id_producto: Number(it.id),
          comentario: `Venta ${folioActual}`,
          tipo_esa: 'VENTA',
          cantidad: it.cantidad,
          cantidad_antigua: it.existencia,
          fecha: new Date().toISOString(),
          id_user: userIdSession,
          costo: it.costo ?? null,
          sucursalId: sucursalIdSession,
        }));
      if (movimientos.length === 0) return;
      await Promise.all(
        movimientos.map((movimiento) =>
          axios.post(`${apiUrl}/inventario-esa`, movimiento, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        )
      );
    };

    try {
      if (cotizacionId) {
        await axios.put(`${apiUrl}/venta/${cotizacionId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${apiUrl}/venta`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      try {
        await registrarMovimientosInventario();
      } catch (error) {
        console.error('Error al registrar movimientos', error);
        toast.error('Venta guardada, pero no se registraron los movimientos de inventario.');
      }
      toast.success('Venta guardada');
      setItems([]);
      setClienteId('');
      setObservaciones('');
      setEstado('CONTADO');
      setCotizacionId(null);
      actualizarDescuentoGeneral(descuentoGeneralBase);
      cargarFolio();
      focusBusqueda();
      limpiarDatosReceta();
      if (imprimirTicket) {
        await generarTicket(folioActual);
      }
      return true;
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Error al guardar'));
      return false;
    }
  };

  const generarTicket = async (folio: string) => {
    const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
    let tienda = { nombre: '', direccion: '', cp: '', rfc: '', tel: '' };
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalIdSession}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const suc = res.data;
      tienda = {
        nombre: `${suc.nombre_comercial || suc.razon_social}`,
        direccion: [suc.direccion, suc.colonia, suc.municipio, suc.estado].filter(Boolean).join(', '),
        cp: suc.cp ? `C.P. ${suc.cp}` : '',
        rfc: suc.rfc || '',
        tel: suc.tel || '',
      };
    } catch (err) { console.error('Error al obtener la sucursal', err); }

    const fecha = new Date();
    const cajero = 'admin';
    const cliente = clienteSeleccionado ? clienteSeleccionado.razon_social : 'PUBLICO EN GENERAL';
    const total = Number(items.reduce((s, it) => s + it.total, 0));
    const iva = total - total / 1.16;
    const subtotal = total / 1.16;

    let html = `<html><head><title>Ticket</title><style>
      @page { margin: 5; }
      body{font-family:monospace;margin:5;padding:10px;}
      h1,h2,h3,h4{margin:0;text-align:center;}
      table{width:100%;border-collapse:collapse;}
      th,td{font-size:12px;}
      .right{text-align:right;}
      </style></head><body>`;
    html += `<h4>NOTA DE VENTA</h4>`;
    if (tienda.nombre) html += `<p style="text-align:center;">${tienda.nombre}</p>`;
    if (tienda.direccion) html += `<p style="text-align:center;">${tienda.direccion}</p>`;
    if (tienda.cp) html += `<p style="text-align:center;">${tienda.cp}</p>`;
    if (tienda.rfc) html += `<p style="text-align:center;">RFC: ${tienda.rfc}</p>`;
    if (tienda.tel) html += `<p style="text-align:center;">Teléfono: ${tienda.tel}</p>`;
    html += `<hr/>`;
    html += `<p>Folio: ${folio}<span class="right">${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString().slice(0, 5)}</span></p>`;
    html += `<p>Cajero: ${cajero}</p>`;
    html += `<p>Cliente: ${cliente}</p>`;
    html += `<table><thead><tr><th>CANT.</th><th>P.UNI.</th><th class="right">IMPORTE</th></tr></thead><tbody>`;
    items.forEach((it) => {
      html += `<tr><td>${it.cantidad}</td><td>${money(it.precio)}</td><td class="right">${money(it.total)}</td></tr>`;
      html += `<tr><td colspan="3">${it.nombre}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<hr/>`;
    html += `<p>SUBTOTAL:<span class="right">${money(subtotal)}</span></p>`;
    html += `<p>IVA:<span class="right">${money(iva)}</span></p>`;
    html += `<p><strong>TOTAL:</strong><span class="right">${money(total)}</span></p>`;
    html += `<hr/><p style="text-align:center;">GRACIAS POR TU COMPRA.</p>`;
    html += `</body></html>`;
    const ticketWindow = window.open('', '_blank');
    if (ticketWindow) {
      ticketWindow.document.write(html);
      ticketWindow.document.close();
      ticketWindow.onload = () => ticketWindow.print();
    }
  };

  const generarPDFCotizacion = async (folio: string) => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = '/logo.png';
    await new Promise((resolve) => { img.onload = resolve; });
    doc.addImage(img, 'PNG', 14, 10, 30, 15);
    doc.setFontSize(16);
    doc.text('Cotización', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Folio: ${folio}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 36);
    autoTable(doc, {
      startY: 42,
      head: [['Producto', 'Cantidad', 'Precio', 'Descuento %', 'Total']],
      body: items.map((it) => [it.nombre, it.cantidad.toString(), it.precio.toFixed(2), `${it.descuento + descuentoGeneral} %`, it.total.toFixed(2)]),
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, pageWidth - 14, finalY + 6, { align: 'right' });
    doc.text(`IVA: $${iva.toFixed(2)}`, pageWidth - 14, finalY + 12, { align: 'right' });
    doc.text(`Total: $${total.toFixed(2)}`, pageWidth - 14, finalY + 18, { align: 'right' });
    doc.save(`cotizacion_${folio}.pdf`);
  };

  const guardarCotizacion = async () => {
    if (items.length === 0) {
      toast.error('Agrega productos a la venta');
      return;
    }
    const folioActual = await cargarFolio();
    const payload = {
      numdoc: folioActual,
      id_cliente: Number(clienteId) || null,
      observaciones,
      estado: 'COTIZACION',
      numitems,
      subtotal,
      iva,
      total,
      efectivo: 0,
      tarjeta: 0,
      cheque: 0,
      transferencia: 0,
      vale: 0,
      tarjeta_tipo: null,
      referencia: null,
      fecha: new Date().toISOString(),
      activo: 1,
      saldo_pendiente: 0,
      fecha_devolucion: null,
      id_usuario_devolucion: null,
      sucursalId: sucursalIdSession,
      id_usuario: userIdSession,
      descuento: descuentoGeneral,
      tipo_descuento: 'N/A',
      ahorro: 0,
      detalles: items.filter((it) => !isNaN(Number(it.id))).map((it) => ({
        id_producto: Number(it.id),
        cantidad: it.cantidad,
        cantidad_existente: it.existencia,
        iva: it.total - it.total / 1.16,
        ieps: 0,
        precio: it.precio,
        descuento: it.descuento + descuentoGeneral,
        descuentoind: it.descuento,
        descuentogeneral: descuentoGeneral,
        total: it.total,
      })),
      descuentogeneral: descuentoGeneral,
    };
    try {
      await axios.post(`${apiUrl}/venta`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Cotización guardada');
      await generarPDFCotizacion(folioActual);
      setItems([]);
      setClienteId('');
      setObservaciones('');
      setEstado('CONTADO');
      setCotizacionId(null);
      cargarFolio();
      focusBusqueda();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Error al guardar'));
    }
  };

  useEffect(() => {
    cargarFolio();
    cargarClientes();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      buscarProductos(busquedaProducto);
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaProducto]);

  useEffect(() => {
    if (modalProductoOpen) {
      buscarProductos(busquedaProducto);
    }
  }, [modalProductoOpen]);

  useEffect(() => {
    if (!requiereReceta) {
      setModalRecetaOpen(false);
      setReceta('');
      setMedicoCedula('');
      setMedicoNombre('');
      setMedicoDireccion('');
      setMedicoId(null);
      setMedicoCedulaConfirmada(null);
      setAccionRecetaPendiente(null);
      setProcesandoReceta(false);
      setBuscandoMedico(false);
    }
  }, [requiereReceta]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>
            <kbd className="font-semibold">F2</kbd> Buscar producto/servicio
          </span>
          <span>
            <kbd className="font-semibold">F3</kbd> Guardar venta
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            data-guide="btn-buscar-ventas"
            onClick={handleOpenSalesSearch}
          >
            Buscar ventas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div>
          <label className="text-sm font-medium">Folio</label>
          <Input value={numdoc} disabled />
        </div>
        
        <div data-guide="cliente-select">
          <label className="text-sm font-medium">Cliente</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            onBlur={focusBusqueda}
          >
            <option value="">Sin cliente</option>
            {clientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.razon_social}
              </option>
            ))}
          </select>
        </div>

        <div data-guide="estado-select">
          <label className="text-sm font-medium">Estado</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={estado}
            onChange={(e) => setEstado(e.target.value as any)}
            onBlur={focusBusqueda}
          >
            <option value="CONTADO">CONTADO</option>
            <option value="CREDITO">CREDITO</option>
            <option value="TARJETA">TARJETA</option>
          </select>
        </div>

        <div data-guide="observaciones-input">
          <label className="text-sm font-medium">Observaciones</label>
          <Input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            onBlur={focusBusqueda}
            onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
          />
        </div>

        <div data-guide="descuento-general">
          <label className="text-sm font-medium">Descuento general (%)</label>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => actualizarDescuentoGeneral(Math.max(0, descuentoGeneral - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              className="w-20 text-center"
              value={descuentoGeneralTexto}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  actualizarDescuentoGeneral(0, '');
                  return;
                }
                const parsed = parseFloat(value);
                if (!Number.isNaN(parsed)) {
                  actualizarDescuentoGeneral(parsed, value);
                }
              }}
              onBlur={focusBusqueda}
              onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
            />
            <Button size="icon" variant="outline" onClick={() => actualizarDescuentoGeneral(descuentoGeneral + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1" data-guide="producto-scan">
          <Input
            ref={buscarRef}
            placeholder="Código de barras"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
            disabled={isInventoryEmpty} 
          />
        </div>
        <Button 
            variant="outline" 
            onClick={handleOpenProductSearch} 
            className={isInventoryEmpty ? "opacity-50 cursor-not-allowed" : ""}
            title={isInventoryEmpty ? "Sin productos registrados" : "Buscar (F2)"}
        >
          Buscar producto/servicio (F2)
        </Button>
      </div>

      <p className="text-sm text-gray-500 my-2">
        Usa ↑/↓ para moverte entre los productos y + o - para ajustar la cantidad.
      </p>

      <div className="overflow-auto rounded border bg-white shadow" data-guide="items-table">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center w-24">Cantidad</TableHead>
              <TableHead className="text-center">Cant. existente</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Descuento %</TableHead>
              <TableHead>Promociones aplicadas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow
                key={it.id}
                className={indiceItemSeleccionado === idx ? 'bg-orange-200' : ''}
                onClick={() => setIndiceItemSeleccionado(idx)}
              >
                <TableCell>{it.nombre}</TableCell>
                <TableCell className="text-center" data-guide={idx === 0 ? "cantidad-row" : undefined}>
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => { setIndiceItemSeleccionado(idx); const nuevaCantidad = Math.max(1, it.cantidad - 1); actualizarItem(idx, 'cantidad', nuevaCantidad); }}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-14 text-center"
                      value={it.cantidad}
                      onFocus={() => setIndiceItemSeleccionado(idx)}
                      onChange={(e) => actualizarItem(idx, 'cantidad', parseFloat(e.target.value))}
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button size="icon" variant="outline" onClick={() => { setIndiceItemSeleccionado(idx); actualizarItem(idx, 'cantidad', it.cantidad + 1); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">{it.servicio === 1 && (!it.existencia || it.existencia === 0) ? 'N/A' : it.existencia}</TableCell>
                <TableCell className="text-right">${it.precio.toFixed(2)}</TableCell>
                <TableCell className="text-right" data-guide={idx === 0 ? "descuento-row" : undefined}>
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => { setIndiceItemSeleccionado(idx); const nuevoDescuento = Math.max(0, (it.descuento || 0) - 1); actualizarItem(idx, 'descuento', nuevoDescuento); }}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-14 text-center"
                      value={it.descuento}
                      onFocus={() => setIndiceItemSeleccionado(idx)}
                      onChange={(e) => actualizarItem(idx, 'descuento', parseFloat(e.target.value))}
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button size="icon" variant="outline" onClick={() => { setIndiceItemSeleccionado(idx); actualizarItem(idx, 'descuento', (it.descuento || 0) + 1); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {it.promociones && it.promociones.length > 0 ? (() => {
                      const conteos = it.promociones.reduce((acc: Record<number, number>, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {} as Record<number, number>);
                      return Object.entries(conteos).map(([id, count]) => {
                        const promo = promociones.find((p) => p.id === Number(id));
                        const nombre = promo?.descripcion || `Promoción ${id}`;
                        return <div key={id}>{`${nombre} - x${count}`}</div>;
                      });
                    })() : null}
                </TableCell>
                <TableCell className="text-right">${Number(it.total).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => eliminarItem(it.id)}><Trash2 size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {requiereReceta && (
        <div className="rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          Esta venta incluye medicamentos controlados o antibióticos. Será necesario capturar los datos de la receta y del médico al momento de cobrar.
        </div>
      )}

      <div className="flex justify-end gap-8 text-lg font-semibold">
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>IVA: ${iva.toFixed(2)}</div>
        <div>Total: ${Number(total).toFixed(2)}</div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={guardarCotizacion} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="w-4 h-4" /> Guardar cotización
        </Button>
        <Button onClick={abrirModalPago} className="bg-orange-500 hover:bg-orange-600 text-white" data-guide="btn-guardar-venta">
          <PlusCircle className="w-4 h-4" /> Guardar venta (F3)
        </Button>
      </div>

      <Dialog open={modalPagoOpen} onOpenChange={setModalPagoOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-md mx-auto shadow-xl border p-6 space-y-4" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">Métodos de pago</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div data-guide="btn-pago-efectivo">
              <label className="flex items-center gap-2 text-sm font-medium"><Banknote size={32} className="cursor-pointer" onClick={() => { setEfectivo(total); setTarjeta(0); }} /> Efectivo</label>
              <Input type="number" className="mt-1 text-right" value={efectivo} onChange={(e) => setEfectivo(parseFloat(e.target.value) || 0)} data-guide="efectivo-input" />
            </div>
            <div data-guide="btn-pago-tarjeta">
              <label className="flex items-center gap-2 text-sm font-medium"><CreditCard size={32} className="cursor-pointer" onClick={() => { setTarjeta(total); setEfectivo(0); }} /> Tarjeta</label>
              <Input type="number" className="mt-1 text-right" value={tarjeta} onChange={(e) => setTarjeta(parseFloat(e.target.value) || 0)} data-guide="tarjeta-input" />
            </div>
            {tarjeta > 0 && (
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <select className="border rounded px-2 py-2" value={tarjetaTipo} onChange={(e) => setTarjetaTipo(e.target.value as any)}>
                  <option value="DEBITO">DEBITO</option>
                  <option value="CREDITO">CREDITO</option>
                </select>
                <Input placeholder="Referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
            )}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium"><CheckSquare size={32} className="cursor-pointer" onClick={() => { setCheque(total); setEfectivo(0); setTarjeta(0); setVale(0); setTransferencia(0); }} /> Cheque</label>
              <Input type="number" className="mt-1 text-right" value={cheque} onChange={(e) => setCheque(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium"><Ticket size={32} className="cursor-pointer" onClick={() => { setVale(total); setEfectivo(0); setTarjeta(0); setCheque(0); setTransferencia(0); }} /> Vale</label>
              <Input type="number" className="mt-1 text-right" value={vale} onChange={(e) => setVale(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium"><ArrowLeftRight size={32} className="cursor-pointer" onClick={() => { setTransferencia(total); setEfectivo(0); setTarjeta(0); setCheque(0); setVale(0); }} /> Transferencia</label>
              <Input type="number" className="mt-1 text-right" value={transferencia} onChange={(e) => setTransferencia(parseFloat(e.target.value) || 0)} />
            </div>
            {transferencia > 0 && tarjeta === 0 && (
              <div className="col-span-2"><Input placeholder="Referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} /></div>
            )}
          </div>
          <div className="border-t pt-4 mt-4 flex justify-between items-center font-semibold">
            <span>Total pago: ${totalPagos.toFixed(2)}</span>
            <div className="flex items-center gap-2"><span>Cambio:</span><Input type="number" readOnly value={cambio.toFixed(2)} className="w-24 text-right" /></div>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={confirmarPago} className="w-full bg-orange-500 hover:bg-orange-600 text-white" data-guide="btn-cobrar-ticket">Cobrar (F3)</Button>
            <Button onClick={confirmarPagoSinTicket} className="w-full bg-gray-500 hover:bg-gray-600 text-white">Cobrar sin ticket</Button>
            <Button onClick={() => setModalPagoOpen(false)} className="w-full bg-red-100 hover:bg-red-200 text-red-600 mt-2">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modalRecetaOpen} onOpenChange={handleModalRecetaChange}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-2xl mx-auto shadow-xl border p-6 space-y-4" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">Datos de la receta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Receta *</label><textarea className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" rows={3} value={receta} onChange={(e) => setReceta(e.target.value)} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium">Cédula profesional *</label><div className="flex gap-2"><Input value={medicoCedula} onChange={(e) => handleCedulaChange(e.target.value)} onKeyDown={handleCedulaKeyDown} placeholder="Ingresa la cédula" /><Button type="button" onClick={buscarMedicoPorCedula} disabled={buscandoMedico} className="bg-orange-500 hover:bg-orange-600 text-white">{buscandoMedico ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando</> : <><Search className="mr-2 h-4 w-4" /> Buscar</>}</Button></div></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium">Nombre del médico *</label><Input value={medicoNombre} onChange={(e) => setMedicoNombre(e.target.value)} placeholder="Nombre completo" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Dirección del médico *</label><Input value={medicoDireccion} onChange={(e) => setMedicoDireccion(e.target.value)} placeholder="Dirección" /></div>
            </div>
            {medicoId && medicoCedulaConfirmada === medicoCedula.trim() && (<p className="text-xs text-green-600">Se actualizará la información del médico existente.</p>)}
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={regresarAPago} className="w-full sm:w-auto">Regresar</Button>
            <Button onClick={confirmarVentaDesdeReceta} disabled={procesandoReceta} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white">{procesandoReceta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar venta'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalBusquedaOpen} onOpenChange={setModalBusquedaOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-4xl mx-auto shadow-xl border p-6 space-y-4" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">Buscar ventas</DialogTitle></DialogHeader>
          <div className="flex gap-4 items-end" data-guide="filtros-busqueda-ventas">
            <div><label className="text-sm font-medium">Desde</label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Hasta</label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Estado</label><select className="w-full border rounded px-2 py-2" value={estadoBusqueda} onChange={(e) => setEstadoBusqueda(e.target.value)}><option value="">Todos</option><option value="CONTADO">CONTADO</option><option value="CREDITO">CREDITO</option><option value="TARJETA">TARJETA</option><option value="COTIZACION">COTIZACION</option></select></div>
            <div className="flex-1"><label className="text-sm font-medium">Folio</label><Input value={folioBusqueda} onChange={(e) => setFolioBusqueda(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { e.preventDefault(); cargarVentas(); } }} /></div>
            <Button onClick={cargarVentas}>Buscar</Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2"><span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" /><span>Las filas en rojo corresponden a ventas devueltas.</span></div>
          <div className="overflow-auto max-h-96 rounded border bg-white" data-guide="tabla-busqueda-ventas">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Sub total</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {permisos['Compra-Venta/Devolución Producto'] && (<TableHead className="text-center">Dev.</TableHead>)}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((c, index) => (
                  <TableRow key={c.id} className={c.activo === 0 ? 'bg-red-100 text-red-600' : 'hover:bg-orange-50'}>
                    <TableCell>{c.numdoc}</TableCell>
                    <TableCell>{c.cliente?.razon_social || 'Sin cliente'}</TableCell>
                    <TableCell className="text-center">{c.numitems}</TableCell>
                    <TableCell>{c.estado}</TableCell>
                    <TableCell>{formatFecha(c.fecha)}</TableCell>
                    <TableCell className="text-right">${Number(c.subtotal).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(c.iva).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(c.total).toFixed(2)}</TableCell>
                    {permisos['Compra-Venta/Devolución Producto'] && (
                      <TableCell className="text-center">
                        {c.estado === 'COTIZACION' ? (
                          <Button size="sm" variant="ghost" onClick={() => seleccionarCotizacion(c.id)}><PlusCircle size={14} /></Button>
                        ) : c.fecha_devolucion ? (
                          <CheckSquare size={14} className="mx-auto text-green-600" />
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => devolverVenta(c.id)} data-guide={index === 0 ? "btn-devolver-venta" : undefined}><ArrowLeftRight size={14} /></Button>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => cargarDetalles(c.id)} data-guide={index === 0 ? "btn-ver-detalles" : undefined}><Eye size={14} /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter><Button onClick={() => setModalBusquedaOpen(false)} variant="ghost">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modalDetallesOpen} onOpenChange={setModalDetallesOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">Detalles de venta</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2"><span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" /><span>Los productos en rojo corresponden a devoluciones.</span></div>
          <div className="overflow-auto max-h-80 rounded border bg-white">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">Desc. prod.</TableHead>
                  <TableHead className="text-center">Desc. gen.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Dev.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((d, index) => (
                  <TableRow key={d.id} className={d.activo === 0 ? 'bg-red-100 text-red-600' : ''}>
                    <TableCell>{d.producto?.nombre}</TableCell>
                    <TableCell className="text-center">{d.servicio === 1 || d.producto?.servicio === 1 ? 'N/A' : d.cantidad}</TableCell>
                    <TableCell className="text-center">{`${(d.descuentoind ?? 0)}%`}</TableCell>
                    <TableCell className="text-center">{`${(d.descuentogeneral ?? 0)}%`}</TableCell>
                    <TableCell className="text-right">${Number(d.total).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {!ventaDevuelta && d.activo !== 0 && (
                        <Button size="sm" variant="ghost" onClick={() => devolverDetalle(d.id)} data-guide={index === 0 ? "btn-devolver-item" : undefined}><ArrowLeftRight size={14} /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            <div>Efectivo</div><div className="text-right">${detalleEfectivo.toFixed(2)}</div>
            <div>Tarjeta</div><div className="text-right">${detalleTarjeta.toFixed(2)}</div>
            <div>Vale</div><div className="text-right">${detalleVale.toFixed(2)}</div>
            <div>Cheque</div><div className="text-right">${detalleCheque.toFixed(2)}</div>
            <div>Transferencia</div><div className="text-right">${detalleTransferencia.toFixed(2)}</div>
          </div>
          <DialogFooter><Button onClick={() => setModalDetallesOpen(false)} variant="ghost">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
       
      <Dialog open={modalProductoOpen} onOpenChange={(open) => { setModalProductoOpen(open); if (!open) { setBusquedaProducto(''); setResultadosProducto([]); setIndiceProductoSeleccionado(-1); focusBusqueda(); } }}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-6xl mx-auto shadow-xl border p-6 space-y-4" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">Buscar producto/servicios</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Nombre del producto" value={busquedaProducto} onChange={(e) => { setBusquedaProducto(e.target.value); setIndiceProductoSeleccionado(-1); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceProductoSeleccionado((prev) => prev < resultadosProducto.length - 1 ? prev + 1 : 0); } else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceProductoSeleccionado((prev) => prev > 0 ? prev - 1 : resultadosProducto.length - 1); } else if (e.key === 'Enter') { e.preventDefault(); const p = resultadosProducto[indiceProductoSeleccionado]; if (p) { agregarProducto(p); setModalProductoOpen(false); setBusquedaProducto(''); setResultadosProducto([]); setIndiceProductoSeleccionado(-1); } } }} />
          <div className="max-h-80 overflow-auto border rounded">
            <Table>
              <TableHeader><TableRow className="bg-orange-100"><TableHead>Código</TableHead><TableHead>Código de barras</TableHead><TableHead>Nombre</TableHead><TableHead className="text-right">Inventario</TableHead><TableHead className="text-right">Precio público</TableHead></TableRow></TableHeader>
              <TableBody>
                {resultadosProducto.map((p, index) => (
                  <TableRow key={p.id} className={`${indiceProductoSeleccionado === index ? 'bg-orange-200' : 'hover:bg-orange-50'} cursor-pointer`} onClick={() => { agregarProducto(p); setModalProductoOpen(false); setBusquedaProducto(''); setResultadosProducto([]); setIndiceProductoSeleccionado(-1); }}>
                    <TableCell>{p.codigo}</TableCell><TableCell>{p.cod_barras}</TableCell><TableCell>{p.nombre}</TableCell><TableCell className="text-right">{p.cantidad_existencia}</TableCell><TableCell className="text-right">${p.precio1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}