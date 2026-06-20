const GITHUB_USERNAME = "MDeus-ai";

async function fetchGitHubData() {
  const container = document.getElementById("graph-container");
  const countLabel = document.getElementById("count-label");

  // Dynamically get the current year so you don't have to update this in 2027
  const currentYear = new Date().getFullYear();

  try {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=${currentYear}`,
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    // Total count using the dynamic year
    countLabel.innerText = `${data.total[currentYear]} contributions in ${currentYear}`;

    const contributions = data.contributions; // array of {date, count, level}

    // --- Build a week-based grid ---
    // Find the day-of-week (0=Sun) of the first contribution
    const firstDate = new Date(contributions[0].date);
    const startDayOfWeek = firstDate.getDay(); // 0=Sun, 1=Mon...

    // Group into columns (weeks), padding the first week
    const weeks = [];
    let currentWeek = new Array(startDayOfWeek).fill(null); // empty slots before first day

    contributions.forEach((day) => {
      const dow = new Date(day.date).getDay();
      if (dow === 0 && currentWeek.length > 0) {
        // Sunday starts a new week
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    // Push the last partial week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    const CELL = 13; // cell size + gap
    const TOP = 22; // space for month labels
    const svgW = weeks.length * CELL;
    const svgH = 7 * CELL + TOP;

    // --- Month labels ---
    let monthLabels = "";
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) return;
      const month = new Date(firstReal.date).getMonth();
      if (month !== lastMonth) {
        const monthName = new Date(firstReal.date).toLocaleString("default", {
          month: "short",
        });
        monthLabels += `<text x="${wi * CELL}" y="12" class="m-label">${monthName}</text>`;
        lastMonth = month;
      }
    });

    // --- Cells ---
    // Pick palette based on current theme
    const isLight = document.body.classList.contains("light-mode");
    const darkColors = ["#161b22", "#393939", "#6e6e6e", "#919191", "#ffffff"];
    const lightColors = ["#ece8e0", "#c9b99a", "#a89060", "#8b7340", "#6b5525"];
    const colors = isLight ? lightColors : darkColors;
    let cells = "";
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        if (!day) return;
        const x = wi * CELL;
        const y = di * CELL + TOP;
        const fill = colors[day.level] ?? colors[0];
        cells += `<rect class="day" width="11" height="11" x="${x}" y="${y}" 
          fill="${fill}" rx="2"
          data-tippy-content="${day.count} contribution${day.count !== 1 ? "s" : ""} on ${day.date}">
        </rect>`;
      });
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%">
        ${monthLabels}
        ${cells}
      </svg>`;

    tippy(".day", { theme: "translucent" });
  } catch (error) {
    console.error("GitHub graph error:", error);
    container.innerHTML = `<div style="color:red">Error: ${error.message}</div>`;
  }
}

fetchGitHubData();

// =======================
// BLOG OPEN/CLOSE LOGIC
// =======================

const allBlogs = document.querySelectorAll(".blog");

allBlogs.forEach((blog) => {
  const blogBox = blog.querySelector(".blog-box");

  if (blogBox) {
    blogBox.addEventListener("click", () => {
      // 1. Check if the clicked blog is already open
      const isOpen = blog.classList.contains("open");

      // 2. Close all other blogs
      allBlogs.forEach((b) => b.classList.remove("open"));

      // 3. Toggle the clicked blog
      // If it was open, it's now closed (removed above).
      // If it was closed, we open it now.
      if (!isOpen) {
        blog.classList.add("open");
      }
    });
  }
});

// =======================
// LIGHT MODE TOGGLE
// =======================

const lightModeBtn = document.querySelector(".lightmode-btn");
const lightModeIcon = lightModeBtn.querySelector("ion-icon");

// 1. Check LocalStorage on load
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  lightModeIcon.setAttribute("name", "sunny-outline");
  // Defer legend update until graph has loaded
  window.addEventListener("load", () => {
    updateLegendColors();
  });
}

if (lightModeBtn) {
  lightModeBtn.addEventListener("click", () => {
    // 1. Add transition orchestrator class for smooth cross-fade
    document.body.classList.add("theme-transitioning");

    // 2. Toggle theme class
    document.body.classList.toggle("light-mode");

    // 3. Toggle Icon AND Save Preference
    if (document.body.classList.contains("light-mode")) {
      lightModeIcon.setAttribute("name", "sunny-outline");
      localStorage.setItem("theme", "light");
    } else {
      lightModeIcon.setAttribute("name", "contrast-outline");
      localStorage.setItem("theme", "dark");
    }

    // 4. Update GitHub graph colors for the new theme
    updateGraphColors();

    // 5. Update legend square colors
    updateLegendColors();

    // 6. Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove("theme-transitioning");
    }, 550);
  });
}

// =======================
// DYNAMIC FEATURES
// =======================

// 1. Visit Counter
async function updateVisitCount() {
  const visitElement = document.querySelector(".website-visits span");
  const LOCAL_STORAGE_KEY = "mdeus_visit_count";
  const FALLBACK_START = 1840;

  try {
    // Try sending request to the real API
    // Using a simple counter API (namespace: mdeus-portfolio, key: visits_v2)
    const response = await fetch(
      "https://api.counterapi.dev/v1/mdeus-portfolio/visits_v2/up",
    );

    if (!response.ok) throw new Error("API response not ok");

    const data = await response.json();
    visitElement.textContent = data.count;

    // Sync local storage with real count just in case we need it later
    localStorage.setItem(LOCAL_STORAGE_KEY, data.count);
  } catch (error) {
    console.warn("Visit counter API failed, using local fallback:", error);

    // FALLBACK LOGIC
    // 1. Get current local count or start at fallback
    let localCount = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!localCount) {
      localCount = FALLBACK_START;
    } else {
      localCount = parseInt(localCount);
    }

    // 2. Increment
    // We only increment if this involves a reload, which it does.
    // To mimic "real" visits, we might just increment it.
    localCount++;

    // 3. Save and Display
    localStorage.setItem(LOCAL_STORAGE_KEY, localCount);
    visitElement.textContent = localCount;
  }
}

// 2. Kampala Time & Online Status
function updateTimeAndStatus() {
  const timeElement = document.querySelector(".local-time span");
  const statusText = document.querySelector(".status .text-sm"); // "Online" text
  const statusIcon = document.querySelector(".status-indicator"); // The dot icon

  const now = new Date();

  // Kampala is UTC+3 (EAT)
  const options = {
    timeZone: "Africa/Kampala",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const timeString = now.toLocaleTimeString("en-US", options);

  // Update Time
  timeElement.textContent = `${timeString}hrs`;

  // Determine "Online" based on working hours (e.g., 8:00 AM - 10:00 PM in Kampala)
  // Get hour in Kampala
  const kampalaDateStr = now.toLocaleString("en-US", {
    timeZone: "Africa/Kampala",
  });
  const kampalaDate = new Date(kampalaDateStr);
  const hour = kampalaDate.getHours();

  // Logic: Online between 8:00 and 22:00
  if (hour >= 8 && hour < 22) {
    statusText.textContent = "Online";
    statusIcon.style.color = "#08cb00"; // Green
    statusIcon.setAttribute("name", "radio-button-on");
  } else {
    statusText.textContent = "Offline";
    statusIcon.style.color = "#939290"; // Grey
    statusIcon.setAttribute("name", "radio-button-off");
  }
}

// Initialize
updateVisitCount();
updateTimeAndStatus();
setInterval(updateTimeAndStatus, 60000); // Update every minute

// =======================
// PROFILE IMAGE SHUFFLE
// =======================

(function () {
  const profileImages = [
    "assets/me.jpg",
    "assets/me-pixel.png",
    "assets/me-anime.png",
    "assets/me-cyberpunk.png",
  ];

  let currentIndex = 0;
  let isAnimating = false;
  const heroImg = document.querySelector(".hero-img");
  const shuffleBtn = document.querySelector(".change-img-btn");

  if (!heroImg || !shuffleBtn) return;

  // Preload all images and keep references so the browser doesn't GC them
  const preloadedImages = profileImages.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  // --- Reusable AudioContext for retro sound ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playRetroSound() {
    try {
      const ctx = getAudioContext();

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") ctx.resume();

      // Main "shuffle" blip — short square wave sweep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Secondary "click" blip — higher pitch confirmation
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.16);
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Web Audio not supported — silently skip
    }
  }

  // --- Glitch Transition (debounced) ---
  function applyGlitchTransition(imgEl, newSrc) {
    if (isAnimating) return;
    isAnimating = true;

    // Add glitch class
    imgEl.classList.add("img-glitch");

    // Swap the image halfway through the glitch
    setTimeout(() => {
      imgEl.src = newSrc;
    }, 150);

    // Remove glitch class after animation completes
    setTimeout(() => {
      imgEl.classList.remove("img-glitch");
      isAnimating = false;
    }, 400);
  }

  // --- Click handler ---
  shuffleBtn.addEventListener("click", () => {
    if (isAnimating) return;
    currentIndex = (currentIndex + 1) % profileImages.length;
    playRetroSound();
    applyGlitchTransition(heroImg, profileImages[currentIndex]);
  });
})();

// =======================
// RESUME TIMELINE EXPAND
// =======================
const resumeExpandBtn = document.getElementById("resume-expand-btn");
const resumeTimeline = document.getElementById("resume-timeline");

if (resumeExpandBtn && resumeTimeline) {
  resumeExpandBtn.addEventListener("click", () => {
    resumeTimeline.classList.toggle("open");
    resumeExpandBtn.classList.toggle("is-open");

    const textSpan = resumeExpandBtn.querySelector(".resume-expand-text");
    const iconSpan = resumeExpandBtn.querySelector(".resume-expand-icon");

    if (resumeTimeline.classList.contains("open")) {
      textSpan.textContent = "Show less";
      iconSpan.textContent = "arrow_drop_up";
    } else {
      textSpan.textContent = "View full resume";
      iconSpan.textContent = "arrow_drop_down";
    }
  });
}

// =======================
// THEME-AWARE GRAPH COLORS
// =======================

const DARK_GRAPH_COLORS = [
  "#161b22",
  "#393939",
  "#6e6e6e",
  "#919191",
  "#ffffff",
];
const LIGHT_GRAPH_COLORS = [
  "#ece8e0",
  "#c9b99a",
  "#a89060",
  "#8b7340",
  "#6b5525",
];

function updateGraphColors() {
  const isLight = document.body.classList.contains("light-mode");
  const oldColors = isLight ? DARK_GRAPH_COLORS : LIGHT_GRAPH_COLORS;
  const newColors = isLight ? LIGHT_GRAPH_COLORS : DARK_GRAPH_COLORS;

  document.querySelectorAll(".day").forEach((rect) => {
    const currentFill = rect.getAttribute("fill");
    const idx = oldColors.indexOf(currentFill);
    if (idx !== -1) {
      rect.setAttribute("fill", newColors[idx]);
    }
  });
}

function updateLegendColors() {
  const isLight = document.body.classList.contains("light-mode");
  const colors = isLight ? LIGHT_GRAPH_COLORS : DARK_GRAPH_COLORS;
  const squares = document.querySelectorAll(".l-sq");
  squares.forEach((sq, i) => {
    if (colors[i]) {
      sq.style.background = colors[i];
    }
  });
}

// =======================
// SPOTIFY LANYARD INTEGRATION
// =======================

// PLEASE REPLACE THIS PLACEHOLDER WITH YOUR ACTUAL DISCORD USER ID
const DISCORD_ID = "1362785972672139454";

function initLanyard() {
  const ws = new WebSocket("wss://api.lanyard.rest/socket");

  const spotifyWidget = document.getElementById("spotify-now-playing");
  const songEl = document.getElementById("spotify-song");
  const artistEl = document.getElementById("spotify-artist");
  const artEl = document.getElementById("spotify-album-art");
  
  const timeCurrentEl = document.getElementById("spotify-time-current");
  const timeTotalEl = document.getElementById("spotify-time-total");
  const progressFillEl = document.getElementById("spotify-progress-fill");

  if (!spotifyWidget) return;

  let spotifyInterval = null;

  function updateProgress(start, end) {
    if (!start || !end) return;
    const now = Date.now();
    const total = end - start;
    const current = now - start;
    const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(Math.max(ms, 0) / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (progressFillEl) progressFillEl.style.width = `${percentage}%`;
    if (timeCurrentEl) timeCurrentEl.textContent = formatTime(Math.min(current, total));
    if (timeTotalEl) timeTotalEl.textContent = formatTime(total);
  }

  ws.onopen = () => {
    // Send initialization message
    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          subscribe_to_id: DISCORD_ID,
        },
      }),
    );
  };

  ws.onmessage = (event) => {
    const { t, d, op } = JSON.parse(event.data);

    // Heartbeat logic
    if (op === 1) {
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 3 }));
        }
      }, d.heartbeat_interval);
    }

    if (t === "INIT_STATE" || t === "PRESENCE_UPDATE") {
      let spotify = d.spotify;

      // --- DEMO MOCK DATA ---
      // This will show a fake song so you can see the design before you put in your real ID.
      if (DISCORD_ID === "123456789012345678") {
        const now = Date.now();
        spotify = {
          song: "Blinding Lights",
          artist: "The Weeknd",
          album_art_url: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2cb1239ce750fa1",
          track_id: "0VjIjW4GlUZAMYd2vXMi3b",
          timestamps: {
            start: now - 86000, // 1m 26s in
            end: now + 86000 // Total 2m 52s
          }
        };
      }

      if (spotify) {
        // User is listening to Spotify
        songEl.textContent = spotify.song;
        artistEl.textContent = spotify.artist;
        artEl.src = spotify.album_art_url;

        spotifyWidget.style.display = "flex";

        // Progress bar logic
        if (spotifyInterval) clearInterval(spotifyInterval);
        if (spotify.timestamps && spotify.timestamps.start && spotify.timestamps.end) {
          updateProgress(spotify.timestamps.start, spotify.timestamps.end);
          spotifyInterval = setInterval(() => {
            updateProgress(spotify.timestamps.start, spotify.timestamps.end);
          }, 1000);
        }

      } else {
        // Not listening
        spotifyWidget.style.display = "none";
        if (spotifyInterval) clearInterval(spotifyInterval);
      }
    }
  };

  ws.onclose = () => {
    console.log("Lanyard WebSocket closed, reconnecting in 5s...");
    setTimeout(initLanyard, 5000);
  };
}

initLanyard();

// =======================
// PLAYLIST EXPAND
// =======================
const playlistExpandBtn = document.getElementById("playlist-expand-btn");
const playlistGrid = document.getElementById("playlist-grid");

if (playlistExpandBtn && playlistGrid) {
  playlistExpandBtn.addEventListener("click", () => {
    playlistGrid.classList.toggle("open");
    playlistExpandBtn.classList.toggle("is-open");

    const textSpan = playlistExpandBtn.querySelector(".playlist-expand-text");
    const iconSpan = playlistExpandBtn.querySelector(".playlist-expand-icon");

    if (playlistGrid.classList.contains("open")) {
      if (textSpan) textSpan.textContent = "View less playlists";
      if (iconSpan) iconSpan.textContent = "arrow_drop_up";
    } else {
      if (textSpan) textSpan.textContent = "View more playlists";
      if (iconSpan) iconSpan.textContent = "arrow_drop_down";
    }
  });
}

// =======================
// ACTIVITIES EXPAND
// =======================
const activitiesExpandBtn = document.getElementById("activities-expand-btn");
const activitiesHiddenWrapper = document.getElementById("activities-hidden-wrapper");

if (activitiesExpandBtn && activitiesHiddenWrapper) {
  activitiesExpandBtn.parentElement.style.display = "flex"; // Ensure it's visible
  
  activitiesExpandBtn.addEventListener("click", () => {
    activitiesHiddenWrapper.classList.toggle("open");
    activitiesExpandBtn.classList.toggle("is-open");

    const textSpan = activitiesExpandBtn.querySelector(".activities-expand-text");
    const iconSpan = activitiesExpandBtn.querySelector(".activities-expand-icon");

    if (activitiesHiddenWrapper.classList.contains("open")) {
      if (textSpan) textSpan.textContent = "View less activities";
      if (iconSpan) iconSpan.textContent = "arrow_drop_up";
    } else {
      if (textSpan) textSpan.textContent = "View more activities";
      if (iconSpan) iconSpan.textContent = "arrow_drop_down";
      
      // Close playlists if they are open when activities are minimized
      if (playlistGrid && playlistGrid.classList.contains("open")) {
        playlistGrid.classList.remove("open");
        if (playlistExpandBtn) {
          playlistExpandBtn.classList.remove("is-open");
          const pText = playlistExpandBtn.querySelector(".playlist-expand-text");
          const pIcon = playlistExpandBtn.querySelector(".playlist-expand-icon");
          if (pText) pText.textContent = "View more playlists";
          if (pIcon) pIcon.textContent = "arrow_drop_down";
        }
      }
    }
  });
}
