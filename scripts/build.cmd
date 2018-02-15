@echo off

pushd "%~dp0Tools\neon-extension-build"
    echo --------------------------------------
    echo Compiling neon-extension-build...
    echo --------------------------------------
    echo.

    call npm run build
    echo.

    echo --------------------------------------
    echo Building extension...
    echo --------------------------------------
    echo.

    call node "%~dp0Tools\neon-extension-build\lib\index.js" build --build-dir "%~dp0\Build" --package-dir "%~dp0" %*
popd
