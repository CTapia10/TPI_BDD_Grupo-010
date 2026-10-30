# UNIVERSIDAD TECNOLÓGICA NACIONAL (UTN)

## Tecnicatura Universitaria en Programación a Distancia (TUPaD)

### Asignatura: Bases de Datos II

### Trabajo Práctico Integrador (TPI) – Persistencia Cloud, Modelado NoSQL y Automatización

---

* **Docente Coordinador:** Prof. Sebastián Bruselario  
* **Ciclo Lectivo:** 2026  
* **Dominio de Negocio:** Sistema de Gestión y Facturación para Kiosko / Maxikiosco  
* **Integrantes del Grupo (Grupo 010):**  
  1. Santino Valentin Arias&nbsp;  
  2. Gabriel Maximiliano Perdomo&nbsp;  
  3. Cristian Tapia

---

## 1\. Descripción del Negocio y Modelado de Datos

### 1.1. Definición del Problema de Negocio

El proyecto resuelve la gestión de inventario, clasificación por rubros y registro de comprobantes de ventas para un kiosko de atención al público. En este dominio se requiere alta velocidad de respuesta en caja, persistencia histórica de valores monetarios ante variaciones de precios y consistencia referencial en el catálogo sin sobrecargar la base de datos con uniones en tiempo real.

### 1.2. Colecciones del Sistema

El modelo se implementa sobre tres colecciones relacionadas:

1. `categorias`: Rubros comerciales (Golosinas, Bebidas, Cigarrillos, Snacks).  
2. `productos`: Catálogo de artículos disponibles para la venta.  
3. `ventas`: Tickets emitidos con el detalle de los productos comercializados.

### 1.3. Justificación Técnica: Embedding vs. Linking

* **Linking (Referenciación \- `productos` $\rightarrow$ `categorias`):** Cada producto almacena la referencia `categoria_id` de tipo BSON `ObjectId` apuntando a su documento padre en `categorias`. Se utiliza esta estrategia para evitar redundancia e inconsistencias: si se modifica el nombre o descripción de una categoría, no se requiere actualizar masivamente miles de documentos de productos.  
* **Embedding (Incrustación \- `ventas` $\rightarrow$ `items`):** Cada venta contiene un arreglo embebido de subdocumentos con `{ producto_id, nombre, cantidad, precio_unitario }`.  
  * *Justificación 1 (Snapshot Histórico):* En un kiosko los precios se actualizan con frecuencia. Embeber los valores garantiza la inmutabilidad contable del ticket; si un producto sube de precio mañana, el ticket emitido en el pasado mantiene el precio exacto al momento de la venta.  
  * *Justificación 2 (Lectura Atómica):* Se recupera el ticket completo en una única operación de I/O sin recurrir a `$lookup`.  
  * *Justificación 3 (Límite BSON de 16 MB):* Un ticket de mostrador tiene un número finito y acotado de líneas de compra, por lo que no existe riesgo de sobrepasar el límite físico del motor.

### 1.4. Implementación de Baja Lógica

Está prohibida la eliminación física de registros. En las colecciones `categorias` y `productos` se implementa el atributo booleano `activo: true` (por defecto).

* La baja consiste en una mutación controlada `{ $set: { activo: false } }`.  
* Las operaciones de consulta (`READ`) aplican obligatoriamente el filtro `{ activo: true }`, manteniendo los registros inactivos preservados en disco para auditorías y referencias históricas en ventas pasadas.

---

## 2\. Esquemas JSON / BSON (Texto Plano)

### Colección: `categorias`

```json
{
  "_id": ObjectId("67168a1f8b4a2c1098e10001"),
  "nombre": "Golosinas",
  "descripcion": "Chocolates, alfajores y caramelos",
  "activo": true,
  "createdAt": ISODate("2026-10-23T14:00:00.000Z"),
  "updatedAt": ISODate("2026-10-23T14:00:00.000Z")
}
```

### Colección: `productos`

```json
{
  "_id": ObjectId("67168a1f8b4a2c1098e10002"),
  "nombre": "Alfajor Triple Chocolate",
  "precio": 1450,
  "stock": 45,
  "categoria_id": ObjectId("67168a1f8b4a2c1098e10001"),
  "activo": true,
  "createdAt": ISODate("2026-10-23T14:05:00.000Z"),
  "updatedAt": ISODate("2026-10-23T14:30:00.000Z")
}
```

### Colección: `ventas`

```json
{
  "_id": ObjectId("67168a1f8b4a2c1098e10003"),
  "fecha": ISODate("2026-10-23T15:10:00.000Z"),
  "metodo_pago": "Efectivo",
  "total": 2900,
  "activo": true,
  "items": [
    {
      "producto_id": ObjectId("67168a1f8b4a2c1098e10002"),
      "nombre": "Alfajor Triple Chocolate",
      "cantidad": 2,
      "precio_unitario": 1450
    }
  ],
  "createdAt": ISODate("2026-10-23T15:10:00.000Z"),
  "updatedAt": ISODate("2026-10-23T15:10:00.000Z")
}
```

---

## 3\. Infraestructura Cloud y Configuración de Atlas (Capturas)

### 3.1. Clúster M0 en MongoDB Atlas

Se desplegó un clúster gratuito compartido (Tier M0) provisto en la región `sa-east-1` (São Paulo).

<img width="1119" height="880" alt="Paso-6-CreacionCluster-M0" src="https://github.com/user-attachments/assets/2cfa06d8-ac44-47f9-bad7-3f21ba318775" />

### 3.2. Acceso de Base de Datos (Database Access)

Se configuró un usuario de base de datos con rol de lectura y escritura (`readWriteAnyDatabase`).

<img width="1654" height="440" alt="Paso-3-CreacionUserPermisosDBB-M0" src="https://github.com/user-attachments/assets/da1a9cbb-92c1-4e0e-be20-52d7187825c1" />

### 3.3. Configuración de Red (Network Access)

Se habilitó la regla de red `0.0.0.0/0` (acceso global) para posibilitar la conexión remota del entorno docente y la ejecución distribuida de los miembros del grupo.

<img width="1639" height="238" alt="Paso-3-CreacionConexionDBB-M0" src="https://github.com/user-attachments/assets/ca299165-fd23-4e42-8808-30cf1309e1ba" />

### 3.4. Colecciones y Datos Sembrados en Atlas

Evidencia de los documentos persistidos directamente en la base `kiosko_db`.

<img width="1097" height="451" alt="06_Verificacion_MongoDB_Atlas" src="https://github.com/user-attachments/assets/dd14820a-3884-4be0-ac9d-e1fda2d7214c" />

---

## 4\. Credenciales de Conexión (Para Corrección Docente)

Las credenciales **no se publican en este informe ni en el repositorio**. La cadena de conexión canónica directa hacia el Replica Set (protocolo estándar sin SRV) se carga desde la variable de entorno `MONGODB_URI` definida en el archivo local `.env` (excluido de Git). El docente puede reproducir el entorno copiando `.env-example` a `.env` y completando usuario y contraseña por un canal privado.

Plantilla de URI (sin secretos):

```
mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/kiosko_db?ssl=true&replicaSet=<replicaSet>&authSource=admin&retryWrites=true&w=majority
```

* **Base de datos:** `kiosko_db`  
* **Usuario / contraseña:** definidos únicamente en `.env`  
* **Mecanismo de autenticación:** `admin` (authSource)  
* **Archivo de plantilla:** `.env-example`

---

## 5\. Código de la Aplicación (Backend Node.js \+ Mongoose)

### 5.1. Inicialización y Dependencias

En la terminal del proyecto se configuró el soporte nativo para módulos ECMAScript y se instalaron las dependencias:

```sh
npm init --init-type module -y
npm install mongoose dotenv
```

### 5.2. Configuración de Variables de Entorno (`.env`)

Se utilizó la biblioteca `dotenv` para desacoplar las credenciales del código fuente:

```env
MONGODB_URI="mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/kiosko_db?ssl=true&replicaSet=<replicaSet>&authSource=admin&retryWrites=true&w=majority"
```

&nbsp;

<img width="880" height="722" alt="Paso-Final-ConexionDBB-Mongoose" src="https://github.com/user-attachments/assets/bb355f8c-e6c0-4718-8e25-9c4fcb362073" />

### 5.3. Código Fuente Principal (`app.js`)

Consola interactiva con menú por terminal construida con `readline/promises` nativo y operaciones CRUD con baja lógica:

&nbsp;

```js
import dns from 'dns';
import mongoose from 'mongoose';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';

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

```

&nbsp;

### 5.4. Demostración Práctica del CRUD y Baja Lógica

<img width="769" height="334" alt="01_CREATE_Registro_Producto png" src="https://github.com/user-attachments/assets/f9c2ea6c-f905-46ff-9eb9-86c48d6e8ead" />

<img width="749" height="275" alt="02_READ_Consulta_Productos" src="https://github.com/user-attachments/assets/2b8222c5-cf19-4e5f-805f-174ed781495c" />

<img width="1330" height="564" alt="03_UPDATE_Modificar_Producto" src="https://github.com/user-attachments/assets/5ff9ac30-a7b7-4d1a-a787-ffacba138a3e" />

<img width="1325" height="326" alt="04_DELETE_Baja_Logica" src="https://github.com/user-attachments/assets/c3dc6868-6d45-4d56-8cd3-2ce3c1da78f5" />

<img width="731" height="538" alt="05_Verificacion_Baja_Logica_y_Auditoria" src="https://github.com/user-attachments/assets/7d08fe63-c553-44da-b6d1-355eddf320f4" />

---

## 6\. Automatización de Resguardos (Backups) y Políticas RTO / RPO

### 6.1. Script de Automatización para Windows (`backup.bat`)

El script genera dinámicamente la carpeta con formato `AAAA-MM-DD` mediante PowerShell nativo (compatible con Windows 10 y 11), carga `MONGODB_URI` desde `.env` y ejecuta `mongodump` usando **rutas relativas** (`.\resguardos_tpi\<fecha>`):

```cmd
@echo off
setlocal enabledelayedexpansion

:: Cargar MONGODB_URI desde .env (sin hardcodear credenciales)
if not exist "%~dp0.env" (
  echo ERROR: No se encontro el archivo .env
  echo Copie .env-example a .env y complete MONGODB_URI.
  pause
  exit /b 1
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env") do (
  if /i "%%A"=="MONGODB_URI" set "MONGODB_URI=%%B"
)

if not defined MONGODB_URI (
  echo ERROR: MONGODB_URI no esta definida en .env
  pause
  exit /b 1
)

:: Quitar comillas envolventes si existen
if "!MONGODB_URI:~0,1!"=="""" set "MONGODB_URI=!MONGODB_URI:~1,-1!"

:: 1. Obtener la fecha actual en formato AAAA-MM-DD usando PowerShell nativo
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"') do set FECHA=%%I

:: 2. Definir la ruta relativa requerida por la consigna (./resguardos_tpi/AAAA-MM-DD)
set DESTINO=.\resguardos_tpi\%FECHA%

echo ========================================================
echo INICIANDO RESPALDO DE KIOSKO DB - MONGODB ATLAS
echo Carpeta de destino: %DESTINO%
echo ========================================================

:: 3. Crear el directorio si no existe
if not exist "%DESTINO%" (
  mkdir "%DESTINO%"
)

:: 4. Ejecutar mongodump con la URI del entorno
mongodump --uri="%MONGODB_URI%" --out="%DESTINO%"

:: 5. Comprobar si mongodump finalizó correctamente
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo RESPALDO FINALIZADO CON EXITO
  echo ========================================================
) else (
  echo ========================================================
  echo ERROR DURANTE EL RESPALDO (Codigo de error: %ERRORLEVEL%)
  echo ========================================================
)

pause
```

&nbsp;

### 6.2. Script de Automatización para Linux / macOS (`backup.sh`)

```sh
#!/bin/bash

# ==============================================================================
# SCRIPT DE RESPALDO AUTOMATIZADO - TPI BASES DE DATOS II
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# Cargar MONGODB_URI desde .env (sin hardcodear credenciales)
if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: No se encontro el archivo .env"
  echo "Copie .env-example a .env y complete MONGODB_URI."
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  export "${key}=${value}"
done < "${ENV_FILE}"

if [ -z "${MONGODB_URI}" ]; then
  echo "ERROR: MONGODB_URI no esta definida en .env"
  exit 1
fi

# 1. Obtener la fecha actual en formato AAAA-MM-DD
FECHA=$(date +%Y-%m-%d)

# 2. Definir la ruta relativa requerida por la consigna
DESTINO="./resguardos_tpi/${FECHA}"

echo "========================================================"
echo "INICIANDO RESPALDO DE KIOSKO DB - MONGODB ATLAS"
echo "Destino relativo: ${DESTINO}"
echo "========================================================"

# 3. Crear la estructura de carpetas relativas si no existe
mkdir -p "${DESTINO}"

# 4. Ejecutar mongodump usando la URI del entorno
mongodump --uri="${MONGODB_URI}" --out="${DESTINO}"

# 5. Comprobar el código de salida del comando
if [ $? -eq 0 ]; then
  echo "========================================================"
  echo "RESPALDO FINALIZADO CON ÉXITO EN: ${DESTINO}"
  echo "========================================================"
else
  echo "========================================================"
  echo "ERROR: Falló la ejecución de mongodump"
  echo "========================================================"
  exit 1
fi
```

6.3. Evidencia de Ejecución y Estructura de Volcado

<img width="1379" height="345" alt="07_Backup_Base_Datos" src="https://github.com/user-attachments/assets/b1063769-122e-4c39-aa7a-af3ce5185a51" />

<img width="287" height="222" alt="08_Verificacion_Archivos_Backup" src="https://github.com/user-attachments/assets/00b87eaa-00c4-4602-b6aa-50b82c53d2ad" />

### 6.4. Análisis de Tolerancia a Fallos: RTO y RPO

* **RPO (Recovery Point Objective \- Objetivo de Punto de Recuperación):** Representa el volumen máximo de datos medidos en el tiempo que la organización asume perder ante un desastre.  
  * *Política definida:* El script de respaldo se planifica para ejecutarse **una vez al día al cierre contable (23:00 hs)**.  
  * *Impacto en el Kiosko:* El **RPO es de 24 horas**. En el escenario más desfavorable (fallo catastrófico antes del cierre), se pierden las transacciones de esa jornada, reconstruibles mediante los comprobantes físicos del punto de venta.  
* **RTO (Recovery Time Objective \- Objetivo de Tiempo de Recuperación):** Es el lapso máximo tolerable para que el sistema vuelva a estar operativo tras un incidente.  
  * *Estrategia de Restauración:* Se utiliza la herramienta nativa `mongorestore` con el parámetro `--drop`:

```sh
mongorestore --uri="${MONGODB_URI}" --drop "./resguardos_tpi/2026-10-23/kiosko_db"
```

  * *Impacto en el Kiosko:* El tamaño comprimido en BSON de las colecciones es de pocos megabytes. La reindexación y subida toma menos de 3 minutos. Se establece un **RTO de 15 minutos**, margen suficiente para que el operador corra la recuperación y reanude la atención.

---

## 7\. Conclusión y Reflexión Técnica

### 7.1. Comunicación Cliente-Servidor y Capa de Transporte

El desarrollo del TPI permitió comprender el ciclo integral de la persistencia de datos moderna:

1. **El rol del ODM (Mongoose):** Actúa como capa de abstracción sobre el driver oficial de MongoDB. Aporta validación en el cliente mediante esquemas fuertemente tipados (`ObjectId`, reglas `required`, marcas de tiempo `timestamps`) antes de enviar las instrucciones a la red.  
2. **Serialización BSON:** Los objetos JavaScript de la aplicación se serializan a formato binario BSON, optimizando el ancho de banda y la velocidad de almacenamiento en disco en los nodos remotos de Atlas.  
3. **Flujo Asíncrono no bloqueante:** La implementación de la interfaz de consola mediante el submódulo nativo `readline/promises` junto con `async/await` demostró cómo Node.js desacopla la captura de eventos por teclado del hilo de ejecución que despacha las operaciones de red hacia MongoDB Atlas.

### 7.2. Resolución del Incidente DNS SRV vs. Conexión Directa a Replica Set

Durante la integración en local bajo sistema operativo Windows se presentó el error `querySrv ECONNREFUSED` al intentar conectar con el prefijo `mongodb+srv://`.

* **Causa técnica diagnosticada:** El protocolo DNS SRV delega en el servidor DNS local la consulta de registros de servicio (`_mongodb._tcp`) para descubrir dinámicamente los nodos del clúster. El resolvedor de red local bajo IPv6 bloqueaba este tipo de consultas en el puerto 53\.  
* **Solución aplicada:** Se implementó la URI canónica directa (`mongodb://`) almacenada en `MONGODB_URI`, declarando explícitamente los 3 miembros que integran el Replica Set (nodos `shard-00-00`, `shard-00-01` y `shard-00-02` en el puerto 27017) junto con el nombre del conjunto (`replicaSet`) y `ssl=true`. De este modo, la aplicación y la utilidad `mongodump` establecieron canales TCP directos y deterministas con el motor de base de datos sin depender de intermediarios DNS inestables. Los secretos no viajan en el código ni en este informe.
