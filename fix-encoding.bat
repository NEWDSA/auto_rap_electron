@echo off
echo 正在设置UTF-8编码...
chcp 65001 >nul 2>&1
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8
echo 编码设置完成，启动应用程序...
npm run dev
