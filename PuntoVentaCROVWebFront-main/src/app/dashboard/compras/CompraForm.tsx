'use client';

import { FormEvent, useEffect, useRef, useState, useCallback } from 'react';
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
  ArrowLeftRight,
  CheckSquare,
  Plus,
  Minus,
  Search,
  Loader2,
  AlertCircle,
  History // Icono para historial
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
import { formatFecha } from '@/lib/date';
import { getUserPermissions } from '@/lib/permissions';

// --- INTERFACES ---
interface Producto {
  id: number;
  codigo: string;
  cod_barras: string;
  nombre: string;
  costo: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  cantidad_existencia: number;
  servicio?: number;
  activo?: number;
}

interface Proveedor {
  id: number;
  razon_social: string;
}

interface ItemCompra {
  id: number;
  nombre: string;
  cantidad: number;
  existencia: number;
  costo: number;
  precio1: number;
  precio2: number;
  precio3: number;
  precio4: number;
  descuento: number;
  total: number;
}

interface Compra {
  id: number;
  numdoc: string;
  proveedor?: { razon_social: string } | null;
  numitems: number;
  estado: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  activo?: number;
  fecha_devolucion?: string | null;
}

interface DetalleCompra {
  id?: number;
  id_producto?: number;
  producto?: { nombre: string; servicio?: number };
  cantidad: number;
  importe: number;
  activo?: number;
  costo?: number;
  servicio?: number;
}

interface CompraFormProps {
  isActive: boolean;
  onSearchOpen?: () => void;
  // Callback para avisar al padre si el modal de productos está abierto
  onProductModalChange?: (isOpen: boolean) => void; 
}

export default function CompraForm({ isActive, onSearchOpen, onProductModalChange }: CompraFormProps) {
  const [numdoc, setFolio] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [estado, setEstado] = useState<'CONTADO' | 'CREDITO' | 'TARJETA'>('CONTADO');
  const [observaciones, setObservaciones] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState<Producto[]>([]);
  const [indiceProductoSeleccionado, setIndiceProductoSeleccionado] = useState(-1);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [indiceItemSeleccionado, setIndiceItemSeleccionado] = useState(-1);
  const [modalBusquedaOpen, setModalBusquedaOpen] = useState(false);
  const [modalDetallesOpen, setModalDetallesOpen] = useState(false);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [detalles, setDetalles] = useState<DetalleCompra[]>([]);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  // --- VALIDACIONES DE SISTEMA ---
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);
  const [hasPurchases, setHasPurchases] = useState(false); // Validar historial
  const [checkingSystem, setCheckingSystem] = useState(true);

  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fechaInicio, setFechaInicio] = useState(
    monday.toISOString().substring(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(
    sunday.toISOString().substring(0, 10)
  );

  const clamp0 = (n: number) => (isNaN(n) ? 0 : Math.max(0, n));

  const [folioBusqueda, setFolioBusqueda] = useState('');
  const buscarRef = useRef<HTMLInputElement>(null);
  const focusBusqueda = () => buscarRef.current?.focus();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;

  const [permisos, setPermisos] = useState<Record<string, boolean>>({})

  const cargarPermisosUser = async () => {
    const permisosAValidar = [
      'Compra-Venta/Devolución Compra',
    ]

    const data = await getUserPermissions(userIdSession, token || undefined)

    const tienePermiso = (permiso: string) => {
      if (Array.isArray(data)) {
        return data.some(
          (p: any) =>
            p.nombre === permiso ||
            p.permiso === permiso ||
            String(p.id) === permiso
        )
      }
      const value = data?.[permiso]
      return value === 1 || value === true
    }

    const mapa = Object.fromEntries(
      permisosAValidar.map((p) => [p, tienePermiso(p)])
    )
    setPermisos(mapa)
  }

  // Notificar al padre sobre el modal de productos
  useEffect(() => {
    if (onProductModalChange) {
        onProductModalChange(modalProductoOpen);
    }
  }, [modalProductoOpen, onProductModalChange]);


  useEffect(() => {
    focusBusqueda();
    cargarPermisosUser();
  }, []);

  // --- VERIFICACIÓN DE SISTEMA (Inventario y Compras) ---
  useEffect(() => {
    const checkSystem = async () => {
      try {
        // 1. Verificar Catálogo
        const paramsInv = new URLSearchParams({
          pagina: "1",
          limite: "1",
          sucursalId: sucursalIdSession.toString(),
        });
        const resInv = await axios.get(
          `${apiUrl}/producto/productosPaginacion?${paramsInv.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dataInv = resInv.data || {};
        const products = dataInv.productos || [];
        setIsInventoryEmpty(products.length === 0);

        // 2. Verificar Historial de Compras
        const paramsCompras = new URLSearchParams({
            sucursalId: sucursalIdSession.toString(),
            limit: "1"
        });
        const resCompras = await axios.get(
            `${apiUrl}/compra?${paramsCompras.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const dataCompras = resCompras.data;
        const hayCompras = Array.isArray(dataCompras) ? dataCompras.length > 0 : (dataCompras?.length > 0);
        setHasPurchases(hayCompras);

      } catch (error) {
        console.error("Error verificando sistema en Compras:", error);
        // Fallback seguro en caso de error
        setIsInventoryEmpty(true); 
        setHasPurchases(false);
      } finally {
        setCheckingSystem(false);
      }
    };
    if (isActive) checkSystem();
  }, [isActive, apiUrl, sucursalIdSession, token]);

  // --- HANDLER PARA ABRIR BÚSQUEDA DE PRODUCTOS (F2) ---
  const handleOpenProductSearch = () => {
    if (checkingSystem) return;
    if (isInventoryEmpty) {
        toast.error('Catálogo vacío', {
            description: 'Debes registrar productos en el catálogo antes de poder comprarlos.',
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            duration: 4000,
        });
        return;
    }
    setModalProductoOpen(true);
    if (onSearchOpen) onSearchOpen();
  };

  // --- HANDLER PARA ABRIR BÚSQUEDA DE COMPRAS ---
  const handleOpenPurchaseSearch = () => {
    if (checkingSystem) return;
    
    // VALIDACIÓN: Si no hay historial, bloquear y avisar
    if (!hasPurchases) {
        toast.warning('No hay historial de compras', {
            description: 'Realiza una compra primero para ver el historial.',
            icon: <History className="w-5 h-5 text-orange-500" />,
            duration: 4000,
        });
        return;
    }

    setModalBusquedaOpen(true);
    cargarCompras();
    if (onSearchOpen) onSearchOpen();
  };

  const cargarFolio = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/compra/ultimoFolio?sucursalId=${sucursalIdSession}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const consecutivo = (res.data?.consecutivo || 0) + 1;
      const anio = new Date().getFullYear();
      const folio = `CV-${consecutivo.toString().padStart(5, '0')}-${anio}`;
      setFolio(folio);
      return folio;
    } catch {
      const anio = new Date().getFullYear();
      const folio = `CV-00001-${anio}`;
      setFolio(folio);
      return folio;
    }
  };

  const cargarProveedores = async () => {
    try {
      const res = await axios.get(`${apiUrl}/proveedor?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarCompras = async () => {
    try {
      const params = new URLSearchParams({
        sucursalId: sucursalIdSession.toString(),
        fechaInicio,
        fechaFin,
      });
      if (folioBusqueda) params.append('numdoc', folioBusqueda);
      const headers = { Authorization: `Bearer ${token}` };
      const [resActivas, resDevueltas] = await Promise.all([
        axios.get(`${apiUrl}/compra?${params.toString()}`, { headers }),
        axios.get(`${apiUrl}/compra?${params.toString()}&activo=0`, { headers }),
      ]);
      const merged = [...resActivas.data, ...resDevueltas.data];
      const data: Compra[] = Array.from(new Map(merged.map((c: Compra) => [c.id, c])).values());
      setCompras(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar compras');
    }
  };

  const cargarDetalles = async (id: number) => {
    try {
      const res = await axios.get(`${apiUrl}/compra/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetalles(res.data.detalles || []);
      setModalDetallesOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles');
    }
  };
  
  const registrarMovimientosDevolucionCompra = async (id: number) => {
    if (!token) return;

    try {
      const res = await axios.get(`${apiUrl}/compra/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detallesCompra: DetalleCompra[] = res.data.detalles || [];
      const folio = res.data?.numdoc as string | undefined;
      const headers = { Authorization: `Bearer ${token}` };

      const movimientos = detallesCompra
        .filter((detalle) => (detalle.servicio ?? detalle.producto?.servicio) !== 1)
        .map((detalle) => ({
          id_producto: detalle.id_producto,
          comentario: folio ? `Devolución de compra - Folio ${folio}` : 'Devolución de compra',
          tipo_esa: 'DEVOLUCION_COMPRA',
          cantidad: detalle.cantidad,
          cantidad_antigua: detalle.cantidad,
          fecha: new Date().toISOString(),
          id_user: userIdSession,
          costo: detalle.costo ?? 0,
          sucursalId: sucursalIdSession,
        }));

      await Promise.all(
        movimientos.map((movimiento) =>
          axios.post(`${apiUrl}/inventario-esa`, movimiento, { headers }).catch((err) => {
            console.error('Error registrando movimiento de devolución de compra', err);
          }),
        ),
      );
    } catch (err) {
      console.error('Error obteniendo datos para registrar la devolución de compra', err);
    }
  };
  const handleBuscarCompras = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    void cargarCompras();
  };
  const devolverCompra = async (id: number) => {
    try {
      await axios.post(
        `${apiUrl}/compra/${id}/devolucion`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await registrarMovimientosDevolucionCompra(id);
      toast.success('Compra devuelta');
      cargarCompras();
    } catch (err) {
      console.error(err);
      toast.error('Error al devolver compra');
    }
  };

  const buscarProductos = async (termino: string) => {
    try {
      const params = new URLSearchParams({
        pagina: '1',
        limite: '20',
        sucursalId: sucursalIdSession.toString(),
        termino,
      });
      const res = await axios.get(`${apiUrl}/producto/productosPaginacion?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prods = res.data.productos || [];
      const filtrados = prods.filter((p: Producto) => p.servicio === 0 || p.servicio == null);
      setResultadosProducto(filtrados);
    } catch (err) {
      console.error(err);
    }
  };

  const buscarPorCodigoBarras = async () => {
    if (!busqueda) return;
    
    // BLOQUEO DE BÚSQUEDA DIRECTA
    if (isInventoryEmpty) {
       toast.error('Catálogo vacío', { description: 'Registra productos antes de buscar.' });
       return;
    }

    try {
      const res = await axios.get(
        `${apiUrl}/producto/codigo/${busqueda}?sucursalId=${sucursalIdSession}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      agregarProducto(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Producto no encontrado');
      } else {
        console.error(err);
      }
      focusBusqueda();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      buscarPorCodigoBarras();
    }
  };

  const agregarProducto = (p: Producto) => {
    const existente = items.find((it) => it.id === p.id);
    if (existente) {
      const nuevos = items.map((it) =>
        it.id === p.id
          ? {
              ...it,
              cantidad: it.cantidad + 1,
              total:
                (it.cantidad + 1) * it.costo * (1 - (it.descuento || 0) / 100),
            }
          : it
      );
      setItems(nuevos);
    } else {
      setItems([
        ...items,
        {
          id: p.id,
          nombre: p.nombre,
          cantidad: 1,
          existencia: Number(p.cantidad_existencia),
          costo: Number(p.costo),
          precio1: Number(p.precio1),
          precio2: Number(p.precio2),
          precio3: Number(p.precio3),
          precio4: Number(p.precio4),
          descuento: 0,
          total: Number(p.costo),
        },
      ]);
    }
    setBusqueda('');
    focusBusqueda();
  };

  const actualizarItem = (index: number, campo: keyof ItemCompra, valor: number) => {
    const nuevos = [...items];
    const v = clamp0(valor);
    const valueFinal = campo === 'cantidad' ? Math.floor(v) : v;
    (nuevos[index] as any)[campo] = valueFinal;
    const it = nuevos[index];
    it.total = Math.max(
      0,
      it.costo * it.cantidad * (1 - (it.descuento || 0) / 100)
    );
    setItems(nuevos);
  };

  const ajustarCantidad = (delta: number) => {
    if (indiceItemSeleccionado < 0) return;
    const item = items[indiceItemSeleccionado];
    const nuevaCantidad = Math.max(1, item.cantidad + delta);
    actualizarItem(indiceItemSeleccionado, 'cantidad', nuevaCantidad);
  };

  const eliminarItem = (id: number) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const total = Number(items.reduce((sum, it) => sum + it.total, 0));
  const iva = total - total / 1.16;
  const subtotal = total / 1.16;
  const numitems = items.reduce((sum, it) => sum + it.cantidad, 0);

  const registrarMovimientosInventario = async (folioMovimiento: string) => {
    const fechaMovimiento = new Date().toISOString();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const movimientos = items
      .filter((it) => !isNaN(Number(it.id)))
      .map((it) => ({
        id_producto: Number(it.id),
        comentario: `Compra ${folioMovimiento}`,
        tipo_esa: 'COMPRA',
        cantidad: it.cantidad,
        cantidad_antigua: it.existencia,
        fecha: fechaMovimiento,
        id_user: userIdSession,
        costo: it.costo,
        sucursalId: sucursalIdSession,
      }));

    try {
      for (const mov of movimientos) {
        await axios.post(`${apiUrl}/inventario-esa`, mov, { headers });
      }
    } catch (error) {
      console.error('Error al registrar movimiento de inventario (compra)', error);
      throw error;
    }
  };

  const guardarCompra = async () => {
    if (guardandoRef.current) return;
    if (items.length === 0) {
      toast.error('Agrega productos a la compra');
      return;
    }

    for (const it of items) {
        if (
          it.cantidad < 0 || !isFinite(it.cantidad) ||
          it.costo < 0 || !isFinite(it.costo) ||
          it.precio1 < 0 || !isFinite(it.precio1) ||
          it.precio2 < 0 || !isFinite(it.precio2) ||
          it.precio3 < 0 || !isFinite(it.precio3) ||
          it.precio4 < 0 || !isFinite(it.precio4) ||
          it.descuento < 0 || !isFinite(it.descuento)
        ) {
          toast.error('Hay valores negativos o inválidos en la compra');
          return;
        }
      }
      guardandoRef.current = true;
      setGuardando(true);
    const folioActual = await cargarFolio();
    const payload = {
      numdoc: folioActual,
      proveedorId: Number(proveedorId) || null,
      observaciones,
      estado,
      numitems,
      subtotal,
      iva,
      total,
      fecha: new Date().toISOString(),
      activo: 1,
      saldo_pendiente: estado === 'CREDITO' ? total : 0,
      fecha_devolucion: null,
      id_usuario_devolucion: null,
      sucursalId: sucursalIdSession,
      id_usuario: userIdSession,
      detalles: items.map((it) => ({
        productoId: Number(it.id),
        cantidad: it.cantidad,
        cantidad_existente: it.existencia,
        iva: it.total - it.total / 1.16,
        ieps: 0,
        costo: it.costo,
        precio1: it.precio1,
        precio2: it.precio2,
        precio3: it.precio3,
        precio4: it.precio4,
        descuento: it.descuento,
      })),
    };
    try {
      await axios.post(`${apiUrl}/compra`, payload, { headers: { Authorization: `Bearer ${token}` } });
      await registrarMovimientosInventario(folioActual);
      toast.success('Compra guardada');
      setItems([]);
      setProveedorId('');
      setObservaciones('');
      setEstado('CONTADO');
      cargarFolio();
      focusBusqueda();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    }finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  useEffect(() => {
    cargarFolio();
    cargarProveedores();
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

  // --- EFECTO DE TECLADO (MODIFICADO) ---
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (modalProductoOpen || modalBusquedaOpen || modalDetallesOpen) return;
      
      // BLOQUEO DE F2
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenProductSearch(); // Usa la función segura
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceItemSeleccionado((prev) =>
          Math.min(prev + 1, items.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceItemSeleccionado((prev) => Math.max(prev - 1, 0));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        ajustarCantidad(1);
      } else if (e.key === '-') {
        e.preventDefault();
        ajustarCantidad(-1);
      } else if (e.key === 'F3') {
        e.preventDefault();
        guardarCompra();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, modalProductoOpen, modalBusquedaOpen, modalDetallesOpen, items, indiceItemSeleccionado, isInventoryEmpty, checkingSystem, hasPurchases]);

  useEffect(() => {
    if (items.length === 0) {
      setIndiceItemSeleccionado(-1);
    } else if (indiceItemSeleccionado === -1) {
      setIndiceItemSeleccionado(0);
    } else if (indiceItemSeleccionado >= items.length) {
      setIndiceItemSeleccionado(items.length - 1);
    }
  }, [items, indiceItemSeleccionado]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:gap-4">
          <span>
            <kbd className="font-semibold">F2</kbd> Buscar producto
          </span>
          <span>
            <kbd className="font-semibold">F3</kbd> Guardar compra
          </span>
        </div>
        <div className="flex gap-2">
          {/* BOTÓN BUSCAR COMPRAS CON VALIDACIÓN */}
          <Button
            variant="outline"
            data-guide="btn-buscar-compras"
            onClick={handleOpenPurchaseSearch} // <--- USO DE FUNCIÓN VALIDADA
          >
            Buscar compras
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Folio</label>
          <Input value={numdoc} disabled />
        </div>
        <div data-guide="proveedor-select">
          <label className="text-sm font-medium">Proveedor</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            onBlur={focusBusqueda}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
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
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1" data-guide="producto-scan">
              <Input
                ref={buscarRef}
                placeholder="Buscar producto por código de barras"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full"
                disabled={isInventoryEmpty} // Bloqueo de input
              />
          </div>
          <Button 
             variant="outline" 
             onClick={handleOpenProductSearch} // USO DE FUNCIÓN SEGURA
             className={isInventoryEmpty ? "opacity-50 cursor-not-allowed" : ""}
             title={isInventoryEmpty ? "Catálogo vacío" : "Buscar (F2)"}
          >
            Buscar (F2)
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Usa <kbd className="font-semibold">↑</kbd>/<kbd className="font-semibold">↓</kbd> para moverte entre los productos y
        <kbd className="font-semibold">+</kbd> o <kbd className="font-semibold">-</kbd> para ajustar la cantidad.
      </p>

      <div className="rounded border bg-white shadow text-sm">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-center">Cant. existente</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">P. público</TableHead>
              <TableHead className="text-right">P. con descuento</TableHead>
              <TableHead className="text-right">P. semi mayoreo</TableHead>
              <TableHead className="text-right">P. mayoreo</TableHead>
              <TableHead className="text-right">Descuento (%)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow
                key={it.id}
                className={idx === indiceItemSeleccionado ? 'bg-orange-50' : ''}
                onClick={() => setIndiceItemSeleccionado(idx)}
              >
                <TableCell>{it.nombre}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'cantidad', Math.max(0, it.cantidad - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-16 text-center"
                      min={0}
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizarItem(idx, 'cantidad', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'cantidad', it.cantidad + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">{it.existencia}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'costo', Math.max(0, it.costo - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      min={0}
                      value={it.costo}
                      onChange={(e) =>
                        actualizarItem(idx, 'costo', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'costo', it.costo + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio1', Math.max(0, it.precio1 - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      min={0}
                      value={it.precio1}
                      onChange={(e) =>
                        actualizarItem(idx, 'precio1', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio1', it.precio1 + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio2', Math.max(0, it.precio2 - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      min={0}
                      value={it.precio2}
                      onChange={(e) =>
                        actualizarItem(idx, 'precio2', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio2', it.precio2 + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio3', Math.max(0, it.precio3 - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      min={0}
                      value={it.precio3}
                      onChange={(e) =>
                        actualizarItem(idx, 'precio3', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio3', it.precio3 + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio4', Math.max(0, it.precio4 - 1));
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-20 text-right"
                      min={0}
                      value={it.precio4}
                      onChange={(e) =>
                        actualizarItem(idx, 'precio4', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'precio4', it.precio4 + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        const nuevo = Math.max(0, (it.descuento || 0) - 1);
                        actualizarItem(idx, 'descuento', nuevo);
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-16 text-right"
                      min={0}
                      max={100}
                      value={it.descuento}
                      onChange={(e) =>
                        actualizarItem(idx, 'descuento', parseFloat(e.target.value))
                      }
                      onBlur={focusBusqueda}
                      onKeyDown={(e) => e.key === 'Enter' && focusBusqueda()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setIndiceItemSeleccionado(idx);
                        actualizarItem(idx, 'descuento', (it.descuento || 0) + 1);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span>%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">${Number(it.total).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => eliminarItem(it.id)}>
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-8 text-lg font-semibold">
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div>IVA: ${iva.toFixed(2)}</div>
        <div>Total: ${Number(total).toFixed(2)}</div>
      </div>

      <div className="flex justify-end">
        <Button 
            onClick={guardarCompra} 
            disabled={guardando} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-guide="btn-guardar-compra"
        >
          <PlusCircle className="w-4 h-4" /> Guardar compra
        </Button>
      </div>

      {/* MODAL BUSCAR PRODUCTO (PROTEGIDO) */}
      <Dialog
        open={modalProductoOpen}
        onOpenChange={(open) => {
          setModalProductoOpen(open);
          if (!open) {
            setBusquedaProducto('');
            setResultadosProducto([]);
            setIndiceProductoSeleccionado(-1);
            focusBusqueda();
          }
        }}
      >
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-6xl mx-auto shadow-xl border p-6 space-y-4"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Buscar producto</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nombre del producto"
            value={busquedaProducto}
            onChange={(e) => {
              setBusquedaProducto(e.target.value);
              setIndiceProductoSeleccionado(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndiceProductoSeleccionado((prev) =>
                  prev < resultadosProducto.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndiceProductoSeleccionado((prev) =>
                  prev > 0 ? prev - 1 : resultadosProducto.length - 1
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const p = resultadosProducto[indiceProductoSeleccionado];
                if (p) {
                  agregarProducto(p);
                  setModalProductoOpen(false);
                  setBusquedaProducto('');
                  setResultadosProducto([]);
                  setIndiceProductoSeleccionado(-1);
                }
              }
            }}
          />
          <div className="max-h-80 overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead>Código</TableHead>
                  <TableHead>Código de barras</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Inventario</TableHead>
                  <TableHead className="text-right">Precio público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultadosProducto.map((p, index) => (
                  <TableRow
                    key={p.id}
                    className={`${
                      indiceProductoSeleccionado === index
                        ? 'bg-orange-200'
                        : 'hover:bg-orange-50'
                    } cursor-pointer`}
                    onClick={() => {
                      agregarProducto(p);
                      setModalProductoOpen(false);
                      setBusquedaProducto('');
                      setResultadosProducto([]);
                      setIndiceProductoSeleccionado(-1);
                    }}
                  >
                    <TableCell>{p.codigo}</TableCell>
                    <TableCell>{p.cod_barras}</TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell className="text-right">{p.cantidad_existencia}</TableCell>
                    <TableCell className="text-right">${p.precio1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL BUSCAR COMPRAS (PROTEGIDO) */}
      <Dialog open={modalBusquedaOpen} onOpenChange={setModalBusquedaOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-4xl mx-auto shadow-xl border p-6 space-y-4"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Buscar compras</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleBuscarCompras} className="flex gap-4 items-end" data-guide="filtros-busqueda-compras">
            <div>
              <label className="text-sm font-medium">Desde</label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
          <div>
            <label className="text-sm font-medium">Hasta</label>
            <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Folio</label>
             <Input
              value={folioBusqueda}
              onChange={(e) => setFolioBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  cargarCompras();
                }
              }}
            />
          </div>
          <Button type="submit">Buscar</Button>
          </form>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />
            <span>Las filas en rojo corresponden a ventas devueltas.</span>
          </div>

          <div className="overflow-auto max-h-96 rounded border bg-white">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Sub total</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {permisos['Compra-Venta/Devolución Compra'] && (
                  <TableHead className="text-center">Dev.</TableHead>
                  )}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((c, index) => (
                  <TableRow
                    key={c.id}
                    className={c.activo === 0 ? 'bg-red-100 text-red-600' : 'hover:bg-orange-50'}
                  >
                    <TableCell>{c.numdoc}</TableCell>
                    <TableCell>{c.proveedor?.razon_social || 'Sin proveedor'}</TableCell>
                    <TableCell className="text-center">{c.numitems}</TableCell>
                    <TableCell>{c.estado}</TableCell>
                    <TableCell>{formatFecha(c.fecha)}</TableCell>
                    <TableCell className="text-right">${Number(c.subtotal).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(c.iva).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(c.total).toFixed(2)}</TableCell>
                    {permisos['Compra-Venta/Devolución Compra'] && (
                    <TableCell className="text-center">
                      {c.fecha_devolucion ? (
                        <CheckSquare size={14} className="mx-auto text-green-600" />
                      ) : (
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => devolverCompra(c.id)}
                            data-guide={index === 0 ? "btn-devolver-compra" : undefined}
                        >
                          <ArrowLeftRight size={14} />
                        </Button>
                      )}
                    </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => cargarDetalles(c.id)}
                        data-guide={index === 0 ? "btn-ver-detalles" : undefined}
                      >
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLES DE COMPRA (PROTEGIDO) */}
      <Dialog open={modalDetallesOpen} onOpenChange={setModalDetallesOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Detalles de compra</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-80 rounded border bg-white">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((d, idx) => (
                  <TableRow
                    key={idx}
                    className={d.activo === 0 ? 'bg-red-100 text-red-600' : ''}
                  >
                    <TableCell>{d.producto?.nombre}</TableCell>
                    <TableCell className="text-center">{d.cantidad}</TableCell>
                    <TableCell className="text-right">${Number(d.importe).toFixed(2)}</TableCell>
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