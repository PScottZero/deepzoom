const TILE_SIZE = 508;
const TILE_OVERLAP = 2;
const TILE_SIZE_WITH_OVERLAP = TILE_SIZE + 2 * TILE_OVERLAP;
const LEVEL_SCALE_THRESHOLD = 0.75;

let uuid = "";
let info = [];
let deepzoom = undefined;

let baseInfo = {};
let levelInfo = {};

let globalZoomLevel = 0;
let maxZoomLevel = 0;
let extraZoomLevels = 0;
let atLastExtraLevel = false;

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

  baseInfo = info[maxZoomLevel];
  levelInfo = baseInfo;

  imageCenterX = baseInfo.width / 2;
  imageCenterY = baseInfo.height / 2;

  deepzoom.addEventListener("mousedown", (e) => startMove(e));
  deepzoom.addEventListener("mousemove", (e) => move(e));
  window.addEventListener("mouseup", () => endMove());

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
  scale *= Math.pow(2, extraZoomLevels);

  for (let level = 0; level <= maxZoomLevel; level++) {
    if (level != globalZoomLevel) {
      const tiles = document.querySelectorAll(`.${getLevelClass(level)}`);
      for (const tile of tiles) tile.remove();
    }
  }

  levelInfo = info[globalZoomLevel];
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
  const existingTile = document.getElementById(getTileId(tileLeft, tileTop));
  if (existingTile !== null) {
    setTilePositionAndDims(existingTile, tileLeft, tileTop);
    return;
  }

  const tile = new Image();
  setTilePositionAndDims(tile, tileLeft, tileTop);

  tile.id = getTileId(tileLeft, tileTop);
  tile.classList.add(getLevelClass(globalZoomLevel));
  tile.classList.add("tile");
  tile.draggable = false;
  tile.style.visibility = "hidden";
  tile.onload = () => (tile.style.visibility = "visible");
  tile.src = `/tile/${uuid}/${globalZoomLevel}/${tileLeft}_${tileTop}.jpg`;

  removeTile(tileLeft, tileTop);
  deepzoom.appendChild(tile);
}

function removeTile(tileLeft, tileTop) {
  const tile = document.getElementById(getTileId(tileLeft, tileTop));
  if (tile !== null) tile.remove();
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

function tileIsRendered(tileLeft, tileTop) {
  return document.querySelector(`#${getTileId(tileLeft, tileTop)}`) !== null;
}

function getTileId(tileLeft, tileTop) {
  return `tile-${tileLeft}-${tileTop}`;
}

function getLevelClass(zoomLevel) {
  return `level-${zoomLevel}`;
}

function resetZoom() {
  globalZoomLevel = maxZoomLevel;
  extraZoomLevels = 0;
  imageCenterX = baseInfo.width / 2;
  imageCenterY = baseInfo.height / 2;
  render();
}

function zoomIn() {
  const atFirstZoomLevel = globalZoomLevel === maxZoomLevel;
  const atLastZoomLevel = globalZoomLevel === 0;
  if (
    (atFirstZoomLevel && scale < LEVEL_SCALE_THRESHOLD) ||
    (atLastZoomLevel && !atLastExtraLevel)
  ) {
    extraZoomLevels += 1;
    if (atLastZoomLevel) atLastExtraLevel = true;
    render();
  } else if (globalZoomLevel > 0) {
    globalZoomLevel -= 1;
    imageCenterX *= 2;
    imageCenterY *= 2;
    render();
  }
}

function zoomOut() {
  const atFirstZoomLevel = globalZoomLevel === maxZoomLevel;
  const atLastZoomLevel = globalZoomLevel === 0;
  if (
    (atFirstZoomLevel && extraZoomLevels > 0) ||
    (atLastZoomLevel && atLastExtraLevel)
  ) {
    extraZoomLevels -= 1;
    if (atLastZoomLevel) atLastExtraLevel = false;
    render();
  } else if (globalZoomLevel < maxZoomLevel) {
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

    imageCenterX = Math.min(Math.max(0, imageCenterX + moveX), levelInfo.width);
    imageCenterY = Math.min(
      Math.max(0, imageCenterY + moveY),
      levelInfo.height,
    );

    cursorX = e.clientX;
    cursorY = e.clientY;

    render();
  }
}

function endMove() {
  moving = false;
  render();
}
