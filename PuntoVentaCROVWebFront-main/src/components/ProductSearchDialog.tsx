"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: any) => void;
}

export default function ProductSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: ProductSearchDialogProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const sucursalIdSession =
    typeof window !== "undefined" ? parseInt(localStorage.getItem("sucursalId") || "0") : 0;

  // --- Debounce suave para no spamear la API ---
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedTerm, setDebouncedTerm] = useState("");
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedTerm(term.trim());
      setPage(1); // reiniciar paginación al cambiar búsqueda
    }, 300);
  }, [term]);

  const fetchProducts = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pagina: page.toString(),
        limite: limit.toString(),
        sucursalId: sucursalIdSession.toString(),
      });

      // Un solo término que consulta los tres campos
      if (debouncedTerm) {
        // Si tu backend soporta estos 3 params por separado:
        params.append("codigo", debouncedTerm);
        params.append("cod_barras", debouncedTerm);
        params.append("nombre", debouncedTerm);

        // (opcional) mantener compatibilidad si tu endpoint también acepta "termino"
        params.append("termino", debouncedTerm);
      }

      const res = await axios.get(
        `${apiUrl}/producto/productosPaginacion?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      setResults(data.productos || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, debouncedTerm]);

  const reset = () => {
    setTerm("");
    setResults([]);
    setPage(1);
    setTotal(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
      <DialogContent className="bg-white z-50 rounded-2xl max-w-4xl mx-auto shadow-xl border p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-orange-600">
            Buscar producto
          </DialogTitle>
        </DialogHeader>

        <Input
          className="text-[#4b5563]"
          autoFocus
          placeholder="Buscar por código, código de barras o nombre del producto"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />

        <div className="max-h-80 overflow-auto border rounded">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-100">
                <TableHead>Código</TableHead>
                <TableHead>Código de barras</TableHead>
                <TableHead>Nombre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length > 0 ? (
                results.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-orange-50 cursor-pointer select-none"
                    onDoubleClick={() => {
                      onSelect(p);         // <-- selección por DOBLE CLIC
                      onOpenChange(false);
                      reset();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSelect(p);
                        onOpenChange(false);
                        reset();
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>{p.codigo}</TableCell>
                    <TableCell>{p.cod_barras}</TableCell>
                    <TableCell>{p.nombre}</TableCell>
                  </TableRow>
                ))
              ) : (
                !loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      Sin resultados
                    </TableCell>
                  </TableRow>
                )
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Anterior
          </Button>
          <span>
            Página {page} de {Math.max(1, Math.ceil((total || 0) / limit))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) => (p < Math.ceil((total || 0) / limit) ? p + 1 : p))
            }
            disabled={page >= Math.ceil((total || 0) / limit) || loading}
          >
            Siguiente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
