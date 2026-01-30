"""
API endpoint for managing user settings.
GET /api/settings?key=<key> - Get a setting by key
POST /api/settings - Update a setting
"""
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api._utils.db import get_supabase


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            key = params.get("key", [None])[0]

            if not key:
                self._send_error(400, "Missing key parameter")
                return

            supabase = get_supabase()
            result = supabase.table("user_settings").select("*").eq("setting_key", key).execute()

            if result.data:
                self._send_json(result.data[0])
            else:
                self._send_json(None)

        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        """Update a setting."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            key = body.get("key")
            value = body.get("value")

            if not key or value is None:
                self._send_error(400, "Missing key or value")
                return

            supabase = get_supabase()

            # Upsert the setting
            result = supabase.table("user_settings").upsert({
                "setting_key": key,
                "setting_value": value
            }, on_conflict="setting_key").execute()

            self._send_json({"success": True, "data": result.data})

        except Exception as e:
            self._send_error(500, str(e))

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
