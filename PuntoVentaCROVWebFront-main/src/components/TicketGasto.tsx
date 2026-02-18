import React from 'react';

interface TicketGastoProps {
  sucursal: any;
  gasto: { descripcion: string; monto: number; fecha: string };
}

const TicketGasto: React.FC<TicketGastoProps> = ({ sucursal, gasto }) => {
  const fecha = new Date(gasto.fecha).toLocaleString();
  return (
    <div className="w-[72mm] mx-auto p-1 text-[10px] leading-3">
      <div className="text-center mb-1 space-y-0.5">
        <div className="font-bold">
          {sucursal.nombre_comercial || sucursal.razon_social}
        </div>
        {sucursal.direccion && <div>{sucursal.direccion}</div>}
        {sucursal.colonia && <div>{sucursal.colonia}</div>}
        {(sucursal.municipio || sucursal.estado) && (
          <div>
            {sucursal.municipio}
            {sucursal.municipio && sucursal.estado ? ', ' : ''}
            {sucursal.estado}
          </div>
        )}
        {sucursal.cp && <div>CP {sucursal.cp}</div>}
        {sucursal.tel && <div>Tel. {sucursal.tel}</div>}
        {sucursal.rfc && <div>RFC: {sucursal.rfc}</div>}
      </div>
      <hr className="border-dashed border-t my-1" />
      <div className="text-center font-bold mb-1">GASTO</div>
      <div className="space-y-0.5">
        <div>Descripción: {gasto.descripcion}</div>
        <div>Monto: ${gasto.monto.toFixed(2)}</div>
        <div>Fecha: {fecha}</div>
      </div>
    </div>
  );
};

export default TicketGasto;
