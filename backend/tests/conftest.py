import os
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("AUTO_INIT_DB", "false")
os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "1000")
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://localhost:3002"
os.environ.pop("CORS_ORIGIN_REGEX", None)
