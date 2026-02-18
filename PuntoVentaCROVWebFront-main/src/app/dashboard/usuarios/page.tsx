'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, UserPlus, Loader2, ShieldCheck, FastForward, Rewind, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getUserPermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

// === DEFINICIÓN DE LOS 4 FLUJOS DE GUÍA ===

const GUIDE_FLOW_REGISTER: GuideStep[] = [
  {
    targetKey: "btn-add-user",
    title: "1. Nuevo Registro",
    content: "Para registrar un usuario, inicia haciendo clic aquí. La guía continuará dentro de la ventana.",
    placement: "left",
    modalPosition: "bottom-left",
    disableNext: true 
  },
  // --- Pasos dentro del Modal ---
  {
    targetKey: "input-nombre",
    title: "2. Datos Personales",
    content: "Ingresa el nombre y apellidos del colaborador.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-correo",
    title: "3. Acceso al Sistema",
    content: "El correo electrónico funcionará como su usuario para iniciar sesión.",
    placement: "right",
    modalPosition: "right"
  },
  // --- NUEVO PASO AGREGADO ---
  {
    targetKey: "input-telefono",
    title: "4. Contacto",
    content: "Ingresa el número de teléfono celular a 10 dígitos.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "select-perfil",
    title: "5. Definir Rol",
    content: "Selecciona el nivel de autoridad (Administrador, Gerencia o Caja).",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-password",
    title: "6. Seguridad",
    content: "Crea una contraseña segura para este usuario.",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "btn-save-user",
    title: "7. Finalizar",
    content: "Guarda los cambios para que el usuario pueda ingresar inmediatamente.",
    placement: "top",
    modalPosition: "top-left"
  }
];

const GUIDE_FLOW_UPDATE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar Usuario",
    content: "Primero, localiza al usuario que deseas modificar usando este buscador.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-edit-user", // Apunta al primer lápiz
    title: "2. Editar",
    content: "Haz clic en el botón de lápiz (✏️) correspondiente al usuario. Se abrirá la ventana con sus datos cargados.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  },
  {
    targetKey: "input-nombre",
    title: "3. Modificar Datos",
    content: "Puedes corregir nombres, teléfonos o cambiar el perfil. El correo suele ser fijo.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-save-user",
    title: "4. Guardar Cambios",
    content: "Haz clic en 'Actualizar' para confirmar las modificaciones.",
    placement: "top",
    modalPosition: "top-left"
  }
];

const GUIDE_FLOW_PERMISSIONS: GuideStep[] = [
  {
    targetKey: "btn-permissions-user", // Apunta al primer escudo
    title: "1. Configurar Permisos",
    content: "Para un control detallado, haz clic en el escudo (🛡️). Esto abrirá el panel avanzado de permisos.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true
  },
  {
    targetKey: "list-available",
    title: "2. Permisos Disponibles",
    content: "A la izquierda verás la lista de funciones que el usuario AÚN NO TIENE. Selecciona las que quieras otorgar.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "permissions-actions",
    title: "3. Asignar / Quitar",
    content: "Usa las flechas centrales para mover permisos de una lista a la otra (Asignar >> o << Quitar).",
    placement: "bottom",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "list-assigned",
    title: "4. Permisos Asignados",
    content: "A la derecha están los permisos que el usuario YA TIENE activos.",
    placement: "left",
    modalPosition: "left"
  }
];

const GUIDE_FLOW_DELETE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar",
    content: "Localiza al usuario que ya no labora o que deseas bloquear.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-delete-user", // Apunta al primer basurero
    title: "2. Desactivar",
    content: "Haz clic en el icono de basura (🗑️). El sistema pedirá confirmación antes de quitarle el acceso. Puedes pulsar 'Finalizar' para cerrar la guía sin borrar.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: false 
  }
];

interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  perfil: string;
  sucursalId: number;
}
interface Permiso {
  id: number;
  nombre: string;
}


const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// --- Helpers de validación ---
const onlyDigits = (s: string) => s.replace(/\D+/g, '');
const clamp10 = (s: string) => s.slice(0, 10);

const isValidEmailFormat = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

const EXACT = new Set(['gmail.com', 'icloud.com', 'proton.me', 'protonmail.com', 'msn.com']);
const PREFIXES = ['outlook.', 'hotmail.', 'live.', 'yahoo.'];

function isAllowedEmailProviderFront(email: string) {
  const e = (email || '').trim().toLowerCase();
  const domain = e.slice(e.lastIndexOf('@') + 1);
  return EXACT.has(domain) || PREFIXES.some(p => domain.startsWith(p));
}

const verificarCorreoReal = async (correo: string, token?: string | null): Promise<boolean> => {
  try {
    const { data } = await axios.get(`${apiUrl}/utils/verify-email`, {
      params: { correo },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (typeof data?.deliverable === 'boolean') return data.deliverable;
  } catch { }
  return isValidEmailFormat(correo);
};

export default function UsuariosPage() {
  // 1. ESTADOS PRINCIPALES (Ordenados al inicio para evitar ReferenceError)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', correo: '', telefono: '', perfil: '', password: '', sucursalId: 0 });
  const [usuarioSesion, setUsuarioSesion] = useState<any>(null);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({
    nombre: false, apellidos: false, correo: false, correoFormato: false, correoProveedor: false, correoNoValido: false, telefono: false, perfil: false, password: false,
  });
  const [loading, setLoading] = useState(false);

  // 2. ESTADOS DE PERMISOS
  const [modalPermisosOpen, setModalPermisosOpen] = useState(false);
  const [usuarioPermisos, setUsuarioPermisos] = useState<Usuario | null>(null);
  const [permisosDisponibles, setPermisosDisponibles] = useState<any[]>([]);
  const [permisosAsignados, setPermisosAsignados] = useState<any[]>([]);
  const [selectedDisponibles, setSelectedDisponibles] = useState<Permiso[]>([]);
  const [selectedAsignados, setSelectedAsignados] = useState<Permiso[]>([]);

  // 3. ESTADOS DE GUÍA INTERACTIVA
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<'REGISTER' | 'UPDATE' | 'PERMISSIONS' | 'DELETE' | null>(null);

  // 4. OTROS HOOKS
  const [permisos, setPermisos] = useState<Record<string, boolean>>({})
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userIdSession = typeof window !== 'undefined' ? parseInt(localStorage.getItem('userId') || '0', 10) : 0;
  const sucursalIdSession = typeof window !== 'undefined' ? parseInt(localStorage.getItem('sucursalId') || '0', 10) : 0;

  // --- LÓGICA DE GUÍA ---
  const startGuide = (flow: 'REGISTER' | 'UPDATE' | 'PERMISSIONS' | 'DELETE') => {
    let steps = GUIDE_FLOW_REGISTER;
    if (flow === 'UPDATE') steps = GUIDE_FLOW_UPDATE;
    if (flow === 'PERMISSIONS') steps = GUIDE_FLOW_PERMISSIONS;
    if (flow === 'DELETE') steps = GUIDE_FLOW_DELETE;

    setCurrentSteps(steps);
    setCurrentFlow(flow);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    
    setTimeout(() => {
        window.dispatchEvent(new Event('resize')); 
    }, 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
    setCurrentFlow(null);
  };

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      closeGuide();
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // === AUTO-AVANCE INTELIGENTE ===
  useEffect(() => {
    if (!guideActive) return;

    // Caso 1: Guía de Registro o Modificación -> Se abre modal principal
    if ((currentFlow === 'REGISTER' || currentFlow === 'UPDATE') && modalOpen) {
       const step = currentSteps[currentStepIndex];
       if (step?.targetKey === 'btn-add-user' || step?.targetKey === 'btn-edit-user') {
          setTimeout(() => handleNextStep(), 400);
       }
    }

    // Caso 2: Guía de Permisos -> Se abre modal permisos
    if (currentFlow === 'PERMISSIONS' && modalPermisosOpen) {
       const step = currentSteps[currentStepIndex];
       if (step?.targetKey === 'btn-permissions-user') {
          setTimeout(() => handleNextStep(), 400);
       }
    }
  }, [modalOpen, modalPermisosOpen, guideActive, currentFlow, currentStepIndex]);

  // Auto-inicio (Registro por defecto)
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenUsuariosGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('REGISTER');
        localStorage.setItem('hasSeenUsuariosGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const errorClass = (...keys: string[]) =>
    keys.some(k => errores?.[k]) ? 'border-red-500 focus-visible:ring-red-200' : '';


  const cargarSesion = async () => {
    const res = await axios.get(`${apiUrl}/auth/perfil`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsuarioSesion(res.data);
  };

  const cargarUsuarios = async () => {
    const res = await axios.get(`${apiUrl}/users/activos`, {
      headers: { Authorization: `Bearer ${token}` },

    });
    setUsuarios(res.data);
  };
  const cargarPermisosUser = async () => {
    const permisosAValidar = [
      'Registro/Registrar_usuarios',
      'Usuarios/agregar_usuario',
      'Usuario/editar_permisos',
      'Usuarios/eliminar_usuario',
      'Usuario/editar_permisos'
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


  useEffect(() => {
    cargarSesion();
    cargarUsuarios();
    cargarPermisosUser();
  }, []);


  const abrirModal = (usuario?: Usuario) => {

    const sucursalId = usuarioSesion?.sucursalId || 0;

    setEditando(usuario || null);
    setForm(usuario ? { ...usuario, password: '' } : {
      nombre: '', apellidos: '', correo: '', telefono: '',
      perfil: '', password: '', sucursalId
    });
    setErrores({});
    setModalOpen(true);
  };

  const verificarCorreoExistente = async (correo: string): Promise<boolean> => {//->
    try {
      const res = await axios.get(`${apiUrl}/users/check-email?correo=${encodeURIComponent(correo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.exists;
    } catch (error) {
      console.error('Error al verificar correo:', error);
      return false;
    }
  };//<-

const guardar = async () => {
  const nuevosErrores: any = {};

  ['nombre', 'apellidos', 'correo', 'perfil'].forEach(campo => {
    if (!form[campo as keyof typeof form]) nuevosErrores[campo] = true;
  });
  if (!editando && !form.password) nuevosErrores.password = true;

  const telClean = onlyDigits(form.telefono || '');
  if (telClean.length !== 10) nuevosErrores.telefono = true;

  if (!isValidEmailFormat(form.correo || '')) nuevosErrores.correoFormato = true;

  if (!isAllowedEmailProviderFront(form.correo || '')) nuevosErrores.correoProveedor = true;

  if (Object.keys(nuevosErrores).length > 0) {
    setErrores(nuevosErrores);
    toast.error('Por favor corrige los campos marcados.');
    return;
  }

  const correoValido = await verificarCorreoReal(form.correo, token);
  if (!correoValido) {
    setErrores((prev) => ({ ...prev, correoNoValido: true }));
    toast.error('El correo no parece válido o no es entregable.');
    return;
  }

  const payload = { ...form, telefono: telClean, sucursalId: sucursalIdSession || 0, activo: 1 };
  setLoading(true);

  try {
    const OtroAdmin = usuarios.some(
      (u) =>
        u.perfil === "Administrador" &&
        u.sucursalId === (sucursalIdSession || 0) &&
        u.id !== (editando?.id ?? 0)
    );

    if (form.perfil === "Administrador" && OtroAdmin) {
      toast.error("Ya existe un administrador en esta sucursal, no se puede asignar otro.");
      setLoading(false);
      return;
    }

    if (editando) {
      await axios.put(`${apiUrl}/users/${editando.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Usuario actualizado con éxito');
    } else {
      const correoExistente = await verificarCorreoExistente(form.correo);
      if (correoExistente) {
        setErrores((prev) => ({ ...prev, correo: true }));
        setLoading(false);
        toast.error('Correo ya se encuentra registrado con un usuario existente.');
        return;
      }

      await axios.post(`${apiUrl}/users/register`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Usuario registrado con éxito');
    }

    setModalOpen(false);
    cargarUsuarios();
  } catch (err) {
    console.error(err);
    toast.error('Ocurrió un error al guardar');
  } finally {
    setLoading(false);
  }
};



  const desactivar = async (id: number) => {
     // --- PROTECCIÓN PARA LA GUÍA ---
     if (guideActive && currentSteps === GUIDE_FLOW_DELETE) {
         toast.info('Modo Guía: Acción simulada. El usuario no fue eliminado.');
         closeGuide(); 
         return;
     }

     const usuario = usuarios.find((u) => u.id === id);
    if (id === userIdSession && usuario?.perfil === 'Administrador') {
      toast.error('No puedes desactivar tu propio usuario');
      return;
    }
    if (!confirm('¿Deseas desactivar este usuario?')) return;
    await axios.delete(`${apiUrl}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    cargarUsuarios();
    toast.success('Usuario desactivado');
  };

  const cargarPermisos = async (userId: number) => {
    try {
      const { data: todos } = await axios.get(`${apiUrl}/permisos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: asignados } = await axios.get(`${apiUrl}/permisos/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const asignadosNormalizados = asignados.map((p: any) => ({
        id: p.id ?? p.permisoId,
        nombre: p.nombre,
      }));
      const asignadosIds = asignadosNormalizados.map((p: Permiso) => p.id);
      setPermisosAsignados(asignadosNormalizados);
      setPermisosDisponibles(todos.filter((p: Permiso) => !asignadosIds.includes(p.id)));
    } catch (err) {
      console.error('Error al cargar permisos:', err);
      toast.error('No se pudieron cargar los permisos');
    }
  };

  const abrirPermisos = async (usuario: Usuario) => {
    setUsuarioPermisos(usuario);
    setSelectedDisponibles([]);
    setSelectedAsignados([]);
    await cargarPermisos(usuario.id);
    setModalPermisosOpen(true);
  };

  const toggleDisponible = (permiso: Permiso) => {
    setSelectedDisponibles((prev) =>
      prev.some((p) => p.id === permiso.id)
        ? prev.filter((p) => p.id !== permiso.id)
        : [...prev, permiso]
    );
  };

  const toggleAsignado = (permiso: Permiso) => {
    setSelectedAsignados((prev) =>
      prev.some((p) => p.id === permiso.id)
        ? prev.filter((p) => p.id !== permiso.id)
        : [...prev, permiso]
    );
  };


  const asignarPermiso = async () => {
    if (selectedDisponibles.length === 0 || !usuarioPermisos) return;
    const permiso = selectedDisponibles[0];
    try {
      await axios.put(
        `${apiUrl}/permisos/${usuarioPermisos.id}`,
        {
          permisos: selectedDisponibles.map((permiso) => ({
            permisoId: permiso.id,
            permitido: true,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPermisosAsignados([...permisosAsignados, ...selectedDisponibles]);
      setPermisosDisponibles(
        permisosDisponibles.filter(
          (p) => !selectedDisponibles.some((s) => s.id === p.id)
        )
      );
      setSelectedDisponibles([]);
    } catch (err) {
      console.error('Error al asignar permiso:', err);
      toast.error('No se pudieron asignar los permisos');
    }
  };

  const quitarPermiso = async () => {
    if (selectedAsignados.length === 0 || !usuarioPermisos) return;
    const permiso = selectedAsignados[0];
    try {
      await axios.put(
        `${apiUrl}/permisos/${usuarioPermisos.id}`,
        {
          permisos: selectedAsignados.map((permiso) => ({
            permisoId: permiso.id,
            permitido: false,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPermisosDisponibles([...permisosDisponibles, ...selectedAsignados]);
      setPermisosAsignados(
        permisosAsignados.filter(
          (p) => !selectedAsignados.some((s) => s.id === p.id)
        )
      );
      setSelectedAsignados([]);
    } catch (err) {
      console.error('Error al quitar permiso:', err);
      toast.error('No se pudieron quitar los permisos');
    }
  };

  const limpiarSeleccion = () => {
    setSelectedDisponibles([]);
    setSelectedAsignados([]);
  };
  //Para no entrar a la pagina por routeo

  useEffect(() => {
    if (permisos['Registro/Registrar_usuarios']) {
      router.push('/dashboard');
      return;
    }
  }, []);

  return (
    <div className="space-y-4 relative">
      
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

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-orange-600" data-guide="page-title">Usuarios</h1>
        
        {/* Action Buttons (Always Visible) */}
        {permisos['Usuarios/agregar_usuario'] && (
            <Button onClick={() => abrirModal()} data-guide="btn-add-user">
              <UserPlus className="mr-2" size={16} />Agregar Usuario
            </Button>
        )}
      </div>
      
      {/* GUIDE BUTTON (MOVED BELOW TITLE) */}
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
                  <button
                  onClick={() => startGuide('REGISTER')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                  ➕ Registro de usuarios
                  </button>
                  <button
                  onClick={() => startGuide('UPDATE')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                  ✏️ Modificar usuarios
                  </button>
                  <button
                  onClick={() => startGuide('PERMISSIONS')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                  🛡️ Permisos de usuarios
                  </button>
                  <button
                  onClick={() => startGuide('DELETE')}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-t"
                  >
                  🗑️ Desactivar usuario
                  </button>
              </div>
              </div>
          )}
      </div>

      <div className="overflow-auto rounded border bg-white">
        <div className="flex justify-end p-2" data-guide="search-input">
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            onChange={(e) => {
              const q = e.target.value.toLowerCase();
              setUsuarios((prev) => prev.filter(u =>
                u.nombre.toLowerCase().includes(q) ||
                u.correo.toLowerCase().includes(q)
              ));
              if (!q) cargarUsuarios();
            }}
            className="border px-3 py-1 text-sm rounded"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-orange-100 sticky top-0">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Correo</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Perfil</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, index) => (
              <tr key={u.id} className="border-t hover:bg-orange-50 sticky top-0" >
                <td className="p-2">{u.nombre} {u.apellidos}</td>
                <td className="p-2">{u.correo}</td>
                <td className="p-2">{u.telefono}</td>
                <td className="p-2">{u.perfil}</td>
                <td 
                    className="p-2 text-right space-x-2"
                    data-guide={index === 0 ? "actions-cell" : undefined} // Solo apunta al primer usuario
                >
                  {permisos['Usuario/editar_permisos'] && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => abrirModal(u)}
                        data-guide={index === 0 ? "btn-edit-user" : undefined} // SOLO 1ER USUARIO
                    >
                      <Pencil size={14} />
                    </Button>

                  )}
                  {permisos['Usuario/editar_permisos'] && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => abrirPermisos(u)}
                        data-guide={index === 0 ? "btn-permissions-user" : undefined} // SOLO 1ER USUARIO
                    >
                      <ShieldCheck size={14} />
                    </Button>

                  )}
                  {permisos['Usuarios/eliminar_usuario'] &&
                  (
                    <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => desactivar(u.id)}
                        data-guide={index === 0 ? "btn-delete-user" : undefined} // SOLO 1ER USUARIO
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6"
            // --- PROTECCIÓN DEL MODAL: PREVIENE CIERRE AL INTERACTUAR CON LA GUÍA ---
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div data-guide="input-nombre">
                <Input placeholder="Nombre" className={errores.nombre ? 'border-red-500' : ''} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <Input placeholder="Apellidos" className={errores.apellidos ? 'border-red-500' : ''} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
            
            <div data-guide="input-correo">
                <Input
                placeholder="Correo"
                type="email"
                disabled={!!editando}
                className={errorClass('correo', 'correoFormato', 'correoProveedor', 'correoNoValido')}
                value={form.correo}
                onChange={(e) => {
                    setForm({ ...form, correo: e.target.value.trim() });
                    if (errores.correo || errores.correoFormato || errores.correoProveedor || errores.correoNoValido) {
                    setErrores((prev) => ({
                        ...prev,
                        correo: false,
                        correoFormato: false,
                        correoProveedor: false,
                        correoNoValido: false
                    }));
                    }
                }}
                />
            </div>

            {/* --- SE ENVUELVE EL INPUT DE TELÉFONO PARA LA GUÍA --- */}
            <div data-guide="input-telefono">
                <Input
                placeholder="Teléfono (10 dígitos)"
                inputMode="numeric"
                maxLength={10}
                value={form.telefono}
                className={errorClass('telefono')}
                onKeyDown={(e) => {
                    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                    if (allowed.includes(e.key)) return;
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                }}
                onChange={(e) => {
                    const soloDigitos = onlyDigits(e.target.value);
                    setForm({ ...form, telefono: clamp10(soloDigitos) });
                    if (errores.telefono) setErrores((prev) => ({ ...prev, telefono: false }));
                }}
                onPaste={(e) => {
                    e.preventDefault();
                    const texto = (e.clipboardData.getData('text') || '').trim();
                    const soloDigitos = onlyDigits(texto);
                    setForm((prev) => ({ ...prev, telefono: clamp10(soloDigitos) }));
                }}
                />
            </div>

            <div data-guide="select-perfil">
                <select className={`border rounded px-3 py-2 w-full ${errores.perfil ? 'border-red-500' : ''}`}
                value={form.perfil}
                disabled={editando !== null && form.perfil === "Administrador"}
                onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
                <option value="">Selecciona un perfil</option>
                {(editando === null || form.perfil === "Administrador") && (
                    <option value="Administrador">Administrador</option>
                )}
                <option value="Gerencia">Gerencia</option>
                <option value="Caja">Caja</option>
                </select>
            </div>

            <div data-guide="input-password">
                <Input
                placeholder="Contraseña"
                type="password"
                className={errores.password ? 'border-red-500' : ''}
                required={!editando}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
            </div>
          </div>

          <DialogFooter>
            {/* BOTÓN CANCELAR EXPLÍCITO */}
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button 
                disabled={loading} 
                onClick={guardar} 
                className="bg-orange-500 hover:bg-orange-600 text-white"
                data-guide="btn-save-user"
            >
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/*Modulo Permisos*/}
      <Dialog open={modalPermisosOpen} onOpenChange={setModalPermisosOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-3xl mx-auto shadow-xl border p-6"
            // --- PROTECCIÓN DEL MODAL DE PERMISOS ---
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Permisos de {usuarioPermisos?.nombre}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Perfil: {usuarioPermisos?.perfil}</p>
          </DialogHeader>

          <div className="flex gap-4 py-4">
            <div className="flex-1 overflow-auto rounded border bg-white max-h-64" data-guide="list-available">
              <table className="w-full text-sm">
                <thead className="bg-orange-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {permisosDisponibles.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-orange-50">
                      <td className="p-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedDisponibles.some((s) => s.id === p.id)}
                            onChange={() => toggleDisponible(p)}
                            style={{ accentColor: '#ea580c' }}
                          />
                          <span>{p.nombre}</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-center gap-2 items-center" data-guide="permissions-actions">
              <span className="text-sm">
                Seleccionados: {selectedDisponibles.length + selectedAsignados.length}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={asignarPermiso}
              >
                <FastForward size={16} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={quitarPermiso}
              >
                <Rewind size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={limpiarSeleccion}>
                Borrar selección
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded border bg-white max-h-64" data-guide="list-assigned">
              <table className="w-full text-sm">
                <thead className="bg-orange-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Asignados</th>
                  </tr>
                </thead>
                <tbody>
                  {permisosAsignados.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-orange-50">
                      <td className="p-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAsignados.some((s) => s.id === p.id)}
                            onChange={() => toggleAsignado(p)}
                            style={{ accentColor: '#ea580c' }}
                          />
                          <span>{p.nombre}</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setModalPermisosOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}