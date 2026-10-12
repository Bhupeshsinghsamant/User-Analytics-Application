import logging
import certifi
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ConfigurationError, ServerSelectionTimeoutError
from backend.app.config import Config

logger = logging.getLogger(__name__)

_client = None
_db = None


def get_client():
    """Initializes and returns the singleton MongoClient instance."""
    global _client
    if _client is None:
        uri = Config.MONGODB_URI
        if not uri:
            logger.warning("MONGODB_URI is not set. Database operations will fail until configured.")
            return None
        try:
            # Set a 5-second server selection timeout and use certifi CA bundle for secure TLS handshake
            _client = MongoClient(uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        except (ConfigurationError, Exception) as e:
            logger.error(f"Failed to initialize MongoClient: {e}")
            _client = None
    return _client


def get_db():
    """Returns the database instance, or None if not connected."""
    global _db
    if _db is not None:
        return _db

    client = get_client()
    if client is None:
        return None

    try:
        db_name = Config.MONGODB_DB_NAME or "user_analytics"
        _db = client[db_name]
        return _db
    except Exception as e:
        logger.error(f"Error accessing database: {e}")
        return None


def ping_db():
    """Tests the database connection and returns (status_bool, message)."""
    client = get_client()
    if client is None:
        return False, "MONGODB_URI is not configured in .env file."

    try:
        # The ping command is cheap and does not require auth permissions on user collections
        client.admin.command("ping")
        return True, "Connected successfully to MongoDB Atlas."
    except ServerSelectionTimeoutError:
        return False, "Connection timed out. Check Network Access in MongoDB Atlas to ensure your current IP address is allowed."
    except ConnectionFailure as e:
        return False, f"Connection failed: {str(e)}"
    except Exception as e:
        return False, f"Database error: {str(e)}"


def init_indexes():
    """Creates required MongoDB indexes for events and sessions collections."""
    db = get_db()
    if db is None:
        return False, "Database not available"

    try:
        # Events indexes:
        # 1. sessionId (fast lookup for session events)
        # 2. pageUrl + eventType (fast click coordinate queries for heatmap)
        # 3. timestamp (descending order for timeline sorting)
        db.events.create_index([("sessionId", ASCENDING)])
        db.events.create_index([("pageUrl", ASCENDING), ("eventType", ASCENDING)])
        db.events.create_index([("timestamp", DESCENDING)])

        # Sessions indexes:
        # 1. sessionId (unique)
        # 2. lastActive (descending for recent session listing)
        db.sessions.create_index([("sessionId", ASCENDING)], unique=True)
        db.sessions.create_index([("lastActive", DESCENDING)])

        logger.info("MongoDB indexes successfully created/verified.")
        return True, "Indexes created successfully."
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        return False, str(e)


def close_db():
    """Closes the MongoClient connection cleanly."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
