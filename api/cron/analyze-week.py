"""
Cron job that runs every Sunday at 8 AM (before weekly generation).
Analyzes the previous week's data to learn from user behavior:
1. Which recipes were accepted vs rejected
2. Which items were purchased (checked) vs skipped
3. Updates preference scores for better future suggestions
"""
import json
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from api._utils.db import get_supabase, get_redis


def get_previous_week_start():
    """Get the Sunday of the previous week."""
    today = datetime.now()
    days_since_sunday = today.weekday() + 1
    if days_since_sunday == 7:
        days_since_sunday = 0
    this_sunday = today - timedelta(days=days_since_sunday)
    last_sunday = this_sunday - timedelta(days=7)
    return last_sunday.strftime("%Y-%m-%d")


def analyze_recipe_preferences(supabase, weekly_list_id):
    """Analyze recipe acceptance/rejection patterns."""
    # Get all recipes from the week
    recipes = supabase.table("weekly_recipes").select("*").eq("weekly_list_id", weekly_list_id).execute()

    for recipe in recipes.data:
        notion_id = recipe["notion_page_id"]
        status = recipe["status"]

        # Get or create recipe score record
        existing = supabase.table("recipe_scores").select("*").eq("notion_page_id", notion_id).execute()

        if existing.data:
            score_record = existing.data[0]
            times_suggested = score_record["times_suggested"] + 1
            times_accepted = score_record["times_accepted"] + (1 if status == "accepted" else 0)
            times_rejected = score_record["times_rejected"] + (1 if status == "rejected" else 0)

            # Calculate acceptance rate
            total_decisions = times_accepted + times_rejected
            acceptance_rate = times_accepted / total_decisions if total_decisions > 0 else 0.5

            # Calculate score: higher for accepted, lower for rejected, decay for old suggestions
            # Base score + acceptance bonus - rejection penalty - time decay
            base_score = 50
            acceptance_bonus = acceptance_rate * 30
            recency_bonus = 10 if status == "accepted" else 0

            score = base_score + acceptance_bonus + recency_bonus

            supabase.table("recipe_scores").update({
                "times_suggested": times_suggested,
                "times_accepted": times_accepted,
                "times_rejected": times_rejected,
                "acceptance_rate": acceptance_rate,
                "score": min(100, max(0, score)),
                "last_suggested": datetime.now().strftime("%Y-%m-%d"),
                "last_accepted": datetime.now().strftime("%Y-%m-%d") if status == "accepted" else score_record.get("last_accepted"),
                "updated_at": datetime.now().isoformat()
            }).eq("notion_page_id", notion_id).execute()
        else:
            # Create new score record
            supabase.table("recipe_scores").insert({
                "notion_page_id": notion_id,
                "name": recipe["name"],
                "times_suggested": 1,
                "times_accepted": 1 if status == "accepted" else 0,
                "times_rejected": 1 if status == "rejected" else 0,
                "acceptance_rate": 1.0 if status == "accepted" else 0.0,
                "score": 60 if status == "accepted" else 40,
                "last_suggested": datetime.now().strftime("%Y-%m-%d"),
                "last_accepted": datetime.now().strftime("%Y-%m-%d") if status == "accepted" else None
            }).execute()

    return len(recipes.data)


def analyze_item_patterns(supabase, weekly_list_id):
    """Analyze which items were purchased vs skipped."""
    items = supabase.table("weekly_list_items").select("*").eq("weekly_list_id", weekly_list_id).execute()

    purchased = 0
    skipped = 0

    for item in items.data:
        name = item["name"].lower().strip()
        checked = item["checked"]

        if checked:
            purchased += 1
        else:
            skipped += 1

        # Get or create item pattern record
        existing = supabase.table("item_patterns").select("*").eq("name", name).execute()

        if existing.data:
            pattern = existing.data[0]
            times_added = pattern["times_added"] + 1
            times_purchased = pattern["times_purchased"] + (1 if checked else 0)
            times_skipped = pattern["times_skipped"] + (0 if checked else 1)

            purchase_rate = times_purchased / times_added if times_added > 0 else 0.5

            supabase.table("item_patterns").update({
                "times_added": times_added,
                "times_purchased": times_purchased,
                "times_skipped": times_skipped,
                "purchase_rate": purchase_rate,
                "last_purchased": datetime.now().strftime("%Y-%m-%d") if checked else pattern.get("last_purchased"),
                "updated_at": datetime.now().isoformat()
            }).eq("name", name).execute()
        else:
            supabase.table("item_patterns").insert({
                "name": name,
                "times_added": 1,
                "times_purchased": 1 if checked else 0,
                "times_skipped": 0 if checked else 1,
                "purchase_rate": 1.0 if checked else 0.0,
                "last_purchased": datetime.now().strftime("%Y-%m-%d") if checked else None
            }).execute()

    return len(items.data), purchased, skipped


def identify_insights(supabase):
    """Generate insights from the data for logging."""
    insights = {}

    # Find consistently skipped staples (might want to deactivate)
    low_purchase_items = supabase.table("item_patterns").select("name, purchase_rate, times_added").lt("purchase_rate", 0.3).gte("times_added", 3).execute()
    if low_purchase_items.data:
        insights["low_purchase_staples"] = [item["name"] for item in low_purchase_items.data]

    # Find highly accepted recipes
    popular_recipes = supabase.table("recipe_scores").select("name, acceptance_rate, times_suggested").gt("acceptance_rate", 0.7).gte("times_suggested", 2).execute()
    if popular_recipes.data:
        insights["popular_recipes"] = [r["name"] for r in popular_recipes.data]

    # Find consistently rejected recipes
    unpopular_recipes = supabase.table("recipe_scores").select("name, acceptance_rate, times_suggested").lt("acceptance_rate", 0.3).gte("times_suggested", 2).execute()
    if unpopular_recipes.data:
        insights["unpopular_recipes"] = [r["name"] for r in unpopular_recipes.data]

    return insights


def analyze_week():
    """Main analysis function."""
    supabase = get_supabase()
    week_start = get_previous_week_start()

    # Get the weekly list
    list_result = supabase.table("weekly_lists").select("*").eq("week_start", week_start).execute()

    if not list_result.data:
        return {"message": "No data for previous week", "week": week_start}

    weekly_list = list_result.data[0]
    weekly_list_id = weekly_list["id"]

    # Analyze recipes
    recipes_count = analyze_recipe_preferences(supabase, weekly_list_id)

    # Get recipe stats for this week
    recipes_result = supabase.table("weekly_recipes").select("status").eq("weekly_list_id", weekly_list_id).execute()
    recipes_accepted = len([r for r in recipes_result.data if r["status"] == "accepted"])
    recipes_rejected = len([r for r in recipes_result.data if r["status"] == "rejected"])

    # Analyze items
    items_total, items_purchased, items_skipped = analyze_item_patterns(supabase, weekly_list_id)

    # Generate insights
    insights = identify_insights(supabase)

    # Store weekly learning record
    supabase.table("weekly_learnings").insert({
        "week_start": week_start,
        "recipes_suggested": recipes_count,
        "recipes_accepted": recipes_accepted,
        "recipes_rejected": recipes_rejected,
        "items_total": items_total,
        "items_purchased": items_purchased,
        "items_skipped": items_skipped,
        "insights": insights
    }).execute()

    # Mark the week as completed
    supabase.table("weekly_lists").update({
        "status": "completed",
        "updated_at": datetime.now().isoformat()
    }).eq("id", weekly_list_id).execute()

    return {
        "week": week_start,
        "recipes_analyzed": recipes_count,
        "recipes_accepted": recipes_accepted,
        "recipes_rejected": recipes_rejected,
        "items_total": items_total,
        "items_purchased": items_purchased,
        "items_skipped": items_skipped,
        "insights": insights
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle cron job trigger."""
        try:
            # Verify cron secret
            auth_header = self.headers.get("Authorization")
            cron_secret = os.environ.get("CRON_SECRET")

            if cron_secret and auth_header != f"Bearer {cron_secret}":
                self._send_error(401, "Unauthorized")
                return

            result = analyze_week()

            # Log to Redis
            try:
                redis = get_redis()
                redis.lpush("cron_logs", json.dumps({
                    "job": "analyze-week",
                    "timestamp": datetime.now().isoformat(),
                    "result": result
                }))
                redis.ltrim("cron_logs", 0, 99)
            except Exception:
                pass

            self._send_json({
                "success": True,
                "message": "Weekly analysis completed",
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
