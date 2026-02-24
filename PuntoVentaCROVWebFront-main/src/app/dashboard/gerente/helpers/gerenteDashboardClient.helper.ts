import axios from "axios";

type AuthHeaders = { Authorization: string } | undefined;

const getMaxDailyRevenue = (data: unknown): number | null => {
  if (!data || typeof data !== "object") return null;
  const maybeRows = (data as { rows?: unknown }).rows;
  const rows = Array.isArray(maybeRows)
    ? maybeRows
    : Array.isArray(data)
      ? data
      : [];

  let maxRevenue = 0;

  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const revenue = Number((row as { revenue?: unknown }).revenue);
    if (Number.isFinite(revenue) && revenue > maxRevenue) {
      maxRevenue = revenue;
    }
  });

  return Number.isFinite(maxRevenue) ? maxRevenue : null;
};

export const fetchGerenteResumenData = async ({
  apiUrl,
  sucursalId,
  diasPrediccion,
  token,
}: {
  apiUrl: string;
  sucursalId: string;
  diasPrediccion: number;
  token?: string | null;
}) => {
  const headers: AuthHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const [
    productosRes,
    predRes,
    predVentasRes,
    predComprasRes,
    predGastosRes,
    topProductosRes,
    topClientesRes,
    metasRes,
    bajaRotacionRes,
    impactoDevolucionesRes,
  ] = await Promise.all([
    axios.get(`${apiUrl}/gerente/productosInventarioMinimo?sucursalId=${sucursalId}`, { headers }),
    axios.get(`${apiUrl}/gerente/prediccionInventario?sucursalId=${sucursalId}&dias=${diasPrediccion}`, { headers }),
    axios.get(`${apiUrl}/gerente/prediccionVentas?sucursalId=${sucursalId}&dias=${diasPrediccion}`, { headers }),
    axios.get(`${apiUrl}/gerente/prediccionCompras?sucursalId=${sucursalId}&dias=${diasPrediccion}`, { headers }),
    axios.get(`${apiUrl}/gerente/prediccionGastos?sucursalId=${sucursalId}&dias=${diasPrediccion}`, { headers }),
    axios.get(`${apiUrl}/gerente/topProductosUltimoMes?sucursalId=${sucursalId}`, { headers }),
    axios.get(`${apiUrl}/gerente/topClientesUltimoMes?sucursalId=${sucursalId}`, { headers }),
    axios.get(`${apiUrl}/gerente/metas?sucursalId=${sucursalId}`, { headers }),
    axios
      .get(`${apiUrl}/gerente/productosBajaRotacion?sucursalId=${sucursalId}`, { headers })
      .catch(() => ({ data: [] })),
    axios
      .get(`${apiUrl}/gerente/impacto-devoluciones?sucursalId=${sucursalId}`, { headers })
      .catch(() => ({ data: null })),
  ]);

  const impacto = impactoDevolucionesRes?.data?.data || impactoDevolucionesRes?.data || null;
  const bajaRotacion = Array.isArray(bajaRotacionRes?.data)
    ? bajaRotacionRes.data
    : bajaRotacionRes?.data?.data || [];

  const metaReferencia = Number(predVentasRes.data?.promedioDiario) || 0;
  const kpisDiaRes = await axios.get(
    `${apiUrl}/gerente/kpisDia?sucursalId=${sucursalId}&meta=${metaReferencia}`,
    { headers },
  );

  const metaDiariaDesdeDias = getMaxDailyRevenue(kpisDiaRes.data);
  const metaDiariaDesdeApi = Number(kpisDiaRes.data?.metaDiaria);
  const metaDiariaBase = Number.isFinite(metaDiariaDesdeApi)
    ? metaDiariaDesdeApi
    : metaReferencia;
  const metaDiaria = typeof metaDiariaDesdeDias === "number" ? metaDiariaDesdeDias : metaDiariaBase;

  const [kpisMesRes, kpisSemanaRes] = await Promise.all([
    axios.get(`${apiUrl}/gerente/kpisMes?sucursalId=${sucursalId}&meta=${metaDiaria}`, { headers }),
    axios.get(`${apiUrl}/gerente/kpisSemana?sucursalId=${sucursalId}&meta=${metaDiaria}`, { headers }),
  ]);

  return {
    productos: productosRes.data,
    predicciones: predRes.data,
    predVentas: predVentasRes.data,
    predCompras: predComprasRes.data,
    predGastos: predGastosRes.data,
    topProductos: topProductosRes.data,
    topClientes: topClientesRes.data,
    metasIA: metasRes.data?.success ? metasRes.data?.data?.metas : null,
    bajaRotacion,
    impactoDevoluciones: impacto,
    kpisDia: { ...kpisDiaRes.data, metaDiaria },
    kpisSemana: { ...kpisSemanaRes.data, metaDiaria },
    kpisMes: { ...kpisMesRes.data, metaDiaria },
  };
};
