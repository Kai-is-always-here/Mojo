@echo off
cd /d "%~dp0server"
if not exist node_modules echo Installing server dependencies... && npm install
if not exist .env copy .env.example .env
npm run dev
