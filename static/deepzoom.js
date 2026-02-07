const TILE_SIZE = 508;
const TILE_OVERLAP = 2;
const TILE_SIZE_WITH_OVERLAP = TILE_SIZE + 2 * TILE_OVERLAP;

let uuid = "";
let info = [];
let deepzoom = undefined;

let globalZoomLevel = 0;
let maxZoomLevel = 0;

let baseWidth = 0;
let baseHeight = 0;
let imageWidth = 0;
let imageHeight = 0;

let scale = 0;
let imageCenterX = 0;
let imageCenterY = 0;
let cursorX = 0;
let cursorY = 0;
let moving = false;

function init(_uuid, _info) {
  uuid = _uuid;
  info = _info;
  deepzoom = document.getElementById("deepzoom");

  maxZoomLevel = info.length - 1;
  globalZoomLevel = maxZoomLevel;

  const maxlevel = info[maxZoomLevel];

  baseWidth = maxlevel.width;
  baseHeight = maxlevel.height;

  imageWidth = baseWidth;
  imageHeight = baseHeight;

  imageCenterX = baseWidth / 2;
  imageCenterY = baseHeight / 2;

  deepzoom.addEventListener("mousedown", (e) => startMove(e));
  deepzoom.addEventListener("mousemove", (e) => move(e));
  window.addEventListener("mouseup", () => endMove());

  render();
  window.addEventListener("resize", () => render());
}

function render() {
  const zoomAspectRatio = deepzoom.clientWidth / deepzoom.clientHeight;
  const imageAspectRatio = baseWidth / baseHeight;

  if (imageAspectRatio < zoomAspectRatio) {
    scale = deepzoom.clientHeight / baseHeight;
  } else {
    scale = deepzoom.clientWidth / baseWidth;
  }

  for (let level = 0; level <= maxZoomLevel; level++) {
    if (level != globalZoomLevel) {
      const tiles = document.querySelectorAll(`.${getLevelClass(level)}`);
      for (const tile of tiles) tile.remove();
    }
  }

  const level = info[globalZoomLevel];
  imageWidth = level.width;
  imageHeight = level.height;

  for (let tileTop = 0; tileTop < imageHeight; tileTop += TILE_SIZE) {
    for (let tileLeft = 0; tileLeft < imageWidth; tileLeft += TILE_SIZE) {
      if (tileIsRendered(tileLeft, tileTop)) {
        refreshTile(level, tileLeft, tileTop);
      } else {
        renderTile(level, tileLeft, tileTop);
      }
    }
  }
}

function renderTile(level, tileLeft, tileTop) {
  const tile = new Image();
  setTilePositionAndDims(level, tile, tileLeft, tileTop);

  tile.id = getTileId(tileLeft, tileTop);
  tile.classList.add(getLevelClass(globalZoomLevel));
  tile.classList.add("tile");
  tile.draggable = false;

  tile.onload = () => deepzoom.appendChild(tile);
  tile.src = `/tile/${uuid}/${globalZoomLevel}/${tileLeft}_${tileTop}.jpg`;
}

function refreshTile(level, tileLeft, tileTop) {
  const tile = document.getElementById(getTileId(tileLeft, tileTop));
  setTilePositionAndDims(level, tile, tileLeft, tileTop);
}

function setTilePositionAndDims(level, tile, tileLeft, tileTop) {
  tileLeft -= TILE_OVERLAP;
  tileTop -= TILE_OVERLAP;

  const tileRight = Math.min(tileLeft + TILE_SIZE_WITH_OVERLAP, level.width);
  const tileBottom = Math.min(tileTop + TILE_SIZE_WITH_OVERLAP, level.height);

  tileLeft = Math.max(0, tileLeft);
  tileTop = Math.max(0, tileTop);

  const tileWidth = tileRight - tileLeft;
  const tileHeight = tileBottom - tileTop;

  const tx = -imageCenterX * scale + deepzoom.clientWidth / 2;
  const ty = -imageCenterY * scale + deepzoom.clientHeight / 2;

  tile.style.left = `${tileLeft * scale + tx}px`;
  tile.style.top = `${tileTop * scale + ty}px`;
  tile.style.width = `${tileWidth * scale}px`;
  tile.style.height = `${tileHeight * scale}px`;
}

function tileIsRendered(tileLeft, tileTop) {
  tileId = getTileId(tileLeft, tileTop);
  return document.getElementById(tileId) !== null;
}

function getTileId(tileLeft, tileTop) {
  return `tile-${tileLeft}-${tileTop}`;
}

function getLevelClass(zoomLevel) {
  return `level-${zoomLevel}`;
}

function resetZoom() {
  globalZoomLevel = maxZoomLevel;
  imageCenterX = baseWidth / 2;
  imageCenterY = baseHeight / 2;
  render();
}

function zoomIn() {
  if (globalZoomLevel > info.length - 2) {
    globalZoomLevel -= 1;
    imageCenterX *= 2;
    imageCenterY *= 2;
    render();
  }
}

function zoomOut() {
  if (globalZoomLevel < maxZoomLevel) {
    globalZoomLevel += 1;
    imageCenterX /= 2;
    imageCenterY /= 2;
    render();
  }
}

function startMove(e) {
  moving = true;
  cursorX = e.clientX;
  cursorY = e.clientY;
}

function move(e) {
  if (moving) {
    const moveX = (cursorX - e.clientX) / scale;
    const moveY = (cursorY - e.clientY) / scale;

    imageCenterX = Math.min(Math.max(0, imageCenterX + moveX), imageWidth);
    imageCenterY = Math.min(Math.max(0, imageCenterY + moveY), imageHeight);

    cursorX = e.clientX;
    cursorY = e.clientY;

    render();
  }
}

function endMove() {
  moving = false;
}
