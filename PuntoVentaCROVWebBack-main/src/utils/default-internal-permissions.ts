export const permisosBaseCrovInternal = [
  { id: 1, nombre: 'Dashboard' },
  { id: 2, nombre: 'TI' },
  { id: 3, nombre: 'Cliente' },
  { id: 4, nombre: 'Distribruidores' },
  { id: 5, nombre: 'CRM' },
  { id: 6, nombre: 'CROV' },
  { id: 7, nombre: 'CROV/Dashboard' },
  { id: 8, nombre: 'CROV/CROV clientes' },
  { id: 9, nombre: 'CROV/Mantenimientos' },
  { id: 10, nombre: 'CROV/Prospectos' },
  { id: 11, nombre: 'CROV/Ticket soporte CROV' },
  { id: 12, nombre: 'Catalogos Crov' },
  { id: 13, nombre: 'Catalogos Crov/Sistemas' },
  { id: 14, nombre: 'Catalogos Crov/Giros Comerciales' },
  { id: 15, nombre: 'Catalogos Crov/Empleado CROV' },
  { id: 16, nombre: 'Catalogos Crov/Empleado CROV/Agregar' },
  { id: 17, nombre: 'Catalogos Crov/Empleado CROV/Editar' },
  { id: 18, nombre: 'Catalogos Crov/Empleado CROV/Eliminar' },
  { id: 19, nombre: 'Catalogos Crov/Empleado CROV/Permisos' },
  { id: 20, nombre: 'Jira' },
  { id: 21, nombre: 'Jira/Dashboard' },
  { id: 22, nombre: 'Jira/Backlog' },
  { id: 23, nombre: 'Jira/Sprint' },
  { id: 24, nombre: 'Jira/Tablero' },
  { id: 25, nombre: 'Catalogos Crov/Historial-Ahorros' },
  { id: 26, nombre: 'Catalogos Crov/Mi Ahorro' },
  { id: 27, nombre: 'Jira/Sistemas' },
  { id: 28, nombre: 'RH/Mis solicitudes incidencia' },
  { id: 29, nombre: 'RH/Gestionar solicitudes incidencia' },
];

const permisosPorRol = {
  SCRUM_MASTER: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  DESARROLLADOR: [1, 2, 6, 7, 8, 9, 11,13, 20, 21, 22, 23, 24, 26, 27, 28],
  TESTER: [1, 2, 6, 7, 11, 20, 21, 22, 23, 24, 26, 27, 28],
  VENTAS: [1, 3, 4, 5, 6, 8, 10, 26, 28],
  SLA: [1, 2, 3, 6, 7, 8, 9, 11, 26, 28],
};

export const permisosCrovInternalPorPuesto: Record<string, { id: number; nombre: string }[]> =
  Object.fromEntries(
    Object.entries(permisosPorRol).map(([puesto, ids]) => [
      puesto,
      permisosBaseCrovInternal.filter((perm) => ids.includes(perm.id)),
    ])
  );

export const permisosCrovInternalPorPuestoIds = permisosPorRol;
