from datetime import datetime, timezone
from bson import ObjectId


ALLOWED_EVENT_TYPES = {"page_view", "click"}


def validate_event_payload(payload):
    """
    Validates the event payload according to assignment specifications.
    Returns (is_valid: bool, error_message: str or None, sanitized_payload: dict or None).
    """
    if not isinstance(payload, dict):
        return False, "Payload must be a JSON object", None

    session_id = payload.get("sessionId") or payload.get("session_id")
    event_type = payload.get("eventType") or payload.get("event_type")
    page_url = payload.get("pageUrl") or payload.get("page_url")

    # Mandatory field checks
    if not session_id or not isinstance(session_id, str) or not session_id.strip():
        return False, "Field 'sessionId' (or 'session_id') is required and must be a non-empty string", None

    if not event_type or event_type not in ALLOWED_EVENT_TYPES:
        return False, f"Field 'eventType' is required and must be one of: {', '.join(sorted(ALLOWED_EVENT_TYPES))}", None

    if not page_url or not isinstance(page_url, str) or not page_url.strip():
        return False, "Field 'pageUrl' (or 'page_url') is required and must be a non-empty string", None

    # Timestamp handling: parse or generate standard UTC timestamp & BSON datetime
    raw_timestamp = payload.get("timestamp")
    now_utc = datetime.now(timezone.utc)
    if not raw_timestamp:
        timestamp_str = now_utc.isoformat().replace("+00:00", "Z")
        timestamp_dt = now_utc
    elif isinstance(raw_timestamp, str):
        timestamp_str = raw_timestamp
        try:
            # Handle trailing Z or parse ISO
            clean_ts = raw_timestamp.replace("Z", "+00:00")
            timestamp_dt = datetime.fromisoformat(clean_ts)
        except ValueError:
            timestamp_dt = now_utc
    else:
        return False, "Field 'timestamp', if provided, must be an ISO 8601 string", None

    sanitized = {
        "sessionId": session_id.strip(),
        "eventType": event_type,
        "pageUrl": page_url.strip(),
        "timestamp": timestamp_str,
        "timestampDate": timestamp_dt,
        "createdAt": now_utc
    }

    # Optional viewport metadata
    viewport = payload.get("viewport")
    vw, vh = None, None
    if isinstance(viewport, dict):
        try:
            vw = int(viewport.get("width", 0))
            vh = int(viewport.get("height", 0))
            if vw > 0 and vh > 0:
                sanitized["viewport"] = {"width": vw, "height": vh}
        except (ValueError, TypeError):
            pass

    # Click-specific validation: must contain clickCoordinates {x, y} or coordinates {x, y}
    if event_type == "click":
        coords = payload.get("clickCoordinates") or payload.get("coordinates")
        if not isinstance(coords, dict):
            return False, "Field 'clickCoordinates' is required for 'click' events and must be an object {x, y}", None

        x = coords.get("x")
        y = coords.get("y")

        if x is None or y is None or not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            return False, "clickCoordinates must contain numeric 'x' and 'y' values", None

        fx = round(float(x), 2)
        fy = round(float(y), 2)

        sanitized["clickCoordinates"] = {"x": fx, "y": fy}

        # Calculate normalized coordinates (0.0 to 1.0) if viewport is known for perfect responsive scaling
        if vw and vh and vw > 0 and vh > 0:
            sanitized["normalizedCoordinates"] = {
                "x": round(min(max(fx / vw, 0.0), 1.0), 4),
                "y": round(min(max(fy / vh, 0.0), 1.0), 4)
            }

        # Optional click element metadata
        if "targetTag" in payload:
            sanitized["targetTag"] = str(payload["targetTag"])[:50]
        if "targetText" in payload:
            sanitized["targetText"] = str(payload["targetText"])[:100]

    return True, None, sanitized


def serialize_doc(doc):
    """Recursively converts MongoDB BSON types (like ObjectId, datetime) to JSON serializable types."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id" and isinstance(value, ObjectId):
                result["id"] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat() + "Z"
            elif isinstance(value, (dict, list)):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc
