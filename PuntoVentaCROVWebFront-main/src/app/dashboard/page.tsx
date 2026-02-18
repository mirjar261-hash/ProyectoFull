'use client';

import ExpensesChart from '@/components/ExpensesChart';
import DashboardTotals from '@/components/DashboardTotals';
import DailyRevenueReturnsCard from '@/components/DailyRevenueReturnsCard';
import RecentActivity from '@/components/RecentActivity';
import UpcomingAgenda from '@/components/UpcomingAgenda';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { getUserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SimplePieChart from '@/components/SimplePieChart';
import { FileText, PieChart } from 'lucide-react';

interface DetalleVentaDevuelta {
  id: number;
  cantidad: number;
  total: number;
  venta?: { numdoc?: string; fecha?: string };
  producto?: { nombre?: string };
  fecha_devolucion?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface VentaPeriodo {
  id: number;
  total: number;
  fecha?: string;
  activo?: number;
}

interface DetalleVentaPeriodo {
  cantidad: number;
  total: number;
  costo?: number;
  activo?: number;
}

interface GastoPeriodo {
  monto: number;
  fecha?: string;
  activo?: number;
}
const formatCurrency = (value: number) =>
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};
export default function DashboardHome() {
  const [permisos, setPermisos] = useState<Record<string, boolean>>({});
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  const [detallesDevueltas, setDetallesDevueltas] = useState<DetalleVentaDevuelta[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(true);
  const [errorDetalles, setErrorDetalles] = useState<string | null>(null);
   const [pieData, setPieData] = useState<
    { label: string; value: number; color: string }[]
  >([]);
  const [pieSummary, setPieSummary] = useState<
    { ventas: number; gastos: number; utilidad: number } | null
  >(null);
  const [pieRangeLabel, setPieRangeLabel] = useState('');
  const [pieLoading, setPieLoading] = useState(true);
  const [pieError, setPieError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    let mounted = true;

    const cargarPermisosDashboard = async () => {
      try {
        const token = localStorage.getItem('token') || undefined;
        const userIdSession = parseInt(localStorage.getItem('userId') || '0', 10);

        const permisosAValidar = ['Dashboard/Tarjetas informativas'];
        const data = await getUserPermissions(userIdSession, token);

        const tienePermiso = (permiso: string) => {
          if (Array.isArray(data)) {
            return data.some(
              (p: any) =>
                p.nombre === permiso ||
                p.permiso === permiso ||
                String(p.id) === permiso
            );
          }
          const value = (data as any)?.[permiso];
          return value === 1 || value === true;
        };

        const mapa = Object.fromEntries(
          permisosAValidar.map((p) => [p, !!tienePermiso(p)])
        );

        if (mounted) setPermisos(mapa);
      } catch (e) {
        console.error('Error cargando permisos del dashboard:', e);
      } finally {
        if (mounted) setLoadingPermisos(false);
      }
    };

    cargarPermisosDashboard();
    return () => {
      mounted = false;
    };
  }, []);
   useEffect(() => {
    let mounted = true;

    const cargarResumenVentasUtilidad = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (!apiUrl) {
        if (mounted) {
          setPieError('No se ha configurado la URL de la API.');
          setPieLoading(false);
        }
        return;
      }

      setPieLoading(true);

      try {
        const token = localStorage.getItem('token') || undefined;
        const sucursalId = localStorage.getItem('sucursalId') || '1';
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const today = new Date();
        const currentWeekStart = startOfWeek(today);
        const previousWeekStart = new Date(currentWeekStart);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        const currentWeekEnd = endOfWeek(today);

        const formatter = new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: 'short',
        });
        const rangeLabel = `${formatter.format(previousWeekStart)} - ${formatter.format(currentWeekEnd)}`;

        const inicioISO = `${toInputDate(previousWeekStart)}T00:00:00.000Z`;
        const finISO = `${toInputDate(currentWeekEnd)}T23:59:59.999Z`;

        const [ventasRes, gastosRes] = await Promise.all([
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicioISO}&fechaFin=${finISO}&activo=1`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(
              previousWeekStart
            )}&fechaFin=${toInputDate(addDays(currentWeekEnd, 1))}&activos=0`,
            { headers }
          ),
        ]);

        const ventasData: VentaPeriodo[] = Array.isArray(ventasRes.data)
          ? ventasRes.data
          : [];
        const gastosData: GastoPeriodo[] = Array.isArray(gastosRes.data)
          ? gastosRes.data
          : [];

        const detallesVentas = ventasData.length
          ? await Promise.all(
              ventasData.map(async (venta) => {
                try {
                  const detalleRes = await axios.get(`${apiUrl}/venta/${venta.id}`, {
                    headers,
                  });
                  const detalles = Array.isArray(detalleRes.data?.detalles)
                    ? detalleRes.data.detalles
                    : [];
                  return detalles as DetalleVentaPeriodo[];
                } catch (error) {
                  console.error('Error al cargar detalles de venta:', error);
                  return [] as DetalleVentaPeriodo[];
                }
              })
            )
          : [];

        let totalVentas = 0;
        let totalCosto = 0;

        ventasData.forEach((venta, index) => {
          const detalles = detallesVentas[index] || [];

          detalles.forEach((detalle) => {
            if (detalle.activo === 0) {
              return;
            }

            const ventaDetalle = Number(detalle.total) || 0;
            const costoDetalle = (detalle.costo || 0) * (detalle.cantidad || 0);

            totalVentas += ventaDetalle;
            totalCosto += costoDetalle;
          });
        });

        const totalGastos = gastosData.reduce((acc, gasto) => {
          if (gasto.activo === 0) {
            return acc;
          }

          return acc + (Number(gasto.monto) || 0);
        }, 0);

        const utilidadNeta = totalVentas - totalGastos;
        const chartData = [
          { label: 'Ventas', value: totalVentas, color: '#f97316' },
          { label: 'Gastos', value: totalGastos, color: '#6366f1' },
          utilidadNeta >= 0
            ? { label: 'Utilidad', value: utilidadNeta, color: '#10b981' }
            : { label: 'Pérdida', value: Math.abs(utilidadNeta), color: '#ef4444' },
        ];

        if (!mounted) {
          return;
        }

        setPieData(chartData);
        setPieSummary({ ventas: totalVentas, gastos: totalGastos, utilidad: utilidadNeta });
        setPieRangeLabel(rangeLabel);
        setPieError(null);
      } catch (error) {
        console.error('Error al cargar el resumen de ventas/utilidad:', error);
        if (!mounted) {
          return;
        }
        setPieError('No se pudo cargar el resumen de ventas y utilidad.');
        setPieData([]);
        setPieSummary(null);
      } finally {
        if (mounted) {
          setPieLoading(false);
        }
      }
    };

    cargarResumenVentasUtilidad();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);
 useEffect(() => {
    let mounted = true;

    const cargarDetalles = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (!apiUrl) {
        setErrorDetalles('No se ha configurado la URL de la API.');
        setLoadingDetalles(false);
        return;
      }

      setLoadingDetalles(true);

      try {
        const token = localStorage.getItem('token') || undefined;
        const sucursalId = localStorage.getItem('sucursalId') || '1';
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.get(
          `${apiUrl}/gerente/detallesVentasDevueltas7dias?sucursalId=${sucursalId}`,
          { headers }
        );

        if (!mounted) {
          return;
        }

        const data = Array.isArray(response.data) ? response.data : [];
        setDetallesDevueltas(data);
        setErrorDetalles(null);
      } catch (error) {
        console.error('Error al cargar detalles de ventas devueltas:', error);
        if (!mounted) {
          return;
        }
        setErrorDetalles('No se pudo cargar la información de ventas devueltas.');
      } finally {
        if (mounted) {
          setLoadingDetalles(false);
        }
      }
    };

    cargarDetalles();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const detallesDelDia = useMemo(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);

    return detallesDevueltas.filter((detalle) => {
      const fechaReferencia =
        detalle.fecha_devolucion ||
        detalle.venta?.fecha ||
        detalle.updatedAt ||
        detalle.createdAt;

      if (!fechaReferencia) {
        return false;
      }

      const fecha = new Date(fechaReferencia);
      if (Number.isNaN(fecha.getTime())) {
        return false;
      }

      return fecha >= inicio && fecha < fin;
    });
  }, [detallesDevueltas]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">
        Bienvenido al Panel de Control
      </h1>

      {!loadingPermisos && permisos['Dashboard/Tarjetas informativas'] && (
        <DashboardTotals />
      )}
      <Card>
        <CardHeader className="flex items-start gap-2">
          <PieChart className="h-5 w-5 text-emerald-500" />
          <div className="space-y-1">
            <CardTitle>Ventas, gastos y utilidad</CardTitle>
            <p className="text-sm text-muted-foreground">
              Resumen de las últimas dos semanas.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {pieLoading ? (
            <p className="text-sm text-muted-foreground">Procesando datos...</p>
          ) : pieError ? (
            <p className="text-sm text-red-500">{pieError}</p>
          ) : pieData.length > 0 && pieSummary ? (
            <div className="flex flex-col items-center gap-4">
              <SimplePieChart
                data={pieData}
                valueFormatter={(value, item) => {
                  if (item.label === 'Utilidad' && pieSummary) {
                    return formatCurrency(pieSummary.utilidad);
                  }
                  if (item.label === 'Pérdida') {
                    return formatCurrency(-Math.abs(value));
                  }
                  return formatCurrency(value);
                }}
              />
              <div className="space-y-1 text-sm text-center text-muted-foreground">
                <p>
                  Ventas totales:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(pieSummary.ventas)}
                  </span>
                </p>
                <p>
                  Gastos totales:{' '}
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(pieSummary.gastos)}
                  </span>
                </p>
                <p
                  className={`font-semibold ${
                    pieSummary.utilidad < 0 ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  Utilidad neta: {formatCurrency(pieSummary.utilidad)}
                </p>
                {pieRangeLabel && (
                  <p className="text-xs text-muted-foreground">
                    Periodo considerado: {pieRangeLabel}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              No hay información disponible para el periodo reciente.
            </p>
          )}
        </CardContent>
      </Card>
      <DailyRevenueReturnsCard />
      <UpcomingAgenda />
      <RecentActivity />
      <Card>
        <CardHeader className="flex items-start gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <div className="space-y-1">
            <CardTitle>Detalles de ventas devueltas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Datos correspondientes al día de hoy.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDetalles ? (
            <p className="text-sm text-muted-foreground">Cargando información...</p>
          ) : errorDetalles ? (
            <p className="text-sm text-red-500">{errorDetalles}</p>
          ) : detallesDelDia.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venta</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detallesDelDia.map((detalle) => (
                  <TableRow key={detalle.id}>
                    <TableCell>{detalle.venta?.numdoc}</TableCell>
                    <TableCell>{detalle.producto?.nombre}</TableCell>
                    <TableCell>{detalle.cantidad}</TableCell>
                    <TableCell>{formatCurrency(Number(detalle.total) || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay devoluciones registradas en el día de hoy.
            </p>
          )}
        </CardContent>
      </Card>
      {/* <ExpensesChart /> */}
    </div>
  );
}
