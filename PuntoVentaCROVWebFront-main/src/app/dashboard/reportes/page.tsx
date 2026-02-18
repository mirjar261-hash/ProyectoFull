'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Wallet, Box, Book } from 'lucide-react'

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">Reportes</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-orange-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-orange-600 text-lg">Ingresos</CardTitle>
            <TrendingUp className="text-orange-500" size={20} />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/reportes/ingresos/fondo-caja"
              className="text-orange-500 hover:underline block"
            >
              Fondo de caja
            </Link>
            <Link
              href="/dashboard/reportes/ingresos/inversiones"
              className="text-orange-500 hover:underline block"
            >
              Inversiones
            </Link>
            <Link
              href="/dashboard/reportes/ingresos/ventas"
              className="text-orange-500 hover:underline block"
            >
              Ventas
            </Link>
             <Link
              href="/dashboard/reportes/ingresos/ventas-bancos"
              className="text-orange-500 hover:underline block"
            >
              Ventas tarjeta/transferencia
            </Link>
            <Link
              href="/dashboard/reportes/ingresos/ventas-credito"
              className="text-orange-500 hover:underline block"
            >
              Ventas a crédito
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-orange-600 text-lg">Egresos</CardTitle>
            <Wallet className="text-orange-500" size={20} />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/reportes/egresos/gastos"
              className="text-orange-500 hover:underline block"
            >
              Gastos
            </Link>
            <Link
              href="/dashboard/reportes/egresos/compras"
              className="text-orange-500 hover:underline block"
            >
              Compras
            </Link>
            <Link
              href="/dashboard/reportes/egresos/retiros"
              className="text-orange-500 hover:underline block"
            >
              Retiros
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-orange-600 text-lg">Inventario</CardTitle>
            <Box className="text-orange-500" size={20} />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/reportes/inventario"
              className="text-orange-500 hover:underline block"
            >
              Inventario general
            </Link>
            <Link
              href="/dashboard/reportes/inventario-costos"
              className="text-orange-500 hover:underline block"
            >
              Inventario con costos
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-orange-600 text-lg">Catálogos</CardTitle>
            <Book className="text-orange-500" size={20} />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/reportes/catalogos/clientes"
              className="text-orange-500 hover:underline block"
            >
              Clientes
            </Link>
            <Link
              href="/dashboard/reportes/catalogos/proveedores"
              className="text-orange-500 hover:underline block"
            >
              Proveedores
            </Link>
            <Link
              href="/dashboard/reportes/catalogos/departamentos"
              className="text-orange-500 hover:underline block"
            >
              Departamentos
            </Link>
            <Link
              href="/dashboard/reportes/catalogos/marcas"
              className="text-orange-500 hover:underline block"
            >
              Marcas
            </Link>
            <Link
              href="/dashboard/reportes/catalogos/modelos"
              className="text-orange-500 hover:underline block"
            >
              Modelos
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
