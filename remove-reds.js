const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = [
  ...walk(path.join(__dirname, 'src', 'app')),
  ...walk(path.join(__dirname, 'src', 'components')),
  ...walk(path.join(__dirname, 'src', 'lib'))
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace solid buttons first
  content = content.replace(/background:\s*["']#e63946["'],\s*color:\s*["']#fff["']/g, 'background: "#fff", color: "#000"');
  content = content.replace(/background:\s*["']#e63946["'],\s*border:\s*["']none["'],\s*color:\s*["']#fff["']/g, 'background: "#fff", border: "none", color: "#000"');
  content = content.replace(/color:\s*["']#fff["'],\s*background:\s*["']#e63946["']/g, 'color: "#000", background: "#fff"');
  
  // Replace other colors
  content = content.replace(/#e63946/g, '#fff');
  content = content.replace(/#ef4444/g, '#fff');
  content = content.replace(/#f87171/g, '#fff');
  content = content.replace(/#b91c2d/g, '#fff');
  
  // Replace rgba reds with rgba whites
  content = content.replace(/rgba\(230,\s*57,\s*70/g, 'rgba(255,255,255');
  content = content.replace(/rgba\(239,\s*68,\s*68/g, 'rgba(255,255,255');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
