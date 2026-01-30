"""
API endpoint for managing staple items (always on grocery list).
GET /api/staples - List all staples
POST /api/staples - Add new staple
PUT /api/staples - Update staple
DELETE /api/staples?id=<id> - Remove staple
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
            supabase = get_supabase()
            result = supabase.table("staples").select("*").order("category").execute()
            self._send_json(result.data)
        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            name = body.get("name")
            category = body.get("category", "Other")
            active = body.get("active", True)

            if not name:
                self._send_error(400, "Missing name")
                return

            supabase = get_supabase()
            result = supabase.table("staples").insert({
                "name": name,
                "category": category,
                "active": active
            }).execute()

            self._send_json({"success": True, "data": result.data})

        except Exception as e:
            self._send_error(500, str(e))

    def do_PUT(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            staple_id = body.get("id")
            if not staple_id:
                self._send_error(400, "Missing id")
                return

            updates = {}
            if "name" in body:
                updates["name"] = body["name"]
            if "category" in body:
                updates["category"] = body["category"]
            if "active" in body:
                updates["active"] = body["active"]

            supabase = get_supabase()
            result = supabase.table("staples").update(updates).eq("id", staple_id).execute()

            self._send_json({"success": True, "data": result.data})

        except Exception as e:
            self._send_error(500, str(e))

    def do_DELETE(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            staple_id = params.get("id", [None])[0]

            if not staple_id:
                self._send_error(400, "Missing id")
                return

            supabase = get_supabase()
            result = supabase.table("staples").delete().eq("id", staple_id).execute()

            self._send_json({"success": True})

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
