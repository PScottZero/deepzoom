const TILE_SIZE = 508;
const TILE_OVERLAP = 2;
const TILE_SIZE_WITH_OVERLAP = TILE_SIZE + 2 * TILE_OVERLAP;
const SCALE_THRESHOLD = 2 / 3;
const MAX_ZOOM_EXTRA_LEVEL_COUNT = 2;

let uuid = "";
let info = [];
let deepzoom = undefined;

let baseInfo = {};
let levelInfo = {};

let zoomLevel = 0;
let maxZoomLevel = 0;
let minZoomExtraLevels = 0;
let maxZoomExtraLevels = 0;

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

  baseInfo = info[0];
  levelInfo = baseInfo;
  maxZoomLevel = info.length - 1;

  imageCenterX = baseInfo.width / 2;
  imageCenterY = baseInfo.height / 2;

  deepzoom.addEventListener("mousedown", (e) => startMove(e));
  deepzoom.addEventListener("mousemove", (e) => move(e));
  window.addEventListener("mouseup", () => endMove());

  deepzoom.addEventListener("touchstart", (e) => startMove(e, true));
  deepzoom.addEventListener("touchmove", (e) => move(e, true));
  window.addEventListener("touchend", () => endMove());

  render();
  window.addEventListener("resize", () => {
    resetZoom();
    render();
  });
}

function render() {
  const zoomAspectRatio = deepzoom.clientWidth / deepzoom.clientHeight;
  const imageAspectRatio = baseInfo.width / baseInfo.height;

  if (imageAspectRatio < zoomAspectRatio) {
    scale = deepzoom.clientHeight / baseInfo.height;
  } else {
    scale = deepzoom.clientWidth / baseInfo.width;
  }
  scale *= Math.pow(2, minZoomExtraLevels + maxZoomExtraLevels);

  for (let level = 0; level <= maxZoomLevel; level++) {
    if (level === zoomLevel) continue;
    const tiles = document.querySelectorAll(`.level-${level}`);
    for (const tile of tiles) tile.remove();
  }

  levelInfo = info[zoomLevel];
  levelInfo.width = levelInfo.width;
  levelInfo.height = levelInfo.height;

  for (let tileTop = 0; tileTop < levelInfo.height; tileTop += TILE_SIZE) {
    for (let tileLeft = 0; tileLeft < levelInfo.width; tileLeft += TILE_SIZE) {
      if (tileIsVisible(tileLeft, tileTop)) {
        renderTile(tileLeft, tileTop);
      } else {
        removeTile(tileLeft, tileTop);
      }
    }
  }
}

function tileIsVisible(tileLeft, tileTop) {
  tileLeft -= TILE_OVERLAP;
  tileTop -= TILE_OVERLAP;

  const tileRight = tileLeft + TILE_SIZE_WITH_OVERLAP;
  const tileBottom = tileTop + TILE_SIZE_WITH_OVERLAP;

  const viewLeft = imageCenterX - deepzoom.clientWidth / (2 * scale);
  const viewTop = imageCenterY - deepzoom.clientHeight / (2 * scale);
  const viewRight = imageCenterX + deepzoom.clientWidth / (2 * scale);
  const viewBottom = imageCenterY + deepzoom.clientHeight / (2 * scale);

  const outOfBounds =
    tileRight < viewLeft ||
    tileLeft > viewRight ||
    tileBottom < viewTop ||
    tileTop > viewBottom;

  return !outOfBounds;
}

function renderTile(tileLeft, tileTop) {
  const tileId = `tile-${tileLeft}-${tileTop}`;
  const existingTile = document.querySelector(`#${tileId}`);
  if (existingTile !== null) {
    setTilePositionAndDims(existingTile, tileLeft, tileTop);
    return;
  }

  const tile = new Image();
  setTilePositionAndDims(tile, tileLeft, tileTop);

  tile.id = tileId;
  tile.classList.add(`level-${zoomLevel}`);
  tile.classList.add("tile");
  tile.draggable = false;
  tile.style.visibility = "hidden";
  tile.onload = () => (tile.style.visibility = "visible");
  tile.src = `/tile/${uuid}/${zoomLevel}/${tileLeft}_${tileTop}.jpg`;

  removeTile(tileLeft, tileTop);
  deepzoom.appendChild(tile);
}

function setTilePositionAndDims(tile, tileLeft, tileTop) {
  tileLeft -= TILE_OVERLAP;
  tileTop -= TILE_OVERLAP;

  const tileRight = Math.min(
    tileLeft + TILE_SIZE_WITH_OVERLAP,
    levelInfo.width,
  );
  const tileBottom = Math.min(
    tileTop + TILE_SIZE_WITH_OVERLAP,
    levelInfo.height,
  );

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

function removeTile(tileLeft, tileTop) {
  const tile = document.querySelector(`#tile-${tileLeft}-${tileTop}`);
  if (tile !== null) tile.remove();
}

function resetZoom() {
  zoomLevel = 0;
  minZoomExtraLevels = 0;
  maxZoomExtraLevels = 0;
  imageCenterX = baseInfo.width / 2;
  imageCenterY = baseInfo.height / 2;
  render();
}

function zoomIn() {
  if (zoomLevel === 0 && scale * window.devicePixelRatio < SCALE_THRESHOLD) {
    minZoomExtraLevels++;
    render();
  } else if (
    zoomLevel === maxZoomLevel &&
    maxZoomExtraLevels < MAX_ZOOM_EXTRA_LEVEL_COUNT
  ) {
    maxZoomExtraLevels++;
    render();
  } else if (zoomLevel < maxZoomLevel) {
    zoomLevel++;
    imageCenterX *= 2;
    imageCenterY *= 2;
    render();
  }
}

function zoomOut() {
  if (zoomLevel === 0 && minZoomExtraLevels > 0) {
    minZoomExtraLevels--;
    render();
  } else if (zoomLevel === maxZoomLevel && maxZoomExtraLevels > 0) {
    maxZoomExtraLevels--;
    render();
  } else if (zoomLevel > 0) {
    zoomLevel--;
    imageCenterX /= 2;
    imageCenterY /= 2;
    render();
  }
}

function startMove(e, touch = false) {
  moving = true;
  cursorX = touch ? e.touches[0].clientX : e.clientX;
  cursorY = touch ? e.touches[0].clientY : e.clientY;
}

function move(e, touch = false) {
  if (moving) {
    const newCursorX = touch ? e.touches[0].clientX : e.clientX;
    const newCursorY = touch ? e.touches[0].clientY : e.clientY;

    const moveX = (cursorX - newCursorX) / scale;
    const moveY = (cursorY - newCursorY) / scale;

    imageCenterX = Math.min(Math.max(0, imageCenterX + moveX), levelInfo.width);
    imageCenterY = Math.min(
      Math.max(0, imageCenterY + moveY),
      levelInfo.height,
    );

    cursorX = newCursorX;
    cursorY = newCursorY;

    render();
  }
}

function endMove() {
  moving = false;
  render();
}
