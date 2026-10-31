
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 1234;
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, `http://${req.headers.host}`).pathname
  );

  const relativePath = pathname === "/"
    ? "index.html"
    : pathname.replace(/^\/+/, "");

  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, "index.html")) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("404 - File not found");
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    res.end(data);
  });
}).listen(PORT, "localhost", () => {
  console.log(`Website running at http://localhost:${PORT}`);
});
