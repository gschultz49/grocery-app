#!/usr/bin/env python3
"""
Development server for running Vercel-style Python handlers locally.
Maps /api/* routes to the appropriate handler classes.
"""
import importlib.util
import io
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

# Cache for loaded handler modules
_handler_cache = {}


def load_handler_class(module_name):
    """Dynamically load a handler class from module."""
    if module_name in _handler_cache:
        return _handler_cache[module_name]

    module_path = module_name.replace('.', '/') + '.py'
    full_path = os.path.join(API_DIR, module_path)

    spec = importlib.util.spec_from_file_location(module_name, full_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    _handler_cache[module_name] = module.handler
    return module.handler


def find_route(path):
    """Find the handler module for a given path."""
    parsed_path = path.split('?')[0].rstrip('/')

    for route, module in ROUTE_MAP.items():
        if parsed_path == route:
            return module
    return None


class DevServerHandler(BaseHTTPRequestHandler):
    """Routes requests to the appropriate Vercel handler."""

    def _send_json(self, data):
        """Send JSON response - used by handler methods."""
        import json
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, code, message):
        """Send error response - used by handler methods."""
        import json
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def _handle_request(self, method):
        module_name = find_route(self.path)

        if not module_name:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')
            return

        try:
            handler_class = load_handler_class(module_name)

            # Get the method handler from the class
            method_name = f'do_{method}'
            if not hasattr(handler_class, method_name):
                self.send_response(405)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Method not allowed"}')
                return

            # Call the method with self as the handler instance
            # We need to temporarily replace our class's method
            method_func = getattr(handler_class, method_name)
            method_func(self)

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_msg = str(e).replace('"', '\\"')
            self.wfile.write(f'{{"error": "{error_msg}"}}'.encode())

    def do_GET(self):
        self._handle_request('GET')

    def do_POST(self):
        self._handle_request('POST')

    def do_PUT(self):
        self._handle_request('PUT')

    def do_DELETE(self):
        self._handle_request('DELETE')

    def do_OPTIONS(self):
        self._handle_request('OPTIONS')

    def log_message(self, format, *args):
        print(f"[API] {args[0]}", flush=True)


def main():
    port = int(os.environ.get('API_PORT', 3001))
    server = HTTPServer(('0.0.0.0', port), DevServerHandler)
    print(f"API dev server running on http://0.0.0.0:{port}", flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
