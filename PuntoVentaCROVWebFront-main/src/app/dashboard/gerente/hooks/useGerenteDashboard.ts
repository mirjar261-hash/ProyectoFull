// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export default function useGerenteDashboard(deps: any = {}) {
  const {
    getDefaultDateRange,
    getWeekOptionsForMonth,
    buildFinancialTableData,
    computeDailyNetProfit,
    quickAlertDefinitions,
    fetchGerenteResumenData,
    buildTopProductosPieData,
    hasPositiveTotals,
    sumWeeklyTotals,
    buildPeriodCardsState,
    buildPerformanceSummaryRows,
    capitalize,
    parseDateInput,
    startOfWeek,
    endOfWeek,
    toInputDate,
    getWeekRangeForMonth,
    getMonthRange,
    addDays,
    PRODUCTOS_MIN_COLORS,
    TOP_PRODUCTOS_COLORS,
    managerialAlertDefinitions,
  } = deps;

  const formatCurrency = (value: number | undefined | null) => {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

  const getExpenseAmount = (item: any) => Number(item?.monto ?? item?.total ?? 0) || 0;
  const isActiveExpense = (item: any) => Number(item?.activo ?? 1) !== 0;

  // 🔥 FILTROS ESTRICTOS: Evitamos que el backend nos mienta
  const isValidSale = (item: any) => Number(item?.activo ?? 1) !== 0 && item?.estado !== "COTIZACION";
  const isReturnSale = (item: any) => Number(item?.activo) === 0 && item?.estado !== "COTIZACION";

  const formatBackendDate = (date: Date, isEnd: boolean) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const t = isEnd ? "23:59:59.999" : "00:00:00.000";
    return `${y}-${m}-${d}T${t}`; 
  };

  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);

  const [bottomProductos, setBottomProductos] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [bottomProductosLimit, setBottomProductosLimit] = useState<number>(10);

  const [productosMin, setProductosMin] = useState<any[]>([]);
  const [productosMinLimit, setProductosMinLimit] = useState<number>(10);
  const [predicciones, setPredicciones] = useState<any[]>([]);
  const [predVentas, setPredVentas] = useState<any | null>(null);
  const [predCompras, setPredCompras] = useState<any | null>(null);
  const [predGastos, setPredGastos] = useState<any | null>(null);
  const [kpisDia, setKpisDia] = useState<any | null>(null);
  const [kpisSemana, setKpisSemana] = useState<any | null>(null);
  const [kpisMes, setKpisMes] = useState<any | null>(null);
  const [topProductos, setTopProductos] = useState<any[]>([]);
  const [topProductosLimit, setTopProductosLimit] = useState<number>(5);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [topClientesPeriodo, setTopClientesPeriodo] = useState<"historico" | "1m" | "2m">("historico");
  
  const [bajaRotacion, setBajaRotacion] = useState<any[]>([]);
  const [bajaRotacionLimit, setBajaRotacionLimit] = useState<number>(10);
  
  const [impactoDevoluciones, setImpactoDevoluciones] = useState<{
    totalDevuelto: number;
    flujoCaja: number;
    tasaDevolucion: number;
  } | null>(null);

  const [monthlyComparison, setMonthlyComparison] = useState<any | null>(null);
  const [loadingMonthlyGrowth, setLoadingMonthlyGrowth] = useState(false);
  const [monthlyGrowthError, setMonthlyGrowthError] = useState<string | null>(null);
  const [dailyComparisonData, setDailyComparisonData] = useState<any[]>([]);
  const [dailyGrowthData, setDailyGrowthData] = useState<any[]>([]);
  const [ventasRaw, setVentasRaw] = useState<any[]>([]);
  const [gastosRaw, setGastosRaw] = useState<any[]>([]);
  const [comprasRaw, setComprasRaw] = useState<any[]>([]);
  const [devolucionesRaw, setDevolucionesRaw] = useState<any[]>([]);

  const [metasIA, setMetasIA] = useState<{
    metaMensual: number;
    metaSemanal: number;
    metaDiaria: number;
    metaExtraordinaria: number;
    hayExtraordinaria: boolean;
  } | null>(null);

  const [fechaInicio, setFechaInicio] = useState(defaultDateRange.start);
  const [fechaFin, setFechaFin] = useState(defaultDateRange.end);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  
  const monthOptions = useMemo(() => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];

    for (let i = 0; i < 12; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${capitalize(
        date.toLocaleDateString("es-MX", { month: "long" }),
      )} ${date.getFullYear()}`;
      options.push({ value: monthValue, label });
    }

    return options;
  }, [capitalize]); 

  const weekOptions = useMemo(() => {
    const parsed = selectedMonth ? selectedMonth.split("-") : [];
    const year = Number(parsed[0]);
    const monthIndex = Number(parsed[1]) - 1;

    if (!Number.isNaN(year) && !Number.isNaN(monthIndex)) {
      return getWeekOptionsForMonth(year, monthIndex);
    }

    const today = new Date();
    return getWeekOptionsForMonth(today.getFullYear(), today.getMonth());
  }, [selectedMonth, getWeekOptionsForMonth]); 


  const [comparativaPeriodo, setComparativaPeriodo] = useState<any[]>([]);
  const [gastosSemanalPeriodo, setGastosSemanalPeriodo] = useState<any[]>([]);
  const [devolucionesSemanalPeriodo, setDevolucionesSemanalPeriodo] = useState<any[]>([]);
  
  const financialTableDia = useMemo(
    () => (kpisDia ? buildFinancialTableData(kpisDia, "día") : null),
    [kpisDia, buildFinancialTableData]
  );
  const financialTableSemana = useMemo(
    () => (kpisSemana ? buildFinancialTableData(kpisSemana, "semana") : null),
    [kpisSemana, buildFinancialTableData]
  );
  const financialTableMes = useMemo(
    () => (kpisMes ? buildFinancialTableData(kpisMes, "mes") : null),
    [kpisMes, buildFinancialTableData]
  );

  const triggeredQuickAlertsRef = useRef<Set<string>>(new Set());
  const periodCardsRef = useRef<HTMLDivElement | null>(null);
  const didSelectDateRangeRef = useRef(false);

  const dailyNetProfit = useMemo(
    () => computeDailyNetProfit(kpisDia),
    [kpisDia, computeDailyNetProfit]
  );

  const evaluatedQuickAlerts = useMemo(() => {
    const context = {
      kpisDia,
      dailyNetProfit,
      kpisSemana,
      metasIA,
      bajaRotacion,
      comparativaPeriodo,
      impactoDevoluciones
    };

    return quickAlertDefinitions
      .map((definition: any) => {
        const isActive = definition.evaluate(context);
        const detailText = isActive ? (definition.detail?.(context) ?? null) : null;
        const progress = definition.getProgress ? definition.getProgress(context) : 0;
        const dynamicAction = typeof definition.action === "function" ? definition.action(context) : definition.action;

        return {
          ...definition,
          isActive,
          detailText,
          progress,
          action: dynamicAction,
        };
      })
      .sort((a: any, b: any) => Number(b.isActive) - Number(a.isActive));
  }, [kpisDia, dailyNetProfit, kpisSemana, metasIA, bajaRotacion, comparativaPeriodo, impactoDevoluciones, quickAlertDefinitions]);

  const currentWeekRange = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today);
    const end = endOfWeek(today);
    const formatter = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
    });

    return {
      label: `${formatter.format(start)} - ${formatter.format(end)}`,
    };
  }, [startOfWeek, endOfWeek]);

  const [ventasDescuentoSemanal, setVentasDescuentoSemanal] = useState<any[]>([]);
  const [loadingPeriodo, setLoadingPeriodo] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);
  const [loadingDevolucionesPeriodo, setLoadingDevolucionesPeriodo] = useState(false);
  const [errorDevolucionesPeriodo, setErrorDevolucionesPeriodo] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const sucursalId = typeof window !== "undefined" ? Number(localStorage.getItem("sucursalId")) : 1;
  const diasPrediccion = 7;
  
  const topProductosFiltrados = useMemo(
    () => topProductos.slice(0, topProductosLimit),
    [topProductos, topProductosLimit],
  );
  const topProductosPieData = useMemo(
    () => buildTopProductosPieData(topProductosFiltrados, TOP_PRODUCTOS_COLORS),
    [topProductosFiltrados, buildTopProductosPieData, TOP_PRODUCTOS_COLORS],
  );

  const bottomProductosFiltrados = useMemo(
    () => bottomProductos.slice(0, bottomProductosLimit),
    [bottomProductos, bottomProductosLimit]
  );

  const bottomProductosPieData = useMemo(
    () =>
      bottomProductosFiltrados.map((producto, index) => ({
        label: producto.nombre,
        value: Number(producto.cantidad),
        color: PRODUCTOS_MIN_COLORS[index % PRODUCTOS_MIN_COLORS.length],
      })),
    [bottomProductosFiltrados, PRODUCTOS_MIN_COLORS]
  );

  const handleFechaInicioChange = (value: string) => {
    setSelectedWeeks([]);
    setSelectedMonth("");
    didSelectDateRangeRef.current = true;
    if (!value) {
      setFechaInicio(value);
      return;
    }

    const parsed = parseDateInput(value);
    if (!parsed) {
      setFechaInicio(value);
      return;
    }

    const normalizedValue = toInputDate(parsed);
    setFechaInicio(normalizedValue);

    if (fechaFin) {
      const currentEnd = parseDateInput(fechaFin);
      if (currentEnd && parsed > currentEnd) {
        setFechaFin(normalizedValue);
      }
    }
  };

  const handleFechaFinChange = (value: string) => {
    setSelectedWeeks([]);
    setSelectedMonth("");
    didSelectDateRangeRef.current = true;
    if (!value) {
      setFechaFin(value);
      return;
    }

    const parsed = parseDateInput(value);
    if (!parsed) {
      setFechaFin(value);
      return;
    }

    const normalizedValue = toInputDate(parsed);
    setFechaFin(normalizedValue);

    if (fechaInicio) {
      const currentStart = parseDateInput(fechaInicio);
      if (currentStart && parsed < currentStart) {
        setFechaInicio(normalizedValue);
      }
    }
  };

  useEffect(() => {
    if (!didSelectDateRangeRef.current) return;
    if (!fechaInicio || !fechaFin) return;
    periodCardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [fechaInicio, fechaFin]);

  const isDateWithinRange = (target: Date, start: Date, end: Date) =>
    target.getTime() >= start.getTime() && target.getTime() <= end.getTime();

  const getWeekIndexForMonth = (dayOfMonth: number) => Math.ceil(dayOfMonth / 7);

  const getWeekInfo = (
    input: string | Date,
    options?: { rangeStart?: Date; rangeEnd?: Date },
  ) => {
    const reference = (() => {
      if (input instanceof Date) {
        return new Date(input);
      }
      const text = String(input).trim();
      const isoLike = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoLike) {
        const [, y, m, d] = isoLike;
        return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
      }
      return new Date(text);
    })();
    if (Number.isNaN(reference.getTime())) {
      return null;
    }

    const monthForLabel = reference.getMonth();
    const yearForLabel = reference.getFullYear();
    const dayOfMonth = reference.getDate();
    const weekIndex = getWeekIndexForMonth(dayOfMonth);
    const weekRange = getWeekRangeForMonth(yearForLabel, monthForLabel, weekIndex - 1);
    if (!weekRange) {
      return null;
    }

    const weekStart = weekRange.start;
    const weekEnd = weekRange.end;
    const formatter = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
    });

    const { rangeStart, rangeEnd } = options ?? {};

    const displayStart = (() => {
      if (rangeStart && isDateWithinRange(rangeStart, weekStart, weekEnd)) {
        return new Date(rangeStart);
      }
      return new Date(weekStart);
    })();
    const displayEnd = (() => {
      if (rangeEnd && isDateWithinRange(rangeEnd, weekStart, weekEnd)) {
        return new Date(rangeEnd);
      }
      return new Date(weekEnd);
    })();

    if (displayEnd.getTime() < displayStart.getTime()) {
      displayEnd.setTime(displayStart.getTime());
    }
    displayStart.setHours(0, 0, 0, 0);
    displayEnd.setHours(0, 0, 0, 0);
    const monthKey = `${yearForLabel}-${String(monthForLabel + 1).padStart(2, "0")}`;
    const monthLabel = capitalize(
      weekEnd.toLocaleDateString("es-MX", { month: "short" }),
    );

    return {
      key: `${monthKey}-W${weekIndex}`,
      label: `Semana ${weekIndex} ${monthLabel}`,
      order: weekStart.getTime(),
      detail: `${formatter.format(displayStart)} - ${formatter.format(displayEnd)}`,
      monthKey,
      weekIndex,
      rangeStartTime: displayStart.getTime(),
      rangeEndTime: displayEnd.getTime(),
    };
  };

  const handleMonthSelect = (value: string) => {
    setSelectedMonth(value);
    setSelectedWeeks([]);

    const [yearStr, monthStr] = value.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
      return;
    }

    const range = getMonthRange(year, monthIndex);
    setFechaInicio(toInputDate(range.start));
    setFechaFin(toInputDate(range.end));
  };

  const handleWeekSelect = (weekIndex: number) => {
    const isAlreadySelected = selectedWeeks.includes(weekIndex);
    let nextSelectedWeeks = isAlreadySelected
      ? selectedWeeks.filter((week) => week !== weekIndex)
      : [...selectedWeeks, weekIndex];

    nextSelectedWeeks.sort((a, b) => a - b);
    setSelectedWeeks(nextSelectedWeeks);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchGerenteResumenData({
          apiUrl,
          sucursalId,
          diasPrediccion,
          token,
        });

        setImpactoDevoluciones(data.impactoDevoluciones);
        setBajaRotacion(data.bajaRotacion);
        setProductosMin(data.productos);
        setPredicciones(data.predicciones);

        const quiebres = data.predicciones.filter((p: any) => p.stockEsperado < 0);
        if (quiebres.length > 0) {
          toast.warning(`Se proyecta desabasto de inventario en ${quiebres.length} producto(s)`);
        }

        setPredVentas(data.predVentas);
        setPredCompras(data.predCompras);
        setPredGastos(data.predGastos);
        setTopProductos(data.topProductos);
        setTopClientes(data.topClientes);
        if (data.metasIA) setMetasIA(data.metasIA);

        setKpisDia(data.kpisDia);
        setKpisSemana(data.kpisSemana);
        setKpisMes(data.kpisMes);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [apiUrl, sucursalId, diasPrediccion, token]); 

  useEffect(() => {
    const fetchTopClientesByPeriodo = async () => {
      if (!apiUrl || !sucursalId) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get(
          `${apiUrl}/gerente/topClientesUltimoMes?sucursalId=${sucursalId}&periodo=${topClientesPeriodo}`,
          { headers },
        );
        setTopClientes(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchTopClientesByPeriodo();
  }, [apiUrl, sucursalId, token, topClientesPeriodo]);

  useEffect(() => {
    const computeDefaultMonthRange = (value: string) => {
      const [yearStr, monthStr] = value.split("-");
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;

      if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
        return null;
      }
      return { year, monthIndex };
    };

    const fetchMonthlyGrowth = async () => {
      if (!apiUrl) return;

      let currentStart, currentEnd;
      let labelActual = "Periodo Actual";

      if (fechaInicio && fechaFin) {
        currentStart = new Date(fechaInicio + "T00:00:00");
        currentEnd = new Date(fechaFin + "T23:59:59");
        labelActual = "Periodo Actual";
      } else {
        const effectiveMonth = selectedMonth || monthOptions[0]?.value;
        if (!effectiveMonth) return;
        const parsed = computeDefaultMonthRange(effectiveMonth);
        if (!parsed) return;
        const range = getMonthRange(parsed.year, parsed.monthIndex);
        currentStart = range.start;
        currentEnd = range.end;
        labelActual = new Date(parsed.year, parsed.monthIndex, 1).toLocaleDateString("es-MX", { month: "long" });
      }

      const duration = currentEnd.getTime() - currentStart.getTime();
      const previousEnd = new Date(currentStart.getTime() - 86400000); 
      const previousStart = new Date(previousEnd.getTime() - duration);

      const labelAnterior = "Periodo Anterior";
      
      const currentStartIso = formatBackendDate(currentStart, false);
      const currentEndIso = formatBackendDate(currentEnd, true);
      const previousStartIso = formatBackendDate(previousStart, false);
      const previousEndIso = formatBackendDate(previousEnd, true);

      setLoadingMonthlyGrowth(true);
      setMonthlyGrowthError(null);

      try {
        const [
          ventasActualRes,
          gastosActualRes,
          comprasActualRes,
          ventasPrevRes,
          gastosPrevRes,
          comprasPrevRes,
          diariaRes,
        ] = await Promise.all([
          axios.get(`${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${currentStartIso}&fechaFin=${currentEndIso}&activo=1`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(currentStart)}&fechaFin=${toInputDate(addDays(currentEnd, 1))}&activos=0`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${toInputDate(currentStart)}&fechaFin=${toInputDate(addDays(currentEnd, 1))}&activos=0`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${previousStartIso}&fechaFin=${previousEndIso}&activo=1`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(previousStart)}&fechaFin=${toInputDate(addDays(previousEnd, 1))}&activos=0`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${toInputDate(previousStart)}&fechaFin=${toInputDate(addDays(previousEnd, 1))}&activos=0`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
          axios.get(`${apiUrl}/gerente/comparativa-diaria`, {
            params: { sucursalId, fechaInicioActual: currentStartIso, fechaFinActual: currentEndIso, fechaInicioAnterior: previousStartIso, fechaFinAnterior: previousEndIso },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
        ]);

        const ventasActuales = (Array.isArray(ventasActualRes.data) ? ventasActualRes.data : []).filter(isValidSale);
        const ventasPrevias = (Array.isArray(ventasPrevRes.data) ? ventasPrevRes.data : []).filter(isValidSale);
        
        const gastosActuales = (Array.isArray(gastosActualRes.data) ? gastosActualRes.data : []).filter(isActiveExpense);
        const comprasActuales = (Array.isArray(comprasActualRes.data) ? comprasActualRes.data : []).filter(isActiveExpense);
        const gastosPrevios = (Array.isArray(gastosPrevRes.data) ? gastosPrevRes.data : []).filter(isActiveExpense);
        const comprasPrevias = (Array.isArray(comprasPrevRes.data) ? comprasPrevRes.data : []).filter(isActiveExpense);

        // Ventas puras
        const totalVentasActual = ventasActuales.reduce((sum: number, v: any) => sum + (Number(v.total) || 0), 0);
        const totalVentasPrevio = ventasPrevias.reduce((sum: number, v: any) => sum + (Number(v.total) || 0), 0);
        
        const totalGastosActual = gastosActuales.reduce((sum: number, g: any) => sum + getExpenseAmount(g), 0);
        const totalComprasActual = comprasActuales.reduce((sum: number, c: any) => sum + getExpenseAmount(c), 0);
        const totalGastosPrevio = gastosPrevios.reduce((sum: number, g: any) => sum + getExpenseAmount(g), 0);
        const totalComprasPrevio = comprasPrevias.reduce((sum: number, c: any) => sum + getExpenseAmount(c), 0);
        
        const totalEgresosActual = totalGastosActual + totalComprasActual;
        const totalEgresosPrevio = totalGastosPrevio + totalComprasPrevio;

        setMonthlyComparison({
          current: {
            ventas: totalVentasActual,
            gastos: totalEgresosActual,
            utilidad: totalVentasActual - totalEgresosActual,
            label: capitalize(labelActual),
          },
          previous: {
            ventas: totalVentasPrevio,
            gastos: totalEgresosPrevio,
            utilidad: totalVentasPrevio - totalEgresosPrevio,
            label: capitalize(labelAnterior),
          },
        });

        if (diariaRes.data && Array.isArray(diariaRes.data)) {
          setDailyComparisonData(diariaRes.data);
        }
      } catch (error) {
        console.error(error);
        setMonthlyComparison(null);
        setMonthlyGrowthError("Error al calcular datos.");
      } finally {
        setLoadingMonthlyGrowth(false);
      }
    };

    fetchMonthlyGrowth();
  }, [selectedMonth, fechaInicio, fechaFin, apiUrl, sucursalId, token]);

  useEffect(() => {
   const fetchVentasUtilidadPeriodo = async () => {
    if (!fechaInicio || !fechaFin) return;

    const inicioDate = parseDateInput(fechaInicio);
    const finDate = parseDateInput(fechaFin);

    if (!inicioDate || !finDate || inicioDate > finDate) {
      setErrorPeriodo("Selecciona un rango de fechas válido.");
      setComparativaPeriodo([]);
      setVentasDescuentoSemanal([]);
      return;
    }

    const normalizedInicio = startOfWeek(inicioDate);
    const normalizedFin = endOfWeek(finDate);

    if (normalizedInicio > normalizedFin) {
      setErrorPeriodo("Selecciona un rango de fechas válido.");
      setComparativaPeriodo([]);
      setVentasDescuentoSemanal([]);
      return;
    }

    setErrorPeriodo(null);
    setErrorDevolucionesPeriodo(null);
    setLoadingPeriodo(true);
    setLoadingDevolucionesPeriodo(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      
      const inicioISO = formatBackendDate(inicioDate, false);
      const finISO = formatBackendDate(finDate, true);
      
      const [ventasRes, devolucionesRes, gastosRes, comprasRes] = await Promise.all([
        axios.get(`${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicioISO}&fechaFin=${finISO}&activo=1`, { headers }),
        axios.get(`${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicioISO}&fechaFin=${finISO}&activo=0`, { headers }),
        axios.get(`${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(inicioDate)}&fechaFin=${toInputDate(addDays(finDate, 1))}&activos=0`, { headers }),
        axios.get(`${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${toInputDate(inicioDate)}&fechaFin=${toInputDate(addDays(finDate, 1))}&activos=0`, { headers }),
      ]);
      
      // 🔥 FILTROS ESTRICTOS: Separamos la paja del trigo
      const ventasData = (Array.isArray(ventasRes.data) ? ventasRes.data : []).filter(isValidSale);
      const devolucionesData = (Array.isArray(devolucionesRes.data) ? devolucionesRes.data : []).filter(isReturnSale);
      
      const gastosData = Array.isArray(gastosRes.data) ? gastosRes.data : [];
      const comprasData = Array.isArray(comprasRes.data)
        ? comprasRes.data.map((compra: any) => ({
            ...compra,
            monto: getExpenseAmount(compra),
            activo: Number(compra?.activo ?? 1),
          }))
        : [];

      if (typeof setVentasRaw === 'function') setVentasRaw(ventasData);
      if (typeof setDevolucionesRaw === 'function') setDevolucionesRaw(devolucionesData);
      if (typeof setGastosRaw === 'function') setGastosRaw(gastosData);
      if (typeof setComprasRaw === 'function') setComprasRaw(comprasData);

      const detallesVentas = ventasData.length
        ? await Promise.all(
            ventasData.map(async (venta: any) => {
              try {
                const res = await axios.get(`${apiUrl}/venta/${venta.id}`, { headers });
                return (res.data.detalles || []);
              } catch (error) {
                console.error(error);
                return [];
              }
            }),
          )
        : [];

      const totalesPorSemana = new Map<string, any>();
      const gastosPorSemana = new Map<string, any>();
      const comprasPorSemana = new Map<string, any>(); // 🟢 NUEVO: Map separado para compras
      const devolucionesPorSemana = new Map<string, any>();
      const ventasDescuentoPorSemana = new Map<string, any>();
      const conteoVentasPorProducto = new Map<string, number>();

      const cursor = new Date(normalizedInicio);
      while (cursor <= normalizedFin) {
        const weekEnd = endOfWeek(cursor);
        let referenceForWeek = new Date(cursor);
        if (isDateWithinRange(inicioDate, cursor, weekEnd)) {
          referenceForWeek = new Date(inicioDate);
        } else if (isDateWithinRange(finDate, cursor, weekEnd)) {
          referenceForWeek = new Date(finDate);
        }

        const infoSemanaRango = getWeekInfo(referenceForWeek, { rangeStart: inicioDate, rangeEnd: finDate });
        if (infoSemanaRango) {
          if (!totalesPorSemana.has(infoSemanaRango.key)) {
            totalesPorSemana.set(infoSemanaRango.key, {
              ventas: 0, label: infoSemanaRango.label, order: infoSemanaRango.order,
              detail: infoSemanaRango.detail, monthKey: infoSemanaRango.monthKey,
              weekIndex: infoSemanaRango.weekIndex, rangeStartTime: infoSemanaRango.rangeStartTime, rangeEndTime: infoSemanaRango.rangeEndTime,
            });
          }
          if (!gastosPorSemana.has(infoSemanaRango.key)) {
            gastosPorSemana.set(infoSemanaRango.key, {
              total: 0, label: infoSemanaRango.label, order: infoSemanaRango.order,
              detail: infoSemanaRango.detail, monthKey: infoSemanaRango.monthKey,
              weekIndex: infoSemanaRango.weekIndex, rangeStartTime: infoSemanaRango.rangeStartTime, rangeEndTime: infoSemanaRango.rangeEndTime,
            });
          }
          if (!comprasPorSemana.has(infoSemanaRango.key)) {
            comprasPorSemana.set(infoSemanaRango.key, {
              total: 0, label: infoSemanaRango.label, order: infoSemanaRango.order,
              detail: infoSemanaRango.detail, monthKey: infoSemanaRango.monthKey,
              weekIndex: infoSemanaRango.weekIndex, rangeStartTime: infoSemanaRango.rangeStartTime, rangeEndTime: infoSemanaRango.rangeEndTime,
            });
          }
          if (!devolucionesPorSemana.has(infoSemanaRango.key)) {
            devolucionesPorSemana.set(infoSemanaRango.key, {
              total: 0, label: infoSemanaRango.label, order: infoSemanaRango.order,
              detail: infoSemanaRango.detail, monthKey: infoSemanaRango.monthKey,
              weekIndex: infoSemanaRango.weekIndex, rangeStartTime: infoSemanaRango.rangeStartTime, rangeEndTime: infoSemanaRango.rangeEndTime,
            });
          }
          if (!ventasDescuentoPorSemana.has(infoSemanaRango.key)) {
            ventasDescuentoPorSemana.set(infoSemanaRango.key, {
              total: 0, label: infoSemanaRango.label, order: infoSemanaRango.order,
              detail: infoSemanaRango.detail, monthKey: infoSemanaRango.monthKey,
              weekIndex: infoSemanaRango.weekIndex, rangeStartTime: infoSemanaRango.rangeStartTime, rangeEndTime: infoSemanaRango.rangeEndTime,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 7);
      }
      
      const weekInfoOptions = { rangeStart: inicioDate, rangeEnd: finDate };

      // Iteramos sobre VENTAS
      ventasData.forEach((venta: any, index: number) => {
        const infoSemana = venta.fecha ? getWeekInfo(venta.fecha, weekInfoOptions) : null;
        if (!infoSemana) return;

        const bucket = totalesPorSemana.get(infoSemana.key);
        if (bucket) {
          bucket.ventas += Number(venta.total) || 0;
        }

        const detalles = detallesVentas[index] || [];
        let detallesConDescuento = false;

        detalles.forEach((detalle: any) => {
          if (detalle.activo === 0) return;

          if (detalle.producto?.nombre) {
             const actual = conteoVentasPorProducto.get(detalle.producto.nombre) || 0;
             conteoVentasPorProducto.set(detalle.producto.nombre, actual + detalle.cantidad);
          }

          if (!detallesConDescuento && Number(detalle.descuento) > 0) {
            detallesConDescuento = true;
          }
        });

        const descuentoGeneral = Number(venta.descuento) > 0;
        const tieneDescuento = descuentoGeneral || detallesConDescuento;

        if (tieneDescuento && Number(venta.total) > 0) {
          const bucketDescuento = ventasDescuentoPorSemana.get(infoSemana.key);
          if (bucketDescuento) {
            bucketDescuento.total += Number(venta.total);
          }
        }
      });

      // Iteramos sobre GASTOS
      gastosData.forEach((gasto: any) => {
        const infoSemana = gasto.fecha ? getWeekInfo(gasto.fecha, weekInfoOptions) : null;
        if (!infoSemana) return;
        if (gasto.activo === 0) return;

        const bucket = gastosPorSemana.get(infoSemana.key);
        if (bucket) bucket.total += Number(gasto.monto) || 0;
      });

      // Iteramos sobre COMPRAS (Ya no se suman a los gastos)
      comprasData.forEach((compra: any) => {
        const infoSemana = compra.fecha ? getWeekInfo(compra.fecha, weekInfoOptions) : null;
        if (!infoSemana) return;
        if (!isActiveExpense(compra)) return;

        const bucket = comprasPorSemana.get(infoSemana.key);
        if (bucket) bucket.total += getExpenseAmount(compra);
      });

      // Iteramos sobre DEVOLUCIONES
      devolucionesData.forEach((venta: any) => {
        const referencia = venta.fecha_devolucion || venta.fecha;
        if (!referencia) return;

        const infoSemana = getWeekInfo(referencia, weekInfoOptions);
        if (!infoSemana) return;

        const bucket = devolucionesPorSemana.get(infoSemana.key);
        if (bucket) bucket.total += Number(venta.total) || 0;
      });

      const comparativa = Array.from(totalesPorSemana.entries())
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key, item]) => {
          const gastosSemana = gastosPorSemana.get(key)?.total ?? 0;
          const comprasSemana = comprasPorSemana.get(key)?.total ?? 0;
          const utilidadSemana = item.ventas - gastosSemana - comprasSemana;

          return {
            ...item,
            gastos: gastosSemana,
            compras: comprasSemana,
            utilidad: utilidadSemana,
          };
        });
      setComparativaPeriodo(comparativa);

      setGastosSemanalPeriodo(Array.from(gastosPorSemana.values()).sort((a, b) => a.order - b.order));
      setDevolucionesSemanalPeriodo(Array.from(devolucionesPorSemana.values()).sort((a, b) => a.order - b.order));
      setVentasDescuentoSemanal(Array.from(ventasDescuentoPorSemana.values()).sort((a, b) => a.order - b.order));

      const listaMenosVendidos = Array.from(conteoVentasPorProducto.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => a.cantidad - b.cantidad);

      setBottomProductos(listaMenosVendidos);

    } catch (error) {
      console.error(error);
      setErrorPeriodo("No se pudo cargar la información del periodo seleccionado.");
      setComparativaPeriodo([]);
      setGastosSemanalPeriodo([]);
      setErrorDevolucionesPeriodo("No se pudo cargar la información de las devoluciones.");
      setDevolucionesSemanalPeriodo([]);
      setVentasDescuentoSemanal([]);
      setBottomProductos([]);
    } finally {
      setLoadingPeriodo(false);
      setLoadingDevolucionesPeriodo(false);
    }
  };

    fetchVentasUtilidadPeriodo();
  }, [fechaInicio, fechaFin, apiUrl, sucursalId, token]); 

  const quiebres = useMemo(
    () => predicciones.filter((p) => p.stockEsperado < 0),
    [predicciones],
  );

  const periodoStartTime = useMemo(() => {
    if (!fechaInicio) return null;
    const parsed = parseDateInput(fechaInicio);
    return parsed ? parsed.getTime() : null;
  }, [fechaInicio, parseDateInput]);

  const periodoEndTime = useMemo(() => {
    if (!fechaFin) return null;
    const parsed = parseDateInput(fechaFin);
    return parsed ? parsed.getTime() + 86399999 : null;
  }, [fechaFin, parseDateInput]);

  const selectedWeeksSet = useMemo(() => new Set(selectedWeeks), [selectedWeeks]);
  const shouldFilterByWeeks = selectedMonth !== "" && selectedWeeks.length > 0;

  const comparativaPeriodoFiltrada = useMemo(
    () =>
      comparativaPeriodo.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime && item.rangeEndTime >= periodoStartTime;
        const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth && selectedWeeksSet.has(item.weekIndex - 1)
          : true;
        return matchesDateRange && matchesSelectedWeeks;
      }),
    [comparativaPeriodo, periodoEndTime, periodoStartTime, selectedMonth, selectedWeeksSet, shouldFilterByWeeks],
  );

  const gastosSemanalPeriodoFiltrado = useMemo(
    () =>
      gastosSemanalPeriodo.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime && item.rangeEndTime >= periodoStartTime;
        const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth && selectedWeeksSet.has(item.weekIndex - 1)
          : true;
        return matchesDateRange && matchesSelectedWeeks;
      }),
    [gastosSemanalPeriodo, periodoEndTime, periodoStartTime, selectedMonth, selectedWeeksSet, shouldFilterByWeeks],
  );

  const { devolucionesFiltradas: devolucionesSemanalPeriodoFiltrado, descuentosFiltrados: ventasDescuentoSemanalFiltrado } =
    useMemo(
      () =>
        buildPeriodCardsState({
          devoluciones: devolucionesSemanalPeriodo,
          descuentos: ventasDescuentoSemanal,
          periodoStartTime,
          periodoEndTime,
          selectedMonth,
          selectedWeeksSet,
          shouldFilterByWeeks,
        }),
      [devolucionesSemanalPeriodo, ventasDescuentoSemanal, periodoStartTime, periodoEndTime, selectedMonth, selectedWeeksSet, shouldFilterByWeeks, buildPeriodCardsState],
    );

  const devolucionesSemanalPeriodoDisplay = devolucionesSemanalPeriodoFiltrado;
  const ventasDescuentoSemanalDisplay = ventasDescuentoSemanalFiltrado;

  const resumenSemanal = useMemo(
    () =>
      comparativaPeriodoFiltrada.reduce(
        (acc, item) => ({
          totalVentas: acc.totalVentas + item.ventas,
          totalUtilidad: acc.totalUtilidad + item.utilidad,
          totalGastos: acc.totalGastos + (item.gastos ?? 0),
          totalCompras: acc.totalCompras + (item.compras ?? 0),
        }),
        { totalVentas: 0, totalUtilidad: 0, totalGastos: 0, totalCompras: 0 },
      ),
    [comparativaPeriodoFiltrada],
  );

  const resumenGastosSemanal = useMemo(
    () => gastosSemanalPeriodoFiltrado.reduce((acc, item) => acc + item.total, 0),
    [gastosSemanalPeriodoFiltrado],
  );

  const comparativaPeriodoDisplay = comparativaPeriodoFiltrada;

  const ingresosBarChartData = useMemo(
    () =>
      comparativaPeriodoDisplay.map((item) => ({
        label: item.label,
        value: item.ventas,
        detail: item.detail,
      })),
    [comparativaPeriodoDisplay],
  );

  const gastosBarChartData = useMemo(
    () =>
      gastosSemanalPeriodoFiltrado.map((item) => ({
        label: item.label,
        value: item.total,
        detail: item.detail,
      })),
    [gastosSemanalPeriodoFiltrado],
  );

  // Totales limpios
  const totalIngresosPeriodo = resumenSemanal.totalVentas;
  const totalGastosOperativosPeriodo = resumenSemanal.totalGastos;
  const totalComprasPeriodo = resumenSemanal.totalCompras;
  const totalEgresosPeriodo = totalGastosOperativosPeriodo + totalComprasPeriodo;
  const utilidadNetaPeriodo = resumenSemanal.totalUtilidad;

  // 🔥 PASTEL CORREGIDO: 3 Rebanadas claras (Utilidad, Gastos, Compras)
  const utilidadPieChartData = useMemo(() => {
    if (utilidadNetaPeriodo >= 0) {
      return [
        { label: "Compras", value: Math.max(totalComprasPeriodo, 0), color: "#94a3b8" }, // Gris
        { label: "Gastos operativos", value: Math.max(totalGastosOperativosPeriodo, 0), color: "#f97316" }, // Naranja
        { label: "Utilidad neta", value: Math.max(utilidadNetaPeriodo, 0), color: "#0ea5e9" }, // Azul
      ];
    }
    const totalCostosYGastos = Math.max(totalEgresosPeriodo, 0);
    return [
      { label: "Ingresos", value: Math.max(totalIngresosPeriodo, 0), color: "#22c55e" },
      { label: "Costos y gastos", value: totalCostosYGastos, color: "#f97316" },
    ];
  }, [totalComprasPeriodo, totalGastosOperativosPeriodo, totalEgresosPeriodo, totalIngresosPeriodo, utilidadNetaPeriodo]);

  const resumenDevolucionesSemanal = useMemo(
    () => sumWeeklyTotals(devolucionesSemanalPeriodoDisplay),
    [devolucionesSemanalPeriodoDisplay, sumWeeklyTotals],
  );
  const totalVentasDescuentoPeriodo = useMemo(
    () => sumWeeklyTotals(ventasDescuentoSemanalDisplay),
    [ventasDescuentoSemanalDisplay, sumWeeklyTotals],
  );

  const hayVentasDescuento = useMemo(
    () => hasPositiveTotals(ventasDescuentoSemanalDisplay),
    [ventasDescuentoSemanalDisplay, hasPositiveTotals],
  );

  const evaluatedManagerialAlerts = useMemo(() => {
    const comparativaFuente = comparativaPeriodoFiltrada.length > 0 ? comparativaPeriodoFiltrada : comparativaPeriodo;
    const context = {
      kpisDia, kpisSemana, kpisMes, monthlyComparison, comparativaPeriodo: comparativaFuente, dailyNetProfit, impactoDevoluciones
    };
    return managerialAlertDefinitions.map((definition: any) => {
      const evaluation = definition.evaluate(context);
      return { ...definition, ...evaluation, severity: evaluation.severity };
    });
  }, [comparativaPeriodo, comparativaPeriodoFiltrada, dailyNetProfit, kpisDia, kpisMes, kpisSemana, monthlyComparison, impactoDevoluciones, managerialAlertDefinitions]);

  const monthlyGrowthEntries = useMemo(
    () =>
      monthlyComparison
        ? [
            { key: "ventas" as const, label: "Ingresos", current: monthlyComparison.current.ventas, previous: monthlyComparison.previous.ventas },
            { key: "gastos" as const, label: "Gastos", current: monthlyComparison.current.gastos, previous: monthlyComparison.previous.gastos },
            { key: "utilidad" as const, label: "Utilidad", current: monthlyComparison.current.utilidad, previous: monthlyComparison.previous.utilidad },
          ].map((entry) => ({
            ...entry,
            growth: entry.previous === 0 ? (entry.current === 0 ? 0 : null) : (entry.current - entry.previous) / entry.previous,
          }))
        : [],
    [monthlyComparison],
  );

  const monthlyGrowthMaxValue = useMemo(() => {
    if (!monthlyGrowthEntries.length) return 0;
    const max = Math.max(...monthlyGrowthEntries.map((entry) => Math.abs(entry.growth ?? 0)));
    return Number.isFinite(max) ? max : 0;
  }, [monthlyGrowthEntries]);

  const monthlyGrowthRadarData = useMemo(
    () =>
      monthlyGrowthEntries.map((entry) => {
        const growthPercent = entry.growth === null ? null : entry.growth * 100;
        const trend = growthPercent === null ? "na" : growthPercent > 0 ? "positive" : growthPercent < 0 ? "negative" : "neutral";
        return {
          label: entry.label,
          value: growthPercent ?? 0,
          display: growthPercent === null ? "Sin referencia" : `${growthPercent.toFixed(1)}%`,
          currentFormatted: formatCurrency(entry.current),
          previousFormatted: formatCurrency(entry.previous),
          trend,
        };
      }),
    [monthlyGrowthEntries],
  );

  const topClientesTop10 = useMemo(() => topClientes.slice(0, 10), [topClientes]);

  const performanceSummaryRows = useMemo(
    () => buildPerformanceSummaryRows(kpisMes, new Date()),
    [kpisMes, buildPerformanceSummaryRows],
  );

  const monthlyGrowthTableData = useMemo(() => {
    const groups = new Map<string, { dateObj: Date; label: string; ingresos: number; gastos: number; compras: number }>();

    if (fechaInicio && fechaFin) {
      const start = new Date(parseDateInput(fechaInicio) || new Date());
      const end = new Date(parseDateInput(fechaFin) || new Date());
      start.setDate(1);
      const current = new Date(start);

      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, "0")}`;
        groups.set(key, {
          dateObj: new Date(current),
          label: `${capitalize(current.toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" }))} ${year}`,
          ingresos: 0,
          gastos: 0,
          compras: 0
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    const getMonthKey = (dateStr: string) => {
      const match = dateStr.match(/^(\d{4})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}`;
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    ventasRaw.forEach((v) => {
      if (!v.fecha) return;
      if (!isValidSale(v)) return; // 🔥 FILTRO ESTRICTO
      const key = getMonthKey(v.fecha);
      if (groups.has(key)) groups.get(key)!.ingresos += Number(v.total || 0);
    });

    gastosRaw.forEach((g) => {
      if (!isActiveExpense(g)) return;
      if (!g.fecha) return;
      const key = getMonthKey(g.fecha);
      if (groups.has(key)) groups.get(key)!.gastos += getExpenseAmount(g);
    });

    comprasRaw.forEach((c) => {
      if (!isActiveExpense(c)) return;
      if (!c.fecha) return;
      const key = getMonthKey(c.fecha);
      if (groups.has(key)) groups.get(key)!.compras += getExpenseAmount(c);
    });

    const sortedMonths = Array.from(groups.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    return sortedMonths.map((curr, index) => {
      const utilidad = curr.ingresos - curr.gastos - curr.compras;
      const isNegative = utilidad < 0;

      let variacion = 0;
      let hasPrevious = false;

      if (index > 0) {
        const prev = sortedMonths[index - 1];
        const prevUtilidad = prev.ingresos - prev.gastos - prev.compras;
        hasPrevious = true;

        if (prevUtilidad !== 0) {
          variacion = ((utilidad - prevUtilidad) / Math.abs(prevUtilidad)) * 100;
        } else if (utilidad !== 0) {
          variacion = utilidad > 0 ? 100 : -100;
        }
      }

      // Sumamos compras a gastos para que se vea un solo "egreso" en la tabla de crecimiento si lo deseas
      return { ...curr, gastos: curr.gastos + curr.compras, utilidad, variacion, hasPrevious, isNegative };
    });
  }, [ventasRaw, gastosRaw, comprasRaw, fechaInicio, fechaFin, parseDateInput, capitalize]);

  const currentMonthLabel = monthlyComparison?.current.label ?? "Mes actual";
  const previousMonthLabel = monthlyComparison?.previous.label ?? "Mes anterior";

  const filterByWeeks = (items: any[], filterType: "ventas" | "egresos") => {
    if (selectedWeeks.length === 0) {
      return filterType === "ventas" ? items.filter(isValidSale) : items; 
    }
    return items.filter((item) => {
      if (filterType === "ventas" && !isValidSale(item)) return false; 
      
      const dateVal = item.fecha || item.fecha_devolucion;
      if (!dateVal) return false;
      
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return false;
      
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const dayOfMonth = Number(match[3]);

      return selectedWeeks.some((weekIndex) => {
        const endOfMonth = new Date(year, month + 1, 0).getDate();
        const startDay = weekIndex * 7 + 1;
        const endDay = Math.min(startDay + 6, endOfMonth);
        return dayOfMonth >= startDay && dayOfMonth <= endDay;
      });
    });
  };

  const egresosRaw = useMemo(() => [...gastosRaw, ...comprasRaw], [gastosRaw, comprasRaw]);

  const ventasFiltradas = useMemo(() => filterByWeeks(ventasRaw, "ventas"), [ventasRaw, selectedWeeks]);
  const gastosFiltrados = useMemo(() => filterByWeeks(egresosRaw, "egresos"), [egresosRaw, selectedWeeks]);

  const totalIngresosFiltrados = ventasFiltradas.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalCostosFiltrados = gastosFiltrados.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

  return {
    defaultDateRange,
    bottomProductos,
    setBottomProductos,
    bottomProductosLimit,
    setBottomProductosLimit,
    productosMin,
    setProductosMin,
    productosMinLimit,
    setProductosMinLimit,
    predicciones,
    setPredicciones,
    predVentas,
    setPredVentas,
    predCompras,
    setPredCompras,
    predGastos,
    setPredGastos,
    kpisDia,
    setKpisDia,
    kpisSemana,
    setKpisSemana,
    kpisMes,
    setKpisMes,
    topProductos,
    setTopProductos,
    topProductosLimit,
    setTopProductosLimit,
    topClientes,
    setTopClientes,
    topClientesPeriodo,
    setTopClientesPeriodo,
    bajaRotacion,
    setBajaRotacion,
    bajaRotacionLimit,
    setBajaRotacionLimit,
    impactoDevoluciones,
    setImpactoDevoluciones,
    monthlyComparison,
    setMonthlyComparison,
    loadingMonthlyGrowth,
    setLoadingMonthlyGrowth,
    monthlyGrowthError,
    setMonthlyGrowthError,
    dailyComparisonData,
    setDailyComparisonData,
    dailyGrowthData,
    setDailyGrowthData,
    ventasRaw,
    setVentasRaw,
    gastosRaw,
    setGastosRaw,
    comprasRaw,
    setComprasRaw,
    devolucionesRaw,
    setDevolucionesRaw,
    metasIA,
    setMetasIA,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    selectedMonth,
    setSelectedMonth,
    selectedWeeks,
    setSelectedWeeks,
    weekOptions,
    comparativaPeriodo,
    setComparativaPeriodo,
    gastosSemanalPeriodo,
    setGastosSemanalPeriodo,
    devolucionesSemanalPeriodo,
    setDevolucionesSemanalPeriodo,
    financialTableDia,
    financialTableSemana,
    financialTableMes,
    triggeredQuickAlertsRef,
    periodCardsRef,
    didSelectDateRangeRef,
    dailyNetProfit,
    evaluatedQuickAlerts,
    currentWeekRange,
    ventasDescuentoSemanal,
    setVentasDescuentoSemanal,
    loadingPeriodo,
    setLoadingPeriodo,
    errorPeriodo,
    setErrorPeriodo,
    loadingDevolucionesPeriodo,
    setLoadingDevolucionesPeriodo,
    errorDevolucionesPeriodo,
    setErrorDevolucionesPeriodo,
    apiUrl,
    token,
    sucursalId,
    diasPrediccion,
    topProductosFiltrados,
    topProductosPieData,
    bottomProductosFiltrados,
    bottomProductosPieData,
    monthOptions,
    handleFechaInicioChange,
    handleFechaFinChange,
    isDateWithinRange,
    getWeekIndexForMonth,
    getWeekInfo,
    handleMonthSelect,
    handleWeekSelect,
    quiebres,
    periodoStartTime,
    periodoEndTime,
    selectedWeeksSet,
    shouldFilterByWeeks,
    comparativaPeriodoFiltrada,
    gastosSemanalPeriodoFiltrado,
    devolucionesSemanalPeriodoDisplay,
    ventasDescuentoSemanalDisplay,
    resumenSemanal,
    resumenGastosSemanal,
    comparativaPeriodoDisplay,
    ingresosBarChartData,
    gastosBarChartData,
    totalIngresosPeriodo,
    totalGastosOperativosPeriodo, 
    totalComprasPeriodo,
    totalEgresosPeriodo,
    utilidadNetaPeriodo,
    utilidadPieChartData,
    resumenDevolucionesSemanal,
    totalVentasDescuentoPeriodo,
    hayVentasDescuento,
    evaluatedManagerialAlerts,
    monthlyGrowthEntries,
    monthlyGrowthMaxValue,
    monthlyGrowthRadarData,
    topClientesTop10,
    performanceSummaryRows,
    monthlyGrowthTableData,
    currentMonthLabel,
    previousMonthLabel,
    filterByWeeks,
    ventasFiltradas,
    gastosFiltrados,
    totalIngresosFiltrados,
    totalCostosFiltrados
  };
}