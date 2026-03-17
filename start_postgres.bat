@echo off
echo ============================================================
echo  Starting PostgreSQL 16...
echo ============================================================
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Projeler\PythonProje\db_data" -l "C:\Projeler\PythonProje\db_data\logfile"
if %errorlevel% == 0 (
    echo  PostgreSQL started successfully on port 5432!
) else (
    echo  PostgreSQL may already be running, or an error occurred.
    echo  Check log: C:\Projeler\PythonProje\db_data\logfile
)
pause
