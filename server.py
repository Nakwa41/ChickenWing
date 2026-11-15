"""Local-only static server. No upload, account, or external API."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import argparse
import json
import threading
import webbrowser

class LocalServer(ThreadingHTTPServer):
    # ES modules load in parallel; avoid resetting connections during cold starts.
    request_queue_size = 64

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.snap': 'application/json'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        super().end_headers()
    def do_GET(self):
        if self.path == '/health':
            data = json.dumps({'application': 'ChickenWing', 'version': 1}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if any(part.startswith('.') for part in self.path.split('/') if part):
            self.send_error(404); return
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--open', action='store_true', help='Open the local application in your browser')
    args = parser.parse_args()
    os.chdir(Path(__file__).parent)
    url = f'http://127.0.0.1:{args.port}'
    try:
        server = LocalServer(('127.0.0.1', args.port), Handler)
    except OSError as error:
        if error.errno == 48:
            from urllib.request import urlopen
            try:
                running = json.load(urlopen(url + '/health', timeout=2))
                if running.get('application') == 'ChickenWing':
                    print(f'ChickenWing est déjà ouvert : {url}', flush=True)
                    if args.open: webbrowser.open(url)
                    raise SystemExit(0)
            except (OSError, ValueError):
                pass
        raise
    print(f'ChickenWing · {url}\nGardez cette fenêtre ouverte. Ctrl+C pour arrêter.', flush=True)
    if args.open: threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: print('\nChickenWing arrêté. Vos shows restent enregistrés dans le navigateur.')
    finally: server.server_close()
