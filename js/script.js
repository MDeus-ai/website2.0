const GITHUB_USERNAME = "MDeus-ai"; // <-- CHANGE THIS

async function fetchGitHubData() {
  const container = document.getElementById("graph-container");
  const countLabel = document.getElementById("count-label");

  try {
    // Using a highly stable alternative API
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`,
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    // 1. Set the count text
    countLabel.innerText = `${data.total.lastYear} activities in 2025`;

    // 2. Start building SVG
    let svg = `<svg viewBox="0 0 780 120" width="100%">`;

    // Month Labels (Simplified positioning)
    const months = [
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
    ];
    months.forEach((m, i) => {
      svg += `<text x="${i * 64}" y="12" class="m-label">${m}</text>`;
    });

    // 3. Draw Squares
    data.contributions.forEach((day, index) => {
      // Logic to calculate grid position
      const weekIndex = Math.floor(index / 7);
      const dayIndex = index % 7;
      const x = weekIndex * 14;
      const y = dayIndex * 13 + 25;

      // Map GitHub levels to our Grayscale
      const colors = ["#161b22", "#393939", "#6e6e6e", "#919191", "#ffffff"];
      const fillColor = colors[day.level] || colors[0];

      svg += `
                <rect class="day" width="11" height="11" 
                      x="${x}" y="${y}" fill="${fillColor}"
                      data-tippy-content="${day.count} contributions on ${day.date}">
                </rect>`;
    });

    svg += `</svg>`;
    container.innerHTML = svg;

    // 4. Init tooltips
    tippy(".day", { theme: "translucent" });
  } catch (error) {
    console.error("DETAILED ERROR:", error);
    container.innerHTML = `<div style="color:red">Error: ${error.message}. Check console for details.</div>`;
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
