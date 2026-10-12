import os
import sys
import time
import re
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv

# Try loading from root .env or backend/.env, prioritizing the one with the real connection string
loaded = False
for p in [root_dir / ".env", Path(__file__).resolve().parent / ".env"]:
    if p.exists():
        load_dotenv(p, override=True)
        if os.getenv("MONGODB_URI") and "paste_your_connection_string_here" not in os.getenv("MONGODB_URI"):
            loaded = True
            break

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError, OperationFailure, ServerSelectionTimeoutError


def mask_uri(uri):
    """Masks username and password in MongoDB URI for safe console display."""
    if not uri:
        return "<EMPTY>"
    return re.sub(r"://([^:]+):([^@]+)@", "://***:***@", uri)


def test_mongodb_connection():
    uri = os.getenv("MONGODB_URI", "").strip()
    db_name = os.getenv("MONGODB_DB_NAME", "user_analytics").strip()

    print("==================================================")
    print("      MongoDB Atlas Connection Diagnostic         ")
    print("==================================================")

    if not uri:
        print("[FAIL] MONGODB_URI not found in .env file.")
        print("\nPlease create a '.env' file inside 'backend/' or the project root:")
        print("MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/user_analytics?retryWrites=true&w=majority")
        print("MONGODB_DB_NAME=user_analytics")
        return False

    print(f"Target URI : {mask_uri(uri)}")
    print(f"Database   : {db_name}")
    print("\nAttempting connection to MongoDB Atlas (5-second timeout)...")

    start_time = time.time()
    try:
        import certifi
        client = MongoClient(uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        # The admin ping command verifies server reachability and credentials
        client.admin.command("ping")
        elapsed = round((time.time() - start_time) * 1000, 2)

        print(f"\n[PASS] Successfully connected to MongoDB Atlas! (Ping took {elapsed} ms)")

        db = client[db_name]
        collections = db.list_collection_names()
        print(f"[INFO] Connected database: '{db_name}'")
        print(f"[INFO] Existing collections: {collections if collections else '(none yet - will be created on first write)'}")

        # Initialize indexes
        from backend.app.db import init_indexes
        success, msg = init_indexes()
        if success:
            print("[INFO] Indexes verified successfully on 'events' and 'sessions' collections.")

        print("\n==================================================")
        print(" RESULT: DATABASE CONNECTION TEST PASSED!        ")
        print("==================================================")
        return True

    except ServerSelectionTimeoutError as e:
        print("\n[FAIL] Connection timed out after 5 seconds.")
        print("\nPossible reasons:")
        print("1. IP Whitelist: Go to MongoDB Atlas -> Network Access -> Add IP Address -> '0.0.0.0/0' (Allow Access From Anywhere).")
        print("2. Internet connection is blocking MongoDB Atlas port (27017 / SRV DNS).")
        return False

    except OperationFailure as e:
        print("\n[FAIL] Authentication failed.")
        print("\nPossible reasons:")
        print("1. Database username or password in .env is incorrect.")
        print("2. Make sure the database user has 'Read and write to any database' role in Atlas -> Database Access.")
        print(f"Details: {e}")
        return False

    except ConfigurationError as e:
        print(f"\n[FAIL] Invalid connection string format: {e}")
        return False

    except Exception as e:
        print(f"\n[FAIL] Unexpected connection error: {e}")
        return False


if __name__ == "__main__":
    success = test_mongodb_connection()
    sys.exit(0 if success else 1)
