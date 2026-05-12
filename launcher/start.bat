@echo off
chcp 65001 >nul
title TRASOCHY Server Auto-Restart

:: 切换到项目根目录
cd /d "%~dp0.."

:loop
echo ==============================================
echo [系统] 正在启动 TRASOCHY 商城服务...
echo ==============================================

:: 关闭 Windows CMD 的快速编辑模式，防止用户鼠标误触导致程序暂停
reg add HKEY_CURRENT_USER\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1

:: 启动服务
call npm run dev

echo.
echo ==============================================
echo [警告] 服务意外关闭或崩溃！
echo [恢复] 5 秒后将自动重新启动服务，请保持此窗口打开...
echo ==============================================
timeout /t 5
goto loop
