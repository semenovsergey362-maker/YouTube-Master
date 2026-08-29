import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

try {
  console.log('--- Starting Production Build ---');
  
  // 1. Run Vite build
  console.log('Building client with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });

  // 2. Run Esbuild for the custom server
  console.log('Bundling custom server with Esbuild...');
  execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit' });

  // 3. Sync dist folder contents to build folder to ensure compatibility with all deploy runtimes
  console.log('Synchronizing dist to build folder...');
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true, force: true });
  }
  copyFolderRecursiveSync('dist', 'build');

  console.log('--- Build Finished Successfully ---');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
