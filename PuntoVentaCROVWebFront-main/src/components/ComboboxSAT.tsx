'use client';

import * as React from 'react';
import axios from 'axios';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

type ProdServOption = { id: number; clave: string; descripcion: string };
type UnidadOption   = { id: number; clave: string; nombre: string; simbolo?: string | null };

type SearchFetcher<T>   = (q: string) => Promise<T[]>;
type ByClaveResolver<T> = (clave: string) => Promise<T | null>;
type PagedListFetcher<T> = (page: number) => Promise<{ items: T[]; hasMore: boolean }>;

function useOutsideClick(ref: React.RefObject<HTMLElement>, onClickOutside: () => void) {
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClickOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClickOutside]);
}

function useDebouncedValue<T>(val: T, delay = 250) {
  const [v, setV] = React.useState(val);
  React.useEffect(() => {
    const t = setTimeout(() => setV(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return v;
}

type BasicAutocompleteProps<T> = {
  value?: string | null;
  onChange: (clave: string | '') => void;
  placeholder: string;
  // data
  resolverByClave: ByClaveResolver<T>;
  getClave: (opt: T) => string;
  getLabelFromResolved: (opt: T) => string;
  renderItem: (opt: T, q: string, selected: boolean) => React.ReactNode;
  // data sources
  pagedListFetcher: PagedListFetcher<T>; // q === ''
  searchFetcher: SearchFetcher<T>;       // q !== ''
  // ui
  emptyMessage?: string;
  clearLabel?: string;
};

export function BasicAutocompleteSAT<T>({
  value, onChange, placeholder,
  resolverByClave, getClave, getLabelFromResolved, renderItem,
  pagedListFetcher, searchFetcher,
  emptyMessage = 'Sin resultados',
  clearLabel = 'Borrar selección',
}: BasicAutocompleteProps<T>) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const dq = useDebouncedValue(q, 250);

  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);

  const selectedClave = (value || '').trim();
  const usingSearch = dq.trim().length > 0;

  useOutsideClick(rootRef, () => setOpen(false));

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Resolver etiqueta inicial
  React.useEffect(() => {
    const clave = (value || '').trim();
    if (!clave) { setLabel(''); return; }
    (async () => {
      try {
        const r = await resolverByClave(clave);
        if (r) setLabel(getLabelFromResolved(r));
      } catch {}
    })();
  }, [value, resolverByClave, getLabelFromResolved]);

  // Cargar datos al abrir / al escribir
  React.useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      setLoading(true);
      try {
        const { items, hasMore } = await pagedListFetcher(1);
        if (!cancelled) { setItems(items); setHasMore(hasMore); setPage(1); }
      } finally { if (!cancelled) setLoading(false); }
    }
    async function loadSearch() {
      setLoading(true);
      try {
        const data = await searchFetcher(dq);
        if (!cancelled) { setItems(data ?? []); setHasMore(false); }
      } finally { if (!cancelled) setLoading(false); }
    }
    if (!open) return;
    if (usingSearch) loadSearch(); else loadFirstPage();
    return () => { cancelled = true; };
  }, [open, dq, usingSearch, pagedListFetcher, searchFetcher]);

  async function loadMore() {
    if (usingSearch || !hasMore || loading) return;
    setLoading(true);
    try {
      const next = page + 1;
      const { items: more, hasMore: hm } = await pagedListFetcher(next);
      setItems(prev => [...prev, ...more]);
      setPage(next);
      setHasMore(hm);
    } finally { setLoading(false); }
  }

  function pick(clave: string, opt?: T) {
    onChange(clave);
    if (opt) setLabel(getLabelFromResolved(opt));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Trigger */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(o => !o)}
        className={cn('w-full h-10 justify-between overflow-hidden bg-white border shadow-sm')}
        title={label || placeholder}
      >
        <span className={cn('truncate text-left', label ? 'text-foreground' : 'text-muted-foreground')}>
          {label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-[100] mt-2 w-full rounded-md border bg-white shadow-lg"
        >
          {/* Search */}
          <div className="p-2 border-b flex items-center gap-2">
            <Input
              ref={inputRef}             
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por clave o texto…"
              className="h-9"
            />
            {selectedClave && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => { onChange(''); setLabel(''); setQ(''); inputRef.current?.focus(); }}
                title={clearLabel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-auto">
            {items.length === 0 && !loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <ul className="py-1">
                {items.map((opt, idx) => {
                  const clave = String(getClave(opt));
                  const isSelected = clave === selectedClave;
                  return (
                    <li key={clave + ':' + idx}>
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-orange-50',
                          isSelected && 'bg-orange-50'
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(clave, opt)}
                      >
                        {renderItem(opt, dq, isSelected)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Paginación */}
          {!usingSearch && hasMore && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-9"
                onMouseDown={(e) => e.preventDefault()}
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Cargar más…
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================
   Wrappers SAT específicos
============================ */

const CLAVE_PRODSERV_LIST = `${apiUrl}/facturacion/clave-prodserv`;
const CLAVE_PRODSERV_AC   = `${apiUrl}/facturacion/clave-prodserv/autocomplete`;
const CLAVE_PRODSERV_GET  = `${apiUrl}/facturacion/clave-prodserv`; // /:clave

const CLAVE_UNIDAD_LIST = `${apiUrl}/facturacion/clave-unidad`;
const CLAVE_UNIDAD_AC   = `${apiUrl}/facturacion/clave-unidad/autocomplete`;
const CLAVE_UNIDAD_GET  = `${apiUrl}/facturacion/clave-unidad`; // /:clave

export function ClaveProdServSelect({
  value, onChange,
}: { value?: string | null; onChange: (clave: string | '') => void }) {
  const pageSize = 20;

  const pagedListFetcher = React.useCallback<PagedListFetcher<ProdServOption>>(async (page) => {
    const { data } = await axios.get<{ data: ProdServOption[]; meta: { page: number; totalPages: number } }>(
      CLAVE_PRODSERV_LIST,
      { params: { page, pageSize, activo: 1 } }
    );
    const items = (data?.data ?? []) as ProdServOption[];
    const meta  = data?.meta;
    return { items, hasMore: meta ? meta.page < meta.totalPages : false };
  }, []);

  const searchFetcher = React.useCallback<SearchFetcher<ProdServOption>>(async (q) => {
    const { data } = await axios.get<ProdServOption[]>(CLAVE_PRODSERV_AC, { params: { q } });
    return data ?? [];
  }, []);

  const resolver = React.useCallback<ByClaveResolver<ProdServOption>>(async (clave) => {
    try {
      const { data } = await axios.get(`${CLAVE_PRODSERV_GET}/${encodeURIComponent(clave)}`);
      return data ?? null;
    } catch { return null; }
  }, []);

  return (
    <BasicAutocompleteSAT<ProdServOption>
      value={value}
      onChange={onChange}
      placeholder="Clave Prod/Serv (SAT)"
      resolverByClave={resolver}
      pagedListFetcher={pagedListFetcher}
      searchFetcher={searchFetcher}
      getClave={(o) => o.clave}
      getLabelFromResolved={(o) => `${o.clave} — ${o.descripcion}`}
      renderItem={(o) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            <span className="font-mono">{o.clave}</span> — {o.descripcion}
          </div>
        </div>
      )}
      emptyMessage="No hay elementos"
      clearLabel="Borrar clave Prod/Serv"
    />
  );
}

export function ClaveUnidadSelect({
  value, onChange,
}: { value?: string | null; onChange: (clave: string | '') => void }) {
  const pageSize = 20;

  const pagedListFetcher = React.useCallback<PagedListFetcher<UnidadOption>>(async (page) => {
    const { data } = await axios.get<{ data: UnidadOption[]; meta: { page: number; totalPages: number } }>(
      CLAVE_UNIDAD_LIST,
      { params: { page, pageSize, activo: 1 } }
    );
    const items = (data?.data ?? []) as UnidadOption[];
    const meta  = data?.meta;
    return { items, hasMore: meta ? meta.page < meta.totalPages : false };
  }, []);

  const searchFetcher = React.useCallback<SearchFetcher<UnidadOption>>(async (q) => {
    const { data } = await axios.get<UnidadOption[]>(CLAVE_UNIDAD_AC, { params: { q } });
    return data ?? [];
  }, []);

  const resolver = React.useCallback<ByClaveResolver<UnidadOption>>(async (clave) => {
    try {
      const { data } = await axios.get(`${CLAVE_UNIDAD_GET}/${encodeURIComponent(clave)}`);
      return data ?? null;
    } catch { return null; }
  }, []);

  return (
    <BasicAutocompleteSAT<UnidadOption>
      value={value}
      onChange={onChange}
      placeholder="Clave Unidad (SAT)"
      resolverByClave={resolver}
      pagedListFetcher={pagedListFetcher}
      searchFetcher={searchFetcher}
      getClave={(o) => o.clave}
      getLabelFromResolved={(o) => `${o.clave} — ${o.nombre}${o.simbolo ? ` (${o.simbolo})` : ''}`}
      renderItem={(o) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            <span className="font-mono">{o.clave}</span> — {o.nombre}
            {o.simbolo ? <span className="ml-1 text-xs text-muted-foreground">({o.simbolo})</span> : null}
          </div>
        </div>
      )}
      emptyMessage="No hay elementos"
      clearLabel="Borrar clave Unidad"
    />
  );
}
