# Quick Start Guide

## Option 1: Automatic Setup (Recommended)
Double-click `start-app.bat` in this folder.

## Option 2: Manual Setup

### Step 1: Install Dependencies
```bash
npm install helmet express-rate-limit joi
npx update-browserslist-db@latest
```

### Step 2: Copy Clean Database File
```bash
copy src\services\database-clean.ts src\services\database.ts
```

### Step 3: Start Backend Server
```bash
npm run server
```

### Step 4: Start Frontend (in new terminal)
```bash
npm run dev
```

## Access Your Application
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Demo Accounts
- **Admin**: admin@mortuary.com / admin123
- **Staff**: staff@mortuary.com / staff123
- **Pathologist**: pathologist@mortuary.com / pathologist123

## Troubleshooting
If you get any "Cannot find package" errors, run:
```bash
npm install
```

This will install all dependencies listed in package.json. 