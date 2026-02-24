'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, X, BookOpen, ChevronDown, Video, PlayCircle, History } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import CompraForm from './CompraForm';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ==========================================
// 1. DEFINICIÓN DE LOS FLUJOS DE COMPRA
// ==========================================

// 1. REGISTRAR COMPRA
const GUIDE_FLOW_REGISTER: GuideStep[] = [
  {
    targetKey: "proveedor-select",
    title: "1. Proveedor",
    content: "Selecciona el proveedor al que le estás realizando la compra.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "estado-select",
    title: "2. Estado de Compra",
    content: "Define si la compra es de CONTADO (pago inmediato) o CRÉDITO.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "observaciones-input",
    title: "3. Observaciones",
    content: "Puedes agregar notas adicionales sobre la compra aquí.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "producto-scan",
    title: "4. Agregar Productos",
    content: "Escanea el código de barras o busca el producto por nombre para añadirlo a la lista. (La flecha se ocultará si abres el buscador F2).",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-guardar-compra",
    title: "5. Guardar",
    content: "Una vez agregados todos los productos, haz clic en 'Guardar compra' para finalizar.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// 2. DEVOLUCIÓN DE COMPRA (ACTUALIZADO CON F4)
const GUIDE_FLOW_RETURNS: GuideStep[] = [
  {
    targetKey: "btn-buscar-compras",
    title: "1. Historial de Compras",
    content: "Haz clic en 'Historial / Devoluciones (F4)' o presiona la tecla F4 para buscar la compra a devolver.",
    placement: "bottom",
    modalPosition: "bottom-right",
    disableNext: true 
  },
  {
    targetKey: "filtros-busqueda-compras",
    title: "2. Filtrar Compras",
    content: "Usa los filtros de fecha o folio para localizar la compra.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-devolver-compra", 
    title: "3. Devolución Total",
    content: "Haz clic en este botón (flechas cruzadas) para devolver la compra completa.",
    placement: "left",
    modalPosition: "top-right"
  },
  {
    targetKey: "btn-ver-detalles", 
    title: "4. Ver Detalles",
    content: "Si solo quieres ver qué productos se compraron, haz clic en el icono del ojo.",
    placement: "left",
    modalPosition: "top-right"
  }
];

// 3. FLUJO DE BLOQUEO (SIN CATÁLOGO)
const GUIDE_FLOW_EMPTY: GuideStep[] = [
  {
    targetKey: "nav-item-catalogo", 
    title: "⛔ Catálogo Vacío",
    content: "NO HAY PRODUCTOS EN EL CATÁLOGO. Antes de comprar, debes registrar tus productos en la sección 'Catálogo'.",
    placement: "right", 
    modalPosition: "left",
    disableNext: true 
  }
];

export default function ComprasPage() {
  const [tabs, setTabs] = useState<string[]>(['0']);
  const [activeTab, setActiveTab] = useState('0');

  // === ESTADO DE LA GUÍA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  
  // === ESTADOS DE VALIDACIÓN ===
  const [isInventoryEmpty, setIsInventoryEmpty] = useState(false);
  const [hasPurchases, setHasPurchases] = useState(false);

  // Control de modal de productos
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
    : 0;

  // --- FUNCIÓN UNIFICADA PARA INICIAR GUÍA ---
  const startGuide = (flow: 'REGISTER' | 'RETURNS' | 'EMPTY') => {
    
    // BLOQUEO: Si el catálogo está vacío
    if (isInventoryEmpty) {
        setCurrentSteps(GUIDE_FLOW_EMPTY);
        setGuideActive(true);
        setCurrentStepIndex(0);
        setShowGuideMenu(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        return;
    }

    let steps = GUIDE_FLOW_REGISTER;
    if (flow === 'RETURNS') steps = GUIDE_FLOW_RETURNS;
    if (flow === 'EMPTY') steps = GUIDE_FLOW_EMPTY;

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

  // --- LÓGICA DE VERIFICACIÓN (Catálogo y Compras) ---
  const checkSystemStatus = async (autoStartGuide: boolean = false) => {
    try {
      // 1. Verificar Catálogo (Inventario)
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
      const emptyCatalog = products.length === 0;
      setIsInventoryEmpty(emptyCatalog);

      // 2. Verificar Historial de Compras
      let purchasesExist = false;
      try {
          const paramsCompras = new URLSearchParams({
            sucursalId: sucursalIdSession.toString(),
            limit: "1" 
          });
          const resCompras = await axios.get(
            `${apiUrl}/compra?${paramsCompras.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          purchasesExist = Array.isArray(resCompras.data) && resCompras.data.length > 0;
          setHasPurchases(purchasesExist);
      } catch (err) {
          console.warn("Error verificando historial de compras", err);
          setHasPurchases(false);
      }

      // 3. Decisión de Guía
      if (emptyCatalog) {
          if (autoStartGuide || !localStorage.getItem('hasSeenComprasGuide')) {
             startGuide('EMPTY'); 
          }
      } else {
          if (autoStartGuide) {
             startGuide('REGISTER');
             localStorage.setItem('hasSeenComprasGuide', 'true');
          }
      }
      
    } catch (error) {
      console.warn("Error crítico de validación", error);
      setIsInventoryEmpty(true);
      startGuide('EMPTY');
      toast.warning("Error de conexión o catálogo vacío.");
    }
  };

  // --- AUTO-START ---
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenComprasGuide');
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

  // --- HANDLER BOTÓN HISTORIAL (CLIC AUTOMÁTICO EN EL MODAL REAL) ---
  const handleOpenHistory = () => {
    if (!hasPurchases) {
        toast.warning("No hay historial de compras registrado.", {
            description: "Realiza una compra primero para ver el historial."
        });
        return; 
    }

    // Buscamos el panel de la pestaña que está activa en este momento
    const activeTabElement = document.querySelector('[role="tabpanel"][data-state="active"]');

    if (activeTabElement) {
        // Buscamos el botón real de "Buscar compras" dentro de ese formulario y le hacemos clic
        const searchBtn = Array.from(activeTabElement.querySelectorAll('button')).find(
            (btn) => btn.textContent?.includes('Buscar compras') || btn.textContent?.includes('Buscar compra')
        );

        if (searchBtn) {
            (searchBtn as HTMLButtonElement).click();
            return; // ¡Éxito! Se abre la ventana
        }
    }

    // Mensaje de respaldo por si no encuentra el botón
    toast.info("Haz clic en el botón 'Buscar compras' a la derecha de la pantalla.");
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
  }, [hasPurchases]); // Depende de hasPurchases para que el F4 también se bloquee si no hay compras

  // --- HANDLER MENÚ GUÍA ---
  const handleManualGuideClick = (flow: 'REGISTER' | 'RETURNS') => {
      startGuide(flow);
  };

  // CALLBACK: Detectar apertura del modal de búsqueda para avanzar guía
  const handleSearchModalOpened = () => {
    if (!guideActive) return;
    const currentStep = currentSteps[currentStepIndex];
    if (currentStep?.targetKey === "btn-buscar-compras") {
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
      
      {/* GUÍA */}
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
            <h1 className="text-2xl font-bold text-orange-600">Compras</h1>
            
            <div className="flex gap-2">
                 {/* BOTÓN HISTORIAL CON VALIDACIÓN Y ATAJO F4 */}
                <Button 
                    variant="outline" 
                    onClick={handleOpenHistory}
                    disabled={!hasPurchases} 
                    className={!hasPurchases ? "opacity-50 cursor-not-allowed" : ""}
                    data-guide="btn-buscar-compras" 
                >
                    <History className="w-4 h-4 mr-2" /> 
                    Historial / Devoluciones (F4)
                </Button>

                <Button onClick={agregarTab} className="bg-orange-500 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Nueva compra
                </Button>
            </div>
        </div>

        {/* BARRA DE HERRAMIENTAS */}
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
                        <button onClick={() => handleManualGuideClick('REGISTER')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        ➕ Registrar Compra
                        </button>
                        
                        {/* Botón Devolución Bloqueado si no hay compras */}
                        <button 
                            onClick={() => !hasPurchases ? toast.warning('No hay historial') : handleManualGuideClick('RETURNS')} 
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${!hasPurchases ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
                        >
                        🔄 Devolución de Compra
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
                        <button onClick={() => window.open('https://www.youtube.com/watch?v=nd9silhIRdM&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=10', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Realizar Compra
                        </button>
                        <button onClick={() => window.open('https://www.youtube.com/watch?v=7-JflGQ657Y&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=15', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t">
                        <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Devolución Compra
                        </button>
                    </div>
                    </div>
                )}
            </div>

        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 overflow-x-auto">
          {tabs.map((t, idx) => (
            <TabsTrigger key={t} value={t} className="flex items-center gap-1">
              <span>Compra {idx + 1}</span>
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
        {tabs.map((t) => (
          <TabsContent key={t} value={t} forceMount className={activeTab === t ? "" : "hidden"}>
            <CompraForm 
                isActive={activeTab === t} 
                onSearchOpen={handleSearchModalOpened}
                onProductModalChange={setIsProductModalOpen}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}