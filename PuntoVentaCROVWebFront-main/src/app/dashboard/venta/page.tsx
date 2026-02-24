'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, X, BookOpen, PlayCircle, ChevronDown, Video, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import VentaForm from './VentaForm';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ==========================================
// 1. DEFINICIÓN DE LOS FLUJOS DE VENTA
// ==========================================

// FLUJO 1: VENTA DE CONTADO
const GUIDE_FLOW_CASH: GuideStep[] = [
  {
    targetKey: "cliente-select",
    title: "1. Selección de Cliente",
    content: "Empieza seleccionando al cliente. Para ventas rápidas, puedes dejarlo como 'Sin cliente' (Público en general).",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "estado-select",
    title: "2. Estado de Venta",
    content: "Verifica que el estado sea 'CONTADO' para procesar un pago inmediato en efectivo.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "producto-scan",
    title: "3. Agregar Productos",
    content: "Escanea el código de barras o busca el producto por nombre (F2).",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "items-table", 
    title: "4. Gestión de Artículos",
    content: "Aquí verás los productos agregados. Puedes ajustar cantidades con los botones +/- o eliminar ítems con el botón de basura.",
    placement: "top", 
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-guardar-venta",
    title: "5. Proceder al Cobro",
    content: "Haz clic en 'Guardar venta (F3)' para abrir la ventana de pagos. La guía continuará automáticamente.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true 
  },
  {
    targetKey: "efectivo-input",
    title: "6. Monto Precargado",
    content: "El sistema pre-cargó el total en Efectivo automáticamente. Si el cliente paga con un billete más grande, cambia este valor para calcular el cambio.",
    placement: "right",
    modalPosition: "left"
  },
  {
    targetKey: "btn-cobrar-ticket",
    title: "7. Finalizar",
    content: "Presiona 'Cobrar' para registrar la venta y generar el ticket.",
    placement: "top",
    modalPosition: "top-right",
    disableNext: false 
  }
];

// FLUJO 2: VENTA CON TARJETA
const GUIDE_FLOW_CARD: GuideStep[] = [
  {
    targetKey: "cliente-select",
    title: "1. Selección de Cliente",
    content: "Selecciona el cliente para la venta.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "estado-select",
    title: "2. Estado: Tarjeta",
    content: "IMPORTANTE: Cambia el estado a 'TARJETA'. Al hacerlo, el sistema sabrá que el cobro debe ir directo al campo de tarjeta.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "producto-scan",
    title: "3. Agregar Productos",
    content: "Busca y agrega los productos necesarios al carrito.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "items-table", 
    title: "4. Gestión de Artículos",
    content: "Verifica que los productos sean correctos.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-guardar-venta",
    title: "5. Ir a Pagar",
    content: "Haz clic en 'Guardar venta'. Verás que el cobro ya está listo.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  },
  {
    targetKey: "tarjeta-input",
    title: "6. Verificación Automática",
    content: "¡Listo! El sistema ya asignó el total a Tarjeta y dejó el Efectivo en 0. Solo verifica que coincida con la terminal bancaria.",
    placement: "left",
    modalPosition: "right"
  },
  {
    targetKey: "btn-cobrar-ticket",
    title: "7. Confirmar Venta",
    content: "Presiona 'Cobrar' para finalizar.",
    placement: "top",
    modalPosition: "top-right",
    disableNext: false
  }
];

// FLUJO 3: VENTA A CRÉDITO
const GUIDE_FLOW_CREDIT: GuideStep[] = [
  {
    targetKey: "cliente-select",
    title: "1. Selección de Cliente",
    content: "IMPORTANTE: Para crédito, debes seleccionar un cliente registrado obligatoriamente.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "estado-select",
    title: "2. Estado: Crédito",
    content: "Selecciona 'CRÉDITO'. Esto indica que la venta generará una cuenta por cobrar.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "producto-scan",
    title: "3. Agregar Productos",
    content: "Agrega los productos a la cuenta del cliente.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "items-table", 
    title: "4. Revisión",
    content: "Confirma el total de la deuda.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-guardar-venta",
    title: "5. Registrar Crédito",
    content: "Haz clic en 'Guardar venta' para procesar.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  },
  {
    targetKey: "tarjeta-input", 
    title: "6. Monto de la Deuda",
    content: "El sistema pre-carga el total automáticamente. Si el cliente deja un anticipo en efectivo, puedes ajustarlo.",
    placement: "left",
    modalPosition: "right"
  },
  {
    targetKey: "btn-cobrar-ticket",
    title: "7. Finalizar",
    content: "Al presionar 'Cobrar', la venta se guardará y se actualizará el saldo del cliente.",
    placement: "top",
    modalPosition: "top-right",
    disableNext: false
  }
];

// FLUJO 4: DEVOLUCIONES (ACTUALIZADO CON F4)
const GUIDE_FLOW_RETURN_TOTAL: GuideStep[] = [
  {
    targetKey: "btn-buscar-ventas",
    title: "1. Historial de Ventas",
    content: "Haz clic en 'Historial / Devoluciones (F4)' o presiona la tecla F4 para abrir el buscador de tickets.",
    placement: "bottom",
    modalPosition: "bottom-right",
    disableNext: true
  },
  {
    targetKey: "filtros-busqueda-ventas",
    title: "2. Buscar Ticket",
    content: "Filtra por fecha o folio.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-devolver-venta",
    title: "3. Cancelar Venta Completa",
    content: "Presiona el botón de flechas cruzadas en la fila de la venta. Esto devolverá TODOS los productos y cancelará el ticket.",
    placement: "left",
    modalPosition: "bottom-left",
    disableNext: false
  }
];

// FLUJO 5: DEVOLUCIÓN PARCIAL (ACTUALIZADO CON F4)
const GUIDE_FLOW_RETURN_PARTIAL: GuideStep[] = [
  {
    targetKey: "btn-buscar-ventas",
    title: "1. Historial de Ventas",
    content: "Haz clic en 'Historial / Devoluciones (F4)' o presiona la tecla F4 para iniciar.",
    placement: "bottom",
    modalPosition: "bottom-right",
    disableNext: true
  },
  {
    targetKey: "filtros-busqueda-ventas",
    title: "2. Buscar Ticket",
    content: "Encuentra la venta que contiene el producto a devolver.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-ver-detalles",
    title: "3. Ver Detalle de Venta",
    content: "NO presiones las flechas cruzadas de la tabla principal. En su lugar, haz clic en el 'Ojo' para ver qué productos tiene la venta.",
    placement: "left",
    modalPosition: "bottom-left",
    disableNext: true
  },
  {
    targetKey: "btn-devolver-item",
    title: "4. Devolver Producto Específico",
    content: "Busca el producto en esta lista y presiona sus flechas cruzadas. Solo ese ítem será devuelto al inventario.",
    placement: "left",
    modalPosition: "bottom-left",
    disableNext: false
  }
];

// --- 6. FLUJO DE BLOQUEO (SIN INVENTARIO) ---
const GUIDE_FLOW_EMPTY: GuideStep[] = [
  {
    targetKey: "nav-item-inventario", 
    title: "⛔ Sin Inventario",
    content: "NO HAY PRODUCTOS REGISTRADOS. Debes registrar productos en el catálogo antes de poder realizar ventas o búsquedas.",
    placement: "right", 
    modalPosition: "left",
    disableNext: true 
  }
];

export default function VentasPage() {
  const [tabs, setTabs] = useState<string[]>(['0']);
  const [activeTab, setActiveTab] = useState('0');

  // === ESTADOS DE LA GUÍA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  
  // === ESTADOS DE VALIDACIÓN ===
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);
  const [hasSales, setHasSales] = useState(false);

  // Estado para ocultar la flecha cuando un modal estorba
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
    : 0;

  // --- FUNCIÓN UNIFICADA PARA INICIAR GUÍA ---
  const startGuide = (mode: 'CASH' | 'CARD' | 'CREDIT' | 'RETURN_TOTAL' | 'RETURN_PARTIAL' | 'EMPTY') => {
    
    // VALIDACIÓN CRÍTICA: SI INVENTARIO VACÍO -> FORZAR FLUJO DE BLOQUEO
    if (isInventoryEmpty) {
        setCurrentSteps(GUIDE_FLOW_EMPTY);
        setGuideActive(true);
        setCurrentStepIndex(0);
        setShowGuideMenu(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        return;
    }

    let steps = GUIDE_FLOW_CASH;
    if (mode === 'CARD') steps = GUIDE_FLOW_CARD;
    if (mode === 'CREDIT') steps = GUIDE_FLOW_CREDIT;
    if (mode === 'RETURN_TOTAL') steps = GUIDE_FLOW_RETURN_TOTAL;
    if (mode === 'RETURN_PARTIAL') steps = GUIDE_FLOW_RETURN_PARTIAL;
    if (mode === 'EMPTY') steps = GUIDE_FLOW_EMPTY;

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    
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
      // Solo mostramos éxito si no es la guía de bloqueo
      if (currentSteps !== GUIDE_FLOW_EMPTY) {
         toast.success("¡Guía completada!");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // --- LÓGICA DE VERIFICACIÓN (Validación de Inventario y Ventas) ---
  const checkSystemStatus = async (autoStartGuide: boolean = false) => {
    try {
      // 1. Verificar Inventario (Para bloquear ventas y búsquedas)
      const paramsInv = new URLSearchParams({
        pagina: "1",
        limite: "1", 
        sucursalId: sucursalIdSession.toString(),
      });

      const resInv = await axios.get(
        `${apiUrl}/producto/productosPaginacion?${paramsInv.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const products = resInv.data.productos || []; 
      const emptyInventory = products.length === 0;
      setIsInventoryEmpty(emptyInventory);

      // 2. Verificar Historial de Ventas (Para bloquear botón de historial)
      let salesExist = false;
      try {
          const paramsVentas = new URLSearchParams({
            sucursalId: sucursalIdSession.toString(),
            limit: "1" 
          });
          const resVentas = await axios.get(
            `${apiUrl}/venta?${paramsVentas.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          salesExist = Array.isArray(resVentas.data) && resVentas.data.length > 0;
          setHasSales(salesExist);
      } catch (err) {
          console.warn("Error verificando historial de ventas", err);
          setHasSales(false);
      }

      // 3. Decisión de Guía Automática
      if (emptyInventory) {
          // Bloqueo total si no hay productos
          if (autoStartGuide || !localStorage.getItem('hasSeenVentasGuide')) {
             startGuide('EMPTY'); 
          }
      } else {
          // Flujo normal
          if (autoStartGuide) {
             startGuide('CASH');
             localStorage.setItem('hasSeenVentasGuide', 'true');
          }
      }
      
    } catch (error) {
      console.warn("Error crítico de validación", error);
      setIsInventoryEmpty(true);
      startGuide('EMPTY');
      toast.warning("Error de conexión o inventario vacío.");
    }
  };

  // --- AUTO-START AL CARGAR PAGINA ---
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenVentasGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        checkSystemStatus(true); 
      }, 1000);
      return () => clearTimeout(timer);
    } else {
        // Verificación silenciosa
        checkSystemStatus(false).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- HANDLER PARA CLICS MANUALES EN EL MENÚ ---
  const handleManualGuideClick = (mode: 'CASH' | 'CARD' | 'CREDIT' | 'RETURN_TOTAL' | 'RETURN_PARTIAL') => {
     // Si el inventario está vacío, startGuide redirigirá a EMPTY automáticamente
     startGuide(mode);
  };

  // --- HANDLER BOTÓN HISTORIAL (CLIC AUTOMÁTICO EN EL MODAL REAL) ---
  const handleOpenHistory = () => {
    if (!hasSales) {
        toast.warning("No hay historial de ventas disponible.", {
            description: "Realiza una venta primero para ver el historial."
        });
        return; 
    }

    // Buscamos el panel de la pestaña que está activa en este momento
    const activeTabElement = document.querySelector('[role="tabpanel"][data-state="active"]');

    if (activeTabElement) {
        // Buscamos el botón real de "Buscar ventas" dentro de ese formulario y le hacemos clic
        const searchBtn = Array.from(activeTabElement.querySelectorAll('button')).find(
            (btn) => btn.textContent?.includes('Buscar ventas')
        );

        if (searchBtn) {
            (searchBtn as HTMLButtonElement).click();
            return; // ¡Éxito! Se abre la ventana
        }
    }

    // Mensaje de respaldo por si no encuentra el botón
    toast.info("Haz clic en el botón 'Buscar ventas' a la derecha de la pantalla.");
  };

  // --- ATAJO DE TECLADO F4 PARA ABRIR HISTORIAL ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault(); // Evita la acción por defecto del navegador
        handleOpenHistory(); 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasSales]); // Depende de hasSales para que el F4 también se bloquee si no hay ventas

  // CALLBACKS DE AVANCE AUTOMÁTICO
  const handlePaymentModalOpened = () => {
    if (!guideActive) return;
    const currentStep = currentSteps[currentStepIndex];
    if (currentStep?.targetKey === "btn-guardar-venta") {
        setTimeout(() => { handleNextStep(); }, 500); 
    }
  };

  const handleSearchModalOpened = () => {
    if (!guideActive) return;
    const currentStep = currentSteps[currentStepIndex];
    if (currentStep?.targetKey === "btn-buscar-ventas") {
        setTimeout(() => { handleNextStep(); }, 500); 
    }
  };

  const handleDetailsModalOpened = () => {
    if (!guideActive) return;
    const currentStep = currentSteps[currentStepIndex];
    if (currentStep?.targetKey === "btn-ver-detalles") {
        setTimeout(() => { handleNextStep(); }, 500); 
    }
  };

  const eliminarTab = (id: string) => {
    const newTabs = tabs.filter((t) => t !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[newTabs.length - 1] || '');
    }
  };

  const agregarTab = () => {
    const id = Date.now().toString();
    setTabs([...tabs, id]);
    setActiveTab(id);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* RENDERIZADO DE LA GUÍA */}
      {guideActive && currentSteps.length > 0 && (
        <>
          {!isProductModalOpen && (
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

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-orange-600" data-guide="ventas-title">Ventas</h1>
            
            <div className="flex gap-2">
                {/* BOTÓN HISTORIAL CON VALIDACIÓN Y ATAJO F4 */}
                <Button 
                    variant="outline" 
                    onClick={handleOpenHistory}
                    disabled={!hasSales}
                    className={!hasSales ? "opacity-50 cursor-not-allowed" : ""}
                    data-guide="btn-buscar-ventas" 
                >
                    <History className="w-4 h-4 mr-2" /> 
                    Historial / Devoluciones (F4)
                </Button>

                <Button onClick={agregarTab} className="bg-orange-500 text-white" data-guide="btn-nueva-venta">
                    <PlusCircle className="w-4 h-4 mr-2" /> Nueva venta
                </Button>
            </div>
        </div>

        <div className="flex flex-wrap gap-2">
            
            {/* Combo Guías */}
            <div className="relative inline-block text-left">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowGuideMenu(!showGuideMenu)}
                    className="flex items-center gap-2"
                >
                    <BookOpen className="w-4 h-4" />
                    Guía Interactiva
                    <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
                
                {showGuideMenu && (
                    <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        <button onClick={() => handleManualGuideClick('CASH')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        🛒 Venta Contado
                        </button>
                        <button onClick={() => handleManualGuideClick('CARD')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        💳 Venta Tarjeta
                        </button>
                        <button onClick={() => handleManualGuideClick('CREDIT')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        📋 Venta Crédito
                        </button>
                        <div className="border-t my-1"></div>
                        
                        {/* Botones de devolución bloqueados si no hay ventas */}
                        <button 
                            onClick={() => !hasSales ? toast.warning('No hay historial') : handleManualGuideClick('RETURN_TOTAL')} 
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${!hasSales ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
                        >
                        🔄 Devolución Total
                        </button>
                        <button 
                            onClick={() => !hasSales ? toast.warning('No hay historial') : handleManualGuideClick('RETURN_PARTIAL')} 
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${!hasSales ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
                        >
                        📝 Devolución Parcial
                        </button>
                    </div>
                    </div>
                )}
            </div>

            {/* Combo Videos */}
            <div className="relative inline-block text-left">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowVideoMenu(!showVideoMenu)}
                    className="flex items-center gap-2"
                >
                    <Video className="w-4 h-4" />
                    Tutoriales en Video
                    <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
                
                {showVideoMenu && (
                    <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        <button onClick={() => window.open('https://www.youtube.com/watch?v=UE_2BOnOUcc&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=1', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Venta Rápida
                        </button>
                        {/* ... otros videos ... */}
                    </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div data-guide="tabs-list">
          <TabsList className="mb-4 overflow-x-auto">
            {tabs.map((t, idx) => (
              <TabsTrigger key={t} value={t} className="flex items-center gap-1">
                <span>Venta {idx + 1}</span>
                <X
                  size={12}
                  className="ml-1 cursor-pointer hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarTab(t);
                  }}
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <div data-guide="active-venta-content">
          {tabs.map((t) => (
            <TabsContent key={t} value={t} forceMount className={activeTab === t ? "" : "hidden"}>
              <VentaForm 
                active={activeTab === t} 
                onPaymentStart={handlePaymentModalOpened}
                onSearchOpen={handleSearchModalOpened}
                onDetailsOpen={handleDetailsModalOpened}
                onProductModalChange={setIsProductModalOpen}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}