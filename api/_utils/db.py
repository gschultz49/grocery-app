import os
from supabase import create_client, Client
from upstash_redis import Redis

def get_supabase() -> Client:
    """Get Supabase client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Missing Supabase credentials")
    return create_client(url, key)

def get_redis() -> Redis:
    """Get Upstash Redis client for caching."""
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        raise ValueError("Missing Upstash credentials")
    return Redis(url=url, token=token)

def cache_get(key: str):
    """Get value from cache."""
    try:
        redis = get_redis()
        return redis.get(key)
    except Exception:
        return None

def cache_set(key: str, value: str, ex: int = 3600):
    """Set value in cache with expiration (default 1 hour)."""
    try:
        redis = get_redis()
        redis.set(key, value, ex=ex)
    except Exception:
        pass
