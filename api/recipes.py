"""
API endpoint for managing recipes from Notion.
GET /api/recipes - List all recipes
GET /api/recipes?id=<page_id> - Get recipe details
POST /api/recipes - Mark recipe as favorite
"""
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api._utils.notion import get_recipes_from_notion, get_recipe_details
from api._utils.db import cache_get, cache_set, get_supabase


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            recipe_id = params.get("id", [None])[0]

            if recipe_id:
                recipe = get_recipe_details(recipe_id)
                self._send_json(recipe)
            else:
                cached = cache_get("recipes_list")
                if cached:
                    self._send_json(json.loads(cached))
                    return

                recipes = get_recipes_from_notion()
                cache_set("recipes_list", json.dumps(recipes), ex=600)
                self._send_json(recipes)

        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            notion_page_id = body.get("notion_page_id")
            name = body.get("name")
            is_favorite = body.get("is_favorite", True)

            if not notion_page_id or not name:
                self._send_error(400, "Missing notion_page_id or name")
                return

            supabase = get_supabase()
            result = supabase.table("favorite_recipes").upsert({
                "notion_page_id": notion_page_id,
                "name": name,
                "is_favorite": is_favorite
            }, on_conflict="notion_page_id").execute()

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
