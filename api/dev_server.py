#!/usr/bin/env python3
"""
Development server for running Vercel-style Python handlers locally.
Maps /api/* routes to the appropriate handler classes.
"""
import importlib.util
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

API_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(API_DIR)
sys.path.insert(0, PROJECT_ROOT)

ROUTE_MAP = {
    '/api/recipes': 'recipes',
    '/api/weekly': 'weekly',
    '/api/staples': 'staples',
    '/api/pantry': 'pantry',
    '/api/settings': 'settings',
    '/api/notifications': 'notifications',
    '/api/cron/analyze-week': 'cron.analyze-week',
    '/api/cron/generate-weekly': 'cron.generate-weekly',
}


def load_handler(module_name):
    """Dynamically load a handler module."""
    module_path = module_name.replace('.', '/') + '.py'
    full_path = os.path.join(API_DIR, module_path)

    spec = importlib.util.spec_from_file_location(module_name, full_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.handler


class DevServerHandler(BaseHTTPRequestHandler):
    """Routes requests to the appropriate Vercel handler."""

    def _route_request(self, method):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')

        # Find matching route
        handler_module = None
        for route, module in ROUTE_MAP.items():
            if path == route or path.startswith(route + '?'):
                handler_module = module
                break

        if not handler_module:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')
            return

        try:
            handler_class = load_handler(handler_module)
            # Create a mock request that mimics what the handler expects
            mock_handler = handler_class(self.request, self.client_address, self.server)
            mock_handler.path = self.path
            mock_handler.headers = self.headers
            mock_handler.rfile = self.rfile
            mock_handler.wfile = self.wfile
            mock_handler.request_version = self.request_version

            # Call the appropriate method
            getattr(mock_handler, f'do_{method}')()
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())

    def do_GET(self):
        self._route_request('GET')

    def do_POST(self):
        self._route_request('POST')

    def do_PUT(self):
        self._route_request('PUT')

    def do_DELETE(self):
        self._route_request('DELETE')

    def do_OPTIONS(self):
        self._route_request('OPTIONS')

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")


def main():
    port = int(os.environ.get('API_PORT', 3001))
    server = HTTPServer(('0.0.0.0', port), DevServerHandler)
    print(f"API dev server running on http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == '__main__':
    main()
