// Lanza el servidor de desarrollo PHP para el backend.
// Se usa un script Node en vez de invocar php.exe directamente desde npm
// para evitar problemas de escapado de comillas/rutas en distintos entornos (WebStorm, cmd, PowerShell).
const { spawn } = require('child_process');
const path = require('path');

const phpPath = 'C:\\xampp\\php\\php.exe';
const backendDir = path.join(__dirname, '..', 'backend');

const server = spawn(phpPath, ['-S', 'localhost:8000', '-t', backendDir], {
  cwd: backendDir,
  stdio: 'inherit',
});

server.on('error', (err) => {
  console.error('No se pudo iniciar el servidor PHP:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});
