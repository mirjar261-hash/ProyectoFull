const assert = require('assert');

function aplicarPromociones(promociones, productoId, precioBase, cantidad) {
  const enFecha = () => true;
  const promosCantidad = promociones.filter(
    (p) => p.tipo === 'POR_CANTIDAD' && p.productoId === productoId && enFecha(p)
  );

  let restante = cantidad;
  let total = 0;
  while (restante > 0) {
    let mejor = null;
    let mejorCobertura = 0;

    promosCantidad.forEach((p) => {
      const bloque = p.cantidad || 0;
      if (bloque > 0 && restante >= bloque) {
        const cobertura = Math.floor(restante / bloque) * bloque;
        if (
          cobertura > mejorCobertura ||
          (cobertura === mejorCobertura && bloque > (mejor?.cantidad || 0))
        ) {
          mejor = p;
          mejorCobertura = cobertura;
        }
      }
    });

    if (!mejor || mejorCobertura === 0) {
      total += restante * precioBase;
      break;
    }

    const grupos = Math.floor(restante / (mejor.cantidad || 1));
    total += grupos * (mejor.monto || 0);
    restante -= grupos * (mejor.cantidad || 0);
  }
  return total;
}

const precioBase = 3;
const promociones = [
  { id: 1, tipo: 'POR_CANTIDAD', productoId: 1, cantidad: 5, monto: 10 },
  { id: 2, tipo: 'POR_CANTIDAD', productoId: 1, cantidad: 6, monto: 12 },
];

assert.strictEqual(
  aplicarPromociones(promociones, 1, precioBase, 11),
  23,
  '11 units should cost 23'
);

assert.strictEqual(
  aplicarPromociones(promociones, 1, precioBase, 12),
  24,
  '12 units should cost 24'
);

assert.strictEqual(
  aplicarPromociones(promociones, 1, precioBase, 13),
  27,
  '13 units should cost 27'
);

assert.strictEqual(
  aplicarPromociones(promociones, 1, precioBase, 30),
  60,
  '30 units should cost 60'
);

console.log('All tests passed');
