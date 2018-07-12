@echo off

pushd "%~dp0Tools\radon-extension-build"
    echo --------------------------------------
    echo Compiling radon-extension-build...
    echo --------------------------------------
    echo.

    call npm run build
    echo.

    echo --------------------------------------
    echo Creating release...
    echo --------------------------------------
    echo.

    call node "%~dp0Tools\radon-extension-build\lib\index.js" release:create --build-dir "%~dp0\Build" --package-dir "%~dp0" %*
popd
