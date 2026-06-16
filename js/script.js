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
    const colors = ["#161b22", "#393939", "#6e6e6e", "#919191", "#ffffff"];
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
}

if (lightModeBtn) {
  lightModeBtn.addEventListener("click", () => {
    // Toggle class
    document.body.classList.toggle("light-mode");

    // Toggle Icon AND Save Preference
    if (document.body.classList.contains("light-mode")) {
      lightModeIcon.setAttribute("name", "sunny-outline");
      localStorage.setItem("theme", "light");
    } else {
      lightModeIcon.setAttribute("name", "contrast-outline");
      localStorage.setItem("theme", "dark");
    }
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
  const heroImg = document.querySelector(".hero-img");
  const shuffleBtn = document.querySelector(".change-img-btn");

  if (!heroImg || !shuffleBtn) return;

  // Preload all images so transitions are instant
  profileImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  // --- Retro Sound Effect via Web Audio API ---
  function playRetroSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

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

      // Clean up context after sounds finish
      setTimeout(() => ctx.close(), 500);
    } catch (e) {
      // Web Audio not supported — silently skip
    }
  }

  // --- Glitch Transition ---
  function applyGlitchTransition(imgEl, newSrc) {
    // Add glitch class
    imgEl.classList.add("img-glitch");

    // Swap the image halfway through the glitch
    setTimeout(() => {
      imgEl.src = newSrc;
    }, 150);

    // Remove glitch class after animation completes
    setTimeout(() => {
      imgEl.classList.remove("img-glitch");
    }, 400);
  }

  // --- Click handler ---
  shuffleBtn.addEventListener("click", () => {
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
