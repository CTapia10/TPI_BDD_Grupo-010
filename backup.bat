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

:: 1. Obtener la fecha actual en formato AAAA-MM-DD usando PowerShell nativo (compatible con Windows 10 y 11)
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
