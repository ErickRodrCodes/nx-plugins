const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Argumentos adicionales para el proyecto específico (opcional)
// Por ejemplo: node tools/serve-with-pid.js --project=mi-proyecto
const args = process.argv.slice(2);

// Iniciar el proceso de Angular
console.log(`Iniciando aplicación Angular...`);
const angularProcess = spawn('ng', ['serve', ...args], {
  stdio: ['inherit', 'pipe', 'inherit'], // Capturar la salida estándar
  shell: true
});

let pidFile = null;
let portDetected = false;

// Analizar la salida para detectar el puerto real
angularProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data); // Mostrar la salida en la consola

  if (portDetected) return; // Si ya detectamos el puerto, no seguir buscando

  // Patrones comunes para detectar el puerto en diferentes versiones de Angular CLI
  const patterns = [
    // Angular 15+: "- Local: http://localhost:4200/"
    /Local:\s+http:\/\/localhost:(\d+)/i,

    // Angular 14: "** Angular Live Development Server is listening on localhost:4200"
    /listening on localhost:(\d+)/i,

    // Versión alternativa: "Development server running on: http://localhost:4200"
    /Development server running on: http:\/\/localhost:(\d+)/i,

    // Otra versión: "Server is listening on localhost:4200"
    /Server is listening on localhost:(\d+)/i,

    // Angular 16+: "Local: http://localhost:4200"
    /Local: http:\/\/localhost:(\d+)/i,

    // Mensaje cuando se encuentra un puerto disponible
    /Port (\d+) is available/i,

    // Angular 12/13: ":4200"
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
        pid: angularProcess.pid,
        port: port,
        startTime: new Date().toISOString(),
        command: `ng serve ${args.join(' ')}`
      };

      pidFile = path.join(process.cwd(), 'angular.pid');
      fs.writeFileSync(pidFile, JSON.stringify(pidInfo, null, 2));
      console.log(`\nArchivo PID creado: ${pidFile}`);
      console.log(`Aplicación ejecutándose en el puerto: ${port}`);
      break;
    }
  }
});

// Manejar señales para limpiar el archivo PID al finalizar
process.on('SIGINT', () => {
  cleanupPidFile();
  process.exit();
});

angularProcess.on('exit', () => {
  cleanupPidFile();
});

function cleanupPidFile() {
  if (pidFile && fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
    console.log(`Archivo PID eliminado: ${pidFile}`);
  }
}
