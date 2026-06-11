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
const cdPrev = document.getElementById("cdPrev");
const activeCd = document.getElementById("activeCd");
const cdNext = document.getElementById("cdNext");
const cdElements = [cdPrev, activeCd, cdNext];
const miniCd = document.getElementById("miniCd");
const trackTitle = document.getElementById("trackTitle");
const statusText = document.getElementById("statusText");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const audio = document.getElementById("audio");
const wave = document.getElementById("wave");
const miniWave = document.getElementById("miniWave");

let currentIndex = 0;
let isPlaying = false;
let dragStartX = 0;
let dragging = false;
let animating = false;
let offsetX = 0;

const CD_SPIN_SECONDS = 5;
let cdRotation = 0;
let spinOrigin = performance.now();

function getActiveCdSurface() {
  return activeCd.querySelector(".cd-surface");
}

function getMiniCdSurface() {
  return miniCd.querySelector(".mini-cd-surface");
}

function getCdRotationAngle() {
  return ((performance.now() - spinOrigin) / 1000 / CD_SPIN_SECONDS) * 360;
}

function syncSpinOrigin(angle = cdRotation) {
  spinOrigin = performance.now() - (angle / 360) * CD_SPIN_SECONDS * 1000;
}

function applyCdRotation(angle = cdRotation) {
  const transform = `rotate(${angle}deg) translateZ(0)`;
  const activeSurface = getActiveCdSurface();
  const miniSurface = getMiniCdSurface();
  if (activeSurface) activeSurface.style.transform = transform;
  if (miniSurface) miniSurface.style.transform = transform;
}

function cdRotationLoop() {
  if (isPlaying && !dragging) {
    cdRotation = getCdRotationAngle();
    applyCdRotation();
  }
  requestAnimationFrame(cdRotationLoop);
}

function wrapIndex(index) {
  return (index + cds.length) % cds.length;
}

function applyCdArtwork() {
  const prevIdx = wrapIndex(currentIndex - 1);
  const nextIdx = wrapIndex(currentIndex + 1);

  cdPrev.style.setProperty("--cd-bg", cds[prevIdx].bg);
  activeCd.style.setProperty("--cd-bg", cds[currentIndex].bg);
  cdNext.style.setProperty("--cd-bg", cds[nextIdx].bg);
  miniCd.style.setProperty("--cd-bg", cds[currentIndex].bg);
}

function setCdTransition(animate) {
  const value = animate ? `transform ${TRANSITION_MS}ms ${TRANSITION_EASE}` : "none";
  cdElements.forEach((cd) => {
    cd.style.transition = value;
  });
}

function setCdPositions(dragOffset = 0, animate = false) {
  setCdTransition(animate);
  const positions = [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE];
  cdElements.forEach((cd, index) => {
    cd.style.transform = `translateX(${positions[index] + dragOffset}px)`;
  });
}

function loadTrack(index, autoplay = false) {
  currentIndex = wrapIndex(index);
  const cd = cds[currentIndex];

  audio.src = cd.file;
  trackTitle.textContent = cd.title;
  applyCdArtwork();
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
    syncSpinOrigin(cdRotation);
    applyCdRotation();
  }
}

function playMusic() {
  if (!audio.src) {
    audio.src = cds[currentIndex].file;
  }

  audio.load();

  audio.play()
    .then(() => {
      updatePlayingUI(true);
    })
    .catch((error) => {
      console.error("Audio failed to play:", error);
      statusText.textContent = "Tap Play";
      updatePlayingUI(false);
    });
}

function pauseMusic() {
  audio.pause();
  updatePlayingUI(false);
}

function finishSwipe(direction) {
  currentIndex = wrapIndex(currentIndex + direction);
  const cd = cds[currentIndex];

  audio.src = cd.file;
  trackTitle.textContent = cd.title;
  applyCdArtwork();

  cdElements.forEach((cdEl) => {
    cdEl.style.transition = "none";
  });
  setCdPositions(0, false);

  void carouselTrack.offsetWidth;

  cdElements.forEach((cdEl) => {
    cdEl.style.transition = "";
  });

  animating = false;
  activeCd.classList.remove("is-dragging");

  if (isPlaying) playMusic();
}

function commitSwipe(direction) {
  if (animating) return;
  animating = true;
  activeCd.classList.add("is-dragging");

  const targets =
    direction === 1
      ? [-SLIDE_DISTANCE * 2, -SLIDE_DISTANCE, 0]
      : [0, SLIDE_DISTANCE, SLIDE_DISTANCE * 2];

  setCdTransition(true);
  cdElements.forEach((cd, index) => {
    cd.style.transform = `translateX(${targets[index]}px)`;
  });

  activeCd.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName !== "transform") return;
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
  cdRotation = getCdRotationAngle();
  dragStartX = event.clientX;
  activeCd.classList.add("is-dragging");
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

  activeCd.classList.remove("is-dragging");
  syncSpinOrigin(cdRotation);
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

syncSpinOrigin(0);
requestAnimationFrame(cdRotationLoop);
loadTrack(0, false);
