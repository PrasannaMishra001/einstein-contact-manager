import os
import subprocess
import sys

def install_requirements():
    """Install required packages"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'rich>=13.0.0'])
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'python-dateutil>=2.8.0'])
        print("✓ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements")
        return False

def setup_directories():
    """Create necessary directories"""
    directories = ['data', 'data/backups', 'data/photos', 'contacts', 'tests']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    print("✓ Directories created successfully!")

def create_init_file():
    """Create __init__.py file"""
    with open('contacts/__init__.py', 'w') as f:
        f.write('# Contact Manager Package\n')
    print("✓ Package initialization file created!")

def main():
    print("🚀 Setting up Enhanced Contact Manager...")
    
    setup_directories()
    create_init_file()
    
    if install_requirements():
        print("\n✅ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Copy all the code files to their respective locations")
        print("2. Run: python create_sample_csv.py (to create sample data)")
        print("3. Run: python main.py (to start the application)")
    else:
        print("\n⚠️ Setup completed with warnings. You may need to install requirements manually:")
        print("pip install rich python-dateutil")

if __name__ == "__main__":
    main()