'use client';

import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { BookOpen, AlertCircle } from 'lucide-react';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Movimiento {
  id: number;
  fecha: string;
  tipo_esa: string;
  cantidad: number;
  cantidad_antigua: number;
  comentario?: string;
  usuario?: { nombre: string; apellidos: string };
}

// === FLUJO 1: KARDEX CON PRODUCTOS ===
const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "search-section",
    title: "1. Búsqueda",
    content: "Se busca por el código de barras o con el botón de buscar producto.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-search",
    title: "2. Selección",
    content: "(Se abre el modal) Con doble clic se selecciona un producto.",
    placement: "bottom", 
    modalPosition: "bottom-right"
  },
  {
    targetKey: "summary-table",
    title: "3. Resumen General",
    content: "Aquí verás el desglose total de movimientos clasificados por tipo (Ventas, Compras, Devoluciones) para tener un panorama rápido.",
    placement: "bottom",
    modalPosition: "bottom-center"
  },
  // --- PASO DE TRANSICIÓN ---
  {
    targetKey: "detailed-table",
    title: "4. Detalle de Movimientos",
    content: "En esta tabla inferior se muestra el historial completo, fila por fila, de cada operación realizada con el producto.",
    placement: "top",
    modalPosition: "center"
  },
  // --- COLUMNAS (Renumeradas a 5.x) ---
  {
    targetKey: "col-fecha",
    title: "5.1. Fecha",
    content: "Fecha en la que se realizó el movimiento.",
    placement: "top",
    modalPosition: "bottom-center"
  },
  {
    targetKey: "col-tipo",
    title: "5.2. Tipo",
    content: "Tipo de movimiento (Entrada, Salida, Ajuste,Compra,Venta,Devolucion de compra o Devolucion de venta).",
    placement: "top",
    modalPosition: "bottom-center"
  },
  {
    targetKey: "col-cantidad",
    title: "5.3. Cantidad",
    content: "Cantidad de producto involucrada en el movimiento.",
    placement: "top",
    modalPosition: "bottom-left" 
  },
  {
    targetKey: "col-prev",
    title: "5.4. Existencia Previa",
    content: "Cantidad que existía antes de este movimiento.",
    placement: "top",
    modalPosition: "bottom-left" 
  },
  {
    targetKey: "col-comentario",
    title: "5.5. Comentarios",
    content: "Detalles u observaciones del movimiento.",
    placement: "top",
    modalPosition: "bottom-left" 
  },
  {
    targetKey: "col-usuario",
    title: "5.6. Usuario",
    content: "Usuario que registró el movimiento.",
    placement: "top",
    modalPosition: "bottom-center"
  }
];

// === FLUJO 2: FLUJO ALTERNATIVO (SIN PRODUCTOS) ===
const GUIDE_FLOW_NO_PRODUCTS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "Aviso",
    content: "No hay productos, favor de registrar y realizar movimientos.",
    placement: "bottom",
    modalPosition: "bottom-center"
  }
];

export default function KardexPage() {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [producto, setProducto] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Estados de la Guía y Validación
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
    : 0;

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
  const startGuide = () => {
    if (isInventoryEmpty) {
        setCurrentSteps(GUIDE_FLOW_NO_PRODUCTS);
    } else {
        setCurrentSteps(GUIDE_STEPS);
    }
    setGuideActive(true);
    setCurrentStepIndex(0);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    checkInventory().then((isEmpty) => {
        const key = 'hasSeenKardexGuide';
        if (!localStorage.getItem(key)) {
            const timer = setTimeout(() => {
                if (isEmpty) {
                    setCurrentSteps(GUIDE_FLOW_NO_PRODUCTS);
                } else {
                    setCurrentSteps(GUIDE_STEPS);
                }
                setGuideActive(true);
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

  const cargarKardex = async (idProducto: number) => {
    try {
      const res = await axios.get(
        `${apiUrl}/inventario-esa?sucursalId=${sucursalIdSession}&id_producto=${idProducto}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMovimientos(res.data || []);
    } catch (err) {
      console.error(err);
      setMovimientos([]);
    }
  };

  const buscarProductoCodigo = async () => {
    if (!codigoBarras) return;
    try {
      const res = await axios.get(
        `${apiUrl}/producto/codigo/${codigoBarras}?sucursalId=${sucursalIdSession}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducto(res.data);
      setError('');
      setCodigoBarras('');
      cargarKardex(res.data.id);
      
      // AUTO-AVANCE: Saltar al paso 3 (Resumen)
      if (guideActive && currentStepIndex < 2) {
          setTimeout(() => setCurrentStepIndex(2), 500);
      }

    } catch (err: any) {
      setProducto(null);
      setMovimientos([]);
      if (err.response?.status === 404) setError('Producto no encontrado');
      else setError('Error al buscar el producto');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') buscarProductoCodigo();
  };

  const handleSelect = (p: any) => {
    setProducto(p);
    setError('');
    setSearchOpen(false);
    setCodigoBarras('');
    cargarKardex(p.id);

    // AUTO-AVANCE: Saltar al paso 3 (Resumen) tras seleccionar en modal
    if (guideActive && !isInventoryEmpty) {
        setTimeout(() => {
            setCurrentStepIndex(2); 
        }, 500); 
    }
  };

  const calcularResumen = (listaMovimientos: Movimiento[]) => {
    const resumen = {
      ventas: 0,
      compras: 0,
      devolucionCompra: 0,
      devolucionVenta: 0,
      total: listaMovimientos.length,
    };

    listaMovimientos.forEach((mov) => {
      const tipo = (mov.tipo_esa || '').toUpperCase();

      if (tipo.includes('DEV') && tipo.includes('COMPRA')) {
        resumen.devolucionCompra += 1;
        return;
      }

      if (tipo.includes('DEV') && tipo.includes('VENTA')) {
        resumen.devolucionVenta += 1;
        return;
      }

      if (tipo.includes('COMPRA')) {
        resumen.compras += 1;
        return;
      }

      if (tipo.includes('VENTA')) {
        resumen.ventas += 1;
      }
    });

    return resumen;
  };

  const resumenMovimientos = useMemo(() => calcularResumen(movimientos), [movimientos]);  

  return (
    <div className="p-4 relative">
      
      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          {!searchOpen && (
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
      <h1 className="text-2xl font-bold mb-2 text-orange-600" data-guide="page-title">
        Kardex
      </h1>

      {/* Botón Guía */}
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={startGuide}>
            {isInventoryEmpty ? <AlertCircle className="w-4 h-4 mr-2 text-red-500" /> : <BookOpen className="w-4 h-4 mr-2" />}
            Guía Interactiva
        </Button>
      </div>

      {/* Sección de Búsqueda */}
      <div className="flex gap-2 mb-4" data-guide="search-section">
        <Input
          placeholder="Código de barras"
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <div data-guide="btn-search">
            <Button variant="outline" onClick={() => setSearchOpen(true)}>
            Buscar producto
            </Button>
        </div>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {producto && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold">{producto.nombre}</h2>
          <p className="text-sm text-gray-500">Código: {producto.codigo}</p>
        </div>
      )}

      {/* Mensaje cuando NO hay movimientos */}
      {movimientos.length === 0 && (
         <div className="min-h-[100px] border rounded bg-white overflow-hidden p-8 text-center text-gray-400 text-sm">
            {producto ? 'No hay movimientos registrados para este producto.' : 'Selecciona un producto para ver su historial.'}
         </div>
      )}

      {/* Contenedor Principal de Resultados */}
      {movimientos.length > 0 && (
        <div className="space-y-4">
          
          {/* Tabla de Resumen (Paso 3 de la Guía) */}
          <div 
            className="overflow-auto rounded border bg-white"
            data-guide="summary-table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead>Movimiento</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Movimientos registrados</TableCell>
                  <TableCell className="text-right text-orange-600 font-semibold">
                    {resumenMovimientos.total}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Ventas</TableCell>
                  <TableCell className="text-right">{resumenMovimientos.ventas}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Compras</TableCell>
                  <TableCell className="text-right">{resumenMovimientos.compras}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Devoluciones de compra</TableCell>
                  <TableCell className="text-right">{resumenMovimientos.devolucionCompra}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Devoluciones de venta</TableCell>
                  <TableCell className="text-right">{resumenMovimientos.devolucionVenta}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Tabla de Detalle (Paso 4: Transición y Pasos 5.x de la Guía) */}
          <div 
            className="overflow-auto border rounded bg-white"
            data-guide="detailed-table" // <-- NUEVO TARGET PARA EL PASO DE TRANSICIÓN
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead data-guide="col-fecha">Fecha</TableHead>
                  <TableHead data-guide="col-tipo">Tipo</TableHead>
                  <TableHead className="text-right" data-guide="col-cantidad">Cantidad</TableHead>
                  <TableHead className="text-right" data-guide="col-prev">Existencia previa</TableHead>
                  <TableHead data-guide="col-comentario">Comentario</TableHead>
                  <TableHead data-guide="col-usuario">Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.fecha).toLocaleString()}</TableCell>
                    <TableCell>{m.tipo_esa}</TableCell>
                    <TableCell className="text-right">{m.cantidad}</TableCell>
                    <TableCell className="text-right">{m.cantidad_antigua}</TableCell>
                    <TableCell>{m.comentario || ''}</TableCell>
                    <TableCell>
                      {m.usuario ? `${m.usuario.nombre} ${m.usuario.apellidos}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ProductSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSelect}
      />
    </div>
  );
}