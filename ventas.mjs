
export async function registrarVentaConsola(rl, Producto, Venta) {
  console.log('\n--- REGISTRAR VENTA ---');

  const productos = await Producto.find({ activo: true, stock: { $gt: 0 } })
    .sort({ nombre: 1 });

  if (productos.length === 0) {
    console.log('No hay productos activos con stock para vender.');
    return;
  }

  productos.forEach((producto, indice) => {
    console.log(`${indice + 1}. ${producto.nombre} | $${producto.precio} | Stock: ${producto.stock}`);
  });

  const seleccion = (await rl.question('Numero del producto: ')).trim();
  if (!/^[1-9]\d*$/.test(seleccion) || Number(seleccion) > productos.length) {
    console.log('Producto no valido.');
    return;
  }
  const producto = productos[Number(seleccion) - 1];

  const cantidadTexto = (await rl.question('Cantidad a vender: ')).trim();
  if (!/^[1-9]\d*$/.test(cantidadTexto)) {
    console.log('La cantidad debe ser un numero entero mayor a cero.');
    return;
  }
  const cantidad = Number(cantidadTexto);
  if (!Number.isSafeInteger(cantidad) || cantidad > producto.stock) {
    console.log('Cantidad invalida o stock insuficiente.');
    return;
  }

  if (!Number.isFinite(producto.precio) || producto.precio < 0) {
    console.log('El precio del producto no es valido.');
    return;
  }

  const pago = (await rl.question('Metodo de pago (1: Efectivo, 2: Transferencia): ')).trim();
  if (!['1', '2'].includes(pago)) {
    console.log('Metodo de pago no valido.');
    return;
  }
  const metodoPago = pago === '1' ? 'Efectivo' : 'Transferencia';
  const total = Math.round((producto.precio * cantidad + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(total)) {
    console.log('No se pudo calcular el total.');
    return;
  }

  console.log(`Resumen: ${cantidad} x ${producto.nombre} = $${total} (${metodoPago})`);
  const confirmar = (await rl.question('Confirmar venta? (s/n): ')).trim().toLowerCase();
  if (confirmar !== 's') {
    console.log('Venta cancelada. No se modifico la base de datos.');
    return;
  }

  const actualizado = await Producto.findOneAndUpdate(
    { _id: producto._id, activo: true, stock: { $gte: cantidad } },
    { $inc: { stock: -cantidad } },
    { returnDocument: 'after' }
  );
  if (!actualizado) {
    console.log('No se registro la venta: el stock cambio o el producto fue dado de baja.');
    return;
  }

  try {
    const venta = await Venta.create({
      metodo_pago: metodoPago,
      total,
      items: [{
        producto_id: producto._id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: producto.precio
      }],
      activo: true
    });
    console.log(`Venta registrada con exito. ID: ${venta._id}`);
    console.log(`Total: $${total} | Stock restante: ${actualizado.stock}`);
  } catch (error) {
    try {
      await Producto.updateOne({ _id: producto._id }, { $inc: { stock: cantidad } });
      console.log('No se pudo guardar la venta. Se restituyo el stock.');
    } catch (reversionError) {
      console.error('ATENCION: fallo el registro y tambien la restitucion del stock.');
      console.error('Revisar manualmente el producto:', String(producto._id));
    }
    console.error('Detalle del error:', error.message);
  }
}

export async function listarVentasConsola(Venta) {
  console.log('\n--- ULTIMAS VENTAS ---');
  const ventas = await Venta.find({ activo: true })
    .sort({ fecha: -1 })
    .limit(10);

  if (ventas.length === 0) {
    console.log('No hay ventas registradas.');
    return;
  }

  ventas.forEach(venta => {
    console.log(`\nVenta ${venta._id} | ${new Date(venta.fecha).toLocaleString('es-AR')}`);
    console.log(`Pago: ${venta.metodo_pago} | Total: $${venta.total}`);
    venta.items.forEach(item => {
      console.log(`  ${item.cantidad} x ${item.nombre} | $${item.precio_unitario} c/u`);
    });
  });
}
