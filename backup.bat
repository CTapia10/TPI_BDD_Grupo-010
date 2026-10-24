@echo off
setlocal EnableDelayedExpansion

:: Cargar MONGODB_URI desde .env (sin hardcodear credenciales)
if not exist "%~dp0.env" (
  echo ERROR: No se encontro el archivo .env
  echo Copie .env-example a .env y complete MONGODB_URI.
  pause
  exit /b 1
)

for /f "usebackq tokens=1* delims==" %%A in ("%~dp0.env") do (
  if /i "%%A"=="MONGODB_URI" set "MONGODB_URI=%%B"
)

:: Quitar comillas envolventes y espacios
if defined MONGODB_URI set "MONGODB_URI=!MONGODB_URI:"=!"
if defined MONGODB_URI set "MONGODB_URI=!MONGODB_URI:'=!"

if not defined MONGODB_URI (
  echo ERROR: MONGODB_URI no esta definida en .env
  pause
  exit /b 1
)

:: 1. Obtener la fecha actual en formato AAAA-MM-DD usando PowerShell nativo (compatible con Windows 10 y 11)
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"') do set FECHA=%%I

:: 2. Definir la ruta relativa requerida por la consigna (./resguardos_tpi/AAAA-MM-DD)
set "DESTINO=%~dp0resguardos_tpi\!FECHA!"

echo ========================================================
echo INICIANDO RESPALDO DE KIOSKO DB - MONGODB ATLAS
echo Carpeta de destino: !DESTINO!
echo ========================================================

:: 3. Crear el directorio si no existe
if not exist "!DESTINO!" (
  mkdir "!DESTINO!"
)

:: 4. Ejecutar mongodump con la URI del entorno (delayed expansion evita que & rompa el comando)
mongodump --uri="!MONGODB_URI!" --out="!DESTINO!"

:: 5. Comprobar si mongodump finalizo correctamente
if !ERRORLEVEL! EQU 0 (
  echo ========================================================
  echo RESPALDO FINALIZADO CON EXITO
  echo ========================================================
) else (
  echo ========================================================
  echo ERROR DURANTE EL RESPALDO (Codigo de error: !ERRORLEVEL!)
  echo ========================================================
  pause
  exit /b 1
)

pause
