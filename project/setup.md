# Mortuary Management System - Local Setup Guide

## Your Supabase Project Details
- **Project ID**: itmocilzcojagjbkrvyx
- **Project Name**: Mortuary_Management_System
- **URL**: https://itmocilzcojagjbkrvyx.supabase.co
- **API Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0bW9jaWx6Y29qYWdqYmtydnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzcyNTMsImV4cCI6MjA2NjY1MzI1M30.ACbbGbvXRnm-gYaTucsBAuPzcE55nmnRgnpr5Jd5k6I

## Step-by-Step Setup Instructions

### 1. Environment Configuration ✅
Your `.env` file is already configured with the correct Supabase credentials.

### 2. Install Dependencies ✅
```bash
npm install
```

### 3. Database Setup ✅
Your Supabase database already has tables and data. No migration needed.

### 4. Start the Backend Server
```bash
npm run server
```
This will start the Express server on port 3001.

### 5. Start the Frontend Development Server
In a new terminal window:
```bash
npm run dev
```
This will start the Vite development server on port 5173.

### 6. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## Demo Accounts
- **Admin**: admin@mortuary.com / admin123
- **Staff**: staff@mortuary.com / staff123
- **Pathologist**: pathologist@mortuary.com / pathologist123

## Real-time Features
The application uses Supabase real-time subscriptions for:
- Live notifications
- Real-time updates for body status
- Live task assignments
- Real-time storage unit status

## Troubleshooting

### If Frontend Won't Start
1. Check if all dependencies are installed: `npm install`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npm run build`

### If Backend Won't Start
1. Check if port 3001 is available
2. Verify Supabase credentials in `.env`
3. Check console for error messages

### Database Connection Issues
1. Verify your Supabase project is active
2. Check that your API key is correct
3. Ensure your database tables exist

## Project Structure
```
project/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/          # Supabase services
│   ├── lib/               # Supabase configuration
│   └── context/           # React context providers
├── server/                # Backend Express application
│   ├── routes/            # API routes
│   ├── config/            # Supabase configuration
│   └── middleware/        # Express middleware
└── supabase/              # Database migrations
```

## Available Scripts
- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint

## Real-time Database Updates
Any CRUD operations performed in the frontend will automatically reflect in your Supabase cloud database and update in real-time across all connected clients. 