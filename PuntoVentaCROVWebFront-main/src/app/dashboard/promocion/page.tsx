'use client';

import { useState, useEffect } from 'react';
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
import ProductSearchDialog from '@/components/ProductSearchDialog';
import { toast } from 'sonner';
import { Trash2, BookOpen, PlayCircle, ChevronDown, Plus, Filter, Search, AlertCircle } from 'lucide-react';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface PromocionForm {
  productoId: number | null;
  productoNombre: string;
  cantidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string;
  monto: string;
}

interface FiltroPromociones {
  inicio: string;
  fin: string;
  productoId: number | null;
  productoNombre: string;
}

// === FLUJO 1: CREACIÓN DE PROMOCIÓN ===
const GUIDE_FLOW_CREATE: GuideStep[] = [
  {
    targetKey: "form-container",
    title: "1. Crear Promoción",
    content: "En este panel izquierdo podrás configurar nuevas promociones por volumen (ej. compra 10 y paga menos).",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-producto-group",
    title: "2. Seleccionar Producto",
    content: "Primero, busca y selecciona el producto al que aplicarás la promoción.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-cantidad",
    title: "3. Definir Cantidad",
    content: "Indica cuántas piezas debe comprar el cliente para que se active la promoción.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-fechas",
    title: "4. Vigencia",
    content: "Establece el rango de fechas en las que esta promoción será válida automáticamente en caja.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-monto",
    title: "5. Precio Especial",
    content: "Define el monto total que pagará el cliente por llevarse la cantidad de productos especificada.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-descripcion",
    title: "6. Descripción",
    content: "Agrega una nota o nombre para identificar esta promoción (ej. 'Promo Verano', 'Oferta Mayorista').",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-actions",
    title: "7. Guardar",
    content: "Finalmente, usa estos botones para Guardar la nueva promoción o limpiar el formulario.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// === FLUJO 2: BÚSQUEDA Y FILTRADO ===
const GUIDE_FLOW_FILTER: GuideStep[] = [
  {
    targetKey: "filter-section",
    title: "1. Filtros de Búsqueda",
    content: "Utiliza esta sección derecha para buscar promociones pasadas o futuras por fecha y producto.",
    placement: "left",
    modalPosition: "left"
  },
  {
    targetKey: "table-results",
    title: "2. Listado de Promociones",
    content: "Aquí verás las promociones activas. Haz clic en una fila para cargar sus datos en el formulario izquierdo y poder editarla o eliminarla.",
    placement: "left",
    modalPosition: "left"
  }
];

// === FLUJO 3: SIN PRODUCTOS (VALIDACIÓN) ===
const GUIDE_FLOW_NO_PRODUCTS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "⛔ Sin Productos",
    content: "No se encontraron productos registrados en el sistema. Para crear una promoción, primero debes registrar tus artículos en el módulo 'Catálogos > Productos'.",
    placement: "bottom",
    modalPosition: "bottom-center"
  }
];

export default function PromocionPage() {
  const today = new Date();
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const finMes = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [form, setForm] = useState<PromocionForm>({
    productoId: null,
    productoNombre: '',
    cantidad: '',
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: '',
    monto: '',
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterSearchOpen, setFilterSearchOpen] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPromociones>({
    inicio: inicioMes,
    fin: finMes,
    productoId: null,
    productoNombre: '',
  });
  const [promociones, setPromociones] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  // Estados de la Guía y Validación
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('sucursalId') || '0', 10) : 0;

  // --- VALIDACIÓN DE INVENTARIO ---
  const checkInventory = async () => {
    try {
        const res = await fetch(`${apiUrl}/producto/productosPaginacion?pagina=1&limite=1&sucursalId=${sucursalIdSession}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const lista = data.productos || (Array.isArray(data) ? data : []);
        const empty = lista.length === 0;
        setIsInventoryEmpty(empty);
        return empty;
    } catch (error) {
        console.error("Error verificando inventario", error);
        return true;
    }
  };

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = (flow: 'CREATE' | 'FILTER') => {
    if (isInventoryEmpty) {
        setCurrentSteps(GUIDE_FLOW_NO_PRODUCTS);
    } else {
        const steps = flow === 'CREATE' ? GUIDE_FLOW_CREATE : GUIDE_FLOW_FILTER;
        setCurrentSteps(steps);
    }
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    checkInventory().then((isEmpty) => {
        const key = 'hasSeenPromocionesGuide';
        if (!localStorage.getItem(key)) {
            const timer = setTimeout(() => {
                if (isEmpty) {
                    setCurrentSteps(GUIDE_FLOW_NO_PRODUCTS);
                    setGuideActive(true);
                } else {
                    startGuide('CREATE');
                }
                localStorage.setItem(key, 'true');
            }, 1000);
            return () => clearTimeout(timer);
        }
    });
  }, []);

  const closeGuide = () => setGuideActive(false);

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      if (currentSteps !== GUIDE_FLOW_NO_PRODUCTS) {
          toast.success("¡Guía completada!");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!form.productoId || !form.cantidad || !form.fecha_inicio || !form.fecha_fin || !form.monto) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    if (new Date(form.fecha_inicio) > new Date(form.fecha_fin)) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }

    const data = {
      tipo: 'POR_CANTIDAD',
      tipo_descuento: 'MONTO',
      productoId: form.productoId,
      cantidad: Number(form.cantidad),
      fecha_inicio: form.fecha_inicio.toString(),
      fecha_fin: form.fecha_fin.toString(),
      descripcion: form.descripcion,
      monto: Number(form.monto),
      sucursalId: sucursalIdSession,
    };

    try {
      const res = await fetch(`${apiUrl}/promocion/promociones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Promoción guardada');
      handleClear();
      await cargarPromociones();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    }
  };

  const handleUpdate = async () => {
    if (
      !editId ||
      !form.productoId ||
      !form.cantidad ||
      !form.fecha_inicio ||
      !form.fecha_fin ||
      !form.monto
    ) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    if (new Date(form.fecha_inicio) > new Date(form.fecha_fin)) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }

    const data = {
      tipo: 'POR_CANTIDAD',
      tipo_descuento: 'MONTO',
      productoId: form.productoId,
      cantidad: Number(form.cantidad),
      fecha_inicio: form.fecha_inicio.toString(),
      fecha_fin: form.fecha_fin.toString(),
      descripcion: form.descripcion,
      monto: Number(form.monto),
      sucursalId: sucursalIdSession,
    };

    try {
      const res = await fetch(`${apiUrl}/promocion/promociones/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al editar');
      toast.success('Promoción editada');
      handleClear();
      await cargarPromociones();
    } catch (err) {
      console.error(err);
      toast.error('Error al editar');
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!confirm('¿Deseas desactivar esta promoción?')) return;
    try {
      const res = await fetch(
        `${apiUrl}/promocion/promociones/${editId}/desactivar`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error('Error al desactivar');
      toast.success('Promoción desactivada');
      handleClear();
      await cargarPromociones();
    } catch (err) {
      console.error(err);
      toast.error('Error al desactivar promoción');
    }
  };

  const handleClear = () => {
    setForm({
      productoId: null,
      productoNombre: '',
      cantidad: '',
      fecha_inicio: '',
      fecha_fin: '',
      descripcion: '',
      monto: '',
    });
    setEditId(null);
  };

  const handleSelectPromocion = (p: any) => {
    setEditId(p.id);
    setForm({
      productoId: p.producto?.id ?? p.productoId ?? null,
      productoNombre: p.producto?.nombre || '',
      cantidad: String(p.cantidad ?? ''),
      fecha_inicio: p.fecha_inicio ? p.fecha_inicio.split('T')[0] : '',
      fecha_fin: p.fecha_fin ? p.fecha_fin.split('T')[0] : '',
      descripcion: p.descripcion ?? '',
      monto: String(p.monto ?? ''),
    });
  };

  const cargarPromociones = async () => {
    if (!filtro.inicio || !filtro.fin) {
      toast.error('Selecciona fecha inicio y fin');
      return;
    }

    const params = new URLSearchParams({
      inicio: filtro.inicio,
      fin: filtro.fin,
      sucursalId: sucursalIdSession.toString(),
    });
    if (filtro.productoId) {
      params.append('productoId', filtro.productoId.toString());
    }

    try {
      const res = await fetch(
        `${apiUrl}/promocion/promociones/rango?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setPromociones(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar');
    }
  };

  useEffect(() => {
    cargarPromociones();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6 relative">
      
      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          {!searchOpen && !filterSearchOpen && (
              <GuideArrowOverlay 
                activeKey={currentSteps[currentStepIndex].targetKey} 
                placement={currentSteps[currentStepIndex].placement}
              />
          )}
          
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

      {/* Título */}
      <h1 className="text-2xl font-semibold mb-2 text-orange-600" data-guide="page-title">
        Promociones por cantidad
      </h1>

      {/* Botones de Ayuda */}
      <div className="flex gap-2 mb-6">
          <div className="relative inline-block text-left">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowGuideMenu(!showGuideMenu)}
                className="flex items-center gap-2"
            >
                <BookOpen className="w-4 h-4 mr-2" /> Guía Interactiva
                <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
            </Button>

            {showGuideMenu && (
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95">
                    <div className="py-1">
                        <button
                            onClick={() => startGuide('CREATE')}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                            {isInventoryEmpty ? <AlertCircle className="w-4 h-4 text-red-500"/> : <Plus className="w-4 h-4 text-blue-600" />}
                            <span>Crear Promoción</span>
                        </button>
                        
                        <button
                            onClick={() => startGuide('FILTER')}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                            {isInventoryEmpty ? <AlertCircle className="w-4 h-4 text-red-500"/> : <Filter className="w-4 h-4 text-purple-600" />}
                            <span>Filtrar y Buscar</span>
                        </button>
                    </div>
                </div>
            )}
          </div>

          <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://www.youtube.com/watch?v=Atn-lBdFBR0&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=11')}
          >
              <PlayCircle className="w-4 h-4 mr-2" /> Tutorial Rápido
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="space-y-4" data-guide="form-container">
          <div data-guide="input-producto-group">
            <label className="block text-sm font-medium mb-1">Producto</label>
            <div className="flex gap-2">
              <Input value={form.productoNombre} readOnly className="flex-1" />
              <Button variant="outline" onClick={() => setSearchOpen(true)}>
                Buscar
              </Button>
            </div>
          </div>
          <div data-guide="input-cantidad">
            <label className="block text-sm font-medium mb-1">Cantidad</label>
            <Input
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-guide="input-fechas">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha inicio</label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha fin</label>
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              />
            </div>
          </div>
          <div data-guide="input-monto">
            <label className="block text-sm font-medium mb-1">Monto</label>
            <Input
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
            />
          </div>
          
          <div data-guide="input-descripcion">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <Input
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2" data-guide="btn-actions">
            <Button variant="outline" onClick={handleClear}>
              Limpiar
            </Button>
            {editId && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-1" size={16} />
                Eliminar
              </Button>
            )}
            <Button onClick={editId ? handleUpdate : handleSubmit}>
              {editId ? 'Editar' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* COLUMNA DERECHA: FILTROS Y TABLA */}
        <div className="space-y-4">
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg border" data-guide="filter-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Fecha Inicio</label>
                <Input
                  type="date"
                  value={filtro.inicio}
                  onChange={(e) => setFiltro({ ...filtro, inicio: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Fecha Fin</label>
                <Input
                  type="date"
                  value={filtro.fin}
                  onChange={(e) => setFiltro({ ...filtro, fin: e.target.value })}
                />
              </div>
            </div>
            
            {/* Leyenda de búsqueda */}
            <p className="text-[11px] text-gray-500 italic px-1">
              Ingrese el rango de fechas para consultar promociones activas.
            </p>

            <div className="flex gap-2 pt-2">
              <Input
                value={filtro.productoNombre}
                readOnly
                placeholder="Producto (opcional)"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setFilterSearchOpen(true)}
              >
                Producto
              </Button>
              <Button onClick={cargarPromociones} className="bg-orange-500 hover:bg-orange-600">
                <Search size={16} className="mr-1" /> Buscar
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-auto" data-guide="table-results">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promociones.length > 0 ? (
                  promociones.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => handleSelectPromocion(p)}
                      className={`cursor-pointer ${editId === p.id ? 'bg-orange-200' : ''
                        }`}
                    >
                      <TableCell>{p.producto?.nombre || ''}</TableCell>
                      <TableCell>{p.cantidad}</TableCell>
                      <TableCell>{p.monto}</TableCell>
                      <TableCell>{p.fecha_inicio?.split('T')[0]}</TableCell>
                      <TableCell>{p.fecha_fin?.split('T')[0]}</TableCell>
                      <TableCell>{p.descripcion}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Sin resultados en este rango de fechas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(p) =>
          setForm({ ...form, productoId: p.id, productoNombre: p.nombre })
        }
      />
      <ProductSearchDialog
        open={filterSearchOpen}
        onOpenChange={setFilterSearchOpen}
        onSelect={(p) =>
          setFiltro({ ...filtro, productoId: p.id, productoNombre: p.nombre })
        }
      />
    </div>
  )
}