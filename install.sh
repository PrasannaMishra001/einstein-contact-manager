#!/bin/bash

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
