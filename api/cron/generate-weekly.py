"""
Cron job that runs every Sunday at 9 AM to generate weekly grocery suggestions.
This prepares:
1. All active staple items
2. 2-3 recipe suggestions based on favorites and variety
3. Checks if any pantry items need restocking

The data is ready BEFORE the notification is sent.
"""
import json
import random
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api._utils.db import get_supabase, get_redis
from api._utils.notion import get_recipes_from_notion


def get_week_start():
    """Get the Sunday of the current week."""
    today = datetime.now()
    days_since_sunday = today.weekday() + 1
    if days_since_sunday == 7:
        days_since_sunday = 0
    sunday = today - timedelta(days=days_since_sunday)
    return sunday.strftime("%Y-%m-%d")


def select_recipes(supabase, all_recipes, count=3):
    """
    Select recipes for the week using learned preferences:
    1. Use recipe_scores table for learned preferences
    2. Prioritize high-scoring recipes
    3. Avoid recently suggested recipes
    4. Add some randomness for discovery
    """
    # Get learned scores
    scores_result = supabase.table("recipe_scores").select("*").execute()
    scores_map = {s["notion_page_id"]: s for s in scores_result.data}

    # Get favorite recipes (explicit favorites)
    favorites_result = supabase.table("favorite_recipes").select("*").eq("is_favorite", True).execute()
    favorite_ids = {f["notion_page_id"] for f in favorites_result.data}

    # Get recently suggested recipes (last 2 weeks) to avoid repetition
    two_weeks_ago = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
    recent_result = supabase.table("weekly_recipes").select("notion_page_id").gte("created_at", two_weeks_ago).execute()
    recent_ids = {r["notion_page_id"] for r in recent_result.data}

    # Score each recipe
    scored_recipes = []
    for recipe in all_recipes:
        recipe_id = recipe["id"]

        # Skip if recently suggested
        if recipe_id in recent_ids:
            continue

        # Base score
        base_score = 50

        # Add learned score if available
        if recipe_id in scores_map:
            learned = scores_map[recipe_id]
            # Use the learned score (0-100 scale)
            base_score = learned.get("score", 50)
            # Boost for high acceptance rate
            acceptance_rate = learned.get("acceptance_rate", 0.5)
            base_score += acceptance_rate * 20

        # Boost for explicit favorites
        if recipe_id in favorite_ids:
            base_score += 25

        # Add some randomness (0-15 points) for discovery
        base_score += random.random() * 15

        scored_recipes.append({
            **recipe,
            "computed_score": base_score
        })

    # Sort by score (highest first)
    scored_recipes.sort(key=lambda r: r["computed_score"], reverse=True)

    # Take top N recipes
    selected = scored_recipes[:count]

    # If we don't have enough, pull from recent (less ideal)
    if len(selected) < count:
        recent_recipes = [r for r in all_recipes if r["id"] in recent_ids]
        random.shuffle(recent_recipes)
        selected.extend(recent_recipes[:count - len(selected)])

    return selected


def generate_weekly_list():
    """Generate the weekly grocery list with staples and recipe suggestions."""
    supabase = get_supabase()
    week_start = get_week_start()

    # Check if list already exists for this week
    existing = supabase.table("weekly_lists").select("id").eq("week_start", week_start).execute()
    if existing.data:
        # Delete existing and regenerate
        supabase.table("weekly_lists").delete().eq("week_start", week_start).execute()

    # Create new weekly list
    list_result = supabase.table("weekly_lists").insert({
        "week_start": week_start,
        "status": "draft"
    }).execute()

    weekly_list_id = list_result.data[0]["id"]

    # Add all active staples
    staples_result = supabase.table("staples").select("*").eq("active", True).execute()

    for staple in staples_result.data:
        supabase.table("weekly_list_items").insert({
            "weekly_list_id": weekly_list_id,
            "name": staple["name"],
            "category": staple["category"],
            "source": "staple",
            "checked": False
        }).execute()

    # Check if any pantry items need restocking
    pantry_restock = supabase.table("pantry_items").select("*").eq("needs_restock", True).execute()

    for item in pantry_restock.data:
        supabase.table("weekly_list_items").insert({
            "weekly_list_id": weekly_list_id,
            "name": item["name"],
            "category": item["category"],
            "source": "pantry_restock",
            "checked": False
        }).execute()

    # Get recipes from Notion and select 2-3
    try:
        all_recipes = get_recipes_from_notion()
        selected_recipes = select_recipes(supabase, all_recipes, count=3)

        for recipe in selected_recipes:
            supabase.table("weekly_recipes").insert({
                "weekly_list_id": weekly_list_id,
                "notion_page_id": recipe["id"],
                "name": recipe["name"],
                "status": "suggested"
            }).execute()

    except Exception as e:
        print(f"Error fetching recipes: {e}")

    return {
        "weekly_list_id": weekly_list_id,
        "week_start": week_start,
        "staples_count": len(staples_result.data),
        "restock_count": len(pantry_restock.data),
        "recipes_suggested": len(selected_recipes) if 'selected_recipes' in locals() else 0
    }


def send_push_notification(message):
    """Send push notification via Upstash Redis pub/sub for web push."""
    try:
        redis = get_redis()
        notification_data = {
            "title": "Weekly Groceries Ready!",
            "body": message,
            "timestamp": datetime.now().isoformat(),
            "url": "/weekly"
        }
        # Store notification for clients to poll
        redis.set("latest_notification", json.dumps(notification_data), ex=86400)  # 24 hour expiry
        redis.publish("notifications", json.dumps(notification_data))
        return True
    except Exception as e:
        print(f"Error sending notification: {e}")
        return False


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle cron job trigger."""
        try:
            # Verify cron secret (Vercel sends this header)
            auth_header = self.headers.get("Authorization")
            cron_secret = os.environ.get("CRON_SECRET")

            if cron_secret and auth_header != f"Bearer {cron_secret}":
                self._send_error(401, "Unauthorized")
                return

            # Generate the weekly list
            result = generate_weekly_list()

            # Send notification
            message = f"Your grocery list has {result['staples_count']} staples and {result['recipes_suggested']} recipe suggestions ready!"
            send_push_notification(message)

            # Log to Redis for monitoring
            try:
                redis = get_redis()
                redis.lpush("cron_logs", json.dumps({
                    "job": "generate-weekly",
                    "timestamp": datetime.now().isoformat(),
                    "result": result
                }))
                redis.ltrim("cron_logs", 0, 99)  # Keep last 100 logs
            except Exception:
                pass

            self._send_json({
                "success": True,
                "message": "Weekly list generated",
                "result": result
            })

        except Exception as e:
            self._send_error(500, str(e))

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
