const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

const platform = process.platform;
const arch = process.arch;

const downloadUrls = {
    'win32': 'https://github.com/PrasannaMishra001/einstein-contact-manager/releases/latest/download/einstein-windows.exe',
    'darwin': 'https://github.com/PrasannaMishra001/einstein-contact-manager/releases/latest/download/einstein-macos',
    'linux': 'https://github.com/PrasannaMishra001/einstein-contact-manager/releases/latest/download/einstein-linux'
};

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete the file on error
            reject(err);
        });
    });
}

async function install() {
    try {
        console.log('🚀 Installing Einstein Contact Manager...');
        
        const binDir = path.join(__dirname, 'bin');
        if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
        }
        
        const url = downloadUrls[platform];
        if (!url) {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        
        const executableName = platform === 'win32' ? 'einstein.exe' : 'einstein';
        const executablePath = path.join(binDir, executableName);
        
        console.log(`📥 Downloading ${url}...`);
        await downloadFile(url, executablePath);
        
        // Make executable on Unix systems
        if (platform !== 'win32') {
            exec(`chmod +x ${executablePath}`, (error) => {
                if (error) {
                    console.error('❌ Failed to make executable:', error);
                } else {
                    console.log('✓ Made executable');
                }
            });
        }
        
        console.log('✅ Einstein Contact Manager installed successfully!');
        console.log('📞 Run "einstein" to start the application');
        
    } catch (error) {
        console.error('❌ Installation failed:', error.message);
        process.exit(1);
    }
}

install();