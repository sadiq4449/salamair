# Ensures `pytest` from Backend/ can import `app.*` the same way uvicorn does.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
