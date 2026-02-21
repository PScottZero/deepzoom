import json
import math
import os
import shutil
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

TILE_SIZE = 508
TILE_OVERLAP = 2
TILE_SIZE_WITH_OVERLAP = TILE_SIZE + 2 * TILE_OVERLAP
MIN_IMAGE_DIM = 1920

ANSI_GREEN = "\033[32m"
ANSI_CYAN = "\033[36m"
ANSI_RED = "\033[91m"
ANSI_RESET = "\033[0m"

PROGRESS_BAR_LEN = 40


def create_deepzoom_image(image_path: str, out_path: str) -> None:
  image_folder = os.path.dirname(image_path)
  image_name = os.path.basename(image_path)
  image_name = image_name[: image_name.rfind(".")]
  deepzoom_path = f"{out_path if out_path else image_folder}/{image_name}"

  if os.path.exists(deepzoom_path):
    print_color("Removing existing deepzoom image...", ANSI_RED)
    shutil.rmtree(deepzoom_path)
  os.makedirs(deepzoom_path)

  img = Image.open(image_path)
  if img.width < MIN_IMAGE_DIM and img.height < MIN_IMAGE_DIM:
    print_color("Image is too small", ANSI_RED)
    exit(0)

  info: list[dict[str, int]] = []

  zoom_levels = get_zoom_levels(img.width, img.height)
  for i, zoom_level in enumerate(zoom_levels):
    zoom_level_id = len(zoom_levels) - i - 1
    zoom_level_path = f"{deepzoom_path}/{zoom_level_id}"
    os.mkdir(zoom_level_path)

    print(f"Generating zoom level {zoom_level_id}")

    if zoom_level[0] != img.width:
      print_color("Halving image dimensions...", ANSI_CYAN)
      img = img.resize(zoom_level)
    print_color(f"Size: {img.width}x{img.height}", ANSI_CYAN)

    print_color("Generating tiles...", ANSI_CYAN)
    tiles = get_tiles(img.width, img.height)
    for i, (tile_left, tile_top) in enumerate(tiles):
      print_progress(i, len(tiles))

      tile_path = f"{zoom_level_path}/{tile_left}_{tile_top}.jpg"

      tile_left -= TILE_OVERLAP
      tile_top -= TILE_OVERLAP

      tile_right = min(tile_left + TILE_SIZE_WITH_OVERLAP, img.width)
      tile_bottom = min(tile_top + TILE_SIZE_WITH_OVERLAP, img.height)

      tile_left = max(0, tile_left)
      tile_top = max(0, tile_top)

      tile = img.crop((tile_left, tile_top, tile_right, tile_bottom))
      tile.save(tile_path)

    info.append({"width": img.width, "height": img.height})
    print()

  print("Writing info.json...")
  info_path = f"{deepzoom_path}/info.json"
  with open(info_path, "w") as f:
    json.dump(list(reversed(info)), f, indent=2)

  print_color("Done", ANSI_GREEN)


def get_zoom_levels(width: int, height: int) -> list[tuple[int, int]]:
  zoom_levels = []
  while width >= MIN_IMAGE_DIM or height >= MIN_IMAGE_DIM:
    zoom_levels.append((width, height))
    width = math.ceil(width / 2)
    height = math.ceil(height / 2)
  return zoom_levels


def get_tiles(width: int, height: int) -> list[tuple[int, int]]:
  return [
    (tile_left, tile_top)
    for tile_top in range(0, height, TILE_SIZE)
    for tile_left in range(0, width, TILE_SIZE)
  ]


def print_progress(i: int, n: int) -> None:
  percent_done = (i + 1) / n
  bar_steps = math.floor(PROGRESS_BAR_LEN * percent_done)
  progress_bar = (
    f"[{i + 1}/{n}] "
    + f"[{'=' * bar_steps + ' ' * (PROGRESS_BAR_LEN - bar_steps)}] "
    + f"{percent_done * 100:.1f}%"
  )
  print_color(progress_bar, ANSI_CYAN, end="\r")


def print_color(text: str, color: str, end: str = "\n") -> None:
  print(f"{color}{text}{ANSI_RESET}", end=end)


if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("No image path specified")
    exit(0)

  image_path = sys.argv[1]
  out_path = sys.argv[2] if len(sys.argv) > 2 else ""

  if not os.path.exists(image_path):
    print("Specified image path does not exist")
    exit(0)

  if out_path and not os.path.exists(out_path):
    print("Specified output path does not exist")
    exit(0)

  create_deepzoom_image(image_path, out_path)
