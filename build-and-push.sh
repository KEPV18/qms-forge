#!/bin/bash
cd /home/kepa/qms-forge
npx tsc --noEmit 2>&1 | head -20
echo "---TSC DONE---"
npx vite build 2>&1 | tail -5
echo "---BUILD DONE---"