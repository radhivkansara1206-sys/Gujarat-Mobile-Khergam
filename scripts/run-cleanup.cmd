@echo off
cd /d "C:\Users\Rv\.gemini\antigravity\scratch\gujarat-mobile-khergam"
if not exist logs mkdir logs
echo ================================================== >> logs\scheduler.log
echo [START] %date% %time% >> logs\scheduler.log
echo Starting daily scan and cleanup... >> logs\scheduler.log
call npx --yes tsx scripts/cleanup-and-optimize.ts >> logs\scheduler.log 2>&1
echo [FINISHED] %date% %time% >> logs\scheduler.log
echo ================================================== >> logs\scheduler.log
