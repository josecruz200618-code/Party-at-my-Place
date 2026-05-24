(function () {
  "use strict";

  const STORAGE_KEY = "party-at-my-place-invites";
  const HANGOUT_JOINS_KEY = "party-hangout-joins";
  const STUDY_PROFILE_KEY = "party-study-profile";
  const DATING_PROFILE_KEY = "party-dating-profile";
  const USER_ID_KEY = "party-user-id";
  const USER_PROFILE_KEY = "party-user-profile";
  const MY_CREATED_KEY = "party-my-created";
  const MY_JOINED_KEY = "party-my-joined";
  const SEED_KEY = "party-seeded-v4";
  const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

  const LOOKING_FOR_OPTIONS = [
    "Casual dating",
    "Serious relationship",
    "Friendship first",
    "See where it goes",
    "Not sure yet",
  ];

  const SEXUALITY_OPTIONS = [
    "Straight",
    "Gay",
    "Lesbian",
    "Bisexual",
    "Pansexual",
    "Queer",
    "Asexual",
    "Prefer not to say",
  ];

  const GENDER_OPTIONS = [
    "Man",
    "Woman",
    "Non-binary",
    "Trans man",
    "Trans woman",
    "Genderqueer",
    "Prefer not to say",
  ];

  const HANGOUT_ADULT_AGE = 18;
  const DATING_CAPACITY = 2;

  let pendingStudyJoinId = null;
  let pendingDatingJoinId = null;
  let pendingJoinInviteId = null;
  let myListFilter = "created";

  const CATEGORIES = {
    hangout: {
      id: "hangout",
      label: "Hangout",
      emoji: "🎉",
      tagline: "Casual hangouts near you",
      heroTitle: "Meet up & try something new",
      heroText: "Game nights, coffee runs, hikes — open invites for anyone friendly.",
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
      activities: [
        "Board game night", "Coffee hangout", "Group hike", "Movie night", "Picnic in the park",
        "Bar / drinks", "Pickup sports", "Cooking together", "Live music", "Explore the city", "Other",
      ],
    },
    dating: {
      id: "dating",
      label: "Dating",
      emoji: "💫",
      tagline: "Dates & meet-cutes",
      heroTitle: "One date. Two people.",
      heroText: "Post a date with one open spot — just you and one other person. Edit your preferences anytime.",
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
      activities: [
        "Coffee date", "Dinner date", "Park walk", "Museum visit", "Mini golf", "Wine / cocktails",
        "Bookstore browse", "Sunset drinks", "Cooking date", "Art gallery", "Other",
      ],
    },
    mine: {
      id: "mine",
      label: "Mine",
      emoji: "👤",
      tagline: "Invites you created or joined",
      heroTitle: "Your plans",
      heroText: "See everything you've posted and every invite you've accepted — with live status.",
      accent: "#7b1fa2",
      accentDark: "#6a1b9a",
      accentSoft: "rgba(123, 31, 162, 0.15)",
      accentGlow: "rgba(123, 31, 162, 0.3)",
      bg: "#faf5fc",
      bgElevated: "#f3e5f5",
      bgCard: "#ffffff",
      border: "rgba(106, 27, 154, 0.18)",
      text: "#3d2048",
      textMuted: "#7a5a85",
      gradient: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(186, 104, 200, 0.35), transparent)",
      activities: [],
    },
    studying: {
      id: "studying",
      label: "Study",
      emoji: "📚",
      tagline: "Study sessions nearby",
      heroTitle: "Study together, stay on track",
      heroText: "Library sessions, pomodoro groups, exam prep — find your study crew.",
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
      activities: [
        "Library session", "Study group", "Exam prep", "Pomodoro coworking", "Language exchange",
        "Coding study", "Group project", "Café study", "Tutoring meetup", "Flashcard drill", "Other",
      ],
    },
  };

  const FEED_CATEGORIES = ["hangout", "dating", "studying"];
  const CATEGORY_IDS = ["hangout", "dating", "studying", "mine"];

  let invites = [];
  let activeCategory = "hangout";
  let activeView = "feed";
  let activeListFilter = "all";
  let searchQuery = "";
  let activityFilter = null;
  let mapCategoryFilter = "all";
  let mapActivityFilter = null;
  let mapInstance = null;
  let markerLayer = null;
  let leafletLoading = null;

  const els = {};

  function newId() {
    try {
      if (window.crypto && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (_) { /* file:// may block UUID */ }
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
  }

  function getCategory(id) {
    return CATEGORIES[id] || CATEGORIES.hangout;
  }

  function allActivities() {
    const set = new Set();
    for (const id of FEED_CATEGORIES) {
      CATEGORIES[id].activities.filter((a) => a !== "Other").forEach((a) => set.add(a));
    }
    return [...set].sort();
  }

  function getUserId() {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  }

  function loadUserProfile() {
    try {
      const raw = localStorage.getItem(USER_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveUserProfile(name, age) {
    localStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({ name: name.trim(), age: Number(age) })
    );
  }

  function loadMyCreated() {
    try {
      const raw = localStorage.getItem(MY_CREATED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addMyCreated(inviteId) {
    const list = loadMyCreated();
    if (list.indexOf(inviteId) === -1) {
      list.push(inviteId);
      localStorage.setItem(MY_CREATED_KEY, JSON.stringify(list));
    }
  }

  function loadMyJoined() {
    try {
      const raw = localStorage.getItem(MY_JOINED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addMyJoined(inviteId) {
    const list = loadMyJoined();
    if (!list.some(function (j) { return j.inviteId === inviteId; })) {
      list.push({ inviteId: inviteId, joinedAt: new Date().toISOString() });
      localStorage.setItem(MY_JOINED_KEY, JSON.stringify(list));
    }
  }

  function isMyCreated(invite) {
    return invite.creatorId === getUserId() || loadMyCreated().indexOf(invite.id) !== -1;
  }

  function isUserOnInvite(invite) {
    const uid = getUserId();
    if (!invite.attendees) return false;
    return invite.attendees.some(function (a) {
      return a.userId === uid;
    });
  }

  function buildAttendeesFromLegacy(inv) {
    const list = [];
    const hostName = inv.host || "Host";
    let hostAge = inv.hostAge != null ? inv.hostAge : inv.age != null ? inv.age : null;
    list.push({
      id: newId(),
      name: hostName,
      age: hostAge,
      isHost: true,
      userId: inv.creatorId || null,
    });
    const count = Math.max(1, inv.going || 1);
    const sampleNames = ["Jamie", "Riley", "Casey", "Morgan", "Taylor", "Jordan", "Sam", "Alex"];
    const sampleAges = [22, 24, 21, 27, 23, 26, 25, 28];
    for (let i = 1; i < count; i++) {
      list.push({
        id: newId(),
        name: sampleNames[(i - 1) % sampleNames.length],
        age: sampleAges[(i - 1) % sampleAges.length],
        isHost: false,
      });
    }
    return list;
  }

  function normalizeInvite(inv) {
    const category = FEED_CATEGORIES.includes(inv.category) ? inv.category : "hangout";
    const normalized = { ...inv, category };
    if (category === "dating") {
      normalized.capacity = DATING_CAPACITY;
    }
    if (!normalized.attendees || !Array.isArray(normalized.attendees)) {
      normalized.attendees = buildAttendeesFromLegacy(normalized);
    }
    if (category === "dating" && normalized.attendees.length > DATING_CAPACITY) {
      normalized.attendees = normalized.attendees.slice(0, DATING_CAPACITY);
    }
    normalized.going = normalized.attendees.length;
    return normalized;
  }

  function syncGoingCount(invite) {
    invite.going = invite.attendees ? invite.attendees.length : 0;
  }

  function getInviteEventStatus(invite) {
    if (isExpired(invite)) return { label: "Expired", className: "badge--expired" };
    if (invite.going >= invite.capacity) {
      return invite.category === "dating"
        ? { label: "Date booked", className: "badge--full" }
        : { label: "Full", className: "badge--full" };
    }
    if (invite.category === "dating") {
      return { label: "1 spot open", className: "badge--open" };
    }
    return { label: "Open", className: "badge--open" };
  }

  function getMyInviteStatus(invite, mode) {
    const event = getInviteEventStatus(invite);
    if (mode === "created") {
      return { label: "Created · " + event.label, className: "badge--mine-created" };
    }
    if (isUserOnInvite(invite)) {
      return { label: "Accepted · " + event.label, className: "badge--status-accepted" };
    }
    return { label: "Joined · " + event.label, className: "badge--status-accepted" };
  }

  function renderGoingList(invite) {
    const title =
      invite.category === "dating"
        ? invite.going >= 2
          ? "The two of you"
          : "Who's on this date"
        : "Who's going (" + invite.attendees.length + ")";
    if (!invite.attendees || !invite.attendees.length) {
      return (
        '<div class="going-list"><p class="going-list__title">' +
        title +
        '</p><p class="going-list__meta">No one listed yet.</p></div>'
      );
    }
    const items = invite.attendees
      .map(function (a) {
        const ageStr = a.age != null && a.age !== "" ? "Age " + a.age : "Age —";
        const hostTag = a.isHost ? '<span class="going-list__host">Host</span>' : "";
        const youTag = a.userId === getUserId() ? " (you)" : "";
        return (
          '<li class="going-list__item"><span class="going-list__name">' +
          escapeHtml(a.name) +
          youTag +
          '</span><span class="going-list__meta">' +
          ageStr +
          " " +
          hostTag +
          "</span></li>"
        );
      })
      .join("");
    return (
      '<div class="going-list"><p class="going-list__title">' +
      title +
      '</p><ul class="going-list__items">' +
      items +
      "</ul></div>"
    );
  }

  function cacheDom() {
    els.app = document.getElementById("app");
    els.hero = document.getElementById("category-hero");
    els.activityPicker = document.getElementById("activity-picker");
    els.list = document.getElementById("invites-list");
    els.empty = document.getElementById("empty-state");
    els.stats = document.getElementById("stats");
    els.search = document.getElementById("search");
    els.modal = document.getElementById("invite-modal");
    els.form = document.getElementById("invite-form");
    els.formError = document.getElementById("form-error");
    els.formCategory = document.getElementById("form-category");
    els.formLat = document.getElementById("form-lat");
    els.formLng = document.getElementById("form-lng");
    els.activityPreset = document.getElementById("activity-preset");
    els.customActivityWrap = document.getElementById("custom-activity-wrap");
    els.activityCustom = document.getElementById("activity-custom");
    els.headerTagline = document.getElementById("header-tagline");
    els.headerLogo = document.getElementById("header-logo");
    els.screenFeed = document.getElementById("screen-feed");
    els.screenMap = document.getElementById("screen-map");
    els.mapEl = document.getElementById("map");
    els.mapCategoryFilter = document.getElementById("map-category-filter");
    els.mapActivityFilters = document.getElementById("map-activity-filters");
    els.mapHint = document.getElementById("map-hint");
    els.btnSubmit = document.getElementById("btn-submit");
    els.bootError = document.getElementById("boot-error");
    els.studyFieldsWrap = document.getElementById("study-fields-wrap");
    els.formSchool = document.getElementById("form-school");
    els.formClassCode = document.getElementById("form-class-code");
    els.studyProfileModal = document.getElementById("study-profile-modal");
    els.studyProfileForm = document.getElementById("study-profile-form");
    els.profileSchool = document.getElementById("profile-school");
    els.profileClassCode = document.getElementById("profile-class-code");
    els.studyProfileError = document.getElementById("study-profile-error");
    els.datingFieldsWrap = document.getElementById("dating-fields-wrap");
    els.formAge = document.getElementById("form-age");
    els.formLookingFor = document.getElementById("form-looking-for");
    els.formGender = document.getElementById("form-gender");
    els.formSexuality = document.getElementById("form-sexuality");
    els.datingProfileModal = document.getElementById("dating-profile-modal");
    els.datingProfileForm = document.getElementById("dating-profile-form");
    els.profileAge = document.getElementById("profile-age");
    els.profileLookingFor = document.getElementById("profile-looking-for");
    els.profileGender = document.getElementById("profile-gender");
    els.profileSexuality = document.getElementById("profile-sexuality");
    els.datingProfileError = document.getElementById("dating-profile-error");
    els.mapError = document.getElementById("map-error");
    els.myFilters = document.getElementById("my-filters");
    els.feedToolbar = document.getElementById("feed-toolbar");
    els.formHostName = document.getElementById("form-host-name");
    els.formHostAge = document.getElementById("form-host-age");
    els.joinModal = document.getElementById("join-modal");
    els.joinForm = document.getElementById("join-form");
    els.joinName = document.getElementById("join-name");
    els.joinAge = document.getElementById("join-age");
    els.joinFormError = document.getElementById("join-form-error");
    els.joinModalIntro = document.getElementById("join-modal-intro");
    els.datingToolbar = document.getElementById("dating-toolbar");
    els.datingPrefsSummary = document.getElementById("dating-prefs-summary");
    els.datingHostSummary = document.getElementById("dating-host-summary");
    els.datingHostSummaryText = document.getElementById("dating-host-summary-text");
    els.capacityWrap = document.getElementById("capacity-field-wrap");
    els.formCapacity = document.getElementById("form-capacity");
    els.modalTitle = document.getElementById("modal-title");
    els.btnNewInvite = document.getElementById("btn-new-invite");
  }

  function formatDatingProfileSummary(profile) {
    if (!profile) return "Set your preferences to post or join dates.";
    return (
      escapeHtml(profile.gender) +
      " · Age " +
      profile.age +
      " · " +
      escapeHtml(profile.lookingFor) +
      " · " +
      escapeHtml(profile.sexuality)
    );
  }

  function renderDatingToolbar() {
    if (!els.datingToolbar) return;
    const isDating = activeCategory === "dating" && activeView === "feed";
    els.datingToolbar.hidden = !isDating;
    if (!isDating) return;
    const profile = loadDatingProfile();
    if (els.datingPrefsSummary) {
      els.datingPrefsSummary.innerHTML = profile
        ? "<strong>Your preferences:</strong> " + formatDatingProfileSummary(profile)
        : "Set your dating preferences before you post or join a date.";
    }
  }

  function updateHostButtonLabel() {
    if (!els.btnNewInvite) return;
    if (activeCategory === "dating") {
      els.btnNewInvite.innerHTML = '<span class="btn__icon">+</span> Post a date';
    } else {
      els.btnNewInvite.innerHTML = '<span class="btn__icon">+</span> Host';
    }
  }

  function openJoinModal(inviteId) {
    pendingJoinInviteId = inviteId;
    const profile = loadUserProfile();
    if (profile) {
      els.joinName.value = profile.name;
      els.joinAge.value = profile.age;
    } else {
      els.joinForm.reset();
    }
    const invite = invites.find(function (i) { return i.id === inviteId; });
    if (invite && els.joinModalIntro) {
      let intro;
      if (invite.category === "dating") {
        intro =
          'Join this date for "' +
          invite.activity +
          '" — one spot for one other person. Your name and age will show on the card.';
      } else {
        intro =
          'Join "' + invite.activity + '" — your name and age will be visible to everyone going.';
        if (invite.category === "hangout") {
          intro +=
            " Hangouts with people 18+ are only for guests 18 and older.";
        }
      }
      els.joinModalIntro.textContent = intro;
    }
    els.joinFormError.hidden = true;
    if (typeof els.joinModal.showModal === "function") {
      els.joinModal.showModal();
    } else {
      els.joinModal.setAttribute("open", "");
    }
  }

  function closeJoinModal() {
    pendingJoinInviteId = null;
    if (typeof els.joinModal.close === "function") {
      els.joinModal.close();
    } else {
      els.joinModal.removeAttribute("open");
    }
    els.joinFormError.hidden = true;
  }

  function onJoinFormSubmit(e) {
    e.preventDefault();
    const name = els.joinName.value.trim();
    const age = Number(els.joinAge.value);
    if (!name || !age || age < 13) {
      els.joinFormError.textContent = "Enter your name and age (13+).";
      els.joinFormError.hidden = false;
      return;
    }
    const id = pendingJoinInviteId;
    const invite = id ? invites.find(function (i) { return i.id === id; }) : null;
    if (invite) {
      const blockReason = hangoutAgeBlockReason(invite, age);
      if (blockReason) {
        els.joinFormError.textContent = blockReason;
        els.joinFormError.hidden = false;
        return;
      }
    }
    saveUserProfile(name, age);
    closeJoinModal();
    if (id) joinInvite(id, true, { name: name, age: age });
  }

  function fillSelectOptions(selectEl, options) {
    if (!selectEl) return;
    selectEl.innerHTML = options
      .map(function (o) {
        return '<option value="' + escapeAttr(o) + '">' + escapeHtml(o) + "</option>";
      })
      .join("");
  }

  function initDatingSelects() {
    fillSelectOptions(els.formLookingFor, LOOKING_FOR_OPTIONS);
    fillSelectOptions(els.formGender, GENDER_OPTIONS);
    fillSelectOptions(els.formSexuality, SEXUALITY_OPTIONS);
    fillSelectOptions(els.profileLookingFor, LOOKING_FOR_OPTIONS);
    fillSelectOptions(els.profileGender, GENDER_OPTIONS);
    fillSelectOptions(els.profileSexuality, SEXUALITY_OPTIONS);
  }

  function isAdult(age) {
    return age != null && !isNaN(age) && age >= HANGOUT_ADULT_AGE;
  }

  function isMinor(age) {
    return age != null && !isNaN(age) && age < HANGOUT_ADULT_AGE;
  }

  function hangoutHasAdult(invite) {
    if (!invite.attendees || !invite.attendees.length) {
      return isAdult(invite.hostAge);
    }
    return invite.attendees.some(function (a) {
      return isAdult(a.age);
    });
  }

  function hangoutAgeBlockReason(invite, joinerAge) {
    if (invite.category !== "hangout") return null;
    if (joinerAge == null || isNaN(joinerAge)) return null;
    if (isMinor(joinerAge) && hangoutHasAdult(invite)) {
      return "You can't join this hangout — it includes people 18+, and guests under 18 aren't allowed.";
    }
    return null;
  }

  function loadHangoutJoins() {
    try {
      const raw = localStorage.getItem(HANGOUT_JOINS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveHangoutJoins(map) {
    localStorage.setItem(HANGOUT_JOINS_KEY, JSON.stringify(map));
  }

  function hasJoinedHangout(inviteId) {
    const joins = loadHangoutJoins();
    return !!joins[inviteId];
  }

  function markJoinedHangout(inviteId) {
    const joins = loadHangoutJoins();
    joins[inviteId] = true;
    saveHangoutJoins(joins);
  }

  function loadStudyProfile() {
    try {
      const raw = localStorage.getItem(STUDY_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveStudyProfile(school, classCode) {
    localStorage.setItem(
      STUDY_PROFILE_KEY,
      JSON.stringify({ school: school.trim(), classCode: classCode.trim() })
    );
  }

  function isExpired(invite) {
    if (!invite.when) return false;
    const end = new Date(invite.when);
    if (isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
  }

  function loadDatingProfile() {
    try {
      const raw = localStorage.getItem(DATING_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveDatingProfile(age, lookingFor, sexuality, gender) {
    localStorage.setItem(
      DATING_PROFILE_KEY,
      JSON.stringify({
        age: Number(age),
        lookingFor: lookingFor.trim(),
        sexuality: sexuality.trim(),
        gender: gender.trim(),
      })
    );
  }

  function toggleCategoryHostFields(category) {
    const isStudy = category === "studying";
    const isDating = category === "dating";
    if (els.studyFieldsWrap) els.studyFieldsWrap.hidden = !isStudy;
    if (els.formSchool) els.formSchool.required = isStudy;
    if (els.formClassCode) els.formClassCode.required = isStudy;
    if (els.capacityWrap) els.capacityWrap.hidden = isDating;
    if (els.formCapacity) els.formCapacity.required = !isDating;
    if (els.datingHostSummary) els.datingHostSummary.hidden = !isDating;
    if (isDating && els.datingHostSummaryText) {
      const profile = loadDatingProfile();
      els.datingHostSummaryText.textContent = profile
        ? formatDatingProfileSummary(profile).replace(/<[^>]+>/g, "")
        : "Set preferences first (button below on Dating tab, or here).";
    }
  }

  function openDatingProfileModal(forJoinId) {
    pendingDatingJoinId = forJoinId || null;
    const profile = loadDatingProfile();
    if (profile) {
      els.profileAge.value = profile.age;
      els.profileGender.value = profile.gender || GENDER_OPTIONS[0];
      els.profileLookingFor.value = profile.lookingFor;
      els.profileSexuality.value = profile.sexuality;
    } else {
      els.datingProfileForm.reset();
    }
    els.datingProfileError.hidden = true;
    if (typeof els.datingProfileModal.showModal === "function") {
      els.datingProfileModal.showModal();
    } else {
      els.datingProfileModal.setAttribute("open", "");
    }
  }

  function closeDatingProfileModal() {
    pendingDatingJoinId = null;
    if (typeof els.datingProfileModal.close === "function") {
      els.datingProfileModal.close();
    } else {
      els.datingProfileModal.removeAttribute("open");
    }
    els.datingProfileError.hidden = true;
  }

  function onDatingProfileSubmit(e) {
    e.preventDefault();
    const age = Number(els.profileAge.value);
    const lookingFor = els.profileLookingFor.value;
    const gender = els.profileGender.value;
    const sexuality = els.profileSexuality.value;
    if (!age || age < 18 || !gender || !lookingFor || !sexuality) {
      els.datingProfileError.textContent =
        "Age (18+), gender, relationship type, and sexuality are required.";
      els.datingProfileError.hidden = false;
      return;
    }
    saveDatingProfile(age, lookingFor, sexuality, gender);
    const joinId = pendingDatingJoinId;
    closeDatingProfileModal();
    renderDatingToolbar();
    if (joinId) joinInvite(joinId, true);
    else if (activeCategory === "dating") {
      render();
      if (document.getElementById("invite-modal")?.open) openCreateModal();
    } else {
      render();
    }
  }

  function maybePromptDatingProfile() {
    if (activeCategory !== "dating" || loadDatingProfile()) return;
    setTimeout(function () {
      openDatingProfileModal(null);
    }, 600);
  }

  function formatDatingDetail(invite) {
    if (invite.category !== "dating") return "";
    const parts = [];
    if (invite.gender) parts.push(invite.gender);
    if (invite.age) parts.push("Age " + invite.age);
    if (invite.lookingFor) parts.push(invite.lookingFor);
    if (invite.sexuality) parts.push(invite.sexuality);
    if (!parts.length) return "";
    return (
      '<p class="invite-card__detail invite-card__detail--dating">💫 ' +
      escapeHtml(parts.join(" · ")) +
      "</p>"
    );
  }

  function openStudyProfileModal(forJoinId) {
    pendingStudyJoinId = forJoinId || null;
    const profile = loadStudyProfile();
    if (profile) {
      els.profileSchool.value = profile.school;
      els.profileClassCode.value = profile.classCode;
    } else {
      els.studyProfileForm.reset();
    }
    els.studyProfileError.hidden = true;
    if (typeof els.studyProfileModal.showModal === "function") {
      els.studyProfileModal.showModal();
    } else {
      els.studyProfileModal.setAttribute("open", "");
    }
  }

  function closeStudyProfileModal() {
    pendingStudyJoinId = null;
    if (typeof els.studyProfileModal.close === "function") {
      els.studyProfileModal.close();
    } else {
      els.studyProfileModal.removeAttribute("open");
    }
    els.studyProfileError.hidden = true;
  }

  function onStudyProfileSubmit(e) {
    e.preventDefault();
    const school = els.profileSchool.value.trim();
    const classCode = els.profileClassCode.value.trim();
    if (!school || !classCode) {
      els.studyProfileError.textContent = "Please enter your school and class code.";
      els.studyProfileError.hidden = false;
      return;
    }
    saveStudyProfile(school, classCode);
    const joinId = pendingStudyJoinId;
    closeStudyProfileModal();
    if (joinId) joinInvite(joinId, true);
    else if (activeCategory === "studying") openCreateModal();
  }

  function maybePromptStudyProfile() {
    if (activeCategory !== "studying" || loadStudyProfile()) return;
    setTimeout(function () {
      openStudyProfileModal(null);
    }, 400);
  }

  function showBootError(msg) {
    if (els.bootError) {
      els.bootError.hidden = false;
      els.bootError.textContent = msg;
    }
    console.error(msg);
  }

  function loadInvites() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("gather-invites-v2") ||
        localStorage.getItem("gather-invites");
      const data = raw ? JSON.parse(raw) : [];
      return data.map(function (inv) {
        return normalizeInvite(inv);
      });
    } catch {
      return [];
    }
  }

  function saveInvites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
  }

  function setView(view, category) {
    activeView = view;
    if (category && CATEGORY_IDS.includes(category)) {
      if (activeCategory !== category) activityFilter = null;
      activeCategory = category;
    }

    document.querySelectorAll(".bottom-nav__item").forEach(function (btn) {
      const isMapBtn = btn.getAttribute("data-nav") === "map";
      const screen = btn.getAttribute("data-screen");
      const isActive =
        view === "map"
          ? isMapBtn
          : !isMapBtn && screen === activeCategory;
      btn.classList.toggle("bottom-nav__item--active", isActive);
    });

    if (els.activityPicker) els.activityPicker.hidden = activeCategory === "mine";
    if (els.myFilters) els.myFilters.hidden = activeCategory !== "mine";
    if (els.feedToolbar) els.feedToolbar.hidden = activeCategory === "mine";

    if (els.screenFeed) {
      els.screenFeed.hidden = view !== "feed";
      els.screenFeed.classList.toggle("screen--active", view === "feed");
    }
    if (els.screenMap) {
      els.screenMap.hidden = view !== "map";
      els.screenMap.classList.toggle("screen--active", view === "map");
    }
    if (els.app) els.app.dataset.view = view;

    applyCategoryTheme();
    renderCategoryHero();
    renderDatingToolbar();
    updateHostButtonLabel();
    renderActivityPicker();
    renderMapActivityFilters();

    if (view === "map") {
      setTimeout(() => initMap(), 50);
    } else if (category === "studying") {
      maybePromptStudyProfile();
    } else if (category === "dating") {
      maybePromptDatingProfile();
    }
    render();
  }

  function updateMyFilterChips() {
    if (!els.myFilters) return;
    els.myFilters.querySelectorAll("[data-my-filter]").forEach(function (chip) {
      chip.classList.toggle("filter-chip--active", chip.getAttribute("data-my-filter") === myListFilter);
    });
  }

  function applyCategoryTheme() {
    const cat = getCategory(activeCategory);
    const root = document.documentElement;
    if (els.app) els.app.dataset.category = activeCategory;
    if (els.headerTagline) {
      els.headerTagline.textContent =
        activeView === "map" ? "Map — filter by activity in your area" : cat.tagline;
    }
    if (els.headerLogo) els.headerLogo.textContent = cat.emoji;

    root.style.setProperty("--accent", cat.accent);
    root.style.setProperty("--accent-dark", cat.accentDark);
    root.style.setProperty("--accent-soft", cat.accentSoft);
    root.style.setProperty("--accent-glow", cat.accentGlow);
    root.style.setProperty("--bg", cat.bg);
    root.style.setProperty("--bg-elevated", cat.bgElevated);
    root.style.setProperty("--bg-card", cat.bgCard);
    root.style.setProperty("--border", cat.border);
    root.style.setProperty("--text", cat.text);
    root.style.setProperty("--text-muted", cat.textMuted);
    root.style.setProperty("--page-gradient", cat.gradient);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function renderCategoryHero() {
    if (!els.hero) return;
    if (activeCategory === "mine") updateMyFilterChips();
    const cat = getCategory(activeCategory);
    els.hero.innerHTML =
      '<p class="category-hero__emoji" aria-hidden="true">' +
      cat.emoji +
      "</p><h2 class=\"category-hero__title\">" +
      escapeHtml(cat.heroTitle) +
      '</h2><p class="category-hero__text">' +
      escapeHtml(cat.heroText) +
      "</p>";
  }

  function renderActivityPicker() {
    if (!els.activityPicker) return;
    const cat = getCategory(activeCategory);
    let html =
      '<button type="button" class="activity-chip' +
      (activityFilter === null ? " activity-chip--active" : "") +
      '" data-activity="">All activities</button>';
    for (const act of cat.activities.filter((a) => a !== "Other")) {
      html +=
        '<button type="button" class="activity-chip' +
        (activityFilter === act ? " activity-chip--active" : "") +
        '" data-activity="' +
        escapeAttr(act) +
        '">' +
        escapeHtml(act) +
        "</button>";
    }
    els.activityPicker.innerHTML = html;
  }

  function renderMapActivityFilters() {
    if (!els.mapActivityFilters) return;
    const activities =
      mapCategoryFilter === "all"
        ? allActivities()
        : getCategory(mapCategoryFilter).activities.filter((a) => a !== "Other");

    els.mapActivityFilters.innerHTML = activities
      .map((act) => {
        const active = mapActivityFilter === act ? " activity-chip--active" : "";
        return (
          '<button type="button" class="activity-chip activity-chip--map' +
          active +
          '" data-map-activity="' +
          escapeAttr(act) +
          '">' +
          escapeHtml(act) +
          "</button>"
        );
      })
      .join("");
  }

  function populateActivitySelect(category) {
    const cat = getCategory(category);
    els.activityPreset.innerHTML = cat.activities
      .map((a) => '<option value="' + escapeAttr(a) + '">' + escapeHtml(a) + "</option>")
      .join("");
    toggleCustomActivity();
  }

  function toggleCustomActivity() {
    const isOther = els.activityPreset.value === "Other";
    els.customActivityWrap.hidden = !isOther;
    els.activityCustom.required = isOther;
  }

  function openCreateModal() {
    if (activeCategory === "studying" && !loadStudyProfile()) {
      openStudyProfileModal(null);
      return;
    }
    if (activeCategory === "dating" && !loadDatingProfile()) {
      openDatingProfileModal(null);
      return;
    }
    if (activeCategory === "mine") {
      activeCategory = "hangout";
      els.formCategory.value = "hangout";
    }
    els.form.reset();
    if (els.formCapacity) els.formCapacity.value = activeCategory === "dating" ? String(DATING_CAPACITY) : "6";
    if (els.modalTitle) {
      els.modalTitle.textContent =
        activeCategory === "dating" ? "Post a date" : "Host at your place";
    }
    const userProfile = loadUserProfile();
    if (userProfile) {
      els.formHostName.value = userProfile.name;
      els.formHostAge.value = userProfile.age;
    }
    els.formCategory.value = activeCategory;
    els.formLat.value = "";
    els.formLng.value = "";
    populateActivitySelect(activeCategory);
    toggleCategoryHostFields(activeCategory);
    const studyProfile = loadStudyProfile();
    if (activeCategory === "studying" && studyProfile) {
      els.formSchool.value = studyProfile.school;
      els.formClassCode.value = studyProfile.classCode;
    }
    if (els.btnSubmit) {
      els.btnSubmit.textContent =
        activeCategory === "dating" ? "Post date" : "Post invite";
    }
    els.formError.hidden = true;
    if (typeof els.modal.showModal === "function") {
      els.modal.showModal();
    } else {
      els.modal.setAttribute("open", "");
    }
  }

  function closeModal() {
    if (typeof els.modal.close === "function") {
      els.modal.close();
    } else {
      els.modal.removeAttribute("open");
    }
    els.formError.hidden = true;
  }

  async function geocodeLocation(query) {
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(query) + "&limit=1"
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  }

  async function onFormSubmit(e) {
    e.preventDefault();
    const fd = new FormData(els.form);
    const category = fd.get("category") || activeCategory;
    const preset = String(fd.get("activityPreset"));
    const custom = String(fd.get("activityCustom") || "").trim();
    const activity = preset === "Other" ? custom : preset;
    const location = String(fd.get("location")).trim();
    const capacity =
      category === "dating" ? DATING_CAPACITY : Number(fd.get("capacity"));
    const when = String(fd.get("when") || "").trim();
    const host = String(fd.get("host") || "").trim();
    const hostAge = Number(fd.get("hostAge"));
    const notes = String(fd.get("notes") || "").trim();
    let lat = fd.get("lat") ? Number(fd.get("lat")) : undefined;
    let lng = fd.get("lng") ? Number(fd.get("lng")) : undefined;

    if (!activity) {
      els.formError.textContent = "Pick or describe an activity.";
      els.formError.hidden = false;
      return;
    }
    if (!host) {
      els.formError.textContent = "Enter your name as host.";
      els.formError.hidden = false;
      return;
    }
    if (!hostAge || hostAge < 13) {
      els.formError.textContent = "Enter your age (13+).";
      els.formError.hidden = false;
      return;
    }
    if (1 > capacity) {
      els.formError.textContent = "Capacity must be at least 1.";
      els.formError.hidden = false;
      return;
    }

    const school = String(fd.get("school") || "").trim();
    const classCode = String(fd.get("classCode") || "").trim();
    if (category === "studying" && (!school || !classCode)) {
      els.formError.textContent = "School and class code are required for study sessions.";
      els.formError.hidden = false;
      return;
    }

    let age;
    let lookingFor;
    let gender;
    let sexuality;
    if (category === "dating") {
      const datingProfile = loadDatingProfile();
      if (!datingProfile) {
        els.formError.textContent = "Set your dating preferences first (Edit preferences on the Dating tab).";
        els.formError.hidden = false;
        return;
      }
      age = datingProfile.age;
      lookingFor = datingProfile.lookingFor;
      gender = datingProfile.gender;
      sexuality = datingProfile.sexuality;
    }
    if (when && isExpired({ when: when })) {
      els.formError.textContent = "That date is already in the past. Pick a future time.";
      els.formError.hidden = false;
      return;
    }

    els.btnSubmit.disabled = true;
    els.btnSubmit.textContent = "Saving…";

    if (!lat || !lng) {
      const coords = await geocodeLocation(location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    els.btnSubmit.disabled = false;
    els.btnSubmit.textContent =
      category === "dating" ? "Post date" : "Post invite";

    const userId = getUserId();
    saveUserProfile(host, hostAge);

    const hostAttendeeAge = category === "dating" ? age : hostAge;

    const inviteId = newId();
    const attendees = [
      {
        id: newId(),
        name: host,
        age: hostAttendeeAge,
        isHost: true,
        userId: userId,
      },
    ];

    invites.unshift({
      id: inviteId,
      category,
      activity,
      location,
      capacity: category === "dating" ? DATING_CAPACITY : capacity,
      going: 1,
      attendees: attendees,
      creatorId: userId,
      host: host,
      hostAge: hostAge,
      ...(lat != null && lng != null ? { lat, lng } : {}),
      ...(when ? { when } : {}),
      ...(notes ? { notes } : {}),
      ...(category === "studying" ? { school, classCode } : {}),
      ...(category === "dating"
        ? { age: age || hostAge, gender, lookingFor, sexuality }
        : {}),
      createdAt: new Date().toISOString(),
    });
    addMyCreated(inviteId);
    if (category === "studying") saveStudyProfile(school, classCode);
    if (category === "dating") saveDatingProfile(age || hostAge, lookingFor, sexuality, gender);
    saveInvites();
    closeModal();
    if (activeCategory !== category) setView(activeView, category);
    else {
      render();
      if (mapInstance) updateMapMarkers();
    }
  }

  function joinInvite(id, skipChecks, joinerInfo) {
    const invite = invites.find(function (i) { return i.id === id; });
    if (!invite) return;
    if (isExpired(invite)) return;
    if (invite.going >= invite.capacity) return;

    if (isUserOnInvite(invite)) return;

    if (invite.category === "hangout" && hasJoinedHangout(id)) return;

    if (!skipChecks) {
      if (invite.category === "studying" && !loadStudyProfile()) {
        openStudyProfileModal(id);
        return;
      }
      if (invite.category === "dating" && !loadDatingProfile()) {
        openDatingProfileModal(id);
        return;
      }
      openJoinModal(id);
      return;
    }

    const profile = joinerInfo || loadUserProfile();
    if (!profile || !profile.name) {
      openJoinModal(id);
      return;
    }

    const hangoutBlock = hangoutAgeBlockReason(invite, profile.age);
    if (hangoutBlock) {
      alert(hangoutBlock);
      return;
    }

    if (!invite.attendees) invite.attendees = [];
    invite.attendees.push({
      id: newId(),
      name: profile.name,
      age: profile.age,
      isHost: false,
      userId: getUserId(),
    });
    syncGoingCount(invite);

    if (invite.category === "hangout") markJoinedHangout(id);
    addMyJoined(id);
    saveUserProfile(profile.name, profile.age);
    saveInvites();
    render();
    if (mapInstance) updateMapMarkers();
  }

  function deleteInvite(id) {
    if (!confirm("Remove this invite?")) return;
    invites = invites.filter(function (i) { return i.id !== id; });
    const created = loadMyCreated().filter(function (cid) { return cid !== id; });
    localStorage.setItem(MY_CREATED_KEY, JSON.stringify(created));
    saveInvites();
    render();
    if (mapInstance) updateMapMarkers();
  }

  function getMyInvites() {
    const uid = getUserId();
    const createdIds = loadMyCreated();
    const joinedIds = loadMyJoined().map(function (j) { return j.inviteId; });

    return invites.filter(function (invite) {
      const created = invite.creatorId === uid || createdIds.indexOf(invite.id) !== -1;
      const joined = joinedIds.indexOf(invite.id) !== -1 || isUserOnInvite(invite);
      if (myListFilter === "created") return created;
      return joined && !created;
    });
  }

  function getFeedInvites() {
    if (activeCategory === "mine") return getMyInvites();

    return invites.filter(function (invite) {
      if (invite.category !== activeCategory) return false;
      const expired = isExpired(invite);
      const spotsLeft = invite.capacity - invite.going;
      const isFull = spotsLeft <= 0 || expired;
      if (activeListFilter === "open" && (isFull || expired)) return false;
      if (activeListFilter === "full" && (!isFull || expired)) return false;
      if (activeListFilter === "expired" && !expired) return false;
      if (activityFilter && invite.activity !== activityFilter) return false;
      if (searchQuery) {
        const haystack = (invite.activity + " " + invite.location + " " + (invite.host || "")).toLowerCase();
        if (haystack.indexOf(searchQuery) === -1) return false;
      }
      return true;
    });
  }

  function getMapInvites() {
    return invites.filter((invite) => {
      if (invite.lat == null || invite.lng == null) return false;
      if (mapCategoryFilter !== "all" && invite.category !== mapCategoryFilter) return false;
      if (mapActivityFilter && invite.activity !== mapActivityFilter) return false;
      return true;
    });
  }

  function formatWhen(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function categoryBadge(category) {
    const cat = getCategory(category);
    return (
      '<span class="badge badge--category badge--' +
      category +
      '">' +
      cat.emoji +
      " " +
      escapeHtml(cat.label) +
      "</span>"
    );
  }

  function renderStats() {
    if (!els.stats) return;
    if (activeCategory === "mine") {
      const mine = getMyInvites();
      const open = mine.filter(function (i) { return !isExpired(i) && i.going < i.capacity; }).length;
      els.stats.innerHTML =
        '<div class="stat"><span class="stat__value">' +
        mine.length +
        '</span><span class="stat__label">' +
        (myListFilter === "created" ? "Created" : "Joined") +
        '</span></div><div class="stat"><span class="stat__value">' +
        open +
        '</span><span class="stat__label">Still open</span></div>';
      return;
    }
    const catInvites = invites.filter(function (i) { return i.category === activeCategory; });
    const open = catInvites.filter(function (i) { return i.going < i.capacity; }).length;
    const totalGoing = catInvites.reduce(function (sum, i) { return sum + i.going; }, 0);
    const cat = getCategory(activeCategory);
    const openLabel = activeCategory === "dating" ? "Open dates" : "Open spots";
    const countLabel = activeCategory === "dating" ? "Date invites" : cat.label + " invites";
    els.stats.innerHTML =
      '<div class="stat"><span class="stat__value">' +
      catInvites.length +
      '</span><span class="stat__label">' +
      escapeHtml(countLabel) +
      '</span></div><div class="stat"><span class="stat__value">' +
      open +
      '</span><span class="stat__label">' +
      escapeHtml(openLabel) +
      '</span></div><div class="stat"><span class="stat__value">' +
      totalGoing +
      '</span><span class="stat__label">People going</span></div>';
  }

  function getJoinButtonState(invite) {
    if (isExpired(invite)) {
      return { label: "Expired", disabled: true, joined: false };
    }
    const spotsLeft = invite.capacity - invite.going;
    const isDating = invite.category === "dating";

    if (isDating) {
      if (spotsLeft <= 0) {
        return { label: "Date booked", disabled: true, joined: false };
      }
      if (isUserOnInvite(invite)) {
        return { label: "You're their date", disabled: true, joined: true };
      }
      return { label: "Join this date", disabled: false, joined: false };
    }

    if (spotsLeft <= 0) {
      return { label: "Full", disabled: true, joined: false };
    }
    if (isUserOnInvite(invite) || (invite.category === "hangout" && hasJoinedHangout(invite.id))) {
      return { label: "You're going", disabled: true, joined: true };
    }
    const userProfile = loadUserProfile();
    if (invite.category === "hangout" && userProfile) {
      const blockReason = hangoutAgeBlockReason(invite, userProfile.age);
      if (blockReason) {
        return { label: "18+ only", disabled: true, joined: false };
      }
    }
    return {
      label: "I'm in",
      disabled: false,
      joined: false,
    };
  }

  function renderDatingDateStatus(invite, expired, isFull) {
    if (expired) {
      return (
        '<div class="date-status"><p class="date-status__label">This date</p>' +
        '<p class="date-status__value">Ended</p></div>'
      );
    }
    if (isFull) {
      return (
        '<div class="date-status"><p class="date-status__label">Two people · Full</p>' +
        '<p class="date-status__value">Date booked</p></div>'
      );
    }
    return (
      '<div class="date-status"><p class="date-status__label">Two people · 1 spot</p>' +
      '<p class="date-status__value">Open for one date</p></div>'
    );
  }

  function renderCapacitySection(invite, expired, isFull, spotsLeft, pct) {
    if (invite.category === "dating") {
      return renderDatingDateStatus(invite, expired, isFull);
    }
    return (
      '<div class="capacity"><div class="capacity__labels"><span class="capacity__going">' +
      invite.going +
      " / " +
      invite.capacity +
      ' going</span><span class="capacity__spots' +
      (isFull || expired ? " capacity__spots--none" : "") +
      '">' +
      (expired ? "Ended" : isFull ? "Full" : spotsLeft + " more welcome") +
      '</span></div><div class="capacity__bar"><div class="capacity__fill" style="width:' +
      pct +
      '%"></div></div></div>'
    );
  }

  function renderStatusBadge(invite, showMineStatus, mineMode, expired, isFull, spotsLeft) {
    if (showMineStatus) {
      const st = getMyInviteStatus(invite, mineMode);
      return '<span class="badge ' + st.className + '">' + escapeHtml(st.label) + "</span>";
    }
    if (invite.category === "dating") {
      if (expired) return '<span class="badge badge--expired">Expired</span>';
      if (isFull) return '<span class="badge badge--full">Date booked</span>';
      return '<span class="badge badge--open">1 spot open</span>';
    }
    if (expired) return '<span class="badge badge--expired">Expired</span>';
    if (isFull) return '<span class="badge badge--full">Full</span>';
    return '<span class="badge badge--open">' + spotsLeft + " left</span>";
  }

  function renderCard(invite, index, options) {
    options = options || {};
    const expired = isExpired(invite);
    const spotsLeft = invite.capacity - invite.going;
    const isFull = spotsLeft <= 0 && !expired;
    const pct = Math.min(100, (invite.going / invite.capacity) * 100);
    const whenLabel = formatWhen(invite.when);
    const joinState = getJoinButtonState(invite);
    const showMineStatus = activeCategory === "mine" || options.mineStatus;
    const mineMode = myListFilter;

    const statusBadge = renderStatusBadge(invite, showMineStatus, mineMode, expired, isFull, spotsLeft);

    const studyBlock =
      invite.category === "studying" && (invite.school || invite.classCode)
        ? '<p class="invite-card__detail invite-card__study">🎓 <strong>' +
          escapeHtml(invite.school || "") +
          "</strong>" +
          (invite.classCode ? " · " + escapeHtml(invite.classCode) : "") +
          "</p>"
        : "";

    const datingBlock = formatDatingDetail(invite);

    const hangoutAgeNote =
      invite.category === "hangout" && hangoutHasAdult(invite)
        ? '<p class="invite-card__age-note">Includes guests 18+. You must be 18+ to join.</p>'
        : "";

    return (
      '<article class="invite-card' +
      (invite.category === "dating" ? " invite-card--dating" : "") +
      (expired ? " invite-card--expired" : isFull ? " invite-card--full" : "") +
      (joinState.joined ? " invite-card--joined" : "") +
      '" style="animation-delay:' +
      (index || 0) * 0.05 +
      's"><div class="invite-card__top"><div><div class="invite-card__badges">' +
      categoryBadge(invite.category) +
      '</div><h3 class="invite-card__activity">' +
      escapeHtml(invite.activity) +
      "</h3></div>" +
      statusBadge +
      '</div><div class="invite-card__meta"><div class="meta-row">📍 ' +
      escapeHtml(invite.location) +
      "</div>" +
      (whenLabel
        ? '<div class="meta-row">🕐 ' +
          escapeHtml(whenLabel) +
          (expired ? ' <span class="meta-expired">(passed)</span>' : "") +
          "</div>"
        : "") +
      "</div>" +
      studyBlock +
      datingBlock +
      hangoutAgeNote +
      renderGoingList(invite) +
      (invite.notes ? '<p class="invite-card__notes">' + escapeHtml(invite.notes) + "</p>" : "") +
      renderCapacitySection(invite, expired, isFull, spotsLeft, pct) +
      '<div class="invite-card__actions"><button type="button" class="btn btn--join" data-join="' +
      invite.id +
      '"' +
      (joinState.disabled ? " disabled" : "") +
      ">" +
      joinState.label +
      '</button><button type="button" class="btn btn--danger" data-delete="' +
      invite.id +
      '">Remove</button></div>' +
      (invite.host && activeCategory !== "mine"
        ? '<p class="invite-card__host">Hosted by ' + escapeHtml(invite.host) + "</p>"
        : "") +
      "</article>"
    );
  }

  function renderFeed() {
    const filtered = getFeedInvites();
    renderStats();
    if (!els.list || !els.empty) return;

    if (filtered.length === 0) {
      els.list.innerHTML = "";
      els.empty.hidden = false;
      if (activeCategory === "mine") {
        els.empty.textContent =
          myListFilter === "created"
            ? "You haven't created any invites yet. Host something from Hangout, Dating, or Study!"
            : "You haven't joined any invites yet. Tap I'm in on a plan that interests you.";
      } else {
        const cat = getCategory(activeCategory);
        els.empty.textContent = invites.some(function (i) { return i.category === activeCategory; })
          ? "No invites match your filters."
          : "No " + cat.label.toLowerCase() + " invites yet — tap Host to post one!";
      }
      return;
    }
    els.empty.hidden = true;
    els.list.innerHTML = filtered.map(function (inv, i) {
      return renderCard(inv, i);
    }).join("");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }

  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletLoading) return leafletLoading;
    leafletLoading = loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css")
      .then(function () {
        return loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
      })
      .catch(function () {
        leafletLoading = null;
        throw new Error("Map could not load. Check your internet connection and refresh.");
      });
    return leafletLoading;
  }

  function showMapError(message) {
    if (!els.mapError) return;
    if (message) {
      els.mapError.hidden = false;
      els.mapError.textContent = message;
    } else {
      els.mapError.hidden = true;
      els.mapError.textContent = "";
    }
  }

  function destroyMap() {
    if (mapInstance) {
      try {
        mapInstance.remove();
      } catch (_) { /* already removed */ }
      mapInstance = null;
      markerLayer = null;
    }
    if (els.mapEl) {
      els.mapEl.innerHTML = "";
      if (els.mapEl._leaflet_id) {
        delete els.mapEl._leaflet_id;
      }
    }
  }

  function addMapTileLayer() {
    const carto =
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const osm = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const layer = window.L.tileLayer(carto, {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    });

    layer.on("tileerror", function onTileError() {
      if (layer._osmFallback) return;
      layer._osmFallback = true;
      layer.off("tileerror", onTileError);
      layer.setUrl(osm);
    });

    layer.addTo(mapInstance);
  }

  function createMarkerIcon(color) {
    return window.L.divIcon({
      className: "map-marker-wrap",
      html: '<span class="map-marker" style="background:' + color + '"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
  }

  function buildPopup(invite) {
    const joinState = getJoinButtonState(invite);
    const cat = getCategory(invite.category);
    const whenLabel = formatWhen(invite.when);
    return (
      '<div class="map-popup"><p class="map-popup__cat">' +
      cat.emoji +
      " " +
      escapeHtml(cat.label) +
      "</p><strong>" +
      escapeHtml(invite.activity) +
      "</strong><p>" +
      escapeHtml(invite.location) +
      "</p>" +
      (invite.school
        ? "<p>🎓 " + escapeHtml(invite.school) + " · " + escapeHtml(invite.classCode || "") + "</p>"
        : "") +
      (invite.category === "dating" && (invite.gender || invite.age)
        ? "<p>💫 " +
          escapeHtml(
            [
              invite.gender,
              invite.age ? "Age " + invite.age : "",
              invite.lookingFor,
              invite.sexuality,
            ]
              .filter(Boolean)
              .join(" · ")
          ) +
          "</p>"
        : "") +
      (whenLabel ? "<p>🕐 " + escapeHtml(whenLabel) + "</p>" : "") +
      "<p><strong>Going:</strong></p>" +
      (invite.attendees
        ? invite.attendees
            .map(function (a) {
              return "<p>• " + escapeHtml(a.name) + (a.age != null ? " (age " + a.age + ")" : "") + "</p>";
            })
            .join("")
        : "<p>" + invite.going + "/" + invite.capacity + "</p>") +
      '<button type="button" class="btn btn--join btn--sm map-popup__join" data-join="' +
      invite.id +
      "\"" +
      (joinState.disabled ? " disabled" : "") +
      ">" +
      joinState.label +
      "</button></div>"
    );
  }

  async function initMap() {
    if (!els.mapEl || (els.screenMap && els.screenMap.hidden)) return;

    showMapError("");

    try {
      await ensureLeaflet();
    } catch (err) {
      showMapError(err.message || "Map failed to load.");
      return;
    }

    if (mapInstance) {
      setTimeout(function () {
        if (mapInstance) {
          mapInstance.invalidateSize(true);
          updateMapMarkers();
        }
      }, 150);
      return;
    }

    if (els.mapEl._leaflet_id) {
      destroyMap();
    }

    try {
      const center = DEFAULT_CENTER;
      mapInstance = window.L.map(els.mapEl, {
        scrollWheelZoom: true,
      }).setView([center.lat, center.lng], 12);

      addMapTileLayer();
      markerLayer = window.L.layerGroup().addTo(mapInstance);

      setTimeout(function () {
        if (mapInstance) mapInstance.invalidateSize(true);
        updateMapMarkers();
      }, 200);
    } catch (err) {
      console.error(err);
      destroyMap();
      showMapError("Could not display the map. Try refreshing the page.");
    }
  }

  function updateMapMarkers() {
    if (!mapInstance || !markerLayer) return;
    markerLayer.clearLayers();
    const mapped = getMapInvites();
    if (els.mapHint) {
      els.mapHint.textContent =
        mapped.length === 0
          ? "No pins match your filters. Post an invite with an address to add one."
          : mapped.length + " on the map";
    }
    const bounds = [];
    for (const invite of mapped) {
      const marker = window.L.marker([invite.lat, invite.lng], {
        icon: createMarkerIcon(getCategory(invite.category).accent),
      });
      marker.bindPopup(buildPopup(invite));
      marker.addTo(markerLayer);
      bounds.push([invite.lat, invite.lng]);
    }
    if (bounds.length > 1) mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    else if (bounds.length === 1) mapInstance.setView(bounds[0], 14);
  }

  function render() {
    renderDatingToolbar();
    updateHostButtonLabel();
    if (activeView === "feed") renderFeed();
    else updateMapMarkers();
  }

  function seedDemoData() {
    const hasAll = FEED_CATEGORIES.every(function (id) {
      return invites.some(function (i) { return i.category === id; });
    });
    if (sessionStorage.getItem(SEED_KEY) && hasAll && invites[0] && invites[0].attendees) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const base = DEFAULT_CENTER;

    function demoAttendees(hostName, hostAge, guests) {
      const list = [{ id: newId(), name: hostName, age: hostAge, isHost: true }];
      guests.forEach(function (g) {
        list.push({ id: newId(), name: g[0], age: g[1], isHost: false });
      });
      return list;
    }

    invites = [
      {
        id: newId(),
        category: "hangout",
        activity: "Board game night",
        location: "Washington Square Park, NYC",
        capacity: 8,
        lat: base.lat + 0.008,
        lng: base.lng - 0.012,
        when: tomorrow.toISOString(),
        host: "Alex",
        hostAge: 24,
        notes: "Beginners welcome.",
        attendees: demoAttendees("Alex", 24, [["Jamie", 22], ["Riley", 25], ["Sam", 23]]),
        createdAt: new Date().toISOString(),
      },
      {
        id: newId(),
        category: "hangout",
        activity: "Coffee hangout",
        location: "Blue Bottle, Flatiron",
        capacity: 5,
        lat: base.lat - 0.006,
        lng: base.lng + 0.009,
        host: "Sam",
        hostAge: 27,
        attendees: demoAttendees("Sam", 27, [["Taylor", 26]]),
        createdAt: new Date().toISOString(),
      },
      {
        id: newId(),
        category: "dating",
        activity: "Coffee date",
        location: "Bryant Park, NYC",
        capacity: 2,
        lat: base.lat + 0.003,
        lng: base.lng + 0.005,
        host: "Jordan",
        hostAge: 26,
        age: 26,
        gender: "Woman",
        lookingFor: "See where it goes",
        sexuality: "Bisexual",
        when: tomorrow.toISOString(),
        attendees: demoAttendees("Jordan", 26, []),
        createdAt: new Date().toISOString(),
      },
      {
        id: newId(),
        category: "dating",
        activity: "Museum visit",
        location: "MoMA, Manhattan",
        capacity: 2,
        lat: base.lat - 0.01,
        lng: base.lng - 0.004,
        host: "Morgan",
        hostAge: 29,
        age: 29,
        gender: "Man",
        lookingFor: "Serious relationship",
        sexuality: "Straight",
        attendees: demoAttendees("Morgan", 29, [["Chris", 28]]),
        createdAt: new Date().toISOString(),
      },
      {
        id: newId(),
        category: "studying",
        activity: "Library session",
        location: "NY Public Library",
        capacity: 6,
        lat: base.lat + 0.005,
        lng: base.lng + 0.011,
        host: "Priya",
        hostAge: 21,
        school: "NYU",
        classCode: "CS 101",
        when: tomorrow.toISOString(),
        attendees: demoAttendees("Priya", 21, [["Dev", 20], ["Ana", 22]]),
        createdAt: new Date().toISOString(),
      },
      {
        id: newId(),
        category: "studying",
        activity: "Pomodoro coworking",
        location: "Midtown café",
        capacity: 4,
        lat: base.lat - 0.004,
        lng: base.lng - 0.008,
        host: "Leo",
        hostAge: 23,
        school: "Columbia",
        classCode: "ECON 1101",
        attendees: demoAttendees("Leo", 23, []),
        createdAt: new Date().toISOString(),
      },
    ];

    invites.forEach(function (inv) {
      syncGoingCount(inv);
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(14, 0, 0, 0);
    const picnic = {
      id: newId(),
      category: "hangout",
      activity: "Picnic in the park",
      location: "Central Park, NYC",
      capacity: 10,
      when: yesterday.toISOString(),
      host: "Casey",
      hostAge: 28,
      attendees: demoAttendees("Casey", 28, [
        ["Jamie", 22],
        ["Riley", 25],
        ["Sam", 23],
        ["Taylor", 26],
        ["Jordan", 27],
      ]),
      createdAt: new Date().toISOString(),
    };
    syncGoingCount(picnic);
    invites.push(picnic);

    saveInvites();
    sessionStorage.setItem(SEED_KEY, "1");
  }

  function handleDocumentClick(e) {
    const target = e.target;

    const navBtn = target.closest(".bottom-nav__item");
    if (navBtn) {
      e.preventDefault();
      if (navBtn.getAttribute("data-nav") === "map") {
        setView("map");
      } else {
        const screen = navBtn.getAttribute("data-screen");
        if (screen && CATEGORY_IDS.includes(screen)) setView("feed", screen);
      }
      return;
    }

    if (target.closest("#btn-new-invite")) {
      e.preventDefault();
      openCreateModal();
      return;
    }
    if (target.closest("#btn-close-modal") || target.closest("#btn-cancel")) {
      e.preventDefault();
      closeModal();
      return;
    }
    if (target.closest("#btn-close-study-profile")) {
      e.preventDefault();
      closeStudyProfileModal();
      return;
    }
    if (target.closest("#btn-close-dating-profile")) {
      e.preventDefault();
      closeDatingProfileModal();
      return;
    }
    if (
      target.closest("#btn-edit-dating-prefs") ||
      target.closest("#btn-edit-dating-prefs-host")
    ) {
      e.preventDefault();
      openDatingProfileModal(null);
      return;
    }
    if (target.closest("#btn-close-join") || target.closest("#btn-cancel-join")) {
      e.preventDefault();
      closeJoinModal();
      return;
    }

    const myFilterChip = target.closest("[data-my-filter]");
    if (myFilterChip) {
      myListFilter = myFilterChip.getAttribute("data-my-filter") || "created";
      updateMyFilterChips();
      render();
      return;
    }

    const activityChip = target.closest(".activity-chip[data-activity]");
    if (activityChip && !activityChip.hasAttribute("data-map-activity")) {
      const val = activityChip.getAttribute("data-activity");
      activityFilter = val === "" ? null : val;
      renderActivityPicker();
      render();
      return;
    }

    const mapChip = target.closest("[data-map-activity]");
    if (mapChip) {
      const act = mapChip.getAttribute("data-map-activity");
      mapActivityFilter = mapActivityFilter === act ? null : act;
      renderMapActivityFilters();
      updateMapMarkers();
      return;
    }

    const filterChip = target.closest(".filter-chip");
    if (filterChip) {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("filter-chip--active"));
      filterChip.classList.add("filter-chip--active");
      activeListFilter = filterChip.getAttribute("data-filter") || "all";
      render();
      return;
    }

    const joinBtn = target.closest("[data-join]");
    if (joinBtn && !joinBtn.disabled) {
      joinInvite(joinBtn.getAttribute("data-join"));
      return;
    }

    const deleteBtn = target.closest("[data-delete]");
    if (deleteBtn) {
      deleteInvite(deleteBtn.getAttribute("data-delete"));
    }
  }

  function bindEvents() {
    document.addEventListener("click", handleDocumentClick);
    els.form.addEventListener("submit", onFormSubmit);
    if (els.studyProfileForm) {
      els.studyProfileForm.addEventListener("submit", onStudyProfileSubmit);
    }
    if (els.datingProfileForm) {
      els.datingProfileForm.addEventListener("submit", onDatingProfileSubmit);
    }
    if (els.joinForm) {
      els.joinForm.addEventListener("submit", onJoinFormSubmit);
    }
    els.search.addEventListener("input", function () {
      searchQuery = els.search.value.trim().toLowerCase();
      render();
    });
    els.activityPreset.addEventListener("change", toggleCustomActivity);
    els.mapCategoryFilter.addEventListener("change", function () {
      mapCategoryFilter = els.mapCategoryFilter.value;
      renderMapActivityFilters();
      updateMapMarkers();
    });
    const clearBtn = document.getElementById("map-clear-filters");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        mapActivityFilter = null;
        renderMapActivityFilters();
        updateMapMarkers();
      });
    }
  }

  function init() {
    try {
      cacheDom();
      if (!els.app) {
        showBootError("App failed to load. Open index.html from the gather folder.");
        return;
      }
      invites = loadInvites();
      initDatingSelects();
      bindEvents();
      seedDemoData();
      setView("feed", "hangout");
    } catch (err) {
      showBootError("Something went wrong: " + (err.message || err));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
