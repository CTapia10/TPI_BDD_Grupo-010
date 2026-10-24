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
