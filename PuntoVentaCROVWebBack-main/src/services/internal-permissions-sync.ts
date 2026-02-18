import fs from "fs";
import path from "path";

import { permisosBaseCrovInternal, permisosCrovInternalPorPuestoIds } from "../utils/default-internal-permissions";
import prisma from "../utils/prisma";

const LOG_PREFIX = "[PermisosInternal]";

const resolvePermissionsFilePath = () => {
  const tsPath = path.join(process.cwd(), "src", "utils", "default-internal-permissions.ts");
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }

  return path.join(process.cwd(), "dist", "utils", "default-internal-permissions.js");
};

export const ensureDefaultInternalPermissions = async () => {
  for (const perm of permisosBaseCrovInternal) {
    await prisma.permisoInternal.upsert({
      where: { id: perm.id },
      update: {
        nombre: perm.nombre,
        scrum_master: permisosCrovInternalPorPuestoIds.SCRUM_MASTER.includes(perm.id) ? 1 : 0,
        tester: permisosCrovInternalPorPuestoIds.TESTER.includes(perm.id) ? 1 : 0,
        desarrollador: permisosCrovInternalPorPuestoIds.DESARROLLADOR.includes(perm.id) ? 1 : 0,
        ventas: permisosCrovInternalPorPuestoIds.VENTAS.includes(perm.id) ? 1 : 0,
        sla: permisosCrovInternalPorPuestoIds.SLA.includes(perm.id) ? 1 : 0,
      },
      create: {
        id: perm.id,
        nombre: perm.nombre,
        scrum_master: permisosCrovInternalPorPuestoIds.SCRUM_MASTER.includes(perm.id) ? 1 : 0,
        tester: permisosCrovInternalPorPuestoIds.TESTER.includes(perm.id) ? 1 : 0,
        desarrollador: permisosCrovInternalPorPuestoIds.DESARROLLADOR.includes(perm.id) ? 1 : 0,
        ventas: permisosCrovInternalPorPuestoIds.VENTAS.includes(perm.id) ? 1 : 0,
        sla: permisosCrovInternalPorPuestoIds.SLA.includes(perm.id) ? 1 : 0,
      },
    });
  }
};

export const watchDefaultInternalPermissionsFile = () => {
  const filePath = resolvePermissionsFilePath();
  const runSync = async () => {
    try {
      await ensureDefaultInternalPermissions();
      console.log(`${LOG_PREFIX} permisos sincronizados`);
    } catch (error) {
      console.error(`${LOG_PREFIX} error al sincronizar permisos`, error);
    }
  };

  runSync();

  if (!fs.existsSync(filePath)) {
    console.warn(`${LOG_PREFIX} archivo de permisos no encontrado: ${filePath}`);
    return;
  }

  let debounceTimer: NodeJS.Timeout | null = null;
  fs.watch(filePath, (eventType) => {
    if (eventType !== "change" && eventType !== "rename") {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      runSync();
    }, 150);
  });
};
