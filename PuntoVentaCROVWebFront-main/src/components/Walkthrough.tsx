'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Smile, LayoutDashboard, ShoppingCart, HandCoins, CalendarDays, PackagePlus, Box, User, Truck, Search, DollarSign, BarChart3 } from 'lucide-react'

const WALKTHROUGH_VERSION = '3'
const SHOW_ALWAYS = false // solo para pruebas true

const steps = [
  {
    title: "Bienvenido",
    description:
      "Te guiaremos por las funciones básicas del sistema para que comiences rápidamente. Aprenderás a navegar por los menús, registrar operaciones y personalizar tu trabajo diario con facilidad.",
    icon: Smile,
  },
  { key: 'navegacion', title: 'Navegación', description: 'Usa el menú superior para moverte entre módulos. Cada sección agrupa funciones relacionadas y los submenús te permiten llegar rápidamente a cualquier herramienta.', icon: LayoutDashboard, placement: 'below' },
  { key: 'compras', title: 'Compras', description: 'Desde el menú "Compra/venta" elige "Compras" para registrar adquisiciones a tus proveedores, adjuntar facturas y actualizar el inventario automáticamente.', icon: ShoppingCart, placement: 'below' },
  { key: 'ventas', title: 'Ventas', description: 'En la misma sección de "Compra/venta" selecciona "Venta" para cobrar, aplicar descuentos, emitir tickets y generar facturas para tus clientes.', icon: HandCoins, placement: 'below' },
  { key: 'agenda', title: 'Agenda', description: 'Abre el módulo "Agenda" desde el menú principal para administrar citas, asignar recordatorios y controlar pendientes diarios o semanales.', icon: CalendarDays, placement: 'below' },
  { key: 'producto', title: 'Registrar producto', description: 'En "Registros" selecciona "Registrar productos" para agregar nuevos artículos con precio, categoría y código de barras a tu catálogo.', icon: PackagePlus, placement: 'below' },
  { key: 'inventario', title: 'Inventario', description: 'Consulta y actualiza el stock de tus productos en el módulo "Inventario". Puedes registrar entradas y salidas para mantener un control preciso.', icon: Box, placement: 'below' },
  { key: 'proveedor', title: 'Proveedor', description: 'Mantén el registro de tus proveedores desde "Proveedores" en el menú de "Registros". Guarda datos de contacto y condiciones de compra.', icon: Truck, placement: 'below' },
  { key: 'cliente', title: 'Cliente', description: 'Gestiona la información de tus clientes entrando a "Clientes" en la sección "Registros" y consulta su historial de compras y datos de contacto.', icon: User, placement: 'below' },
  { key: 'verificador', title: 'Verificador de precios', description: 'Utiliza el botón con la lupa en la parte superior para buscar artículos por nombre o código y verificar precios en segundos.', icon: Search, placement: 'below' },
  { key: 'corte', title: 'Corte del día', description: 'Accede al resumen de ventas diarias desde "Corte del día" en la sección de reportes y descarga un informe con totales y formas de pago.', icon: DollarSign, placement: 'below' },
  { key: 'gerente-crov', title: 'Gerente CROV', description: 'Aquí se encuentra nuestro Gerente CROV, quien te proporcionará información, estadísticas, predicciones y alertas.', icon: BarChart3, placement: 'below' },
] as const

export function Walkthrough() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (SHOW_ALWAYS) {
      setOpen(true)
      return
    }
    const stored = localStorage.getItem('walkthrough');
    // const completed = localStorage.getItem('walkthrough-complete')
    const completed = localStorage.getItem('walkthrough-complete') === '1';


    if (!stored || stored !== WALKTHROUGH_VERSION || !completed) setOpen(true)
  }, [])

  useEffect(() => {
    if (open) {
      window.dispatchEvent(
        new CustomEvent('guide:step', { detail: { start: true } })
      )
    }
  }, [open])

  useEffect(() => {
    const step = steps[index] as any
    if (!step) return
    window.dispatchEvent(new CustomEvent('guide:step', {
      detail: { key: step.key, placement: step.placement }
    }))
  }, [index])

const close = () => {
  setOpen(false);

  // Guardar walkthrough como completado
  localStorage.setItem('walkthrough', WALKTHROUGH_VERSION);
  localStorage.setItem('walkthrough-complete', '1');

  // Forzar que se muestre la guía del módulo dashboard
  localStorage.setItem('module-guide:force-open:/dashboard', '1');
  window.dispatchEvent(new CustomEvent('module-guide:show', { detail: { key: '/dashboard' } }));

  // Luego avisar que terminó el walkthrough
  window.dispatchEvent(new CustomEvent('guide:step', { detail: { key: '' } }));
  window.dispatchEvent(new CustomEvent('guide:step', { detail: { end: true } }));
};




  const next = () => {
    if (index < steps.length - 1) setIndex(i => i + 1)
    else close()
  }

  if (!open) return null

  const step = steps[index] as any
  const StepIcon = step.icon

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
    >
      <DialogContent className="bg-white text-black shadow-md">
        <DialogHeader>
          {StepIcon && <StepIcon className="mx-auto mb-2 h-8 w-8 text-orange-500" />}
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end">
          <Button onClick={next}>{index === steps.length - 1 ? 'Finalizar' : 'Siguiente'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
