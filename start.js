const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk') || { green: text => text, blue: text => text, red: text => text, yellow: text => text };

// Function to create a server process
function createServer(command, args, name, options = {}) {
  console.log(`Starting ${name}...`);
  
  const server = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    ...options
  });
  
  server.stdout.on('data', (data) => {
    console.log(`${chalk.blue(`[${name}]`)} ${data.toString().trim()}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`${chalk.red(`[${name} ERROR]`)} ${data.toString().trim()}`);
  });
  
  server.on('close', (code) => {
    console.log(`${chalk.yellow(`[${name}]`)} Process exited with code ${code}`);
  });
  
  return server;
}

// Start frontend server (Vite)
const frontendServer = createServer('npm', ['run', 'dev'], 'Frontend');

// Start backend server (Flask)
const backendServer = createServer('python', ['run.py'], 'Backend');

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  frontendServer.kill();
  backendServer.kill();
  process.exit(0);
});

console.log(chalk.green('Both servers are running...'));
console.log('Press Ctrl+C to stop both servers.'); 