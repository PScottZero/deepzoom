import json
import os
import sys
import uuid

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def deepzoom() -> str:
  with open(f"{app.config['deepzoom_path']}/info.json", "r") as info:
    info = json.loads(info.read())
  title = os.path.basename(app.config["deepzoom_path"])
  return render_template(
    "deepzoom.jinja",
    title=title,
    uuid=app.config["id"],
    info=info,
  )


@app.route("/tile/<string:uuid>/<int:zoom_level>/<string:tile>")
def get_tile(uuid: str, zoom_level: int, tile: str) -> bytes:
  tile_path = f"{app.config['deepzoom_path']}/{zoom_level}/{tile}"
  if not os.path.exists(tile_path):
    return bytes()
  with open(tile_path, "rb") as t:
    return t.read()


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("No deepzoom image path specified")
    exit(0)

  deepzoom_path = sys.argv[1]
  if not os.path.exists(deepzoom_path):
    print("Specified deepzoom image path does not exist")
    exit(0)

  app.config["id"] = str(uuid.uuid4())
  app.config["deepzoom_path"] = deepzoom_path
  app.run(host="0.0.0.0", port=3000)
