import dns from 'dns';
import mongoose from 'mongoose';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
import { registrarVentaConsola, listarVentasConsola } from './ventas.mjs';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const uri = process.env.MONGODB_URI?.trim();

// ==========================================
// 1. ESQUEMAS Y MODELOS CON MONGOOSE
// ==========================================

const CategoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Categoria = mongoose.model('Categoria', CategoriaSchema);

const ProductoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  categoria_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categoria', 
    required: true 
  },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Producto = mongoose.model('Producto', ProductoSchema);

const ItemVentaSchema = new mongoose.Schema({
  producto_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Producto', 
    required: true 
  },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precio_unitario: { type: Number, required: true }
}, { _id: false });

const VentaSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  metodo_pago: { type: String, default: 'Efectivo' },
  total: { type: Number, required: true },
  items: [ItemVentaSchema],
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Venta = mongoose.model('Venta', VentaSchema);

// ==========================================
// 2. FUNCIONES CRUD CON CONTROL DE BAJA LÓGICA
// ==========================================

async function listarProductosActivos() {
  return await Producto.find({ activo: true }).populate('categoria_id', 'nombre');
}

async function crearProducto(nombre, precio, stock, categoria_id) {
  const nuevo = new Producto({
    nombre,
    precio,
    stock,
    categoria_id,
    activo: true
  });
  return await nuevo.save();
}

async function actualizarProducto(id, nuevoPrecio, nuevoStock) {
  const campos = {};
  if (!isNaN(nuevoPrecio)) campos.precio = nuevoPrecio;
  if (!isNaN(nuevoStock)) campos.stock = nuevoStock;

  return await Producto.findOneAndUpdate(
    { _id: id, activo: true },
    { $set: campos },
    { new: true }
  );
}

async function bajaLogicaProducto(id) {
  return await Producto.findByIdAndUpdate(
    id,
    { $set: { activo: false } },
    { new: true }
  );
}

async function listarTodoSinFiltro() {
  return await Producto.find().populate('categoria_id', 'nombre');
}

// ==========================================
// 3. CONSOLA INTERACTIVA (CLI)
// ==========================================

async function mostrarMenu() {
  console.log('\n========================================');
  console.log('       SISTEMA KIOSKO - GESTIÓN         ');
  console.log('========================================');
  console.log('1. Listar productos activos (READ)');
  console.log('2. Insertar nuevo producto (CREATE)');
  console.log('3. Modificar precio/stock (UPDATE)');
  console.log('4. Eliminar producto - Baja lógica (DELETE)');
  console.log('5. Ver base completa (Auditoría de activos e inactivos)');
  console.log('6. Registrar venta');
  console.log('7. Consultar ventas');
  console.log('0. Salir');
  console.log('========================================');
}

async function inicializarCategoriasBase() {
  const existe = await Categoria.findOne({ nombre: 'Golosinas' });
  if (!existe) {
    await Categoria.create({
      nombre: 'Golosinas',
      descripcion: 'Chocolates, alfajores y galletitas',
      activo: true
    });
    await Categoria.create({
      nombre: 'Bebidas',
      descripcion: 'Gaseosas, aguas y jugos',
      activo: true
    });
  }
}

async function iniciarConsola() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Conexión establecida con éxito.\n');

    await inicializarCategoriasBase();

    let salir = false;

    while (!salir) {
      await mostrarMenu();
      const opcion = (await rl.question('Seleccione una opción: ')).trim();

      switch (opcion) {
        case '1': {
          console.log('\n--- PRODUCTOS ACTIVOS EN CATÁLOGO ---');
          const productos = await listarProductosActivos();
          if (productos.length === 0) {
            console.log('No hay productos activos registrados.');
          } else {
            productos.forEach(p => {
              const catNombre = p.categoria_id ? p.categoria_id.nombre : 'Sin categoría';
              console.log(`[ID: ${p._id}] | ${p.nombre} | Precio: $${p.precio} | Stock: ${p.stock} | Cat: ${catNombre}`);
            });
          }
          break;
        }

        case '2': {
          console.log('\n--- REGISTRAR NUEVO PRODUCTO ---');
          const categorias = await Categoria.find({ activo: true });
          console.log('Categorías disponibles:');
          categorias.forEach((c, idx) => {
            console.log(`  ${idx + 1}. ${c.nombre} (ID: ${c._id})`);
          });

          const idxCat = parseInt(await rl.question('Elija el número de la categoría: ')) - 1;
          if (idxCat < 0 || idxCat >= categorias.length || isNaN(idxCat)) {
            console.log('Opción de categoría inválida.');
            break;
          }

          const nombre = await rl.question('Nombre del producto: ');
          const precio = parseFloat(await rl.question('Precio unitario: '));
          const stock = parseInt(await rl.question('Stock inicial: '));

          if (!nombre || isNaN(precio) || isNaN(stock)) {
            console.log('Datos de entrada incorrectos.');
            break;
          }

          const creado = await crearProducto(nombre, precio, stock, categorias[idxCat]._id);
          console.log(`\nProducto registrado con éxito. ID asignado: ${creado._id}`);
          break;
        }

        case '3': {
          console.log('\n--- MODIFICAR PRODUCTO ---');
          const id = (await rl.question('Ingrese el ObjectId del producto: ')).trim();
          
          if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('El ID proporcionado no es un ObjectId válido de MongoDB.');
            break;
          }

          const nuevoPrecio = parseFloat(await rl.question('Nuevo precio (o Enter para omitir): '));
          const nuevoStock = parseInt(await rl.question('Nuevo stock (o Enter para omitir): '));

          const actualizado = await actualizarProducto(id, nuevoPrecio, nuevoStock);
          if (actualizado) {
            console.log('\nProducto actualizado correctamente:');
            console.log(actualizado);
          } else {
            console.log('\nNo se encontró el producto activo con ese ID.');
          }
          break;
        }

        case '4': {
          console.log('\n--- ELIMINAR PRODUCTO (BAJA LÓGICA) ---');
          const id = (await rl.question('Ingrese el ObjectId a dar de baja: ')).trim();

          if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('El ID proporcionado no es un ObjectId válido.');
            break;
          }

          const dadoDeBaja = await bajaLogicaProducto(id);
          if (dadoDeBaja) {
            console.log(`\nBaja lógica aplicada con éxito sobre: ${dadoDeBaja.nombre}`);
            console.log(`Estado actual -> activo: ${dadoDeBaja.activo} (Conservado en disco).`);
          } else {
            console.log('\nNo se encontró ningún producto con ese ID.');
          }
          break;
        }

        case '5': {
          console.log('\n--- REGISTRO GENERAL (TODOS LOS DOCUMENTOS) ---');
          const todos = await listarTodoSinFiltro();
          todos.forEach(p => {
            const estado = p.activo ? 'ACTIVO' : 'DADO DE BAJA';
            console.log(`[${estado}] ID: ${p._id} | ${p.nombre} | Precio: $${p.precio} | Stock: ${p.stock}`);
          });
          break;
        }

        case '6': {
          await registrarVentaConsola(rl, Producto, Venta);
          break;
        }
        case '7': {
          await listarVentasConsola(Venta);
          break;
        }
        case '0': {
          console.log('\nSaliendo de la aplicación...');
          salir = true;
          break;
        }

        default:
          console.log('\nOpción no válida. Intente nuevamente.');
          break;
      }
    }
  } catch (error) {
    console.error('Ocurrió un error en el sistema:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('Conexión con MongoDB cerrada.');
    process.exit(0);
  }
}

iniciarConsola();