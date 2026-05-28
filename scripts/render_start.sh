#!/usr/bin/env sh
set -eu

MODEL_PATH="${MODEL_PATH:-checkpoints/best_model.pth}"

if [ ! -f "$MODEL_PATH" ] && [ -n "${MODEL_URL:-}" ]; then
  echo "Downloading model checkpoint to $MODEL_PATH"
  mkdir -p "$(dirname "$MODEL_PATH")"
  python - <<'PY'
import os
import urllib.request

url = os.environ["MODEL_URL"]
path = os.environ.get("MODEL_PATH", "checkpoints/best_model.pth")
tmp_path = f"{path}.download"

with urllib.request.urlopen(url) as response, open(tmp_path, "wb") as out:
    while True:
        chunk = response.read(1024 * 1024)
        if not chunk:
            break
        out.write(chunk)

os.replace(tmp_path, path)
print(f"Model downloaded: {path}")
PY
fi

if [ ! -f "$MODEL_PATH" ] && [ "${REQUIRE_MODEL:-true}" = "true" ]; then
  echo "ERROR: Model checkpoint not found at $MODEL_PATH and MODEL_URL is not configured."
  echo "Set MODEL_URL to a direct HTTPS download URL for best_model.pth."
  exit 1
fi

exec uvicorn src.api.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --forwarded-allow-ips="*"
