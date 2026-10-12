from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from backend.app.db import get_db, ping_db, init_indexes
from backend.app.models import validate_event_payload, serialize_doc

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint: verifies service status and MongoDB Atlas connection."""
    db_connected, message = ping_db()
    status_code = 200 if db_connected else 503
    return jsonify({
        "status": "healthy" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }), status_code


@api_bp.route("/init-db", methods=["POST"])
def initialize_database():
    """Initializes MongoDB indexes for events and sessions."""
    success, msg = init_indexes()
    status_code = 200 if success else 500
    return jsonify({"success": success, "message": msg}), status_code


@api_bp.route("/track", methods=["POST"])
@api_bp.route("/events", methods=["POST"])
def track_event():
    """
    Ingests user analytics events.
    Supports single event object or batch array of events.
    Persists events to 'events' collection and updates 'sessions' summary.
    """
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"success": False, "error": "Invalid JSON body"}), 400

    # Support batch or single event
    events_to_process = payload if isinstance(payload, list) else [payload]
    if not events_to_process or (isinstance(payload, dict) and not payload):
        return jsonify({"success": False, "error": "Empty event payload"}), 400

    db = get_db()
    if db is None:
        return jsonify({
            "success": False,
            "error": "Database unavailable. Verify MongoDB Atlas connection string in .env file."
        }), 503

    processed_ids = []
    errors = []

    for idx, item in enumerate(events_to_process):
        is_valid, err_msg, sanitized = validate_event_payload(item)
        if not is_valid:
            errors.append({"index": idx, "error": err_msg})
            continue

        # Extract client IP & User-Agent if available
        sanitized["userAgent"] = request.headers.get("User-Agent", "Unknown")
        sanitized["ipAddress"] = request.remote_addr or "127.0.0.1"

        try:
            # 1. Insert into events collection
            insert_result = db.events.insert_one(sanitized)
            processed_ids.append(str(insert_result.inserted_id))

            # 2. Upsert session summary in sessions collection
            session_id = sanitized["sessionId"]
            timestamp = sanitized["timestamp"]
            event_type = sanitized["eventType"]
            page_url = sanitized["pageUrl"]

            click_inc = 1 if event_type == "click" else 0
            pageview_inc = 1 if event_type == "page_view" else 0

            db.sessions.update_one(
                {"sessionId": session_id},
                {
                    "$setOnInsert": {
                        "sessionId": session_id,
                        "startTime": timestamp,
                        "firstPageUrl": page_url,
                        "userAgent": sanitized["userAgent"],
                        "createdAt": datetime.now(timezone.utc)
                    },
                    "$set": {
                        "lastActive": timestamp,
                        "lastPageUrl": page_url,
                        "updatedAt": datetime.now(timezone.utc)
                    },
                    "$inc": {
                        "eventCount": 1,
                        "clickCount": click_inc,
                        "pageViewCount": pageview_inc
                    }
                },
                upsert=True
            )
        except Exception as e:
            errors.append({"index": idx, "error": f"Database insertion failed: {str(e)}"})

    if errors and not processed_ids:
        return jsonify({"success": False, "errors": errors}), 400

    return jsonify({
        "success": True,
        "processedCount": len(processed_ids),
        "eventIds": processed_ids,
        "errors": errors if errors else None
    }), 201


@api_bp.route("/sessions", methods=["GET"])
def get_sessions():
    """
    Returns list of all recorded sessions sorted by lastActive descending.
    Query params: limit (default 50), skip (default 0).
    """
    db = get_db()
    if db is None:
        return jsonify({"success": False, "error": "Database unavailable"}), 503

    try:
        limit = min(int(request.args.get("limit", 50)), 200)
        skip = max(int(request.args.get("skip", 0)), 0)

        cursor = db.sessions.find({}, {"_id": 0}).sort("lastActive", -1).skip(skip).limit(limit)
        sessions = list(cursor)
        total = db.sessions.count_documents({})

        return jsonify({
            "success": True,
            "total": total,
            "count": len(sessions),
            "sessions": serialize_doc(sessions)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route("/sessions/<session_id>/events", methods=["GET"])
def get_session_events(session_id):
    """
    Returns complete chronological event history for a specific session.
    """
    db = get_db()
    if db is None:
        return jsonify({"success": False, "error": "Database unavailable"}), 503

    try:
        cursor = db.events.find({"sessionId": session_id}).sort("timestamp", 1)
        events = list(cursor)

        return jsonify({
            "success": True,
            "sessionId": session_id,
            "count": len(events),
            "events": serialize_doc(events)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route("/events/clicks", methods=["GET"])
def get_click_coordinates():
    """
    Returns recorded click coordinates with page URL and timestamp.
    Query param: pageUrl (optional filter for page-specific heatmap).
    """
    db = get_db()
    if db is None:
        return jsonify({"success": False, "error": "Database unavailable"}), 503

    try:
        query = {"eventType": "click", "clickCoordinates": {"$exists": True}}
        page_url = request.args.get("page_url") or request.args.get("pageUrl")
        if page_url:
            query["pageUrl"] = page_url

        cursor = db.events.find(
            query,
            {
                "clickCoordinates": 1,
                "normalizedCoordinates": 1,
                "pageUrl": 1,
                "timestamp": 1,
                "targetTag": 1,
                "targetText": 1,
                "viewport": 1,
                "sessionId": 1,
                "_id": 1
            }
        ).sort("timestamp", -1).limit(500)

        clicks = list(cursor)

        return jsonify({
            "success": True,
            "pageUrl": page_url,
            "count": len(clicks),
            "clicks": serialize_doc(clicks)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route("/stats/overview", methods=["GET"])
def get_stats_overview():
    """
    Aggregates overall analytics metrics for dashboard summary cards.
    """
    db = get_db()
    if db is None:
        return jsonify({"success": False, "error": "Database unavailable"}), 503

    try:
        total_sessions = db.sessions.count_documents({})
        total_events = db.events.count_documents({})
        total_clicks = db.events.count_documents({"eventType": "click"})
        total_pageviews = db.events.count_documents({"eventType": "page_view"})

        # Get unique pages tracked
        unique_pages = db.events.distinct("pageUrl")

        return jsonify({
            "success": True,
            "totalSessions": total_sessions,
            "totalEvents": total_events,
            "totalClicks": total_clicks,
            "totalPageViews": total_pageviews,
            "uniquePagesCount": len(unique_pages),
            "uniquePages": unique_pages
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
