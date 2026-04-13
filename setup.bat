@echo off
echo ================================
echo   S.H.I.E.L.D Bot Setup
echo ================================

echo Installing dependencies...
npm install

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please fill in your .env file then run start.bat
) else (
    echo .env file already exists
)

echo Deploying slash commands...
node deploy-commands.js

echo Done! Run start.bat to start the bot.
pause