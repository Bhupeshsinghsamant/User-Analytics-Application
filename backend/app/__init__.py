from flask import Flask, jsonify
from flask_cors import CORS
from backend.app.config import Config


def create_app():
    """Application factory for Flask analytics service."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for all routes under /api/ to allow cross-origin requests from frontend and tracking SDK
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from backend.app.routes import api_bp
    app.register_blueprint(api_bp)

    # Static routes for interactive demo site and tracker SDK
    from pathlib import Path
    from flask import send_from_directory

    root_dir = Path(__file__).resolve().parent.parent.parent
    demo_dir = root_dir / "demo-site"
    tracker_dir = root_dir / "tracker"

    @app.route("/demo-site/<path:filename>")
    def serve_demo_site(filename):
        return send_from_directory(demo_dir, filename)

    @app.route("/tracker/<path:filename>")
    def serve_tracker_sdk(filename):
        return send_from_directory(tracker_dir, filename)

    @app.route("/demo")
    def serve_demo_root():
        return send_from_directory(demo_dir, "index.html")

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app
