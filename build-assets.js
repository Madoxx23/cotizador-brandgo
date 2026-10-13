// Genera assets.js con todas las imágenes embebidas (data URIs) para que la web
// funcione sin servidor y html2canvas pueda exportarlas sin errores de CORS.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'assets');
const out = { equipo: {}, icons: {} };
const uri = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
out.logo = uri(path.join(dir, 'logo.png'));
for (const f of fs.readdirSync(path.join(dir, 'equipo'))) out.equipo[path.parse(f).name] = uri(path.join(dir, 'equipo', f));
for (const f of fs.readdirSync(path.join(dir, 'icons'))) out.icons[path.parse(f).name] = uri(path.join(dir, 'icons', f));
fs.writeFileSync(path.join(__dirname, 'assets.js'), 'window.ASSETS = ' + JSON.stringify(out) + ';\n');
console.log('assets.js', Math.round(fs.statSync(path.join(__dirname, 'assets.js')).size / 1024) + ' KB');
