'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Search, X } from 'lucide-react';

export type CatalogoItem = {
    id?: number;
    clave: string;
    nombre?: string | null;
    descripcion: string;
    fecha_inicio_vigencia?: string | null;
    fecha_fin_vigencia?: string | null;
    palabras_similares?: string | string[] | null;
};

function fmtDate(d?: string | null) {
    if (!d) return '—';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-MX');
}

function normalizeResponse(json: any): { items: CatalogoItem[]; page: number; pageSize: number; total: number; totalPages: number } {
    const data = Array.isArray(json) ? json : json?.data ?? [];
    const meta = json?.meta ?? {};
    const items = (data ?? []).map((r: any) => ({
        id: r.id ?? r.ID ?? undefined,
        clave: r.clave ?? r.c_ClaveProdServ ?? r.c_ClaveUnidad ?? r['c_ClaveProdServ'] ?? r['c_ClaveUnidad'] ?? '',
        nombre: r.nombre ?? r.Nombre ?? null,
        descripcion: r.descripcion ?? r.Descripcion ?? '',
        fecha_inicio_vigencia: r.fecha_inicio_vigencia ?? r.inicio ?? null,
        fecha_fin_vigencia: r.fecha_fin_vigencia ?? r.fin ?? null,
        palabras_similares:
            r.palabras_similares ??
            r.palabrasSimilares ??
            r.palabras ??
            null,
    }));
    const page = Number(meta.page ?? 1);
    const pageSize = Number(meta.pageSize ?? (items.length || 50));
    const total = Number(meta.total ?? items.length);
    const totalPages = Number(meta.totalPages ?? Math.max(1, Math.ceil(total / (pageSize || 50))));
    return { items, page, pageSize, total, totalPages };
}

function useDebouncedValue<T>(value: T, delay = 400) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function Highlight({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${q})`, 'ig'));
    return (
        <>
            {parts.map((p, i) =>
                p.toLowerCase() === query.toLowerCase()
                    ? (
                        <mark key={i} className="rounded px-0.5 bg-yellow-200">
                            {p}
                        </mark>
                    )
                    : (
                        <span key={i}>{p}</span>
                    )
            )}
        </>
    );
}

export function CatalogoSATDialog({
    open,
    onOpenChange,
    title,
    description,
    endpoint,
    pageSize: defaultPageSize = 50,
    onSelect,
    showSimilarWords = false,
    showNombre = false,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    description?: string;
    endpoint: string;
    pageSize?: number;
    onSelect: (item: CatalogoItem) => void;
    showSimilarWords?: boolean;
    showNombre?: boolean;
}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const [q, setQ] = useState('');
    const debouncedQ = useDebouncedValue(q);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [rows, setRows] = useState<CatalogoItem[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const searchRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const fetchPage = async (p: number, query: string, ps: number) => {
        if (!endpoint) return;
        setLoading(true);
        setErr(null);

        try {
            const params = new URLSearchParams({
                page: String(p),
                pageSize: String(ps),
            });
            if (query.trim()) params.set('q', query.trim());

            const res = await fetch(`${endpoint}?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) {
                throw new Error(`Error ${res.status}`);
            }
            const json = await res.json();
            const { items, page: pg, totalPages: tp, total: tot } = normalizeResponse(json);

            setRows(items);
            setPage(pg);
            setTotalPages(Math.max(1, Math.ceil(tot / ps)));
            setTotal(tot);
            setActiveIndex(items.length ? 0 : -1);
        } catch (error: any) {
            console.error('Error cargando catálogo SAT:', error);
            setErr('No se pudo cargar el catálogo. Intenta nuevamente.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setQ('');
            setPage(1);
            setPageSize(defaultPageSize);
            setRows([]);
            setTotal(0);
            setTotalPages(1);
            setActiveIndex(-1);
            requestAnimationFrame(() => searchRef.current?.focus());
            fetchPage(1, '', defaultPageSize);
        }
    }, [open, defaultPageSize]);

    useEffect(() => {
        if (!open) return;
        fetchPage(1, debouncedQ, pageSize);
    }, [debouncedQ, pageSize, open]);

    const go = (next: number) => {
        const clamped = Math.min(Math.max(next, 1), Math.max(1, totalPages));
        setPage(clamped);
        fetchPage(clamped, debouncedQ, pageSize);
    };

    useEffect(() => {
        const next = Math.min(page, totalPages);
        if (next !== page) {
            setPage(next);
            fetchPage(next, debouncedQ, pageSize);
        }
    }, [totalPages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!rows.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
            tableRef.current
                ?.querySelectorAll('tr[data-row]')
                ?.[Math.min(activeIndex + 1, rows.length - 1)]
                ?.scrollIntoView({ block: 'nearest' });
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
            tableRef.current
                ?.querySelectorAll('tr[data-row]')
                ?.[Math.max(activeIndex - 1, 0)]
                ?.scrollIntoView({ block: 'nearest' });
        }
        if (e.key === 'Enter' && activeIndex >= 0) {
            onSelect(rows[activeIndex]);
            onOpenChange(false);
        }
        if (e.key === 'Escape') onOpenChange(false);
    };

    const showing = useMemo(() => rows.length, [rows]);
    const colSpan = 3 + (showNombre ? 1 : 0) + (showSimilarWords ? 1 : 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden" onKeyDown={handleKeyDown}>
                <div className="sticky top-0 z-10 border-b bg-white">
                    <DialogHeader className="px-6 pt-5 pb-3">
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                        {description ? <DialogDescription>{description}</DialogDescription> : null}
                    </DialogHeader>

                    <div className="px-6 pb-4 flex flex-col gap-3">
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    ref={searchRef}
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Buscar por clave, nombre o descripción…"
                                    className="pl-8"
                                />
                                {q && (
                                    <button
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                                        onClick={() => setQ('')}
                                        aria-label="Limpiar búsqueda"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    className="h-9 rounded-md border px-2 text-sm"
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    title="Resultados por página"
                                >
                                    {[25, 50, 100, 200].map((n) => (
                                        <option key={n} value={n}>
                                            {n}/pág
                                        </option>
                                    ))}
                                </select>
                                <Button variant="outline" onClick={() => fetchPage(page, q, pageSize)} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Actualizar
                                </Button>
                            </div>
                        </div>

                        <div className="text-xs text-gray-600">
                            {loading ? 'Cargando…' : `Mostrando ${showing} de ${total} resultados`}
                        </div>
                    </div>
                </div>

                <div ref={tableRef} className="px-6 pb-4 max-h-[60vh] overflow-auto">
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0">
                                <TableRow>
                                    <TableHead className="w-40">Clave</TableHead>
                                    {showNombre && <TableHead className="w-56">Nombre</TableHead>}
                                    <TableHead>Descripción</TableHead>
                                    {showSimilarWords && <TableHead className="min-w-[240px]">Palabras similares</TableHead>}
                                    <TableHead className="w-48 text-right">Vigencia</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading &&
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <TableRow key={`sk-${i}`}>
                                            <TableCell>
                                                <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
                                            </TableCell>
                                            {showNombre && (
                                                <TableCell>
                                                    <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" />
                                            </TableCell>
                                            {showSimilarWords && (
                                                <TableCell>
                                                    <div className="h-3 w-40 bg-gray-200 animate-pulse rounded" />
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <div className="h-3 w-24 bg-gray-200 animate-pulse rounded ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                {!loading && err && (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center py-8 text-red-600">
                                            {err}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!loading && !err && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center py-8 text-gray-500">
                                            Sin resultados. Prueba con otra palabra clave.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {rows.map((r, i) => {
                                    const isActive = i === activeIndex;
                                    const similaresStr = Array.isArray(r.palabras_similares)
                                        ? r.palabras_similares.join(', ')
                                        : r.palabras_similares ?? '';

                                    const qlc = q.trim().toLowerCase();
                                    const hasMatch =
                                        !!qlc &&
                                        (r.clave?.toLowerCase().includes(qlc) ||
                                            (showNombre && (r.nombre ?? '').toLowerCase().includes(qlc)) ||
                                            r.descripcion?.toLowerCase().includes(qlc) ||
                                            (showSimilarWords && similaresStr.toLowerCase().includes(qlc)));

                                    return (
                                        <TableRow
                                            key={`${r.clave}-${i}`}
                                            data-row
                                            onClick={() => setActiveIndex(i)}
                                            onDoubleClick={() => {
                                                onSelect(r);
                                                onOpenChange(false);
                                            }}
                                            aria-selected={isActive}
                                            className={[
                                                'group cursor-pointer transition-colors',
                                                isActive
                                                    ? 'bg-orange-50 ring-1 ring-orange-300/60 border-l-4 border-orange-400'
                                                    : hasMatch
                                                        ? 'bg-amber-50'
                                                        : 'hover:bg-gray-50/60',
                                            ].join(' ')}
                                            title="Clic: preseleccionar • Doble clic / Enter: elegir"
                                        >
                                            <TableCell className="font-semibold">
                                                <Highlight text={r.clave} query={q} />
                                            </TableCell>

                                            {showNombre && (
                                                <TableCell className="whitespace-pre-wrap">
                                                    <Highlight text={r.nombre ?? ''} query={q} />
                                                </TableCell>
                                            )}

                                            <TableCell className="whitespace-pre-wrap">
                                                <Highlight text={r.descripcion} query={q} />
                                            </TableCell>

                                            {showSimilarWords && (
                                                <TableCell className="whitespace-pre-wrap text-sm text-gray-700">
                                                    {similaresStr ? <Highlight text={similaresStr} query={q} /> : <span className="text-gray-400">—</span>}
                                                </TableCell>
                                            )}

                                            <TableCell className="text-right text-sm text-gray-600">
                                                {fmtDate(r.fecha_inicio_vigencia)} — {fmtDate(r.fecha_fin_vigencia)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                        <div className="text-xs text-gray-600">
                            Página {page} de {Math.max(1, totalPages)}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => go(1)} disabled={page <= 1} title="Primera">
                                <ChevronsLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => go(page - 1)} disabled={page <= 1} title="Anterior">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Input
                                type="number"
                                min={1}
                                max={Math.max(1, totalPages)}
                                value={page}
                                onChange={(e) => go(Number(e.target.value || 1))}
                                className="w-20 h-9 text-center"
                                title="Ir a página"
                            />
                            <Button variant="outline" size="sm" onClick={() => go(page + 1)} disabled={page >= totalPages} title="Siguiente">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => go(totalPages)} disabled={page >= totalPages} title="Última">
                                <ChevronsRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}