import os
import sys
import subprocess
import shutil

def install_pyinstaller():
    """Install PyInstaller"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])
        print("+ PyInstaller installed!")
        return True
    except subprocess.CalledProcessError:
        print("- Failed to install PyInstaller")
        return False

def create_spec_file():
    """Create PyInstaller spec file"""
    spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('data', 'data'),
        ('docs', 'docs'),
    ],
    hiddenimports=[
        'google.auth',
        'google.auth.transport',
        'google_auth_oauthlib',
        'googleapiclient',
        'rich',
        'PIL',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='einstein',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    with open('einstein.spec', 'w', encoding='utf-8') as f:
        f.write(spec_content)
    print("+ Spec file created!")

def build_executable():
    """Build the executable"""
    try:
        subprocess.check_call(['pyinstaller', '--clean', 'einstein.spec'])
        print("+ Executable built successfully!")
        return True
    except subprocess.CalledProcessError:
        print("- Failed to build executable")
        return False

def create_installer_script():
    """Create installer script for Windows"""
    installer_content = '''@echo off
echo Installing Einstein Contact Manager...

REM Create program directory
mkdir "%PROGRAMFILES%\\Einstein" 2>nul

REM Copy executable
copy "dist\\einstein.exe" "%PROGRAMFILES%\\Einstein\\" >nul
if errorlevel 1 (
    echo Error: Failed to copy executable. Run as Administrator.
    pause
    exit /b 1
)

REM Add to PATH
setx PATH "%PATH%;%PROGRAMFILES%\\Einstein" /M >nul 2>&1
if errorlevel 1 (
    echo Warning: Could not add to system PATH. Run as Administrator for system-wide access.
    setx PATH "%PATH%;%PROGRAMFILES%\\Einstein" >nul 2>&1
)

echo.
echo [32m+ Einstein Contact Manager installed successfully![0m
echo [32m+ You can now run 'einstein' from any command prompt[0m
echo.
pause
'''
    
    with open('install.bat', 'w', encoding='utf-8') as f:
        f.write(installer_content)
    print("+ Windows installer created!")

def create_unix_installer():
    """Create installer script for Unix/Linux/Mac"""
    installer_content = '''#!/bin/bash

echo "Installing Einstein Contact Manager..."

# Create local bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Copy executable
cp dist/einstein ~/.local/bin/
chmod +x ~/.local/bin/einstein

# Add to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
fi

echo ""
echo "+ Einstein Contact Manager installed successfully!"
echo "+ Restart your terminal or run: source ~/.bashrc"
echo "+ Then you can run 'einstein' from anywhere"
'''
    
    with open('install.sh', 'w', encoding='utf-8') as f:
        f.write(installer_content)
    os.chmod('install.sh', 0o755)
    print("+ Unix installer created!")

def main():
    print("Building Einstein Contact Manager Executable...")
    
    if not install_pyinstaller():
        return
    
    create_spec_file()
    
    if build_executable():
        create_installer_script()
        create_unix_installer()
        
        print("\n+ Build completed successfully!")
        print("\nFiles created:")
        print("  dist/einstein.exe (Windows)")
        print("  dist/einstein (Unix/Linux/Mac)")
        print("  install.bat (Windows installer)")
        print("  install.sh (Unix installer)")
        print("\nTo install:")
        print("  Windows: Run install.bat as Administrator")
        print("  Unix/Linux/Mac: Run ./install.sh")

if __name__ == "__main__":
    main()