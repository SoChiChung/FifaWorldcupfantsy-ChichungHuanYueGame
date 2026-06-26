const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'docs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? '/index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: return index.html for non-file routes
        fs.readFile(path.join(ROOT, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`  Dev server running at http://localhost:${PORT}`);
  console.log(`  Serving: ${ROOT}`);
  console.log(`  Press Ctrl+C to stop`);
});
