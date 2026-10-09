import http.server, os, sys, functools, gzip, mimetypes
# Statischer Server wie Firebase Hosting: saubere URLs, gzip für Text, Langzeit-Cache für /_next/static
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        p = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if os.path.exists(p + ".html"): p = p + ".html"
        elif os.path.isdir(p): p = os.path.join(p, "index.html")
        if not os.path.exists(p):
            self.send_response(404); self.end_headers(); return
        data = open(p, "rb").read()
        ctype = mimetypes.guess_type(p)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if ctype.startswith(("text/", "application/javascript", "application/json", "image/svg")) and "gzip" in self.headers.get("Accept-Encoding", ""):
            data = gzip.compress(data, 6); self.send_header("Content-Encoding", "gzip")
        if path.startswith("/_next/static/"): self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else: self.send_header("Cache-Control", "max-age=3600")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers(); self.wfile.write(data)
    def log_message(self, *a): pass
ROOT, port = sys.argv[1], int(sys.argv[2])
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
