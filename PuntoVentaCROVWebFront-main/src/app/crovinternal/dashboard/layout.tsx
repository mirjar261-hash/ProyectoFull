'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Wrench, Users, Truck, FileText, UserCog, LogOut, Sparkles, Kanban, User } from "lucide-react";
import ClientesPage from "../clientes/page";
import TiPage from "../ti/page";
import DistribuidoresPage from "../distribuidores/page";
import CRMPage from "../crm/page";
import CrovPage from "../crov/page";
import GerentePage from "../gerente/page";
import JiraPage from "../jira/page";
import { getInternalAuthHeaders } from "@/lib/internalAuth";

interface Sucursal{
  id: number;
  activo:number;
  nombre_comercial: string;
}
interface Empresa {
  id: number;
  paquete: string;
  fecha_vencimiento: string;
  sucursal: Sucursal[];
}

type Ventana = "dashboard" | "ti" | "clientes" | "distribuidores" | "crm" | "gerente" | "crov" | "jira";

interface InternalPermiso {
  nombre: string;
}

const normalizeInternalPermiso = (raw: any): InternalPermiso | null => {
  const nombre = String(raw?.nombre ?? raw?.permiso ?? "").trim();

  if (!nombre) {
    return null;
  }

  return { nombre };
};

const MODULE_PERMISSIONS: Record<Exclude<Ventana, "jira" | "gerente">, string> = {
  dashboard: "Dashboard",
  ti: "TI",
  clientes: "Cliente",
  distribuidores: "Distribruidores",
  crm: "CRM",
  crov: "CROV",
};

export default function InternalDashboard({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isResidente, setIsResidente] = useState<boolean | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  const [puestoUsuario, setPuestoUsuario] = useState<string>('');
  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [internalPermisos, setInternalPermisos] = useState<InternalPermiso[]>([]);
  const [permisosLoading, setPermisosLoading] = useState(false);
  const isSubPageRoute = pathname?.startsWith("/crovinternal/dashboard/perfil") || 
                       pathname?.startsWith("/crovinternal/dashboard/rh");

useEffect(() => {
  const storedResidente = localStorage.getItem("internalResident");
  if (storedResidente != null) {
    const v = storedResidente.trim().toLowerCase();
    setIsResidente(v === "1" || v === "true");
    return;
  }

  const rawUser = localStorage.getItem("internalUser");
  if (!rawUser) {
    setIsResidente(false);
    return;
  }

  try {
    const user = JSON.parse(rawUser) as {
      residente?: number | boolean | string;
      es_residente?: number | boolean | string;
    };

    const residenteRaw = user.residente ?? user.es_residente ?? 0;

    if (typeof residenteRaw === "string") {
      const v = residenteRaw.trim().toLowerCase();
      setIsResidente(v === "1" || v === "true");
    } else if (typeof residenteRaw === "number") {
      setIsResidente(residenteRaw === 1);
    } else if (typeof residenteRaw === "boolean") {
      setIsResidente(residenteRaw);
    } else {
      setIsResidente(false);
    }
  } catch {
    setIsResidente(false);
  }
}, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawUser = localStorage.getItem("internalUser");
    if (!rawUser) return;

    try {
      const user = JSON.parse(rawUser) as {
        nombre_completo?: string;
        nombreCompleto?: string;
        nombre?: string;
        puesto?: string | null;
      };

      setNombreUsuario(user.nombre_completo ?? user.nombreCompleto ?? user.nombre ?? "");
      setPuestoUsuario(user.puesto ?? "");
    } catch {
      setNombreUsuario("");
      setPuestoUsuario("");
    }
  }, []);

 const [ventana, setVentana] = useState<Ventana>("dashboard"); // estado para ventana activa

 useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = Number(localStorage.getItem("internalUserId") ?? 0);
    if (Number.isFinite(storedId) && storedId > 0) {
      setInternalUserId(storedId);
    } else {
      setInternalUserId(null);
    }
  }, []);

  useEffect(() => {
    if (!apiUrl || !token || !internalUserId || isResidente) {
      return;
    }

    const fetchPermisos = async () => {
      setPermisosLoading(true);
      try {
        const res = await axios.get(
          `${apiUrl}/crovinternal/permisos-internal/${internalUserId}`,
          { headers: authHeaders }
        );
        const permisos = Array.isArray(res.data)
          ? res.data
              .map((item) => normalizeInternalPermiso(item))
              .filter((item): item is InternalPermiso => item !== null)
          : [];
        setInternalPermisos(permisos);
      } catch (err) {
        console.error("Error al cargar permisos internos", err);
        setInternalPermisos([]);
      } finally {
        setPermisosLoading(false);
      }
    };

    fetchPermisos();
  }, [apiUrl, authHeaders, internalUserId, isResidente, token]);

  useEffect(() => {
    if (!localStorage.getItem('internalToken')) {
      router.replace('/crovinternal');
      return;
    }
    const fetchEmpresas = async () => {
      try {
        const res = await axios.get(`${apiUrl}/empresas/activas`, {
          headers: authHeaders,
        });
        setEmpresas(res.data || []);
      } catch (err) {
        console.error("Error al cargar empresas", err);
      }
    };
    fetchEmpresas();
  }, [apiUrl, router, token]);

  useEffect(() => {
  if (isResidente && ventana !== "jira" && !isSubPageRoute) {
    setVentana("jira");
  }
}, [isSubPageRoute, isResidente, ventana]);

  const hoy = useMemo(() => new Date(), []);
  const activos = empresas.filter((e) => new Date(e.fecha_vencimiento) >= hoy);
  const clientesActivos = activos.length;
  const clientesDemo = activos.filter((e) => e.paquete === "demo").length;
  const clientesNegocio = activos.filter((e) => e.paquete === "negocio").length;
  const clientesInteligente = activos.filter((e) => e.paquete === "inteligente").length;
  const puestos: Record<string, string> = {
  CEO:'CEO',
  SCRUM_MASTER: 'Scrum Master',
  DESARROLLADOR: 'Desarrollador',
  VENTAS: 'Venta',
  TESTER: 'Tester',
  SLA:'SLA',


};

  const quickLinks: { label: string; icon: JSX.Element; value: Ventana }[] = useMemo(() => {
    if (isResidente) {
      return [{ label: "Jira", icon: <Kanban size={28} />, value: "jira" }];
    }
    return [
      { label: "Dashboard", icon: <LayoutDashboard size={28} />, value: "dashboard" },
      { label: "TI", icon: <Wrench size={28} />, value: "ti" },
      { label: "Clientes", icon: <Users size={28} />, value: "clientes" },
      { label: "Distribuidores", icon: <Truck size={28} />, value: "distribuidores" },
      { label: "CRM", icon: <FileText size={28} />, value: "crm" },
      { label: "CROV", icon: <Sparkles size={28} />, value: "crov" },
      { label: "Catálogos CROV", icon: <UserCog size={28} />, value: "gerente" },
      { label: "Jira", icon: <Kanban size={28} />, value: "jira" },
    ];
  }, [isResidente]);
  const hasModulePermission = useMemo(() => {
    const permisosSet = new Set(internalPermisos.map((permiso) => permiso.nombre.toLowerCase()));
    return (permiso: string) => permisosSet.has(permiso.toLowerCase());
  }, [internalPermisos]);

  const allowedVentanas = useMemo(() => {
    if (isResidente) {
      return ["jira"] as Ventana[];
    }
    return quickLinks
      .map((link) => link.value)
      .filter((value) => {
        if (value === "jira" || value === "gerente") {
          return true;
        }
        const permiso = MODULE_PERMISSIONS[value];
        return permiso ? hasModulePermission(permiso) : true;
      });
  }, [hasModulePermission, isResidente, quickLinks]);

  useEffect(() => {
    if (allowedVentanas.length === 0 || isResidente) {
      return;
    }
    if (!allowedVentanas.includes(ventana)) {
      setVentana(allowedVentanas[0]);
    }
  }, [allowedVentanas, isResidente, ventana]);

  const filteredQuickLinks = useMemo(
    () =>
      quickLinks.filter((link) => {
        if (link.value === "jira" || link.value === "gerente") {
          return true;
        }
        const permiso = MODULE_PERMISSIONS[link.value];
        return permiso ? hasModulePermission(permiso) : true;
      }),
    [hasModulePermission, quickLinks]
  );
  const canShowDashboard = allowedVentanas.includes("dashboard");
  const canShowTi = allowedVentanas.includes("ti");
  const canShowClientes = allowedVentanas.includes("clientes");
  const canShowDistribuidores = allowedVentanas.includes("distribuidores");
  const canShowCrm = allowedVentanas.includes("crm");
  const canShowCrov = allowedVentanas.includes("crov");

  if (isResidente === null) {
  return <div className="p-6">Cargando...</div>;
}
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col space-y-8 py--6 px-4 py-5 sm:px-6 lg:max-w-none lg:space-y-4 lg:px-8 lg:py-4">
     <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-600">
            {nombreUsuario ? `Hola, ${nombreUsuario}` : "Hola"}
          </h1>
          {puestoUsuario && <p className="text-sm text-gray-600">{puestos[puestoUsuario] ?? 'Sin puesto asignado'}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/crovinternal/dashboard/rh")}
            disabled={isSubPageRoute}
            className={`flex items-center gap-1 text-sm ${
              isSubPageRoute
                ? "text-orange-600 cursor-default"
                : "text-orange-600 hover:underline"
            }`}
          >
            <UserCog size={16} /> RH
          </button>
          <button
            onClick={() => router.push("/crovinternal/dashboard/perfil")}
            disabled={isSubPageRoute}
            className={`flex items-center gap-1 text-sm ${
              isSubPageRoute
                ? "text-orange-600 cursor-default"
                : "text-orange-600 hover:underline"
            }`}
          >
            <User size={16} /> Mi perfil
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('internalToken');
              localStorage.removeItem("internalResident");
              localStorage.removeItem("internalUser");
              localStorage.removeItem("empresaToken");
              localStorage.removeItem("empresaId");
              localStorage.removeItem("lastActivity");
              window.location.href = "/crovinternal";
            }}
            className="flex items-center gap-1 text-sm text-red-600 hover:underline"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      {isSubPageRoute ? (
        <div>{children}</div>
      ) : (
        <>
          {/* Accesos directos */}
          <div className="w-full overflow-x-auto py-2">
            <div className="flex w-max gap-4 px-2 sm:px-6 sm:justify-center sm:mx-auto">
              {filteredQuickLinks.map(({ label, icon, value }) => (
                <button
                  key={value}
                  onClick={() => setVentana(value)}
                  className={`min-w-[140px] border rounded-xl shadow-sm px-4 py-3 flex flex-col items-center text-center transition
                    ${ventana === value ? "bg-orange-100" : "bg-white"} hover:shadow-md`}
                >
                  <div className="text-orange-500 mb-1">{icon}</div>
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas informativas */}
         {ventana === "dashboard" && !isResidente && canShowDashboard && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-green-200 text-green-800">
                <CardHeader>
                  <CardTitle className="text-sm">Clientes activos</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{clientesActivos}</CardContent>
              </Card>
              <Card className="bg-blue-200 text-blue-800">
                <CardHeader>
                  <CardTitle className="text-sm">Clientes demo (activos)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{clientesDemo}</CardContent>
              </Card>
              <Card className="bg-yellow-200 text-yellow-800">
                <CardHeader>
                  <CardTitle className="text-sm">Plan negocio (activos)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{clientesNegocio}</CardContent>
              </Card>
              <Card className="bg-purple-200 text-purple-800">
                <CardHeader>
                  <CardTitle className="text-sm">Plan inteligente (activos)</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{clientesInteligente}</CardContent>
              </Card>
            </div>
          )}

          {/* Contenido condicional según ventana */}
          {ventana === "ti" && !isResidente && canShowTi && <TiPage />}
          {ventana === "clientes" && !isResidente && canShowClientes && <ClientesPage />}
          {ventana === "distribuidores" && !isResidente && canShowDistribuidores && (
            <DistribuidoresPage />
          )}
          {ventana === "crm" && !isResidente && canShowCrm && <CRMPage />}
          {ventana === "crov" && !isResidente && canShowCrov && <CrovPage />}
          {ventana === "gerente" && !isResidente && <GerentePage />}
          {ventana === "jira" && <JiraPage />}

           {ventana === "dashboard" && !isResidente && canShowDashboard && children}
          {!isResidente &&
            !permisosLoading &&
            allowedVentanas.length > 0 &&
            !allowedVentanas.includes(ventana) && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                No tienes permisos para acceder a este módulo.
              </div>
            )}
        </>
      )}
    </div>
  );
}
