@echo off
title V3 Dental Backend Server
echo =======================================================
echo Starting V3 Dental Clinic Backend (Spring Boot)...
echo =======================================================
cd /d "%~dp0backend"
mvn spring-boot:run
pause
