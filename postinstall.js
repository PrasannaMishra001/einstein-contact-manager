const path = require('path');
const fs = require('fs');

// Create wrapper script
const binPath = path.join(__dirname, 'bin');
const platform = process.platform;

if (platform === 'win32') {
    const batContent = `@echo off
"${path.join(binPath, 'einstein.exe')}" %*`;
    fs.writeFileSync(path.join(binPath, 'einstein.bat'), batContent);
} else {
    const shContent = `#!/bin/bash
"${path.join(binPath, 'einstein')}" "$@"`;
    fs.writeFileSync(path.join(binPath, 'einstein'), shContent);
    fs.chmodSync(path.join(binPath, 'einstein'), '755');
}

console.log('✅ Post-install setup completed');