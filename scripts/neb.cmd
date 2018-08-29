@echo off

pushd "%~dp0Tools\radon-extension-build"
    call npm run build
    echo.
popd

call node "%~dp0Tools\radon-extension-build\lib\index.js" %*
