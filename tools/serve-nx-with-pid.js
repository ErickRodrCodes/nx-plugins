const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Obtener argumentos para nx serve
const args = process.argv.slice(2);

// Determinar el nombre del proyecto (obligatorio para nx serve)
let projectName = null;
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('-')) {
    projectName = args[i];
    break;
  }
}

if (!projectName) {
  console.error('Error: Debes especificar un nombre de proyecto.');
  console.error('Uso: node tools/serve-nx-with-pid.js [proyecto] [opciones]');
  process.exit(1);
}

// Crear nombre de archivo PID basado en el proyecto
const pidFileName = `${projectName}.pid`;

console.log(`Iniciando aplicación Nx '${projectName}'...`);
const nxProcess = spawn('nx', ['serve', ...args], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true
});

let pidFile = null;
let portDetected = false;

// Analizar la salida para detectar el puerto real
nxProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data); // Mostrar la salida en la consola

  if (portDetected) return; // Si ya detectamos el puerto, no seguir buscando

  // Patrones comunes para detectar el puerto en diferentes versiones de Angular CLI / Nx
  const patterns = [
    // Angular/Nx patrones comunes
    /Local:\s+http:\/\/localhost:(\d+)/i,
    /listening on localhost:(\d+)/i,
    /Development server running on: http:\/\/localhost:(\d+)/i,
    /Server is listening on localhost:(\d+)/i,
    /http:\/\/localhost:(\d+)/i,
    /Port (\d+) is available/i,
    /Application is running at http:\/\/localhost:(\d+)/i,
    /:\s*(\d+)/
  ];

  // Probar cada patrón para encontrar el puerto
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match && match[1]) {
      const port = match[1];
      portDetected = true;

      // Escribir archivo PID con el puerto
      const pidInfo = {
        project: projectName,
        pid: nxProcess.pid,
        port: port,
        startTime: new Date().toISOString(),
        command: `nx serve ${args.join(' ')}`
      };

      pidFile = path.join(process.cwd(), pidFileName);
      fs.writeFileSync(pidFile, JSON.stringify(pidInfo, null, 2));
      console.log(`\nArchivo PID creado: ${pidFile}`);
      console.log(`Aplicación '${projectName}' ejecutándose en el puerto: ${port}`);
      break;
    }
  }
});

// Manejar señales para limpiar el archivo PID al finalizar
process.on('SIGINT', () => {
  cleanupPidFile();
  process.exit();
});

nxProcess.on('exit', () => {
  cleanupPidFile();
});

function cleanupPidFile() {
  if (pidFile && fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
    console.log(`Archivo PID eliminado: ${pidFile}`);
  }
}
