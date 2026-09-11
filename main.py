import os
import sys

# Ensure ai-server directory is on python path and working directory
ai_server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "ai-server"))
if os.path.exists(ai_server_dir):
    if ai_server_dir not in sys.path:
        sys.path.insert(0, ai_server_dir)
    os.chdir(ai_server_dir)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8005))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[INFO] Precision Oncology CDSS root launcher starting on {host}:{port}...")
    uvicorn.run("main:app", host=host, port=port, reload=False)
