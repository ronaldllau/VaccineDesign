// Import packages as ESM modules
import { spawn } from 'child_process';
import process from 'process';
import chalk from 'chalk';

// Track running processes
const runningProcesses = [];

// Function to handle process termination
function cleanup() {
  console.log(chalk.yellow('\nShutting down servers...'));
  
  runningProcesses.forEach(proc => {
    if (!proc.killed) {
      proc.kill();
    }
  });
  
  console.log(chalk.yellow('All servers stopped. Goodbye!'));
  process.exit(0);
}

// Register cleanup handlers for graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start Frontend Server (Vite)
console.log(chalk.green('Starting Frontend...'));
const frontendProcess = spawn('npm', ['run', 'dev'], { 
  stdio: 'pipe',
  shell: true
});
runningProcesses.push(frontendProcess);

// Start Backend Server (Flask)
console.log(chalk.green('Starting Backend...'));
const backendProcess = spawn('python', ['run.py'], { 
  stdio: 'pipe',
  shell: true
});
runningProcesses.push(backendProcess);

// Helper function to prefix log lines
function prefixLines(data, prefix, color) {
  return data
    .toString()
    .trim()
    .split('\n')
    .map(line => color(`[${prefix}] `) + line)
    .join('\n');
}

// Handle frontend output
frontendProcess.stdout.on('data', (data) => {
  console.log(prefixLines(data, 'Frontend', chalk.blue));
});
frontendProcess.stderr.on('data', (data) => {
  console.error(prefixLines(data, 'Frontend', chalk.blue));
});

// Handle backend output
backendProcess.stdout.on('data', (data) => {
  console.log(prefixLines(data, 'Backend', chalk.green));
});
backendProcess.stderr.on('data', (data) => {
  console.error(prefixLines(data, 'Backend', chalk.green));
});

console.log(chalk.green('Both servers are running...'));
console.log(chalk.blue('Frontend server typically runs on http://localhost:5173'));
console.log(chalk.green('Backend server runs on http://localhost:8080'));
console.log(chalk.yellow('Press Ctrl+C to stop all servers')); 