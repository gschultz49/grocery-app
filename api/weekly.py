"""
API endpoint for managing weekly grocery lists.
GET /api/weekly - Get current week's list
GET /api/weekly?week=<date> - Get specific week's list
POST /api/weekly/accept - Accept suggested recipes and add ingredients
PUT /api/weekly - Update item (check/uncheck)
"""
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api._utils.db import get_supabase


def get_current_week_start():
    """Get the Sunday of the current week."""
    today = datetime.now()
    days_since_sunday = today.weekday() + 1
    if days_since_sunday == 7:
        days_since_sunday = 0
    sunday = today - timedelta(days=days_since_sunday)
    return sunday.strftime("%Y-%m-%d")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            week_start = params.get("week", [get_current_week_start()])[0]

            supabase = get_supabase()

            # Get the weekly list
            list_result = supabase.table("weekly_lists").select("*").eq("week_start", week_start).execute()

            if not list_result.data:
                self._send_json({
                    "week_start": week_start,
                    "status": "not_created",
                    "items": [],
                    "recipes": []
                })
                return

            weekly_list = list_result.data[0]

            # Get items for this list
            items_result = supabase.table("weekly_list_items").select("*").eq("weekly_list_id", weekly_list["id"]).order("category").execute()

            # Get recipes for this list
            recipes_result = supabase.table("weekly_recipes").select("*").eq("weekly_list_id", weekly_list["id"]).execute()

            self._send_json({
                "id": weekly_list["id"],
                "week_start": weekly_list["week_start"],
                "status": weekly_list["status"],
                "items": items_result.data,
                "recipes": recipes_result.data
            })

        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        """Accept or reject recipe suggestions."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            action = body.get("action")
            weekly_list_id = body.get("weekly_list_id")
            recipe_id = body.get("recipe_id")

            supabase = get_supabase()

            if action == "accept_recipe":
                # Update recipe status to accepted
                supabase.table("weekly_recipes").update({
                    "status": "accepted"
                }).eq("id", recipe_id).execute()

                # Get recipe details to add ingredients
                recipe = supabase.table("weekly_recipes").select("*").eq("id", recipe_id).execute()
                if recipe.data:
                    notion_page_id = recipe.data[0]["notion_page_id"]

                    # Fetch recipe ingredients from Notion
                    from api._utils.notion import get_recipe_details
                    recipe_details = get_recipe_details(notion_page_id)

                    # Get pantry items to filter out
                    pantry_result = supabase.table("pantry_items").select("name").execute()
                    pantry_names = [p["name"].lower() for p in pantry_result.data]

                    # Add ingredients that aren't in pantry
                    for ingredient in recipe_details.get("ingredients", []):
                        # Check if ingredient is in pantry (case-insensitive partial match)
                        is_pantry = any(p in ingredient.lower() for p in pantry_names)

                        if not is_pantry:
                            supabase.table("weekly_list_items").insert({
                                "weekly_list_id": weekly_list_id,
                                "name": ingredient,
                                "category": "Recipe Ingredients",
                                "source": "recipe",
                                "source_recipe_id": notion_page_id,
                                "checked": False
                            }).execute()

                self._send_json({"success": True, "action": "accepted"})

            elif action == "reject_recipe":
                supabase.table("weekly_recipes").update({
                    "status": "rejected"
                }).eq("id", recipe_id).execute()

                self._send_json({"success": True, "action": "rejected"})

            elif action == "activate":
                # Activate the weekly list (mark as ready to use)
                supabase.table("weekly_lists").update({
                    "status": "active"
                }).eq("id", weekly_list_id).execute()

                self._send_json({"success": True, "status": "active"})

            else:
                self._send_error(400, "Invalid action")

        except Exception as e:
            self._send_error(500, str(e))

    def do_PUT(self):
        """Update item (check/uncheck)."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            item_id = body.get("id")
            checked = body.get("checked")

            if not item_id or checked is None:
                self._send_error(400, "Missing id or checked")
                return

            supabase = get_supabase()
            result = supabase.table("weekly_list_items").update({
                "checked": checked
            }).eq("id", item_id).execute()

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
