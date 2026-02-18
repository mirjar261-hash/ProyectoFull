'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BookOpen, Settings, CreditCard, ShieldCheck } from 'lucide-react'; 

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Extendemos la interfaz para controlar el cambio de pestaña
interface GuideStepWithTab extends GuideStep {
  requiredTab?: 'general' | 'recargas' | 'permisos';
}

// === DEFINICIÓN DE LOS PASOS DE LA GUÍA ===
const GUIDE_STEPS: GuideStepWithTab[] = [
  {
    targetKey: "tabs-list",
    title: "1. Menú de Configuración",
    content: "Aquí encontrarás las diferentes secciones para configurar el comportamiento de tu sucursal.",
    placement: "bottom",
    modalPosition: "bottom-center"
  },
  // --- SECCIÓN GENERAL ---
  {
    targetKey: "input-correo",
    title: "2. Correo de Notificación",
    content: "Ingresa el correo electrónico donde deseas recibir alertas del sistema (ej. cortes de caja, inventario bajo).",
    placement: "bottom",
    modalPosition: "bottom-left",
    requiredTab: 'general'
  },
  {
    targetKey: "btn-save-general",
    title: "3. Guardar Cambios",
    content: "No olvides guardar los cambios realizados en esta sección antes de cambiar de pestaña.",
    placement: "top",
    modalPosition: "top-left",
    requiredTab: 'general'
  },
  // --- SECCIÓN RECARGAS ---
  {
    targetKey: "tab-recargas",
    title: "4. Módulo de Recargas",
    content: "Haz clic aquí para configurar la conexión con el proveedor de recargas electrónicas (Taecel).",
    placement: "bottom",
    modalPosition: "bottom-center",
    requiredTab: 'recargas'
  },
  {
    targetKey: "form-recargas",
    title: "5. Credenciales Taecel",
    content: "Ingresa tu 'Key' y 'NIP' proporcionados por Taecel, así como la comisión que deseas cobrar por cada recarga.",
    placement: "top",
    modalPosition: "top-right",
    requiredTab: 'recargas'
  },
  // --- SECCIÓN PERMISOS ---
  {
    targetKey: "tab-permisos",
    title: "6. Permisos de Sucursal",
    content: "En esta pestaña puedes definir reglas operativas críticas.",
    placement: "bottom",
    modalPosition: "bottom-right",
    requiredTab: 'permisos'
  },
  {
    targetKey: "check-inventario",
    title: "7. Inventario Negativo",
    content: "Si activas esta casilla, el sistema permitirá vender productos aunque no tengas existencias registradas (el stock bajará a números rojos: -1, -2...).",
    placement: "bottom",
    modalPosition: "bottom-left",
    requiredTab: 'permisos'
  }
];

export default function ConfiguracionPage() {
  const [correo, setCorreo] = useState('');
  const [taecelForm, setTaecelForm] = useState({
    comision_por_recarga: '',
    keyTaecel: '',
    nipTaecel: '',
  });
  const [inventarioNegativo, setInventarioNegativo] = useState(false);

  // Estado para las Tabs (Controlado)
  const [activeTab, setActiveTab] = useState<string>('general');

  // Estados de la Guía
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalId = typeof window !== 'undefined' ? localStorage.getItem('sucursalId') : null;

  // Cargar correo
  const cargarCorreo = async () => {
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCorreo(res.data.correo_notificacion || '');
      setInventarioNegativo(res.data.inventario_negativo === 1 || res.data.inventario_negativo === true);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la configuración');
    }
  };

  // Cargar Taecel
  const cargarTaecel = async () => {
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalId}/taecel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTaecelForm({
        comision_por_recarga: res.data.comision_por_recarga ?? '',
        keyTaecel: res.data.keyTaecel ?? '',
        nipTaecel: res.data.nipTaecel ?? '',
      });
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los datos de Taecel');
    }
  };

  // Guardar correo
  const guardarCorreo = async () => {
    try {
      await axios.put(
        `${apiUrl}/sucursales/${sucursalId}`,
        { correo_notificacion: correo, inventario_negativo: inventarioNegativo ? 1 : 0  },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success('Correo actualizado con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la configuración');
    }
  };

  // Guardar permisos
  const guardarPermisos = async () => {
    try {
      await axios.put(
        `${apiUrl}/sucursales/${sucursalId}`,
        { inventario_negativo: inventarioNegativo },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success('Permisos actualizados con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar permisos');
    }
  };

  // Guardar Taecel
  const guardarTaecel = async () => {
    try {
      await axios.put(
        `${apiUrl}/sucursales/${sucursalId}/taecel`,
        taecelForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      toast.success('Datos de Taecel actualizados con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar datos de Taecel. Verifica los datos o intenta más tarde.');
    }
  };

  useEffect(() => {
    if (token && sucursalId) {
      cargarCorreo();
      cargarTaecel();
    }
  }, []);

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = () => {
    setGuideActive(true);
    setCurrentStepIndex(0);
    setActiveTab('general'); // Resetear a la primera tab
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenConfiguracionGuide';
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => {
        startGuide();
        localStorage.setItem(key, 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeGuide = () => setGuideActive(false);

  const handleNextStep = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      const nextStep = GUIDE_STEPS[currentStepIndex + 1];
      
      // Cambio automático de pestaña
      if (nextStep.requiredTab && nextStep.requiredTab !== activeTab) {
        setActiveTab(nextStep.requiredTab);
      }
      
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      toast.success("¡Configuración revisada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevStep = GUIDE_STEPS[currentStepIndex - 1];
      
      if (prevStep.requiredTab && prevStep.requiredTab !== activeTab) {
        setActiveTab(prevStep.requiredTab);
      }
      
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="max-w-md mx-auto relative p-4">
      
      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && (
        <>
          <GuideArrowOverlay 
            activeKey={GUIDE_STEPS[currentStepIndex].targetKey} 
            placement={GUIDE_STEPS[currentStepIndex].placement}
          />
          <GuideModal 
            isOpen={guideActive}
            step={GUIDE_STEPS[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={GUIDE_STEPS.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      {/* TITULO */}
      <h1 className="text-2xl font-bold mb-2">Ajustes</h1>

      {/* BOTON GUIA (Debajo del título) */}
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={startGuide}>
          <BookOpen className="w-4 h-4 mr-2" /> Guía
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4" data-guide="tabs-list">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Config
          </TabsTrigger>
          <TabsTrigger value="recargas" className="flex items-center gap-2" data-guide="tab-recargas">
            <CreditCard className="w-4 h-4" /> Recargas
          </TabsTrigger>
          <TabsTrigger value="permisos" className="flex items-center gap-2" data-guide="tab-permisos">
            <ShieldCheck className="w-4 h-4" /> Permisos
          </TabsTrigger>
        </TabsList>

        {/* Pestaña Configuración */}
        <TabsContent value="general">
          <div className="bg-white p-6 shadow rounded space-y-4 border">
            <h2 className="text-xl font-bold text-orange-600">Configuración General</h2>
            <div data-guide="input-correo">
                <label className="text-sm font-medium">Correo de notificación</label>
                <Input
                type="email"
                placeholder="ejemplo@empresa.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                />
            </div>
            <Button 
                className="w-full bg-orange-500 text-white hover:bg-orange-600" 
                onClick={guardarCorreo}
                data-guide="btn-save-general"
            >
              Guardar cambios
            </Button>
          </div>
        </TabsContent>

        {/* Pestaña Recargas */}
        <TabsContent value="recargas">
          <div className="bg-white p-6 shadow rounded space-y-4 border" data-guide="form-recargas">
            <h2 className="text-xl font-bold text-orange-600">Datos Recargas (Taecel)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Comisión ($)</label>
                <Input
                  placeholder="0.00"
                  value={taecelForm.comision_por_recarga}
                  onChange={(e) => setTaecelForm({ ...taecelForm, comision_por_recarga: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">NIP Taecel</label>
                <Input
                  placeholder="****"
                  type="password"
                  value={taecelForm.nipTaecel}
                  onChange={(e) => setTaecelForm({ ...taecelForm, nipTaecel: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Key Taecel</label>
                <Input
                  placeholder="Clave de API"
                  value={taecelForm.keyTaecel}
                  onChange={(e) => setTaecelForm({ ...taecelForm, keyTaecel: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={guardarTaecel} className="bg-orange-500 text-white hover:bg-orange-600 w-full">
              Guardar Configuración Taecel
            </Button>
          </div>
        </TabsContent>

        {/* Pestaña Permisos */}
        <TabsContent value="permisos">
          <div className="bg-white p-6 shadow rounded space-y-4 border">
            <h2 className="text-xl font-bold text-orange-600">Permisos Operativos</h2>
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50" data-guide="check-inventario">
              <Checkbox
                id="inv-neg"
                checked={inventarioNegativo}
                onCheckedChange={(checked) => setInventarioNegativo(checked as boolean)}
                style={{ accentColor: '#ea580c' }}
              />
              <label htmlFor="inv-neg" className="flex flex-col cursor-pointer">
                <span className="font-semibold text-sm">Permitir inventario negativo</span>
                <span className="text-xs text-gray-500">Vender productos sin existencias suficientes</span>
              </label>
            </div>
            <Button
              onClick={guardarPermisos}
              className="bg-orange-500 text-white hover:bg-orange-600 w-full"
            >
              Actualizar Permisos
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}