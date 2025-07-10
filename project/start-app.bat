@echo off
echo Starting Mortuary Management System...
echo.

echo Installing missing dependencies...
npm install helmet express-rate-limit joi

echo.
echo Updating browserslist...
npx update-browserslist-db@latest

echo.
echo Replacing database.ts with clean version...
if exist src\services\database-clean.ts (
    copy src\services\database-clean.ts src\services\database.ts
    echo Database file updated successfully.
) else (
    echo Warning: database-clean.ts not found, skipping...
)

echo.
echo Starting backend server...
start "Backend Server" cmd /k "npm run server"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting frontend development server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Application is starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window...
pause > nul