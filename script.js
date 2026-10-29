
"use strict";

// ---------- Demo data and storage ----------

const STORAGE_KEYS = {
  tracks: "jamverse_tracks_v1",
  favorites: "jamverse_favorites_v1",
  votes: "jamverse_votes_v1",
  theme: "jamverse_theme_v1"
};

const initialTracks = [
  { id: "t1", title: "Midnight Drive", artist: "The Weekenders", genre: "Indie", votes: 24 },
  { id: "t2", title: "Electric Dreams", artist: "Nova Pulse", genre: "Electronic", votes: 35 },
  { id: "t3", title: "Slow Morning", artist: "Cloud Theory", genre: "Chill", votes: 18 },
  { id: "t4", title: "Campus Cypher", artist: "Fresh Verse", genre: "Hip-Hop", votes: 42 },
  { id: "t5", title: "Golden Hour", artist: "Amber Lane", genre: "Pop", votes: 29 },
  { id: "t6", title: "After Hours", artist: "Static Youth", genre: "Rock", votes: 16 },
  { id: "t7", title: "Paper Planes", artist: "Sunday Club", genre: "Indie", votes: 21 },
  { id: "t8", title: "Neon Skyline", artist: "Digital Bloom", genre: "Electronic", votes: 31 },
  { id: "t9", title: "Coffee & Rain", artist: "Mellow Miles", genre: "Chill", votes: 13 },
  { id: "t10", title: "Late Night Notes", artist: "Lil Campus", genre: "Hip-Hop", votes: 26 }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("Could not save data in this browser.");
  }
}

function loadTracks() {
  const stored = readStorage(STORAGE_KEYS.tracks, null);

  if (!Array.isArray(stored)) return initialTracks.map(t => ({ ...t }));

  return stored.filter(t =>
    t &&
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.artist === "string" &&
    typeof t.genre === "string" &&
    Number.isFinite(t.votes)
  );
}

let tracks = loadTracks();
let favorites = readStorage(STORAGE_KEYS.favorites, []);
let votedIds = readStorage(STORAGE_KEYS.votes, []);
let activeGenre = "All";
let searchTerm = "";
let currentTrackId = null;
let isPlaying = false;

if (!Array.isArray(favorites)) favorites = [];
if (!Array.isArray(votedIds)) votedIds = [];

favorites = favorites.filter(id =>
  typeof id === "string" && tracks.some(t => t.id === id)
);

votedIds = votedIds.filter(id =>
  typeof id === "string" && tracks.some(t => t.id === id)
);

// ---------- DOM references ----------

const playlistGrid = document.getElementById("playlistGrid");
const queueList = document.getElementById("queueList");
const favoritesGrid = document.getElementById("favoritesGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resultCount = document.getElementById("resultCount");
const favoriteCount = document.getElementById("favoriteCount");
const trackDialog = document.getElementById("trackDialog");
const trackForm = document.getElementById("trackForm");
const toast = document.getElementById("toast");

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Safe HTML helpers ----------

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function iconForGenre(genre) {
  const icons = {
    Indie: "🎸",
    Electronic: "⚡",
    Chill: "☁️",
    "Hip-Hop": "🎤",
    Pop: "✨",
    Rock: "🤘"
  };

  return icons[genre] || "♫";
}

function coverClass(index) {
  return "cover-" + (index % 5 + 1);
}

// ---------- Notifications ----------

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ---------- Playlist search and filtering ----------

function getFilteredTracks() {
  let result = tracks.filter(track => {
    const matchesGenre =
      activeGenre === "All" || track.genre === activeGenre;

    const searchable =
      `${track.title} ${track.artist} ${track.genre}`.toLowerCase();

    return matchesGenre && searchable.includes(searchTerm);
  });

  const sortMode = sortSelect.value;

  if (sortMode === "popular") {
    result.sort((a, b) => b.votes - a.votes);
  } else if (sortMode === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === "newest") {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
}

function trackCard(track, index) {
  const isFavorite = favorites.includes(track.id);
  const hasVoted = votedIds.includes(track.id);

  return `
    <article class="track-card">
      <div class="cover ${coverClass(index)}"
           aria-hidden="true">${iconForGenre(track.genre)}</div>

      <div class="track-top">
        <div>
          <h3>${escapeHTML(track.title)}</h3>
          <p class="track-artist">${escapeHTML(track.artist)}</p>
        </div>
        <span class="vote-count">▲ ${track.votes}</span>
      </div>

      <span class="genre-tag">${escapeHTML(track.genre)}</span>

      <div class="card-actions">
        <button class="small-btn" data-action="play"
                data-id="${escapeHTML(track.id)}">
          ▶ Select
        </button>

        <button class="small-btn ${hasVoted ? "voted" : ""}"
                data-action="vote" data-id="${escapeHTML(track.id)}"
                ${hasVoted ? "disabled" : ""}>
          ${hasVoted ? "✓ Voted" : "▲ Vote"}
        </button>

        <button class="small-btn ${isFavorite ? "favorited" : ""}"
                data-action="favorite" data-id="${escapeHTML(track.id)}"
                aria-pressed="${isFavorite}">
          ${isFavorite ? "♥ Saved" : "♡ Favorite"}
        </button>
      </div>
    </article>
  `;
}

function renderDiscover() {
  const filtered = getFilteredTracks();

  resultCount.textContent =
    `${filtered.length} track${filtered.length === 1 ? "" : "s"}`;

  playlistGrid.innerHTML = filtered.length
    ? filtered.map(trackCard).join("")
    : `<div class="empty-state">
         <h3>No tracks found</h3>
         <p>Try another search term or choose a different genre.</p>
       </div>`;
}

// ---------- Trending tracks ----------

function renderQueue() {
  const trending = [...tracks]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  if (!trending.length) {
    queueList.innerHTML = `
      <div class="empty-state">
        <h3>No tracks yet</h3>
        <p>Add the first song to your Jam Arena.</p>
      </div>`;
    updateEnergy();
    return;
  }

  queueList.innerHTML = trending.map((track, index) => `
    <div class="queue-item">
      <div class="queue-info">
        <strong>${index + 1}. ${escapeHTML(track.title)}</strong>
        <small>${escapeHTML(track.artist)} · ${escapeHTML(track.genre)}</small>
      </div>

      <div class="queue-actions">
        <span class="vote-count">${track.votes} ▲</span>
        <button class="small-btn" data-action="vote"
                data-id="${escapeHTML(track.id)}"
                ${votedIds.includes(track.id) ? "disabled" : ""}
                aria-label="Vote for ${escapeHTML(track.title)}">
          ${votedIds.includes(track.id) ? "✓" : "▲"}
        </button>
        <button class="small-btn" data-action="play"
                data-id="${escapeHTML(track.id)}"
                aria-label="Select ${escapeHTML(track.title)}">▶</button>
      </div>
    </div>
  `).join("");

  updateEnergy();
}

// ---------- Favorites ----------

function renderFavorites() {
  const savedTracks = favorites
    .map(id => tracks.find(track => track.id === id))
    .filter(Boolean);

  favoriteCount.textContent = savedTracks.length;

  favoritesGrid.innerHTML = savedTracks.length
    ? savedTracks.map(trackCard).join("")
    : `<div class="empty-state">
         <h3>Your collection starts here ♡</h3>
         <p>Press Favorite on any track to save it here.</p>
       </div>`;
}

// ---------- Voting ----------

function voteForTrack(id) {
  const track = tracks.find(item => item.id === id);

  if (!track) return;

  if (votedIds.includes(id)) {
    showToast("You have already voted for this track.");
    return;
  }

  track.votes += 1;
  votedIds.push(id);

  saveStorage(STORAGE_KEYS.tracks, tracks);
  saveStorage(STORAGE_KEYS.votes, votedIds);

  renderAll();
  showToast("Your vote has been counted! ▲");
}

// ---------- Favorite management ----------

function toggleFavorite(id) {
  const track = tracks.find(item => item.id === id);

  if (!track) return;

  if (favorites.includes(id)) {
    favorites = favorites.filter(item => item !== id);
    showToast("Removed from favorites.");
  } else {
    favorites.push(id);
    showToast("Added to your favorites! ♥");
  }

  saveStorage(STORAGE_KEYS.favorites, favorites);
  renderAll();
}

// ---------- Mini-player demo ----------

function selectTrack(id) {
  const track = tracks.find(item => item.id === id);

  if (!track) return;

  currentTrackId = id;
  isPlaying = false;

  document.getElementById("nowPlaying").textContent = track.title;
  document.getElementById("nowArtist").textContent = track.artist;
  document.getElementById("playBtn").textContent = "▶";
  document.getElementById("playerStatus").textContent = "Demo mode";

  showToast("Track selected. Add an audio source for playback.");
}

function togglePlayback() {
  if (!currentTrackId) {
    const firstTrack = tracks[0];

    if (!firstTrack) {
      showToast("Add a track to get started.");
      return;
    }

    selectTrack(firstTrack.id);
    return;
  }

  // This is a UI demonstration, not real audio playback.
  isPlaying = !isPlaying;

  document.getElementById("playBtn").textContent =
    isPlaying ? "Ⅱ" : "▶";

  document.getElementById("playerStatus").textContent =
    isPlaying ? "Demo playing · No audio" : "Demo paused";

  showToast(isPlaying
    ? "Demo player activated. No audio is playing."
    : "Demo player paused.");
}

function moveTrack(direction) {
  if (!tracks.length) {
    showToast("Add a track to get started.");
    return;
  }

  let index = tracks.findIndex(t => t.id === currentTrackId);

  if (index < 0) index = 0;
  else index = (index + direction + tracks.length) % tracks.length;

  selectTrack(tracks[index].id);
}

// ---------- Community energy indicator ----------

function updateEnergy() {
  const totalVotes = tracks.reduce((sum, track) => sum + track.votes, 0);
  const percentage = Math.min(100, 15 + totalVotes);

  document.getElementById("energyBar").style.width = percentage + "%";

  let label = "BUILDING";

  if (percentage >= 80) label = "HIGH VOLTAGE";
  else if (percentage >= 50) label = "ON THE RISE";

  document.getElementById("energyText").textContent =
    "ENERGY LEVEL: " + label;
}

// ---------- Add a track ----------

document.getElementById("addTrackBtn").addEventListener("click", () => {
  trackDialog.showModal();
});

document.getElementById("closeDialog").addEventListener("click", () => {
  trackDialog.close();
});

trackDialog.addEventListener("click", event => {
  if (event.target === trackDialog) trackDialog.close();
});

trackForm.addEventListener("submit", event => {
  event.preventDefault();

  if (!trackForm.reportValidity()) return;

  const formData = new FormData(trackForm);
  const title = String(formData.get("title") || "").trim();
  const artist = String(formData.get("artist") || "").trim();
  const genre = String(formData.get("genre") || "Indie");

  if (!title || !artist || title.length > 70 || artist.length > 70) {
    showToast("Enter a valid song title and artist.");
    return;
  }

  const allowedGenres = [
    "Indie", "Electronic", "Chill", "Hip-Hop", "Pop", "Rock"
  ];

  if (!allowedGenres.includes(genre)) {
    showToast("Choose a valid genre.");
    return;
  }

  const newTrack = {
    id: "custom-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 8),
    title,
    artist,
    genre,
    votes: 0,
    createdAt: Date.now()
  };

  tracks.unshift(newTrack);
  saveStorage(STORAGE_KEYS.tracks, tracks);

  trackForm.reset();
  trackDialog.close();

  activeGenre = "All";
  searchTerm = "";
  searchInput.value = "";

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle("active", button.dataset.genre === "All");
  });

  renderAll();
  showToast("Track added to the Jam Arena!");
});

// ---------- Search and genre filters ----------

searchInput.addEventListener("input", event => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderDiscover();
});

sortSelect.addEventListener("change", renderDiscover);

document.getElementById("genreFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-genre]");

  if (!button) return;

  activeGenre = button.dataset.genre;

  document.querySelectorAll(".filter").forEach(filter => {
    filter.classList.toggle("active", filter === button);
  });

  renderDiscover();
});

// ---------- Shared card actions ----------

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "vote") voteForTrack(id);
  if (action === "favorite") toggleFavorite(id);
  if (action === "play") selectTrack(id);
});

// ---------- Theme toggle ----------

function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  document.getElementById("themeToggle").textContent =
    theme === "light" ? "☾" : "☼";
}

const savedTheme = readStorage(STORAGE_KEYS.theme, "dark");
applyTheme(savedTheme === "light" ? "light" : "dark");

document.getElementById("themeToggle").addEventListener("click", () => {
  const newTheme = document.body.classList.contains("light-theme")
    ? "dark"
    : "light";

  applyTheme(newTheme);
  saveStorage(STORAGE_KEYS.theme, newTheme);
});

// ---------- Mobile navigation ----------

const navLinks = document.getElementById("navLinks");

document.getElementById("menuToggle").addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");

  document.getElementById("menuToggle").setAttribute(
    "aria-expanded",
    String(isOpen)
  );
});

navLinks.addEventListener("click", event => {
  if (event.target.closest("a")) {
    navLinks.classList.remove("open");
    document.getElementById("menuToggle").setAttribute(
      "aria-expanded",
      "false"
    );
  }
});

// ---------- Player controls ----------

document.getElementById("playBtn").addEventListener("click", togglePlayback);

document.getElementById("nextBtn").addEventListener("click", () => {
  moveTrack(1);
});

document.getElementById("prevBtn").addEventListener("click", () => {
  moveTrack(-1);
});

document.getElementById("volumeControl").addEventListener("input", event => {
  // Volume control is a visual demo until real audio is connected.
  document.getElementById("playerStatus").textContent =
    "Demo volume: " + Math.round(Number(event.target.value) * 100) + "%";
});

// ---------- Render everything ----------

function renderAll() {
  renderDiscover();
  renderQueue();
  renderFavorites();
}

renderAll();
