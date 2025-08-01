const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const canvas = document.getElementById("bg");
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const clock = new THREE.Clock();

camera.position.z = 2;

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.7,
  transparent: true,
});

const starVertices = [];
const radius = 500; // A smaller radius to improve depth precision
for (let i = 0; i < 10000; i++) {
  // Using spherical coordinates to get a uniform random distribution inside a sphere
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random()) * radius;

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  starVertices.push(x, y, z);
}

starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starVertices, 3)
);

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // --- Vertical Rotation (X-axis) ---
  // The vertical field of view is constant, so the perceived vertical speed
  // should also be constant. We use a simple base speed.
  const baseSpeedX = 0.01;
  stars.rotation.x += baseSpeedX * deltaTime;

  // --- Horizontal Rotation (Y-axis) ---
  // The horizontal field of view (hFOV) changes with the window's aspect ratio.
  // On a narrow screen, hFOV is small, so stars cross the screen faster if
  // the rotation speed is constant. To fix this, we must adapt the rotation
  // speed to be proportional to the hFOV.

  // 1. Calculate the current horizontal FOV based on the vertical FOV and aspect ratio.
  const vFOV = camera.fov * (Math.PI / 180); // camera.fov is vertical FOV in degrees.
  const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * camera.aspect);

  // 2. Define a reference to scale the speed. We'll use a common 16:9 aspect ratio.
  const referenceAspect = 16 / 9;
  const referenceHFOV = 2 * Math.atan(Math.tan(vFOV / 2) * referenceAspect);

  // 3. The speed factor is the ratio of the current hFOV to the reference hFOV.
  const speedFactor = hFOV / referenceHFOV;

  // 4. Apply the rotation.
  const baseSpeedY = 0.03; // This is the desired speed on a 16:9 screen.
  stars.rotation.y += baseSpeedY * speedFactor * deltaTime;

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- AUDIO PLAYER ---

const playPauseBtn = document.getElementById("play-pause-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const trackArtwork = document.getElementById("track-artwork");
const progressBar = document.getElementById("progress-bar");
const progressBarBg = document.getElementById("progress-container");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const volumeSlider = document.getElementById("volume-slider");
const volumeIcon = document.getElementById("volume-icon");
const playlistContainer = document.getElementById("playlist");

let sound;
let currentTrackIndex = 0;
let updateInterval;

const playlist = [
  {
    title: "Night Owl",
    artist: "Broke For Free",
    file: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Broke_For_Free/Directionless_EP/Broke_For_Free_-_01_-_Night_Owl.mp3",
    cover: "https://picsum.photos/seed/nightowl/200",
    youtubeLink: "https://www.youtube.com/watch?v=9x2_k_0_3wA",
  },
  {
    title: "Upbeat Party",
    artist: "Scott Holmes",
    file: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Scott_Holmes/Inspiring__Upbeat_Music/Scott_Holmes_-_Upbeat_Party.mp3",
    cover: "https://picsum.photos/seed/upbeat/200",
    youtubeLink: "https://www.youtube.com/watch?v=vj-b-I-324w",
  },
  {
    title: "Shipping Lanes",
    artist: "Chad Crouch",
    file: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Motion/Chad_Crouch_-_Shipping_Lanes.mp3",
    cover: "https://picsum.photos/seed/shipping/200",
    youtubeLink: "https://www.youtube.com/watch?v=kviA-Q-O-cI",
  },
];

function formatTime(secs) {
  const minutes = Math.floor(secs / 60) || 0;
  const seconds = Math.floor(secs % 60) || 0;
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function updateProgress() {
  if (sound && sound.playing()) {
    const seek = sound.seek() || 0;
    currentTimeEl.textContent = formatTime(seek);
    progressBar.style.width = (seek / sound.duration()) * 100 + "%";
  }
}

function renderPlaylist() {
  playlistContainer.innerHTML = "";
  playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.classList.add("playlist-item");
    item.dataset.index = index;

    item.innerHTML = `
      <img class="playlist-item-artwork" src="${track.cover}" alt="${track.title} artwork">
      <div class="playlist-item-info">
        <div class="playlist-item-title">${track.title}</div>
        <div class="playlist-item-artist">${track.artist}</div>
      </div>
      <a href="${track.youtubeLink}" class="playlist-item-youtube" target="_blank" title="Watch on YouTube">📺</a>
      <a href="${track.file}" class="playlist-item-download" download title="Download MP3">📥</a>
    `;

    item.addEventListener("click", (e) => {
      // Don't play if an action icon was clicked
      if (e.target.tagName !== "A") {
        loadAndPlay(index);
      }
    });

    playlistContainer.appendChild(item);
  });
}

function loadAndPlay(index) {
  if (sound) {
    sound.stop();
    sound.unload();
  }
  clearInterval(updateInterval);

  currentTrackIndex = index;
  const track = playlist[index];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  trackArtwork.src = track.cover;
  progressBar.style.width = "0%";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
  playPauseBtn.textContent = "▶";

  sound = new Howl({
    src: [track.file],
    html5: true,
    volume: volumeSlider.value,
    onload: function () {
      durationEl.textContent = formatTime(sound.duration());
    },
    onplay: function () {
      playPauseBtn.textContent = "||";
      updateInterval = setInterval(updateProgress, 100);
    },
    onpause: function () {
      playPauseBtn.textContent = "▶";
      clearInterval(updateInterval);
    },
    onend: function () {
      playPauseBtn.textContent = "▶";
      clearInterval(updateInterval);
      playNext();
    },
    onvolume: function () {
      updateVolumeIcon();
    },
  });

  sound.play();
  updatePlayingHighlight(index);
}

function updatePlayingHighlight(currentIndex) {
  const items = document.querySelectorAll(".playlist-item");
  items.forEach((item, index) => {
    if (index === currentIndex) {
      item.classList.add("playing");
    } else {
      item.classList.remove("playing");
    }
  });
}

function updateVolumeIcon() {
  const vol = sound ? sound.volume() : volumeSlider.value;
  if (vol == 0) {
    volumeIcon.className = "fa-solid fa-volume-xmark";
  } else if (vol < 0.5) {
    volumeIcon.className = "fa-solid fa-volume-low";
  } else {
    volumeIcon.className = "fa-solid fa-volume-high";
  }
}

function togglePlayPause() {
  if (!sound) {
    loadAndPlay(currentTrackIndex);
    return;
  }
  if (sound.playing()) {
    sound.pause();
  } else {
    sound.play();
  }
}

function playNext() {
  const newIndex = (currentTrackIndex + 1) % playlist.length;
  loadAndPlay(newIndex);
}

function playPrev() {
  const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadAndPlay(newIndex);
}

function seek(event) {
  if (sound && sound.duration()) {
    const rect = progressBarBg.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    sound.seek(sound.duration() * percent);
  }
}

// Event Listeners
playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);
volumeSlider.addEventListener("input", (e) => {
  if (sound) {
    sound.volume(parseFloat(e.target.value));
  }
  updateVolumeIcon();
});
progressBarBg.addEventListener("click", seek);

// Initial state
function init() {
  const track = playlist[currentTrackIndex];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  trackArtwork.src = track.cover;
  updateVolumeIcon();
  renderPlaylist();
  updatePlayingHighlight(-1); // No track playing initially
}

init();
