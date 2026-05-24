const CATEGORIES = {
  hangout: {
    id: "hangout",
    label: "Hangout",
    emoji: "🎉",
    tagline: "General hangouts near you",
    heroTitle: "Meet up & try something new",
    heroText: "Game nights, coffee runs, hikes — casual plans with open spots for anyone friendly.",
    accent: "#e6a800",
    accentDark: "#b8860b",
    accentSoft: "rgba(230, 168, 0, 0.2)",
    accentGlow: "rgba(230, 168, 0, 0.35)",
    bg: "#fffbeb",
    bgElevated: "#fff8dc",
    bgCard: "#ffffff",
    border: "rgba(184, 134, 11, 0.22)",
    text: "#3d3420",
    textMuted: "#7a6b4a",
    gradient: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(255, 213, 79, 0.45), transparent)",
  },
  dating: {
    id: "dating",
    label: "Dating",
    emoji: "💫",
    tagline: "Low-pressure dates & meet-cutes",
    heroTitle: "Go on a date, not a group chat",
    heroText: "Coffee dates, walks, museums — post what you're up for and how many spots (usually 2).",
    accent: "#e53935",
    accentDark: "#c62828",
    accentSoft: "rgba(229, 57, 53, 0.15)",
    accentGlow: "rgba(229, 57, 53, 0.3)",
    bg: "#fff5f5",
    bgElevated: "#ffebee",
    bgCard: "#ffffff",
    border: "rgba(198, 40, 40, 0.18)",
    text: "#3d2020",
    textMuted: "#8a5a5a",
    gradient: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(239, 83, 80, 0.35), transparent)",
  },
  studying: {
    id: "studying",
    label: "Study",
    emoji: "📚",
    tagline: "Study sessions & accountability",
    heroTitle: "Study together, stay on track",
    heroText: "Library sessions, pomodoro groups, exam prep — find people focused on the same grind.",
    accent: "#1e88e5",
    accentDark: "#1565c0",
    accentSoft: "rgba(30, 136, 229, 0.15)",
    accentGlow: "rgba(30, 136, 229, 0.3)",
    bg: "#f3f9ff",
    bgElevated: "#e3f2fd",
    bgCard: "#ffffff",
    border: "rgba(21, 101, 192, 0.18)",
    text: "#1a2a3d",
    textMuted: "#5a6d85",
    gradient: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(100, 181, 246, 0.4), transparent)",
  },
};

const CATEGORY_IDS = Object.keys(CATEGORIES);

function getCategory(id) {
  return CATEGORIES[id] || CATEGORIES.hangout;
}

function allActivities() {
  const set = new Set();
  for (const cat of Object.values(CATEGORIES)) {
    cat.activities.filter((a) => a !== "Other").forEach((a) => set.add(a));
  }
  return [...set].sort();
}

// Attach activities arrays (kept separate for readability above - actually they're in the object)
CATEGORIES.hangout.activities = [
  "Board game night", "Coffee hangout", "Group hike", "Movie night", "Picnic in the park",
  "Bar / drinks", "Pickup sports", "Cooking together", "Live music", "Explore the city", "Other",
];
CATEGORIES.dating.activities = [
  "Coffee date", "Dinner date", "Park walk", "Museum visit", "Mini golf", "Wine / cocktails",
  "Bookstore browse", "Sunset drinks", "Cooking date", "Art gallery", "Other",
];
CATEGORIES.studying.activities = [
  "Library session", "Study group", "Exam prep", "Pomodoro coworking", "Language exchange",
  "Coding study", "Group project", "Café study", "Tutoring meetup", "Flashcard drill", "Other",
];

window.GatherCategories = { CATEGORIES, CATEGORY_IDS, getCategory, allActivities };
