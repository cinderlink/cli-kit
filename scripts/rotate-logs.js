#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_LINES = 1000;

function rotateLogs() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(LOG_DIR);
  
  files.forEach(file => {
    const filePath = path.join(LOG_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile() && file.endsWith('.log')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (lines.length > MAX_LINES) {
        // Keep only the last MAX_LINES lines
        const truncatedContent = lines.slice(-MAX_LINES).join('\n');
        fs.writeFileSync(filePath, truncatedContent);
        console.log(`Rotated ${file}: ${lines.length} -> ${MAX_LINES} lines`);
      }
    }
  });
}

// Run rotation
rotateLogs();

// Set up periodic rotation (every 30 seconds)
setInterval(rotateLogs, 30000);

console.log('Log rotation script started. Checking every 30 seconds...');