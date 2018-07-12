@echo off

pushd "%~dp0Tools\neon-extension-build"
    call npm run build
    echo.
popd

call node "%~dp0Tools\neon-extension-build\lib\index.js" %*
