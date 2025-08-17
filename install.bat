@echo off
echo Installing Einstein Contact Manager...

REM Create program directory
mkdir "%PROGRAMFILES%\Einstein" 2>nul

REM Copy executable
copy "dist\einstein.exe" "%PROGRAMFILES%\Einstein\" >nul
if errorlevel 1 (
    echo Error: Failed to copy executable. Run as Administrator.
    pause
    exit /b 1
)

REM Add to PATH
setx PATH "%PATH%;%PROGRAMFILES%\Einstein" /M >nul 2>&1
if errorlevel 1 (
    echo Warning: Could not add to system PATH. Run as Administrator for system-wide access.
    setx PATH "%PATH%;%PROGRAMFILES%\Einstein" >nul 2>&1
)

echo.
echo [32m+ Einstein Contact Manager installed successfully![0m
echo [32m+ You can now run 'einstein' from any command prompt[0m
echo.
pause
