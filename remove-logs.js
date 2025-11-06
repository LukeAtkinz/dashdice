const fs = require('fs');

// Read the matchService.ts file
const filePath = 'src/services/matchService.ts';
const content = fs.readFileSync(filePath, 'utf-8');

// Split into lines
const lines = content.split('\n');
const newLines = [];
let skipNext = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip console.log lines (but keep console.error, console.warn)
  if (trimmed.startsWith('console.log(')) {
    // Check if it's a multi-line console.log
    let fullStatement = line;
    let j = i;
    
    // Keep reading until we find the closing );
    while (j < lines.length && !fullStatement.includes(');')) {
      j++;
      if (j < lines.length) {
        fullStatement += lines[j];
      }
    }
    
    // Skip all these lines
    if (j > i) {
      i = j; // Skip the multi-line statement
    }
    // Don't add this line or the continuation lines
    continue;
  }
  
  // Keep all other lines
  newLines.push(line);
}

// Write the modified content back
fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('✅ Removed all console.log statements from matchService.ts');
console.log(`Original: ${lines.length} lines, New: ${newLines.length} lines (removed ${lines.length - newLines.length} lines)`);
