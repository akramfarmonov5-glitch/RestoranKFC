import { execSync } from 'child_process';

try {
  console.log('Killing node processes...');
  execSync('pkill node');
  console.log('Done.');
} catch (e) {
  console.log('Error:', e.message);
}
