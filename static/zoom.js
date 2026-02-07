const TILE_SIZE = 508;
const TILE_OVERLAP = 2;
const TILE_SIZE_WITH_OVERLAP = TILE_SIZE + 2 * TILE_OVERLAP;
const RESIZE_DELAY = 100;
const NUM_EXTRA_ZOOM_LEVELS = 3;

let uuid = "";
let info = undefined;

let imgWidth = 0;
let imgHeight = 0;

let deepzoom = undefined;
let scale = 0;
let zoomLevel = 0;
let maxZoomLevel = 0;
let maxInfoLevel = 0;
let zoomLevelScales = {};

let moving = false;
let moveX = 0;
let moveY = 0;

let centerX = 0;
let centerY = 0;

function init(uuid_arg, info_arg) {
  uuid = uuid_arg;
  info = info_arg;

  maxInfoLevel = info.length - 1;
  maxZoomLevel = maxInfoLevel + NUM_EXTRA_ZOOM_LEVELS;
  zoomLevel = maxZoomLevel;

  const infoLevel = info[getInfoLevel()];
  imgWidth = infoLevel.width;
  imgHeight = infoLevel.height;
  centerX = imgWidth / 2;
  centerY = imgHeight / 2;

  deepzoom = document.getElementById("deepzoom");
  deepzoom.addEventListener("mousedown", (e) => startMove(e));
  deepzoom.addEventListener("mousemove", (e) => move(e));
  window.addEventListener("mouseup", () => endMove());

  render();
  window.addEventListener("resize", () => render());
}

function render() {
  const zoomAspectRatio = deepzoom.clientWidth / deepzoom.clientHeight;
  const imageAspectRatio = imgWidth / imgHeight;

  if (imageAspectRatio < zoomAspectRatio) {
    scale = deepzoom.clientHeight / imgHeight;
  } else {
    scale = deepzoom.clientWidth / imgWidth;
  }

  for (let level = 0; level <= maxZoomLevel; level++) {
    zoomLevelScales[level] = scale * Math.pow(2, maxZoomLevel - level);
  }

  for (let tileTop = 0; tileTop < imgHeight; tileTop += TILE_SIZE) {
    for (let tileLeft = 0; tileLeft < imgWidth; tileLeft += TILE_SIZE) {
      if (tileIsRendered(tileLeft, tileTop)) {
        refreshTile(tileLeft, tileTop);
      } else {
        renderTile(tileLeft, tileTop);
      }
    }
  }
}

function renderTile(tileLeft, tileTop) {
  const tile = new Image();
  setTilePositionAndDims(tile, tileLeft, tileTop);

  tile.id = getTileId(tileLeft, tileTop);
  tile.classList.add("tile");
  tile.draggable = false;

  tile.onload = () => deepzoom.appendChild(tile);
  tile.src = `/tile/${uuid}/${maxInfoLevel}/${tileLeft}_${tileTop}.jpg`;
}

function refreshTile(tileLeft, tileTop) {
  const tile = document.getElementById(getTileId(tileLeft, tileTop));
  setTilePositionAndDims(tile, tileLeft, tileTop);
}

function setTilePositionAndDims(tile, tileLeft, tileTop) {
  tileLeft -= TILE_OVERLAP;
  tileTop -= TILE_OVERLAP;

  const tileRight = Math.min(tileLeft + TILE_SIZE_WITH_OVERLAP, imgWidth);
  const tileBottom = Math.min(tileTop + TILE_SIZE_WITH_OVERLAP, imgHeight);

  tileLeft = Math.max(0, tileLeft);
  tileTop = Math.max(0, tileTop);

  const tileWidth = tileRight - tileLeft;
  const tileHeight = tileBottom - tileTop;
  const tileScale = zoomLevelScales[zoomLevel];

  const tx = -centerX * tileScale + deepzoom.clientWidth / 2;
  const ty = -centerY * tileScale + deepzoom.clientHeight / 2;

  tile.style.left = `${tileLeft * tileScale + tx}px`;
  tile.style.top = `${tileTop * tileScale + ty}px`;
  tile.style.width = `${tileWidth * tileScale}px`;
  tile.style.height = `${tileHeight * tileScale}px`;
}

function tileIsRendered(tileLeft, tileTop) {
  return document.getElementById(getTileId(tileLeft, tileTop)) !== null;
}

function getTileId(tileLeft, tileTop) {
  return `tile-${maxInfoLevel}-${tileLeft}-${tileTop}`;
}

function resetZoom() {
  zoomLevel = maxZoomLevel;
  centerX = imgWidth / 2;
  centerY = imgHeight / 2;
  render();
}

function zoomIn() {
  if (zoomLevel > 0) {
    zoomLevel -= 1;
    render();
  }
}

function zoomOut() {
  if (zoomLevel < maxZoomLevel) {
    zoomLevel += 1;
    render();
  }
}

function getInfoLevel() {
  return Math.min(zoomLevel, maxInfoLevel);
}

function startMove(e) {
  moving = true;
  moveX = e.clientX;
  moveY = e.clientY;
}

function move(e) {
  if (moving) {
    const moveScale = zoomLevelScales[zoomLevel];

    centerX += (moveX - e.clientX) / moveScale;
    centerY += (moveY - e.clientY) / moveScale;

    centerX = Math.min(Math.max(0, centerX), imgWidth);
    centerY = Math.min(Math.max(0, centerY), imgHeight);

    moveX = e.clientX;
    moveY = e.clientY;

    render();
  }
}

function endMove() {
  moving = false;
}
