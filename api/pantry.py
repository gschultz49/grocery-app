"""
API endpoint for managing pantry items (things you always have on hand).
These items are filtered OUT from recipe ingredients.
GET /api/pantry - List all pantry items
POST /api/pantry - Add new pantry item
PUT /api/pantry - Update pantry item (e.g., mark as needing restock)
DELETE /api/pantry?id=<id> - Remove pantry item
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
            result = supabase.table("pantry_items").select("*").order("category").execute()
            self._send_json(result.data)
        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            name = body.get("name")
            category = body.get("category", "Other")

            if not name:
                self._send_error(400, "Missing name")
                return

            supabase = get_supabase()
            result = supabase.table("pantry_items").insert({
                "name": name,
                "category": category,
                "needs_restock": False
            }).execute()

            self._send_json({"success": True, "data": result.data})

        except Exception as e:
            self._send_error(500, str(e))

    def do_PUT(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            item_id = body.get("id")
            if not item_id:
                self._send_error(400, "Missing id")
                return

            updates = {}
            if "name" in body:
                updates["name"] = body["name"]
            if "category" in body:
                updates["category"] = body["category"]
            if "needs_restock" in body:
                updates["needs_restock"] = body["needs_restock"]

            supabase = get_supabase()
            result = supabase.table("pantry_items").update(updates).eq("id", item_id).execute()

            self._send_json({"success": True, "data": result.data})

        except Exception as e:
            self._send_error(500, str(e))

    def do_DELETE(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            item_id = params.get("id", [None])[0]

            if not item_id:
                self._send_error(400, "Missing id")
                return

            supabase = get_supabase()
            result = supabase.table("pantry_items").delete().eq("id", item_id).execute()

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
