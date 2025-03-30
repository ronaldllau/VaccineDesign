const { spawn } = require('child_process');
const path = require('path');

// Start Flask backend
const flaskProcess = spawn('python', ['run.py'], {
  stdio: 'inherit',
  shell: true
});

// Start React frontend
const frontendProcess = spawn('cd', ['frontend', '&&', 'npm', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  flaskProcess.kill('SIGINT');
  frontendProcess.kill('SIGINT');
  process.exit();
});

console.log('Both servers are running...');
console.log('Press Ctrl+C to stop both servers.'); 