'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConstructionIcon, Loader2, Pencil, Trash2, BookOpen, ChevronDown, PlayCircle } from 'lucide-react';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

// === 1. GUÍA DE REGISTRO COMPLETO (FLUJO UNIFICADO) ===
const GUIDE_FLOW_REGISTER: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Gestión de Clientes",
    content: "Este es el módulo maestro de clientes. Vamos a realizar el proceso completo de alta.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "block-info-contacto",
    title: "2. Datos Generales",
    content: "Primero, captura la información básica de contacto. Recuerda que la Razón Social y el Teléfono son obligatorios.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "rubro-credito-section",
    title: "3. Crédito y Precios",
    content: "Define aquí las condiciones comerciales: Rubro, Límite de Crédito y Días de plazo.",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "tab-trigger-facturacion",
    title: "4. Siguiente Paso: Facturación",
    content: "Para continuar, haz clic en la pestaña 'Datos de Facturación' para capturar la información fiscal.",
    placement: "bottom",
    modalPosition: "bottom-left",
    disableNext: true // Obliga al usuario a cambiar de pestaña manualmente
  },
  // --- A PARTIR DE AQUÍ ESTAMOS EN LA PESTAÑA DE FACTURACIÓN ---
  {
    targetKey: "block-datos-fiscales",
    title: "5. Datos Fiscales",
    content: "Ingresa el RFC, CURP y Régimen Fiscal necesarios para la facturación 4.0.",
    placement: "left",
    modalPosition: "left"
  },
  {
    targetKey: "block-domicilio-fiscal",
    title: "6. Domicilio Fiscal",
    content: "Completa la dirección fiscal. Es vital que el Código Postal coincida con la constancia de situación fiscal.",
    placement: "left",
    modalPosition: "left"
  },
  {
    targetKey: "btn-save-cliente",
    title: "7. Finalizar Registro",
    content: "Una vez capturados todos los datos (Generales y Facturación), haz clic en 'Registrar' para guardar.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// === 2. GUÍA DE ACTUALIZACIÓN (MODIFICADA PARA INCLUIR FISCAL) ===
const GUIDE_FLOW_UPDATE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar Cliente",
    content: "Usa el buscador para localizar al cliente que deseas modificar.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-edit-item",
    title: "2. Editar (Acción Requerida)",
    content: "Haz clic en el botón del lápiz. La información se cargará en el formulario superior.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  },
  {
    targetKey: "block-info-contacto",
    title: "3. Modificar Datos Generales",
    content: "Aquí puedes editar teléfono, correo o condiciones de crédito.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "tab-trigger-facturacion",
    title: "4. Modificar Datos Fiscales",
    content: "Si necesitas actualizar el RFC o Domicilio Fiscal, cambia a esta pestaña antes de guardar.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-save-cliente",
    title: "5. Guardar Cambios",
    content: "Haz clic en 'Actualizar' para guardar las modificaciones realizadas en cualquiera de las pestañas.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// === 3. GUÍA DE ELIMINACIÓN ===
const GUIDE_FLOW_DELETE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar",
    content: "Localiza al cliente que deseas dar de baja.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-delete-item",
    title: "2. Desactivar",
    content: "Haz clic en el icono de basura. El sistema pedirá confirmación antes de desactivarlo.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  }
];

interface Cliente {
  id: number;
  razon_social: string;
  telefono: string;
  movil: string;
  nom_contacto: string;
  email: string;
  razon_social_facturacion: string;
  rfc_facturacion: string;
  curp_facturacion: string;
  domicilio_facturacion: string;
  no_ext_facturacion: string;
  no_int_facturacion: string;
  cp_facturacion: string;
  colonia_facturacion: string;
  ciudad_facturacion: string;
  localidad_facturacion: string;
  estado_facturacion: string;
  pais_facturacion: string;
  regimen_fiscal: string;
  sucursalId: number;
  limite_credito: number;
  dias_credito: number;
  tipo_precio: number;
}

type RegimenDTO = {
  clave: string;
  descripcion: string;
  aplica_fisica: boolean;
  aplica_moral: boolean;
};

export default function ClienteFormPage() {
  const [form, setForm] = useState<Partial<Cliente>>({
    tipo_precio: 1
  });
  const [regimenes, setRegimenes] = useState<RegimenDTO[]>([]);
  const [loadingRegimenes, setLoadingRegimenes] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tabValue, setTabValue] = useState('datos-generales');

  // === ESTADO DE GUÍAS ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);

  // Iniciar guía específica
  const startGuide = (flow: 'REGISTER' | 'UPDATE' | 'DELETE') => {
    let steps = GUIDE_FLOW_REGISTER;
    
    if (flow === 'REGISTER' || flow === 'UPDATE') {
        setTabValue('datos-generales');
    }
    
    if (flow === 'UPDATE') steps = GUIDE_FLOW_UPDATE;
    if (flow === 'DELETE') steps = GUIDE_FLOW_DELETE;

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
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // === EFECTO: DETECTAR CAMBIO DE TAB ===
  useEffect(() => {
    if(guideActive && currentSteps === GUIDE_FLOW_REGISTER && currentStepIndex === 3 && tabValue === 'facturacion') {
         setTimeout(() => {
             handleNextStep();
         }, 300);
    }
  }, [tabValue, guideActive, currentSteps, currentStepIndex]);

  // Auto-inicio
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenClientesGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('REGISTER');
        localStorage.setItem('hasSeenClientesGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const tipoPrecioValue = form.tipo_precio == null ? '' : String(form.tipo_precio);

  const obtenerRegimenes = async () => {
    try {
      setLoadingRegimenes(true);
      const res = await axios.get(`${apiUrl}/facturacion/regimen-fiscal/cli`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRegimenes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar régimen fiscal');
      setRegimenes([]);
    } finally {
      setLoadingRegimenes(false);
    }
  };

  const guardarCliente = async () => {
    if (!form.razon_social || !form.telefono) {
      toast.error('Nombre comercial y Teléfono son obligatorios');
      return;
    }

    if (form.limite_credito !== undefined && form.limite_credito < 0) {
      toast.error('El límite de crédito no puede ser negativo');
      return;
    }
    if (form.dias_credito !== undefined && form.dias_credito < 0) {
      toast.error('Los días de crédito no pueden ser negativos');
      return;
    }

    const telefonoValido = /^\d{10}$/.test(form.telefono);
    if (!telefonoValido) {
      toast.error('Teléfono debe ser solo números o tener 10 dígitos');
      return;
    }

    const Vmovil = form.movil?.trim();
    if (Vmovil) {
      const movilValido = /^\d{10}$/.test(Vmovil);
      if (!movilValido) {
        toast.error('Movil debe ser solo números o tener 10 dígitos');
        return;
      }
    }

    const nombrecontacto = form.nom_contacto?.trim();
    if (nombrecontacto && nombrecontacto !== "") {
      const nombrecontactoValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.nom_contacto!);
      if (!nombrecontactoValido) {
        toast.error('Nombre de contacto solo permite letras');
        return;
      }
    }

    const Vemail = form.email?.trim();
    if (Vemail) {
      const emailValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(Vemail);
      if (!emailValido) {
        toast.error('Correo no valido');
        return;
      }
    }
    
    const curp = form.curp_facturacion?.trim();
    if (curp) {
      const curpValida = /^[A-Z]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](?:AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/.test(curp);
      if (!curpValida) { toast.error('CURP no válida'); return; }
    }

    const rfc = form.rfc_facturacion?.trim();
    if (rfc) {
      const rfcValido = /^([A-ZÑ&]{3,4})\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/.test(rfc);
      if (!rfcValido) { toast.error('RFC no válido'); return; }
    }

    const Vcp = form.cp_facturacion?.trim();
    if (Vcp) {
      const cpValido = /^\d{5}$/.test(Vcp);
      if (!cpValido) { toast.error('Código postal no válido (debe ser de 5 dígitos)'); return; }
    }

    const payload = { ...form, sucursalId: sucursalIdSession, activo: 1 };
    setLoading(true);

    try {
      if (editandoId) {
        await axios.put(`${apiUrl}/cliente/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cliente actualizado');
      } else {
        await axios.post(`${apiUrl}/cliente`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Cliente creado');
      }
      setForm({ tipo_precio: 1 });
      setEditandoId(null);
      setTabValue('datos-generales');
      obtenerClientes();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const obtenerClientes = async () => {
    try {
      const res = await axios.get(`${apiUrl}/cliente?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientes(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar clientes');
    }
  };

  const desactivarCliente = async (id: number) => {
    if (guideActive && currentSteps === GUIDE_FLOW_DELETE) {
         if (!confirm('¿Deseas desactivar este cliente? (Esta acción es real, si solo estás probando, cancela)')) return;
    } else {
         if (!confirm('¿Deseas desactivar este cliente?')) return;
    }

    await axios.delete(`${apiUrl}/cliente/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success('Cliente desactivado');
    obtenerClientes();
    
    if(guideActive && currentSteps === GUIDE_FLOW_DELETE) {
        closeGuide();
        toast.success("¡Guía completada!");
    }
  };

  const editarCliente = (cli: Cliente) => {
    setForm({ ...cli });
    setEditandoId(cli.id);
    setTabValue('datos-generales');
    
    if (guideActive && currentSteps === GUIDE_FLOW_UPDATE && currentStepIndex === 1) {
        setTimeout(handleNextStep, 300);
    }
  };

  const limpiarFormulario = () => {
    setForm({ tipo_precio: 1 });
    setEditandoId(null);
  };

  useEffect(() => {
    obtenerClientes();
    obtenerRegimenes();
  }, []);

  useEffect(() => {
    if (tabValue === 'facturacion' && regimenes.length === 0 && !loadingRegimenes) {
      obtenerRegimenes();
    }
  }, [tabValue]);

  const clientesFiltrados = clientes.filter(c =>
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.toLowerCase().includes(busqueda.toLowerCase())
  );

  const parseDecimalNonNeg = (v: string): number | undefined => {
    if (v == null || v.trim() === '') return undefined;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0, n) : undefined;
  };

  const parseIntNonNeg = (v: string): number | undefined => {
    if (v == null || v.trim() === '') return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
  };

  const blockInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  };
  const blockInvalidKeysInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) e.preventDefault();
  };
  const preventWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();
  
  const handlePasteDecimalPositive = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData('text');
    const cleaned = raw.replace(/[+-]/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    if (cleaned !== raw) e.preventDefault();
    const n = Number(cleaned);
    const safe = Number.isFinite(n) ? Math.max(0, n) : undefined;
    setForm(prev => ({ ...prev, limite_credito: safe }));
  };

  const handlePasteIntPositive = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData('text');
    const cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned !== raw) e.preventDefault();
    const n = cleaned === '' ? undefined : Math.max(0, Math.floor(Number(cleaned)));
    setForm(prev => ({ ...prev, dias_credito: n }));
  };

  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-orange-600" data-guide="page-title">
        {editandoId ? 'Editar Cliente' : 'Nuevo Cliente'}
      </h1>

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

      {/* MENÚ DE AYUDA (MOVIDO AQUÍ, DEBAJO DEL TÍTULO) */}
      <div className="mb-4 relative inline-block text-left">
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
            <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="py-1">
                <button onClick={() => startGuide('REGISTER')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                 ➕ Registro Completo
                </button>
                <button onClick={() => startGuide('UPDATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                 ✏️ Actualizar Cliente
                </button>
                <button onClick={() => startGuide('DELETE')} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t">
                 🗑️ Eliminar Cliente
                </button>
            </div>
            </div>
        )}
      </div>

      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <div data-guide="tabs-list">
            <TabsList className="mb-4">
                <TabsTrigger value="datos-generales">Datos Generales</TabsTrigger>
                <TabsTrigger value="facturacion" data-guide="tab-trigger-facturacion">Datos de Facturación</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="datos-generales">
          <div className="flex flex-col gap-6">
            
            {/* BLOQUE DE INFORMACIÓN DE CONTACTO */}
            <div className="border rounded-lg p-4 bg-slate-50/50" data-guide="block-info-contacto">
                <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Información de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div data-guide="razon-social-input">
                        <label className="text-sm font-medium">Nombre comercial:*</label>
                        <Input value={form.razon_social || ''} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
                    </div>
                    <div data-guide="telefono-input">
                        <label className="text-sm font-medium">Teléfono:*</label>
                        <Input 
                            value={form.telefono || ''} maxLength={10} inputMode="numeric" 
                            onKeyDown={(e) => {
                                const invalid = ['-', '+', 'e', 'E', '.', ','];
                                if (invalid.includes(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Móvil</label>
                        <Input 
                            value={form.movil || ''} maxLength={10} inputMode="numeric"
                            onKeyDown={(e) => {
                                const invalid = ['-', '+', 'e', 'E', '.', ','];
                                if (invalid.includes(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => setForm({ ...form, movil: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                    </div>
                    <div><label className="text-sm font-medium">Contacto</label><Input value={form.nom_contacto || ''} onChange={(e) => setForm({ ...form, nom_contacto: e.target.value })} /></div>
                    <div className="col-span-2"><label className="text-sm font-medium">Email</label><Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
            </div>

            {/* BLOQUE DE CRÉDITO Y PRECIOS */}
            <div className="border rounded-lg p-4 bg-slate-50/50 relative" data-guide="rubro-credito-section">
                <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider absolute -top-3 bg-white px-2 left-2">Crédito y Precios</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Límite de crédito</label>
                        <Input
                            value={form.limite_credito ?? ''} type="number" inputMode="decimal" min={0}
                            onKeyDown={blockInvalidKeys} onWheel={preventWheel} onPaste={handlePasteDecimalPositive}
                            onChange={(e) => setForm({ ...form, limite_credito: parseDecimalNonNeg(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Días de crédito</label>
                        <Input
                            value={form.dias_credito ?? ''} type="number" inputMode="numeric" min={0}
                            onKeyDown={blockInvalidKeysInt} onWheel={preventWheel} onPaste={handlePasteIntPositive}
                            onChange={(e) => setForm({ ...form, dias_credito: parseIntNonNeg(e.target.value) })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-sm font-medium">Tipo de precio</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm"
                            value={tipoPrecioValue} 
                            onChange={(e) => setForm({ ...form, tipo_precio: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                        >
                            <option value="1">Precio público</option>
                            <option value="2">Precio con descuento</option>
                            <option value="3">Precio semi mayoreo</option>
                            <option value="4">Precio mayoreo</option>
                        </select>
                    </div>
                </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="facturacion">
          <div className="flex flex-col gap-6">
            
            {/* BLOQUE DATOS FISCALES */}
            <div className="border rounded-lg p-4 bg-slate-50/50 relative" data-guide="block-datos-fiscales">
                 <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider absolute -top-3 bg-white px-2 left-2">Datos Fiscales</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium">Razón social (Facturación)</label><Input value={form.razon_social_facturacion || ''} onChange={(e) => setForm({ ...form, razon_social_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">RFC</label><Input value={form.rfc_facturacion || ''} onChange={(e) => setForm({ ...form, rfc_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">CURP</label><Input value={form.curp_facturacion || ''} onChange={(e) => setForm({ ...form, curp_facturacion: e.target.value })} /></div>
                    <div>
                    <label className="text-sm font-medium">Régimen fiscal</label>
                    <select
                        onFocus={() => (regimenes.length === 0 && !loadingRegimenes) && obtenerRegimenes()}
                        value={form.regimen_fiscal || ''}
                        onChange={(e) => setForm({ ...form, regimen_fiscal: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                        disabled={loadingRegimenes}
                    >
                        <option value="">{loadingRegimenes ? 'Cargando...' : 'Selecciona un régimen'}</option>
                        {regimenes.map((reg) => (
                        <option key={reg.clave} value={reg.clave}>
                            {reg.clave} - {reg.descripcion}
                        </option>
                        ))}
                    </select>
                    </div>
                 </div>
            </div>

             {/* BLOQUE DOMICILIO */}
             <div className="border rounded-lg p-4 bg-slate-50/50 relative" data-guide="block-domicilio-fiscal">
                 <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider absolute -top-3 bg-white px-2 left-2">Domicilio Fiscal</h3>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3"><label className="text-sm font-medium">Calle / Domicilio</label><Input value={form.domicilio_facturacion || ''} onChange={(e) => setForm({ ...form, domicilio_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">No. Exterior</label><Input value={form.no_ext_facturacion || ''} onChange={(e) => setForm({ ...form, no_ext_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">No. Interior</label><Input value={form.no_int_facturacion || ''} onChange={(e) => setForm({ ...form, no_int_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">C.P.</label><Input value={form.cp_facturacion || ''} onChange={(e) => setForm({ ...form, cp_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Colonia</label><Input value={form.colonia_facturacion || ''} onChange={(e) => setForm({ ...form, colonia_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Ciudad</label><Input value={form.ciudad_facturacion || ''} onChange={(e) => setForm({ ...form, ciudad_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Localidad</label><Input value={form.localidad_facturacion || ''} onChange={(e) => setForm({ ...form, localidad_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">Estado</label><Input value={form.estado_facturacion || ''} onChange={(e) => setForm({ ...form, estado_facturacion: e.target.value })} /></div>
                    <div><label className="text-sm font-medium">País</label><Input value={form.pais_facturacion || ''} onChange={(e) => setForm({ ...form, pais_facturacion: e.target.value })} /></div>
                 </div>
             </div>
          </div>
        </TabsContent>

      </Tabs>

      <div className="flex justify-between items-center gap-4 mt-6" data-guide="action-buttons">
        <Button onClick={limpiarFormulario} variant="outline" className="text-orange-600 border-orange-500 hover:bg-orange-100 w-full">
          Limpiar
        </Button>

        <Button onClick={guardarCliente} disabled={loading} className="bg-orange-500 text-white hover:bg-orange-600 w-full" data-guide="btn-save-cliente">
          {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : (editandoId ? 'Actualizar Cliente' : 'Registrar Cliente')}
        </Button>
      </div>

      <hr className="my-6" />
      <h2 className="text-xl font-semibold">Lista de clientes</h2>

      <div data-guide="search-input">
        <Input placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-1/3 mb-4" />
      </div>

      <div className="overflow-auto rounded border bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2 text-left">Razón social</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Contacto</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cli, index) => (
              <tr key={cli.id} className="border-t hover:bg-orange-50">
                <td className="p-2">{cli.razon_social}</td>
                <td className="p-2">{cli.telefono}</td>
                <td className="p-2">{cli.nom_contacto}</td>
                <td className="p-2">{cli.email}</td>
                <td 
                    className="p-2 text-right space-x-2"
                    data-guide={index === 0 ? "table-actions" : undefined}
                >
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => editarCliente(cli)}
                    data-guide={index === 0 ? "btn-edit-item" : undefined}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => desactivarCliente(cli.id)}
                    data-guide={index === 0 ? "btn-delete-item" : undefined}
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}