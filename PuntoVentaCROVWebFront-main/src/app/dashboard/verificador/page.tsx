'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import { toast } from 'sonner';
import type { Producto, ProductoTransferEvent } from '../venta/types';
import { BookOpen, ChevronDown, AlertCircle } from 'lucide-react'; // Agregué AlertCircle
import { Button } from '@/components/ui/button';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// --- 1. FLUJO NORMAL ---
const GUIDE_FLOW_VERIFICADOR: GuideStep[] = [
  {
    targetKey: "input-codigo",
    title: "1. Escanear o Escribir",
    content: "Aquí inicia el proceso. Escanea el código de barras o escribe manualmente.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-buscar-nombre",
    title: "2. Búsqueda por Nombre",
    content: "Si no tienes el código, haz clic aquí para buscar por nombre.",
    placement: "bottom",
    modalPosition: "bottom-right",
    disableNext: true 
  },
  {
    targetKey: "search-input-modal", 
    title: "3. Buscar y Seleccionar",
    content: "Escribe el nombre y haz DOBLE CLIC en el producto para seleccionarlo.",
    placement: "bottom",
    modalPosition: "bottom-left", 
    disableNext: true 
  },
  {
    targetKey: "area-resultados",
    title: "4. Precio y Stock",
    content: "Aquí aparece la información consultada.",
    placement: "top",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "shortcut-f1",
    title: "5. Enviar a Venta",
    content: "Si el cliente lo lleva, presiona F1.",
    placement: "bottom",
    modalPosition: "bottom-left"
  }
];

// --- 2. FLUJO DE BLOQUEO (SIN REGISTROS) ---
const GUIDE_FLOW_EMPTY: GuideStep[] = [
  {
    targetKey: "nav-item-inventario", 
    title: "⛔ Sin Registros",
    content: "NO HAY REGISTROS EN INVENTARIOS. FAVOR DE REGISTRAR PRODUCTOS para poder usar el verificador.",
    placement: "right", 
    modalPosition: "left",
    disableNext: true 
  }
];

export default function VerificadorPrecio() {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);

  // === ESTADO DE LA GUÍA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>(GUIDE_FLOW_VERIFICADOR);
  const [showGuideMenu, setShowGuideMenu] = useState(false);

  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
    : 0;

  // --- LÓGICA DE APERTURA ---
  const isNormalGuide = currentSteps === GUIDE_FLOW_VERIFICADOR;
  const isGuideForcingOpen = guideActive && isNormalGuide && currentStepIndex === 2;
  const effectiveOpen = searchOpen || isGuideForcingOpen;
  const isGuideForcingOpenRef = useRef(isGuideForcingOpen);

  useEffect(() => {
    isGuideForcingOpenRef.current = isGuideForcingOpen;
  }, [isGuideForcingOpen]);

  // --- FUNCIONES DE LA GUÍA ---
  const startGuide = (stepsToUse: GuideStep[] = GUIDE_FLOW_VERIFICADOR) => {
    setCurrentSteps(stepsToUse);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    setProducto(null);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      if (currentSteps === GUIDE_FLOW_VERIFICADOR) {
        toast.success("¡Guía completada!");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // --- LÓGICA CRÍTICA: DETECCIÓN CORRECTA ---
  const checkInventoryAndStart = async () => {
    try {
      const params = new URLSearchParams({
        pagina: "1",
        limite: "1", 
        sucursalId: sucursalIdSession.toString(),
      });

      const res = await axios.get(
        `${apiUrl}/producto/productosPaginacion?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      const products = data.productos || []; 
      const hasProducts = products.length > 0;

      if (hasProducts) {
        setIsInventoryEmpty(false);
        startGuide(GUIDE_FLOW_VERIFICADOR);
        localStorage.setItem('hasSeenVerificadorGuide', 'true');
      } else {
        throw new Error("Lista vacía"); 
      }
      
    } catch (error: any) {
      console.warn("Inventario vacío o error:", error);
      setIsInventoryEmpty(true); 
      startGuide(GUIDE_FLOW_EMPTY);
      toast.warning("Inventario vacío: Favor de registrar productos.");
    }
  };

  // --- AUTO-START ---
  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenVerificadorGuide');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        checkInventoryAndStart(); 
      }, 1000); 
      return () => clearTimeout(timer);
    } else {
       checkInventoryAndStart();
    }
  }, []);

  // --- DETECTORES DE PASOS ---
  useEffect(() => {
    if (guideActive && isNormalGuide && searchOpen && currentStepIndex === 1) {
       setTimeout(() => handleNextStep(), 300);
    }
  }, [searchOpen, guideActive, currentStepIndex, isNormalGuide]);

  useEffect(() => {
    if (guideActive && isNormalGuide && producto && currentStepIndex === 2) {
       setCurrentStepIndex(3); 
    }
  }, [producto, guideActive, currentStepIndex, searchOpen, isNormalGuide]);


  // --- FUNCIONES DE NEGOCIO ---
  const buscarProducto = async () => {
    if (!codigoBarras) return;
    
    // VALIDACIÓN EXTRA: Bloquear búsqueda manual si está vacío
    if (isInventoryEmpty) {
       toast.error('Inventario Vacío', { description: 'Registra productos antes de buscar.' });
       return;
    }

    try {
      const res = await axios.get(
        `${apiUrl}/producto/codigo/${codigoBarras}?sucursalId=${sucursalIdSession}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducto(res.data as Producto);
      setError('');
    } catch (err: any) {
      setProducto(null);
      if (err.response?.status === 404) setError('Producto no encontrado');
      else setError('Error al buscar el producto');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscarProducto();
  };

  const enviarProductoAVenta = useCallback(async (productoSeleccionado: Producto, cantidad = 1) => {
      if (!productoSeleccionado) return;
      let productoCompleto: Producto | null = productoSeleccionado;
      const payload: ProductoTransferEvent = {
        producto: productoCompleto ?? undefined,
        productoId: productoCompleto?.id ?? productoSeleccionado.id,
        codigo: productoCompleto?.codigo ?? null,
        codBarras: productoCompleto?.cod_barras ?? null,
        sucursalId: sucursalIdSession || null,
        cantidad,
        timestamp: Date.now(),
      };

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ventaProductoPendiente', JSON.stringify(payload));
          window.dispatchEvent(new CustomEvent('venta:agregar-producto', { detail: payload }));
        }
        router.push('/dashboard/venta');
        toast.success('Producto enviado a ventas');
      } catch (err) {
        toast.error('No se pudo enviar el producto a ventas');
      }
    }, [router, sucursalIdSession]);

  useEffect(() => {
    const handleF1 = (event: KeyboardEvent) => {
      if (event.key !== 'F1') return;
      event.preventDefault();
      if (producto) void enviarProductoAVenta(producto);
      else toast.error('Busca un producto antes de enviarlo a ventas');
    };
    window.addEventListener('keydown', handleF1);
    return () => window.removeEventListener('keydown', handleF1);
  }, [enviarProductoAVenta, producto]);

  const showArrow = !isNormalGuide || (!effectiveOpen || currentStepIndex === 2);

  const handleModalOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && isGuideForcingOpenRef.current) return; 
    setSearchOpen(isOpen);
  }, []); 

  const handleProductSelect = useCallback((p: any) => {
    setProducto(p as Producto);
    setError('');
    setSearchOpen(false); 
  }, []); 

  const ProductSearchDialogMemo = useMemo(() => (
    <ProductSearchDialog
      key="static-dialog-key" 
      open={effectiveOpen}
      onOpenChange={handleModalOpenChange}
      onSelect={handleProductSelect}
    />
  ), [effectiveOpen, handleModalOpenChange, handleProductSelect]);

  // --- HANDLER DEL BOTÓN (CORREGIDO) ---
  const handleSearchButtonClick = () => {
    // 1. VALIDAR PRIMERO
    if (isInventoryEmpty) {
      toast.warning("Inventario vacío: Favor de registrar productos.", {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
      });
      return; // DETENER EJECUCIÓN: No abre el modal
    }
    
    // 2. ABRIR SOLO SI ES VÁLIDO
    setSearchOpen(true); 
  };

  return (
    <div className="space-y-6 relative">
      
      {guideActive && showArrow && currentSteps[currentStepIndex] && (
          <GuideArrowOverlay 
            activeKey={currentSteps[currentStepIndex].targetKey} 
            placement={currentSteps[currentStepIndex].placement}
          />
      )}
      
      {guideActive && currentSteps[currentStepIndex] && (
          <GuideModal 
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
      )}

      <div className="flex justify-end mb-2">
        <div className="relative inline-block text-left">
            <Button variant="outline" size="sm" onClick={() => setShowGuideMenu(!showGuideMenu)} className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Guía Interactiva <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
            </Button>
            {showGuideMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="py-1">
                      <button 
                        onClick={() => { checkInventoryAndStart(); setShowGuideMenu(false); }} 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ▶ Iniciar Tour
                      </button>
                  </div>
                </div>
            )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl border">
        <div className="flex gap-4 text-sm text-gray-600" data-guide="shortcut-f1">           
            <kbd className="font-semibold">F1</kbd> Agregar producto a venta         
        </div>
        <h1 className="text-xl font-bold mb-4 text-center">Verificador de Precio</h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text" className={`flex-1 px-4 py-2 border rounded-md ${isInventoryEmpty ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Escanea o escribe el código de barras"
            value={codigoBarras} 
            onChange={(e) => setCodigoBarras(e.target.value)} 
            onKeyDown={handleKeyDown} 
            autoFocus
            disabled={isInventoryEmpty}
            data-guide="input-codigo"
          />
          <button
            type="button" 
            onClick={handleSearchButtonClick} // USA LA FUNCIÓN CON VALIDACIÓN
            className={`px-4 py-2 rounded-md text-white transition ${isInventoryEmpty ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
            data-guide="btn-buscar-nombre"
            title={isInventoryEmpty ? "Inventario Vacío" : "Buscar"}
          >
            Buscar Producto
          </button>
        </div>

        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}

        <div className="mt-6 border-t pt-4 min-h-[100px]" data-guide="area-resultados">
            {producto ? (
                <>
                    <p className="text-lg"><strong>Producto:</strong> {producto.nombre}</p>
                    <p className="text-xl text-green-600 mt-2"><strong>Precio público:</strong> ${producto.precio1}</p>
                    <p className="text-gray-600"><strong>Inventario:</strong> {producto.cantidad_existencia} piezas</p>
                </>
            ) : (
                <p className="text-center text-gray-400 italic mt-8">Los detalles del producto aparecerán aquí</p>
            )}
        </div>

        {ProductSearchDialogMemo}

      </div>
    </div>
  );
}