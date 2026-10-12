import pytest
from datetime import datetime
from bson import ObjectId
from backend.app import create_app
from backend.app.models import validate_event_payload, serialize_doc


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# --- Schema & Validation Tests ---

def test_validate_page_view_success():
    payload = {
        "sessionId": "sess-test-123",
        "eventType": "page_view",
        "pageUrl": "http://localhost:3000/home",
        "timestamp": "2026-10-12T10:00:00Z"
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is True
    assert err is None
    assert sanitized["sessionId"] == "sess-test-123"
    assert sanitized["eventType"] == "page_view"
    assert sanitized["pageUrl"] == "http://localhost:3000/home"


def test_validate_click_with_coords_success():
    payload = {
        "sessionId": "sess-test-123",
        "eventType": "click",
        "pageUrl": "http://localhost:3000/pricing",
        "clickCoordinates": {"x": 250.5, "y": 420.75},
        "targetTag": "BUTTON",
        "targetText": "Sign Up"
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is True
    assert err is None
    assert sanitized["clickCoordinates"] == {"x": 250.5, "y": 420.75}
    assert sanitized["targetTag"] == "BUTTON"
    assert sanitized["targetText"] == "Sign Up"


def test_validate_click_missing_coords_fails():
    payload = {
        "sessionId": "sess-test-123",
        "eventType": "click",
        "pageUrl": "http://localhost:3000/pricing"
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is False
    assert "clickCoordinates" in err


def test_validate_click_invalid_coords_fails():
    payload = {
        "sessionId": "sess-test-123",
        "eventType": "click",
        "pageUrl": "http://localhost:3000/pricing",
        "clickCoordinates": {"x": "abc", "y": None}
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is False
    assert "numeric" in err.lower()


def test_validate_invalid_event_type_fails():
    payload = {
        "sessionId": "sess-test-123",
        "eventType": "hover",
        "pageUrl": "http://localhost:3000/home"
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is False
    assert "eventType" in err


def test_validate_missing_session_id_fails():
    payload = {
        "eventType": "page_view",
        "pageUrl": "http://localhost:3000/home"
    }
    is_valid, err, sanitized = validate_event_payload(payload)
    assert is_valid is False
    assert "sessionId" in err


# --- Serialization Tests ---

def test_serialize_doc():
    oid = ObjectId()
    dt = datetime(2026, 10, 12, 10, 30, 0)
    raw = {
        "_id": oid,
        "name": "test",
        "createdAt": dt,
        "nested": {"other_id": ObjectId()}
    }
    serialized = serialize_doc(raw)
    assert serialized["id"] == str(oid)
    assert "_id" not in serialized
    assert serialized["createdAt"] == "2026-10-12T10:30:00Z"
    assert isinstance(serialized["nested"]["other_id"], str)


# --- Endpoint Route Tests ---

def test_health_endpoint(client):
    response = client.get("/api/health")
    # Health endpoint returns 200 or 503 depending on DB connection, but always valid JSON
    assert response.status_code in [200, 503]
    data = response.get_json()
    assert "status" in data
    assert "database" in data


def test_track_invalid_body(client):
    response = client.post("/api/track", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False


def test_404_handler(client):
    response = client.get("/api/non-existent-route")
    assert response.status_code == 404
    data = response.get_json()
    assert data["success"] is False
