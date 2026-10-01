/* ---------- tabs ---------- */
(function () {
  const tabs = Array.from(document.querySelectorAll(".nav-tab"));
  const views = Array.from(document.querySelectorAll(".section-view"));
  const names = tabs.map((t) => t.dataset.section);

  function show(name) {
    if (!names.includes(name)) name = "home";
    const active = names.indexOf(name);
    views.forEach((v) => v.classList.toggle("is-active", v.id === "section-" + name));
    tabs.forEach((t, i) => {
      t.classList.remove("is-active", "heat-1", "heat-2", "heat-3");
      if (i === active) t.classList.add("is-active");
      else t.classList.add("heat-" + Math.min(Math.abs(i - active), 3));
    });
    window.scrollTo(0, 0);
  }

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      history.replaceState(null, "", "#" + t.dataset.section);
      show(t.dataset.section);
    })
  );
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
})();

/* ---------- skyline (time-of-day sky, bands, stars) ---------- */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const bandsGroup = document.getElementById("bands-group");
  const starField = document.getElementById("star-field");
  const gradient = document.getElementById("bandGradient");

  // [y, height, opacity]
  const BAND_SETS = {
    day: [
      [261, 9, 1], [281, 9, 1], [302, 10, 1], [324, 11, 1],
      [348, 12, 1], [373, 13, 1], [400, 14, 1], [429, 15, 1],
    ],
    evening: [
      [300, 8, 0.06], [318, 9, 0.07], [336, 10, 0.08], [356, 11, 0.09],
      [388, 14, 0.16], [412, 14, 0.16], [436, 14, 0.16], [460, 14, 0.16],
      [484, 12, 0.10],
    ],
    night: [
      [430, 10, 0.04], [452, 12, 0.06], [476, 14, 0.08], [500, 16, 0.06],
    ],
  };

  function renderBands(period) {
    bandsGroup.innerHTML = "";
    let minY = Infinity, maxY = -Infinity;
    BAND_SETS[period].forEach(([y, h, op]) => {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", "0");
      rect.setAttribute("y", y);
      rect.setAttribute("width", "1200");
      rect.setAttribute("height", h);
      rect.setAttribute("fill", "url(#bandGradient)");
      rect.setAttribute("opacity", op);
      bandsGroup.appendChild(rect);
    });
    gradient.setAttribute("y1", minY);
    gradient.setAttribute("y2", maxY);
  }

  function renderStars() {
    starField.innerHTML = "";
    for (let i = 0; i < 70; i++) {
      const star = document.createElementNS(NS, "circle");
      star.setAttribute("cx", (Math.random() * 1200).toFixed(1));
      star.setAttribute("cy", (160 + Math.random() * 190).toFixed(1));
      star.setAttribute("r", (0.5 + Math.random() * 1.4).toFixed(2));
      star.setAttribute("fill", "#ffffff");
      star.style.setProperty("--star-min", (0.15 + Math.random() * 0.25).toFixed(2));
      star.style.setProperty("--star-max", (0.7 + Math.random() * 0.3).toFixed(2));
      star.style.animationDelay = "-" + (Math.random() * 4.5).toFixed(2) + "s";
      star.classList.add("star-twinkle");
      starField.appendChild(star);
    }
  }

  function getPeriod() {
    const h = new Date().getHours();
    if (h >= 6 && h < 18) return "day";
    if (h >= 18 && h < 21) return "evening";
    return "night";
  }

  let current = null;

  function apply() {
    const period = getPeriod();
    if (period === current) return;
    document.body.classList.remove("time-day", "time-evening", "time-night");
    document.body.classList.add("time-" + period);
    renderBands(period);
    if (period === "night") renderStars();
    else starField.innerHTML = "";
    current = period;
  }

  apply();
  setInterval(apply, 5 * 60 * 1000);
})();