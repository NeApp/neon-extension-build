@echo off

pushd "%~dp0Tools\neon-extension-build"
    echo --------------------------------------
    echo Installing neon-extension-build...
    echo --------------------------------------
    echo.

    call npm install
    echo.

    echo --------------------------------------
    echo Installing modules...
    echo --------------------------------------
    echo.

    call node "%~dp0Tools\neon-extension-build\lib\index.js" install --build-dir "%~dp0\Build" --package-dir "%~dp0" %*
popd
