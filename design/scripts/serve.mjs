// Tiny static server for the mockups. Usage: node serve.mjs <dir> <port>
import http from "http";
import fs from "fs";
import path from "path";
const [, , dir, argPort = "8765"] = process.argv;
const port = process.env.PORT || argPort;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".css": "text/css", ".json": "application/json" };
http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!p.startsWith(dir)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(+port, () => console.log("serving " + dir + " on " + port));
