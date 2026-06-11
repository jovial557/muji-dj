const cds = [
  { title: "MUJI FRANCE", file: "assets/MUJI-FRANCE.mp3", bg: "url('assets/cd-france.png')" },
  { title: "MUJI SPAIN", file: "assets/MUJI-SPAIN.mp3", bg: "url('assets/cd-spain.png')" },
  { title: "MUJI ITALY", file: "assets/MUJI-ITALY.mp3", bg: "url('assets/cd-italy.png')" },
  { title: "MUJI IRELAND", file: "assets/MUJI-IRELAND.mp3", bg: "url('assets/cd-ireland.png')" },
  { title: "MUJI SCOTLAND", file: "assets/MUJI-SCOTLAND.mp3", bg: "url('assets/cd-scotland.png')" },
];

const SLIDE_DISTANCE = 318;
const SWIPE_THRESHOLD = 70;
const TRANSITION_MS = 420;
const TRANSITION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const miniPlayer = document.getElementById("miniPlayer");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");
const carouselTrack = document.getElementById("carouselTrack");
const miniCd = document.getElementById("miniCd");
const trackTitle = document.getElementById("trackTitle");
const statusText = document.getElementById("statusText");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const audio = document.getElementById("audio");
const wave = document.getElementById("wave");
const miniWave = document.getElementById("miniWave");

// Three physical CD elements. Their roles rotate after each swipe.
// cdSlots[0] = left/prev, cdSlots[1] = center/active, cdSlots[2] = right/next
let cdSlots = [
  document.getElementById("cdPrev"),
  document.getElementById("activeCd"),
  document.getElementById("cdNext"),
];

let currentIndex = 0;
let isPlaying = false;
let dragStartX = 0;
let dragging = false;
let animating = false;
let offsetX = 0;

const CD_SPIN_SECONDS = 5;
// Each track keeps its own rotation angle
const trackRotations = cds.map(() => 0);
const trackSpinOrigins = cds.map(() => performance.now());

function wrapIndex(index) {
  return (index + cds.length) % cds.length;
}

function getCenterCd() {
  return cdSlots[1];
}

function getMiniCdSurface() {
  return miniCd.querySelector(".mini-cd-surface");
}

function trackIndexForSlot(slotIndex) {
  if (slotIndex === 0) return wrapIndex(currentIndex - 1);
  if (slotIndex === 1) return currentIndex;
  return wrapIndex(currentIndex + 1);
}

function getTrackRotationAngle(trackIndex) {
  if (!isPlaying) return trackRotations[trackIndex];
  const origin = trackSpinOrigins[trackIndex];
  return ((performance.now() - origin) / 1000 / CD_SPIN_SECONDS) * 360;
}

function syncTrackSpinOrigin(trackIndex, angle = trackRotations[trackIndex]) {
  trackSpinOrigins[trackIndex] =
    performance.now() - (angle / 360) * CD_SPIN_SECONDS * 1000;
}

function applyCdRotation() {
  const centerSurface = getCenterCd().querySelector(".cd-surface");
  if (centerSurface) {
    const angle = getTrackRotationAngle(currentIndex);
    trackRotations[currentIndex] = angle;
    centerSurface.style.transform = `rotate(${angle}deg) translateZ(0)`;
  }

  // Side CDs stay still — only the active one spins
  [cdSlots[0], cdSlots[2]].forEach((cd) => {
    const surface = cd.querySelector(".cd-surface");
    if (surface) surface.style.transform = "rotate(0deg) translateZ(0)";
  });

  const miniSurface = getMiniCdSurface();
  if (miniSurface) {
    const angle = getTrackRotationAngle(currentIndex);
    miniSurface.style.transform = `rotate(${angle}deg) translateZ(0)`;
  }
}

function cdRotationLoop() {
  if (isPlaying && !dragging) {
    applyCdRotation();
  }
  requestAnimationFrame(cdRotationLoop);
}

function setCdTransition(animate) {
  const value = animate ? `transform ${TRANSITION_MS}ms ${TRANSITION_EASE}` : "none";
  cdSlots.forEach((cd) => {
    cd.style.transition = value;
  });
}

function setCdPositions(dragOffset = 0, animate = false) {
  setCdTransition(animate);
  const positions = [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE];
  cdSlots.forEach((cd, slotIndex) => {
    cd.style.transform = `translateX(${positions[slotIndex] + dragOffset}px)`;
  });
}

function applySideArtwork() {
  // Only update the offscreen CDs. The center CD already shows the right art.
  cdSlots[0].style.setProperty("--cd-bg", cds[wrapIndex(currentIndex - 1)].bg);
  cdSlots[2].style.setProperty("--cd-bg", cds[wrapIndex(currentIndex + 1)].bg);
  miniCd.style.setProperty("--cd-bg", cds[currentIndex].bg);
}

function applyAllArtwork() {
  cdSlots.forEach((cd, slotIndex) => {
    cd.style.setProperty("--cd-bg", cds[trackIndexForSlot(slotIndex)].bg);
  });
  miniCd.style.setProperty("--cd-bg", cds[currentIndex].bg);
}

function loadTrack(index, autoplay = false) {
  currentIndex = wrapIndex(index);
  const cd = cds[currentIndex];

  audio.src = cd.file;
  trackTitle.textContent = cd.title;
  applyAllArtwork();
  offsetX = 0;
  setCdPositions(0, false);

  if (autoplay) playMusic();
  else updatePlayingUI(false);
}

function updatePlayingUI(playing) {
  isPlaying = playing;
  document.body.classList.toggle("is-playing", playing);
  wave.classList.toggle("is-playing", playing);
  miniWave.classList.toggle("is-playing", playing);
  statusText.textContent = playing ? "Now Playing" : "Paused";

  if (playing) {
    syncTrackSpinOrigin(currentIndex, trackRotations[currentIndex]);
    applyCdRotation();
  }
}

async function playMusic() {
  try {
    audio.muted = false;
    audio.volume = 1;

    if (!audio.src) {
      audio.src = cds[currentIndex].file;
    }

    await audio.play();
    updatePlayingUI(true);
  } catch (error) {
    statusText.textContent = "Tap Play";
    updatePlayingUI(false);
  }
}

function pauseMusic() {
  audio.pause();
  updatePlayingUI(false);
}

function rotateSlots(direction) {
  // After a swipe, the CD that landed in the center becomes the new active slot.
  // We rotate the array instead of jumping artwork/positions on the center CD.
  if (direction === 1) {
    // Swiped to next: center CD was cdSlots[2]
    cdSlots = [cdSlots[1], cdSlots[2], cdSlots[0]];
  } else {
    // Swiped to previous: center CD was cdSlots[0]
    cdSlots = [cdSlots[2], cdSlots[0], cdSlots[1]];
  }
}

function finishSwipe(direction) {
  currentIndex = wrapIndex(currentIndex + direction);
  const cd = cds[currentIndex];

  audio.src = cd.file;
  trackTitle.textContent = cd.title;
  miniCd.style.setProperty("--cd-bg", cd.bg);

  // Rotate which DOM element plays prev / active / next
  rotateSlots(direction);

  // Reset positions with no animation. The center CD never moves, so no flicker.
  setCdTransition(false);
  setCdPositions(0, false);

  // Wait one paint frame so the browser finishes the slide before we swap side art
  requestAnimationFrame(() => {
    applySideArtwork();
    applyCdRotation();

    animating = false;
    getCenterCd().classList.remove("is-dragging");

    if (isPlaying) playMusic();
  });
}

function commitSwipe(direction) {
  if (animating) return;
  animating = true;
  getCenterCd().classList.add("is-dragging");

  const targets =
    direction === 1
      ? [-SLIDE_DISTANCE * 2, -SLIDE_DISTANCE, 0]
      : [0, SLIDE_DISTANCE, SLIDE_DISTANCE * 2];

  setCdTransition(true);
  cdSlots.forEach((cd, slotIndex) => {
    cd.style.transform = `translateX(${targets[slotIndex]}px)`;
  });

  // Listen on the CD that slides into the center (not always the same element)
  const landingCd = direction === 1 ? cdSlots[2] : cdSlots[0];

  landingCd.addEventListener(
    "transitionend",
    (event) => {
      if (event.target !== landingCd || event.propertyName !== "transform") return;
      finishSwipe(direction);
    },
    { once: true }
  );
}

function nextCd(autoplay = isPlaying) {
  if (dragging || animating) return;
  if (autoplay) isPlaying = true;
  commitSwipe(1);
}

function prevCd(autoplay = isPlaying) {
  if (dragging || animating) return;
  if (autoplay) isPlaying = true;
  commitSwipe(-1);
}

miniPlayer.addEventListener("click", () => {
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
});

closeBtn.addEventListener("click", () => {
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
});

playPauseBtn.addEventListener("click", () => {
  if (isPlaying) pauseMusic();
  else playMusic();
});

nextBtn.addEventListener("click", () => nextCd(true));
prevBtn.addEventListener("click", () => prevCd(true));
audio.addEventListener("ended", () => nextCd(true));

carouselTrack.addEventListener("pointerdown", (event) => {
  if (animating) return;
  dragging = true;
  trackRotations[currentIndex] = getTrackRotationAngle(currentIndex);
  dragStartX = event.clientX;
  getCenterCd().classList.add("is-dragging");
  carouselTrack.setPointerCapture(event.pointerId);
  setCdTransition(false);
});

carouselTrack.addEventListener("pointermove", (event) => {
  if (!dragging || animating) return;
  offsetX = event.clientX - dragStartX;
  setCdPositions(offsetX, false);
});

function endDrag() {
  if (!dragging || animating) return;
  dragging = false;

  if (offsetX < -SWIPE_THRESHOLD) {
    commitSwipe(1);
    return;
  }

  if (offsetX > SWIPE_THRESHOLD) {
    commitSwipe(-1);
    return;
  }

  getCenterCd().classList.remove("is-dragging");
  syncTrackSpinOrigin(currentIndex, trackRotations[currentIndex]);
  setCdPositions(0, true);
  offsetX = 0;
}

carouselTrack.addEventListener("pointerup", endDrag);
carouselTrack.addEventListener("pointercancel", endDrag);

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 848;
const phone = document.querySelector(".phone");

function fitPhoneToScreen() {
  const viewW = window.visualViewport?.width ?? window.innerWidth;
  const viewH = window.visualViewport?.height ?? window.innerHeight;
  const scale = Math.min(viewW / PHONE_WIDTH, viewH / PHONE_HEIGHT);
  phone.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", fitPhoneToScreen);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", fitPhoneToScreen);
}
fitPhoneToScreen();

requestAnimationFrame(cdRotationLoop);
loadTrack(0, false);
