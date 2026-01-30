"""
API endpoint for push notifications.
GET /api/notifications - Get latest notification
POST /api/notifications/subscribe - Subscribe to push notifications
"""
import json
from http.server import BaseHTTPRequestHandler
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api._utils.db import get_redis, get_supabase


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Get latest notification."""
        try:
            redis = get_redis()
            notification = redis.get("latest_notification")

            if notification:
                self._send_json(json.loads(notification))
            else:
                self._send_json(None)

        except Exception as e:
            self._send_error(500, str(e))

    def do_POST(self):
        """Subscribe to push notifications (store push subscription)."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            subscription = body.get("subscription")
            device_id = body.get("device_id")

            if not subscription or not device_id:
                self._send_error(400, "Missing subscription or device_id")
                return

            # Store subscription in Redis for push notifications
            redis = get_redis()
            redis.hset("push_subscriptions", device_id, json.dumps(subscription))

            self._send_json({"success": True, "message": "Subscribed to notifications"})

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
