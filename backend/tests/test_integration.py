import pytest
import time
from backend.app import create_app
from backend.app.db import get_db, ping_db


@pytest.fixture
def app_client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_live_integration_pipeline(app_client):
    """
    End-to-End integration test:
    1. Verify DB is connected.
    2. Ingest real page_view event.
    3. Ingest real click event with coordinates.
    4. Verify session appears in /api/sessions.
    5. Verify timeline in /api/sessions/<id>/events.
    6. Verify click coordinates in /api/events/clicks.
    """
    is_connected, msg = ping_db()
    if not is_connected:
        pytest.skip(f"Live database not reachable: {msg}")

    test_session_id = f"test_sess_{int(time.time())}"
    test_page_url = "http://127.0.0.1:5000/demo-site/index.html"

    # 1. Ingest page_view event
    pv_payload = {
        "sessionId": test_session_id,
        "eventType": "page_view",
        "pageUrl": test_page_url,
        "viewport": {"width": 1440, "height": 900}
    }
    pv_res = app_client.post("/api/events", json=pv_payload)
    assert pv_res.status_code == 201
    pv_data = pv_res.get_json()
    assert pv_data["success"] is True

    # 2. Ingest click event
    click_payload = {
        "sessionId": test_session_id,
        "eventType": "click",
        "pageUrl": test_page_url,
        "clickCoordinates": {"x": 512.5, "y": 280.0},
        "viewport": {"width": 1440, "height": 900},
        "targetTag": "BUTTON",
        "targetText": "Start Free Trial"
    }
    clk_res = app_client.post("/api/events", json=click_payload)
    assert clk_res.status_code == 201
    clk_data = clk_res.get_json()
    assert clk_data["success"] is True

    # 3. Verify session in /api/sessions
    sess_res = app_client.get("/api/sessions")
    assert sess_res.status_code == 200
    sess_data = sess_res.get_json()
    assert sess_data["success"] is True
    session_ids = [s["sessionId"] for s in sess_data["sessions"]]
    assert test_session_id in session_ids

    # Find our specific test session
    matched_session = next(s for s in sess_data["sessions"] if s["sessionId"] == test_session_id)
    assert matched_session["eventCount"] >= 2
    assert matched_session["clickCount"] >= 1
    assert matched_session["pageViewCount"] >= 1

    # 4. Verify chronological event history in /api/sessions/<id>/events
    hist_res = app_client.get(f"/api/sessions/{test_session_id}/events")
    assert hist_res.status_code == 200
    hist_data = hist_res.get_json()
    assert hist_data["success"] is True
    assert len(hist_data["events"]) == 2
    assert hist_data["events"][0]["eventType"] == "page_view"
    assert hist_data["events"][1]["eventType"] == "click"
    assert hist_data["events"][1]["clickCoordinates"]["x"] == 512.5

    # 5. Verify click coordinates in /api/events/clicks?page_url=...
    clicks_res = app_client.get(f"/api/events/clicks?page_url={test_page_url}")
    assert clicks_res.status_code == 200
    clicks_data = clicks_res.get_json()
    assert clicks_data["success"] is True
    assert clicks_data["count"] >= 1
    recent_click = next(c for c in clicks_data["clicks"] if c["sessionId"] == test_session_id)
    assert recent_click["clickCoordinates"]["x"] == 512.5
    assert recent_click["clickCoordinates"]["y"] == 280.0
    # Verify normalized coordinates were computed
    assert "normalizedCoordinates" in recent_click
    assert recent_click["normalizedCoordinates"]["x"] == round(512.5 / 1440, 4)
