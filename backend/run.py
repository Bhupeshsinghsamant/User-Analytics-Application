import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.app import create_app
from backend.app.config import Config

app = create_app()

if __name__ == "__main__":
    port = Config.FLASK_PORT or 5000
    debug = Config.FLASK_DEBUG
    print(f"Starting User Analytics Flask server on http://127.0.0.1:{port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
