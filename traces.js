/* PCB trace effect: hovering a project card draws orange traces branching out around it.
   Traces are generated per card (seeded, so they look the same every time) and drawn in an
   SVG that sits behind the cards, so they appear to leave from under each card's edge. */
(function () {
  const grid = document.querySelector(".project-grid");
  if (!grid || !window.matchMedia("(hover: hover)").matches) return;

  const NS = "http://www.w3.org/2000/svg";
  const PAD = { t: 26, r: 44, b: 48, l: 56 }; // room outside the grid for traces
  const SP = 7;        // spacing between parallel traces
  const PAD_R = 3.2;   // via/pad ring radius
  const TAN = Math.SQRT2 - 1; // offset keeping parallel traces parallel through a 45° bend

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "pcb-overlay");
  svg.setAttribute("aria-hidden", "true");
  grid.prepend(svg);

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function build() {
    const cards = Array.from(grid.querySelectorAll(".project"));
    if (!grid.offsetWidth || !cards.length) return;

    svg.setAttribute("width", grid.offsetWidth + PAD.l + PAD.r);
    svg.setAttribute("height", grid.offsetHeight + PAD.t + PAD.b);
    svg.style.left = -PAD.l + "px";
    svg.style.top = -PAD.t + "px";
    svg.querySelectorAll("g").forEach((g) => g.remove());

    const rects = cards.map((c) => ({
      x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight,
      get r() { return this.x + this.w; }, get b() { return this.y + this.h; },
    }));

    cards.forEach((card, i) => {
      const c = rects[i];
      const rand = rng(i + 1);
      const g = el("g", { class: "pcb-card" });
      g.dataset.card = i;

      // free space on each side: distance to the nearest neighbouring card, else the outer padding
      const others = rects.filter((_, j) => j !== i);
      const overlapX = (o) => o.x < c.r && o.r > c.x;
      const overlapY = (o) => o.y < c.b && o.b > c.y;
      const gap = (list, fallback) => Math.min(fallback, ...list);
      const room = {
        top:    gap(others.filter((o) => overlapX(o) && o.b <= c.y).map((o) => c.y - o.b), PAD.t),
        bottom: gap(others.filter((o) => overlapX(o) && o.y >= c.b).map((o) => o.y - c.b), PAD.b),
        left:   gap(others.filter((o) => overlapY(o) && o.r <= c.x).map((o) => c.x - o.r), PAD.l),
        right:  gap(others.filter((o) => overlapY(o) && o.x >= c.r).map((o) => o.x - c.r), PAD.r),
      };

      const sides = [
        { name: "top",    len: c.w, fr: [0.5],        base: (u) => [c.x + u, c.y],        n: [0, -1], t: [1, 0] },
        { name: "bottom", len: c.w, fr: [0.5],        base: (u) => [c.x + u, c.b],        n: [0, 1],  t: [1, 0] },
        { name: "left",   len: c.h, fr: [0.22, 0.72], base: (u) => [c.x, c.y + u],        n: [-1, 0], t: [0, 1] },
        { name: "right",  len: c.h, fr: [0.28, 0.78], base: (u) => [c.r, c.y + u],        n: [1, 0],  t: [0, 1] },
      ];

      let order = 0;
      sides.forEach((side) => {
        const rm = room[side.name];
        if (rm < 20) return;
        side.fr.forEach((fr) => {
          const s = rand() < 0.5 ? -1 : 1;
          const m = 2 + Math.floor(rand() * 2);
          const u0 = side.len * (fr + (rand() - 0.5) * 0.12);
          const a0 = Math.max(4, rm * 0.14);
          const D = Math.min(18, rm * 0.3);
          const E = rm - 6;
          for (let k = 0; k < m; k++) {
            const u = u0 - s * k * SP;
            const a = a0 + TAN * k * SP;
            const origin = side.base(0);
            const pt = (uu, nn) => [
              origin[0] + side.t[0] * uu + side.n[0] * nn,
              origin[1] + side.t[1] * uu + side.n[1] * nn,
            ];
            const pts = [pt(u, -3), pt(u, a), pt(u + s * D, a + D), pt(u + s * D, E - PAD_R)];
            const d = pts.map((p, idx) => (idx ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
            const delay = (order * 0.05).toFixed(2) + "s";
            g.appendChild(el("path", { d, pathLength: 1, style: "--d:" + delay }));
            const end = pt(u + s * D, E);
            g.appendChild(el("circle", { cx: end[0].toFixed(1), cy: end[1].toFixed(1), r: PAD_R, style: "--d:" + delay }));
            order++;
          }
        });
      });

      // offset into overlay coordinates
      g.setAttribute("transform", "translate(" + PAD.l + " " + PAD.t + ")");
      svg.appendChild(g);

      if (card._pcb) {
        card.removeEventListener("mouseenter", card._pcb.on);
        card.removeEventListener("mouseleave", card._pcb.off);
        card.removeEventListener("focus", card._pcb.on);
        card.removeEventListener("blur", card._pcb.off);
      }
      const on = () => g.classList.add("is-on");
      const off = () => g.classList.remove("is-on");
      card._pcb = { on, off };
      card.addEventListener("mouseenter", on);
      card.addEventListener("mouseleave", off);
      card.addEventListener("focus", on);
      card.addEventListener("blur", off);
    });
  }

  new ResizeObserver(build).observe(grid);
})();