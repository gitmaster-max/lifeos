"""LifeOS local server — run: python serve.py, then open http://localhost:8000"""
import http.server, socketserver, webbrowser, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8000
handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map[".js"] = "text/javascript"
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"LifeOS running at http://localhost:{PORT}  (Ctrl+C to stop)")
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()
