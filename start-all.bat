@echo off
title V3 Dental Clinic Launcher
echo =======================================================
echo Starting V3 Dental Clinic System (Backend & Frontend)...
echo =======================================================
start "V3 Dental Backend" cmd /k "%~dp0run-backend.bat"
start "V3 Dental Frontend" cmd /k "%~dp0run-frontend.bat"
echo System launching... Check the opened command prompt windows.
