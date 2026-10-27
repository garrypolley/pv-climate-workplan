const guideById = Object.fromEntries(GUIDE.map((g) => [g.id, g]));
const actionById = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

const IMPACTS = ["Direct", "Enabling", "Indirect", "Supporting"];
const COSTS = ["High", "Medium", "Low"];

const IMPACT_RANK = { Direct: 0, Enabling: 1, Indirect: 2, Supporting: 3 };
const COST_RANK = { Low: 0, Medium: 1, High: 2 };
const AREA_RANK = { EL: 0, EE: 1, T: 2, W: 3 };
const SORTS = [
  { key: "id", label: "ID" },
  { key: "name", label: "Action" },
  { key: "source", label: "Source" },
  { key: "impact", label: "GHG impact" },
  { key: "cost", label: "Relative cost" },
  { key: "chartImpact", label: "Chart impact" },
  { key: "chartFeasibility", label: "Chart feasibility" },
  { key: "board", label: "Board" },
  { key: "when", label: "When" },
];
const ratingById = Object.fromEntries(
  GROUP_RATINGS.filter((rating) => actionById[rating.id]).map((rating) => [rating.id, rating]),
);
const ratingByLabel = Object.fromEntries(GROUP_RATINGS.map((rating) => [String(rating.id), rating]));
const boardById = Object.fromEntries(
  BOARD.filter((place) => place.id != null && actionById[place.id]).map((place) => [place.id, place]),
);
const BOXES = [
  { id: "strategic", name: "Strategic Priorities", short: "Strategic", impact: "higher", feasibility: "lower", className: "strategic" },
  { id: "high-value", name: "High-Value Investments", short: "High-value", impact: "higher", feasibility: "moderate", className: "invest" },
  { id: "quick", name: "Quick Wins", short: "Quick win", impact: "higher", feasibility: "higher", className: "quick" },
  { id: "reassess", name: "Reassess or Deprioritize", short: "Reassess", impact: "lower", feasibility: "lower", className: "reassess" },
  { id: "capacity", name: "Build Capacity", short: "Capacity", impact: "lower", feasibility: "moderate", className: "capacity" },
  { id: "efficient", name: "Efficient Improvements", short: "Efficient", impact: "lower", feasibility: "higher", className: "efficient" },
];
const BOX_BY_ID = Object.fromEntries(BOXES.map((box) => [box.id, box]));
const BOARD_RANK = Object.fromEntries(BOXES.map((box, index) => [box.id, index]));
const WHEN = [
  { id: "opportunities", name: "2027 Opportunities", className: "opportunities" },
  { id: "budget", name: "2028 Budget", className: "budget" },
  { id: "planning", name: "2029/2030 Planning", className: "planning" },
  { id: "awareness", name: "2030+ Awareness", className: "awareness" },
];
const WHEN_BY_ID = Object.fromEntries(WHEN.map((column) => [column.id, column]));
const WHEN_RANK = Object.fromEntries(WHEN.map((column, index) => [column.id, index]));
const WHEN_SHORT = {
  opportunities: "2027",
  budget: "2028",
  planning: "2029/30",
  awareness: "2030+",
};

const state = {
  q: "",
  impact: "All",
  cost: "All",
  origin: "All",
  sort: "id",
  dir: "asc",
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, "");
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function citesGuide(action) {
  return action.guideIds.length > 0;
}

function coverage() {
  const cited = new Map();
  for (const action of ACTIONS) {
    for (const id of action.guideIds) {
      if (!cited.has(id)) cited.set(id, []);
      cited.get(id).push(action.id);
    }
  }
  const missing = GUIDE.filter((g) => !cited.has(g.id)).map((g) => g.id);
  const duplicated = [...cited.entries()].filter(([, rows]) => rows.length > 1);
  return { cited, missing, duplicated, guideRows: ACTIONS.filter(citesGuide).length };
}

function renderStats() {
  const { missing, guideRows } = coverage();
  const stats = [
    [String(ACTIONS.length), "rows in the action table"],
    [String(GUIDE.length), "city actions in the guide"],
    [String(guideRows), "rows that cite a guide code"],
    [String(ACTIONS.length - guideRows), "rows from the committee alone"],
  ];
  const dl = document.getElementById("stats");
  for (const [n, label] of stats) {
    dl.append(el("div", {}, [el("dt", { text: n }), el("dd", { text: label })]));
  }
  const finding = document.getElementById("finding");
  const dupes = coverage().duplicated;
  if (missing.length === 0 && dupes.length === 0) {
    finding.textContent = `Every city action in the guide shows up in this table, and each code is used once. The table folds those ${GUIDE.length} actions into ${guideRows} rows, often several codes to a project. The other ${ACTIONS.length - guideRows} rows are Environmental Committee work the guide does not list.`;
  } else if (missing.length) {
    finding.textContent = `Guide codes with no row in the table: ${missing.join(", ")}.`;
  } else {
    finding.textContent = `Guide codes cited by more than one row: ${dupes.map(([id]) => id).join(", ")}.`;
  }
}

function renderLegend() {
  const copy = {
    Direct: "The city changes a physical practice itself: waste service, pesticide use, landscaping. Almost all of these rows are committee work. The exception is zero-waste facilities and events, which cites W4 and W5.",
    Enabling: "Codes, grants, fees, parking, and infrastructure that let residents and businesses cut emissions. This is most of the guide’s city chapter.",
    Indirect: "Education, encouragement, and habitat. The emission effect depends on what someone does next. Solar campaigns and restaurant electrification are rated here, not as Enabling.",
    Supporting: "Partnerships, signage, benchmarking, and process. The greenhouse-gas inventory is in this group, and it is one of the higher-cost rows.",
  };
  const root = document.getElementById("legend");
  for (const name of IMPACTS) {
    const n = ACTIONS.filter((a) => a.impact === name).length;
    root.append(el("article", { class: name.toLowerCase() }, [
      el("h3", { text: `${name} · ${n}` }),
      el("p", { text: copy[name] }),
    ]));
  }

  const high = ACTIONS.filter((a) => a.cost === "High");
  const block = document.getElementById("high-cost");
  const list = el("ul", { class: "high-list" });
  for (const action of high) {
    const link = el("a", { href: `#a-${action.id}`, onclick: () => reveal(action.id) });
    link.append(el("span", { class: "num", text: String(action.id).padStart(2, "0") }));
    link.append(el("span", { text: action.name }));
    list.append(el("li", {}, [link]));
  }
  block.append(el("div", { class: "high-cost" }, [
    el("h3", { text: `Higher relative cost · ${high.length} rows` }),
    list,
  ]));
}

function chipSet(rootId, options, key) {
  const root = document.getElementById(rootId);
  const choices = [{ value: "All", label: "All" }, ...options.map((option) => (
    typeof option === "string" ? { value: option, label: option } : option
  ))];
  for (const choice of choices) {
    const button = el("button", {
      type: "button",
      text: choice.label,
      "data-value": choice.value,
      "aria-pressed": choice.value === state[key] ? "true" : "false",
      onclick: () => {
        state[key] = choice.value;
        for (const peer of root.querySelectorAll("button")) {
          peer.setAttribute("aria-pressed", peer.dataset.value === choice.value ? "true" : "false");
        }
        renderActions();
      },
    });
    root.append(button);
  }
}

function matches(action) {
  if (state.impact !== "All" && action.impact !== state.impact) return false;
  if (state.cost !== "All" && action.cost !== state.cost) return false;
  if (state.origin === "Guide" && !citesGuide(action)) return false;
  if (state.origin === "Committee" && citesGuide(action)) return false;
  const q = state.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    action.name,
    action.description,
    action.sourceNote,
    action.impact,
    action.cost,
    ...action.guideIds,
    ...action.guideIds.map((id) => guideById[id]?.name || ""),
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function codeButton(id) {
  return el("button", {
    class: "code",
    type: "button",
    text: id,
    title: guideById[id] ? guideById[id].name : id,
    onclick: () => {
      document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#g-${id}`);
    },
  });
}

function sourceRank(action) {
  if (!action.guideIds.length) return [1, 0, 0];
  const match = action.guideIds[0].match(/^([A-Z]+)(\d+)$/);
  return [0, AREA_RANK[match[1]] ?? 9, Number(match[2])];
}

function compareActions(a, b) {
  let diff = 0;
  if (state.sort === "id") diff = a.id - b.id;
  else if (state.sort === "name") diff = a.name.localeCompare(b.name);
  else if (state.sort === "impact") diff = IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
  else if (state.sort === "cost") diff = COST_RANK[a.cost] - COST_RANK[b.cost];
  else if (state.sort === "chartImpact" || state.sort === "chartFeasibility") {
    const key = state.sort === "chartImpact" ? "impact" : "feasibility";
    const left = ratingById[a.id];
    const right = ratingById[b.id];
    if (!left && !right) diff = 0;
    else if (!left) return 1;
    else if (!right) return -1;
    else diff = left[key] - right[key];
  } else if (state.sort === "board") {
    const left = boardById[a.id];
    const right = boardById[b.id];
    if (!left && !right) diff = 0;
    else if (!left) return 1;
    else if (!right) return -1;
    else diff = BOARD_RANK[left.box] - BOARD_RANK[right.box];
  } else if (state.sort === "when") {
    const left = recommendedWhen(a);
    const right = recommendedWhen(b);
    if (!left && !right) diff = 0;
    else if (!left) return 1;
    else if (!right) return -1;
    else diff = WHEN_RANK[left] - WHEN_RANK[right];
  } else {
    const left = sourceRank(a);
    const right = sourceRank(b);
    diff = left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
  }
  if (diff === 0) return a.id - b.id;
  return state.dir === "asc" ? diff : -diff;
}

function sortLabel() {
  const names = {
    id: "table order",
    name: "action name",
    source: "guide code",
    impact: "greenhouse-gas impact",
    cost: "relative cost",
    chartImpact: "group impact",
    chartFeasibility: "group feasibility",
    board: "the later sheet",
    when: "the recommended year",
  };
  const direction = {
    id: state.dir === "asc" ? "1 to 45" : "45 to 1",
    name: state.dir === "asc" ? "A to Z" : "Z to A",
    source: state.dir === "asc" ? "EL through committee" : "committee through EL",
    impact: state.dir === "asc" ? "Direct first" : "Supporting first",
    cost: state.dir === "asc" ? "Low first" : "High first",
    chartImpact: state.dir === "asc" ? "lower impact first" : "higher impact first",
    chartFeasibility: state.dir === "asc" ? "more challenging first" : "more achievable first",
    board: state.dir === "asc" ? "Strategic Priorities first" : "Efficient Improvements first",
    when: state.dir === "asc" ? "2027 first" : "2030+ first",
  };
  return `${names[state.sort]}, ${direction[state.sort]}`;
}

function renderActions() {
  const list = document.getElementById("action-list");
  list.replaceChildren();
  const shown = ACTIONS.filter(matches).sort(compareActions);
  const count = document.getElementById("result-count");
  const total = shown.length === ACTIONS.length
    ? `${ACTIONS.length} actions`
    : `${shown.length} of ${ACTIONS.length} actions`;
  count.textContent = `${total}, sorted by ${sortLabel()}`;

  if (!shown.length) {
    list.append(el("p", { class: "empty", text: "Nothing matches those filters. Clear one and the rows will come back." }));
    return;
  }

  const head = el("tr");
  for (const column of SORTS) {
    const active = state.sort === column.key;
    const aria = active ? (state.dir === "asc" ? "ascending" : "descending") : "none";
    const mark = !active ? "" : state.dir === "asc" ? " ↑" : " ↓";
    head.append(el("th", { scope: "col", "aria-sort": aria }, [
      el("button", {
        type: "button",
        text: column.label + mark,
        onclick: () => {
          if (state.sort === column.key) state.dir = state.dir === "asc" ? "desc" : "asc";
          else {
            state.sort = column.key;
            state.dir = "asc";
          }
          renderActions();
        },
      }),
    ]));
  }

  const body = el("tbody");
  for (const action of shown) {
    const codes = el("div", { class: "codes" });
    if (action.guideIds.length) {
      for (const id of action.guideIds) codes.append(codeButton(id));
    } else {
      codes.append(el("span", { text: "Environmental Committee" }));
    }
    if (action.sourceNote) {
      codes.append(el("p", { class: "note", text: action.sourceNote }));
    }
    const actionCell = el("td", {}, [
      el("p", { class: "action-name", text: action.name }),
      el("p", { class: "desc", text: action.description }),
    ]);
    if (action.links?.length) {
      const links = el("ul", { class: "links" });
      for (const link of action.links) {
        links.append(el("li", {}, [el("a", { href: link.href, text: link.label })]));
      }
      actionCell.append(links);
    }
    body.append(el("tr", { id: `a-${action.id}` }, [
      el("td", { class: "num", text: String(action.id) }),
      actionCell,
      el("td", {}, [codes]),
      el("td", {}, [el("span", { class: `tag ${action.impact.toLowerCase()}`, text: action.impact })]),
      el("td", {}, [el("span", { class: "tag cost", text: action.cost })]),
      scoreCell(action, "impact"),
      scoreCell(action, "feasibility"),
      boardCell(action),
      whenCell(action),
    ]));
  }

  list.append(el("div", { class: "table-scroll" }, [
    el("table", { class: "sheet" }, [
      el("caption", { class: "sr", text: "Prairie Village climate actions. Sort with the column buttons." }),
      el("thead", {}, [head]),
      body,
    ]),
  ]));
}

function renderCrosswalk() {
  const root = document.getElementById("crosswalk-list");
  const { cited } = coverage();
  for (const area of AREAS) {
    const grid = el("div", { class: "guide-grid" });
    for (const guide of GUIDE.filter((g) => g.area === area.id)) {
      const rows = cited.get(guide.id) || [];
      const rowLinks = el("div", { class: "codes" });
      for (const rowId of rows) {
        const action = actionById[rowId];
        rowLinks.append(el("button", {
          class: "rowlink",
          type: "button",
          text: `${rowId}. ${action.name}`,
          onclick: () => reveal(rowId),
        }));
      }
      if (!rows.length) rowLinks.append(el("span", { class: "note", text: "No row cites this code." }));
      grid.append(el("article", { class: "guide-card", id: `g-${guide.id}` }, [
        el("div", { class: "idline" }, [
          el("span", { class: "gid", text: guide.id }),
        ]),
        el("h3", { text: guide.name }),
        el("p", { text: guide.description }),
        rowLinks,
      ]));
    }
    root.append(el("section", { class: "area-block" }, [
      el("header", {}, [
        el("h3", { text: area.name }),
        el("p", { text: area.share }),
      ]),
      grid,
    ]));
  }
}

function renderResidents() {
  const root = document.getElementById("resident-guide");
  for (const block of RESIDENT_GUIDE) {
    const pairs = el("div");
    for (const [label, text] of block.items) {
      pairs.append(el("div", { class: "pair" }, [
        el("strong", { text: label }),
        el("span", { text }),
      ]));
    }
    root.append(el("article", { class: "resident" }, [
      el("div", {}, [
        el("h3", { text: block.area }),
        el("p", { class: "note", text: block.note }),
      ]),
      pairs,
    ]));
  }
}

function scoreCell(action, key) {
  const rating = ratingById[action.id];
  if (!rating) return el("td", { class: "score", text: "—" });
  const label = key === "impact" ? "impact" : "feasibility";
  return el("td", { class: "score" }, [
    el("a", {
      href: `#rate-${action.id}`,
      text: rating[key].toFixed(1),
      "aria-label": `${action.name}, chart ${label} ${rating[key].toFixed(1)}`,
    }),
  ]);
}

function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function renderRatings() {
  const mount = document.getElementById("rating-chart");
  const notes = document.getElementById("rating-notes");
  const width = 860;
  const height = 560;
  const pad = { l: 54, r: 28, t: 36, b: 48 };
  const x0 = 2.5;
  const x1 = 5.1;
  const y0 = 1.7;
  const y1 = 5.8;
  const px = (feasibility) => pad.l + ((feasibility - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const py = (impact) => pad.t + ((y1 - impact) / (y1 - y0)) * (height - pad.t - pad.b);
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": "Group ratings. Each number opens its row." });

  const axisValue = (value) => (value % 1 === 0 ? String(value) : value.toFixed(1));
  for (let feasibility = 3; feasibility <= 5.001; feasibility += 0.5) {
    const x = px(feasibility);
    svg.append(svgEl("line", { x1: x, x2: x, y1: pad.t, y2: height - pad.b, class: "gridline" }));
    svg.append(svgEl("text", { class: "axis-label", x, y: height - pad.b + 22, "text-anchor": "middle", text: axisValue(feasibility) }));
  }
  for (let impact = 2; impact <= 5.501; impact += 0.5) {
    const y = py(impact);
    svg.append(svgEl("line", { x1: pad.l, x2: width - pad.r, y1: y, y2: y, class: "gridline" }));
    svg.append(svgEl("text", { class: "axis-label", x: pad.l - 10, y: y + 4, "text-anchor": "end", text: axisValue(impact) }));
  }
  svg.append(svgEl("text", {
    class: "axis-title",
    x: (pad.l + width - pad.r) / 2,
    y: height - 8,
    "text-anchor": "middle",
    text: "Feasibility",
  }));
  const axisMid = (pad.t + height - pad.b) / 2;
  svg.append(svgEl("text", {
    class: "axis-title",
    x: 16,
    y: axisMid,
    "text-anchor": "middle",
    transform: `rotate(-90 16 ${axisMid})`,
    text: "Impact",
  }));

  const groups = new Map();
  for (const rating of GROUP_RATINGS) {
    const key = `${rating.impact.toFixed(1)}|${rating.feasibility.toFixed(1)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rating);
  }
  const placed = [];
  const ordered = [...groups.values()].sort((a, b) => a[0].feasibility - b[0].feasibility || b[0].impact - a[0].impact);
  for (const ratings of ordered) {
    const x = px(ratings[0].feasibility);
    const y = py(ratings[0].impact);
    const group = svgEl("g", { class: "plot-point" });
    const onChartOnly = ratings.every((rating) => !actionById[rating.id]);
    group.append(svgEl("circle", { cx: x, cy: y, r: 5.5, class: onChartOnly ? "dot extra" : "dot" }));
    const labels = ratings.map((rating) => String(rating.id));
    const widths = labels.map((label) => label.length * 8.4 + 8);
    const total = widths.reduce((sum, item) => sum + item, 0) - 8;
    let labelY = y - 14;
    let guard = 0;
    while (guard < 14 && placed.some((spot) => Math.abs(spot.x - x) < (spot.w + total) / 2 + 8 && Math.abs(spot.y - labelY) < 16)) {
      labelY -= 16;
      guard += 1;
    }
    if (labelY < 16) labelY = y + 20;
    placed.push({ x, y: labelY, w: total });
    let cursor = x - total / 2;
    ratings.forEach((rating, index) => {
      const label = String(rating.id);
      const action = actionById[rating.id];
      const attrs = { class: action ? "point-link" : "point-link off-list", id: `rate-${rating.id}` };
      if (action) attrs.href = `#a-${rating.id}`;
      const link = svgEl("a", attrs);
      link.append(svgEl("text", {
        x: cursor,
        y: labelY,
        text: label,
        "aria-label": action
          ? `${label}. ${action.name}. Impact ${rating.impact.toFixed(1)}, feasibility ${rating.feasibility.toFixed(1)}.`
          : `${label} is on the chart and is not one of the 45 rows. Impact ${rating.impact.toFixed(1)}, feasibility ${rating.feasibility.toFixed(1)}.`,
      }));
      group.append(link);
      cursor += widths[index];
    });
    svg.append(group);
  }

  mount.replaceChildren(el("div", { class: "chart-scroll" }, [svg]));

  const missing = ACTIONS.filter((action) => !ratingById[action.id]);
  const extras = GROUP_RATINGS.filter((rating) => !actionById[rating.id]);
  const missingList = el("ul", { class: "plain" });
  for (const action of missing) {
    missingList.append(el("li", {}, [
      el("a", { href: `#a-${action.id}`, text: `${action.id}. ${action.name}` }),
    ]));
  }
  const extraText = extras
    .map((rating) => `${rating.id} (impact ${rating.impact.toFixed(1)}, feasibility ${rating.feasibility.toFixed(1)})`)
    .join(" and ");
  notes.replaceChildren(
    el("p", { text: "These rows have no point on the chart." }),
    missingList,
    el("p", { text: `Two labels on the chart are not rows in the table: ${extraText}. Those labels are marked in clay.` }),
  );
}

function boardCell(action) {
  const place = boardById[action.id];
  if (!place) return el("td", { class: "board-cell", text: "—" });
  const box = BOX_BY_ID[place.box];
  return el("td", { class: "board-cell" }, [
    el("a", { href: `#box-${box.id}`, text: box.short }),
  ]);
}

function chartBoxFor(rating) {
  const impact = rating.impact >= 4.3 ? "higher" : "lower";
  const feasibility = rating.feasibility < 3.6 ? "lower" : rating.feasibility < 4.2 ? "moderate" : "higher";
  return BOXES.find((box) => box.impact === impact && box.feasibility === feasibility);
}

function rowLink(id, name) {
  return el("a", { href: `#a-${id}`, text: name ? `${id}. ${name}` : String(id) });
}

function renderBoard() {
  const mount = document.getElementById("board-boxes");
  const grid = el("div", { class: "board-grid" });
  for (const box of BOXES) {
    const places = BOARD.filter((place) => place.box === box.id);
    const chips = el("div", { class: "stickers" });
    const ordered = [...places].sort((a, b) => {
      if (a.scribbled) return 1;
      if (b.scribbled) return -1;
      return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    });
    for (const place of ordered) {
      const classes = ["sticker", place.color];
      if (place.ring) classes.push("ring");
      if (place.scribbled) classes.push("scribbled");
      const label = place.scribbled ? "×" : String(place.id);
      const action = place.id != null ? actionById[place.id] : null;
      const attrs = { class: classes.join(" "), text: label };
      if (place.scribbled) attrs["aria-label"] = "Yellow sticker scribbled out. The number is not readable.";
      else if (place.writtenOn) attrs["aria-label"] = `${place.id}, written on the sticker for ${place.writtenOn}`;
      else if (!action) attrs["aria-label"] = `${place.id} is on the sheet and is not one of the 45 rows`;
      const chip = action ? el("a", { ...attrs, href: `#a-${place.id}` }) : el("span", attrs);
      chips.append(chip);
    }
    const cell = el("article", { class: `board-box box ${box.className}`, id: `box-${box.id}` }, [
      el("h3", { text: box.name }),
      chips,
    ]);
    if (box.id === "high-value") {
      cell.append(el("p", { class: "note board-note", text: "16 and 17 are written on the sticker for 23." }));
    }
    if (box.id === "efficient") {
      cell.append(el("p", { class: "note board-note", text: "One yellow sticker is scribbled out. The number is not readable." }));
    }
    grid.append(cell);
  }
  mount.replaceChildren(grid);

  const diff = document.getElementById("board-diff");
  const lower = [];
  const higher = [];
  const columnOnly = [];
  const same = [];
  for (const place of BOARD) {
    if (place.scribbled || place.id == null) continue;
    const rating = ratingByLabel[String(place.id)];
    if (!rating) continue;
    const chartBox = chartBoxFor(rating);
    const boardBox = BOX_BY_ID[place.box];
    const action = actionById[place.id];
    const item = { place, rating, chartBox, boardBox, action };
    if (chartBox.id === boardBox.id) same.push(item);
    else if (chartBox.impact !== boardBox.impact && boardBox.impact === "lower") lower.push(item);
    else if (chartBox.impact !== boardBox.impact) higher.push(item);
    else columnOnly.push(item);
  }
  const byImpact = (a, b) => b.rating.impact - a.rating.impact || Number(a.place.id) - Number(b.place.id);
  lower.sort(byImpact);
  higher.sort(byImpact);
  columnOnly.sort((a, b) => Math.abs(BOARD_RANK[b.chartBox.id] - BOARD_RANK[b.boardBox.id]) - Math.abs(BOARD_RANK[a.chartBox.id] - BOARD_RANK[a.boardBox.id]) || Number(a.place.id) - Number(b.place.id));
  const listFor = (items) => {
    const list = el("ul", { class: "plain" });
    for (const item of items) {
      const who = item.action
        ? rowLink(item.action.id, item.action.name)
        : el("span", { text: `${item.place.id}, which is not a row in the table` });
      const sentence = ` Chart impact ${item.rating.impact.toFixed(1)}, feasibility ${item.rating.feasibility.toFixed(1)}, which reads as ${item.chartBox.name}. The sheet puts it in ${item.boardBox.name}.`;
      list.append(el("li", {}, [who, el("span", { text: sentence })]));
    }
    return list;
  };
  const sameLine = el("p", {}, [el("span", { text: "The same box on both readings: " })]);
  same
    .sort((a, b) => String(a.place.id).localeCompare(String(b.place.id), undefined, { numeric: true }))
    .forEach((item, index) => {
      if (index) sameLine.append(el("span", { text: ", " }));
      if (item.action) sameLine.append(el("a", { href: `#a-${item.action.id}`, text: String(item.action.id) }));
      else sameLine.append(el("span", { text: `${item.place.id} (not a table row)` }));
    });
  sameLine.append(el("span", { text: "." }));

  const chartOnly = GROUP_RATINGS.filter((rating) => !BOARD.some((place) => String(place.id) === String(rating.id)));
  const sheetOnly = BOARD.filter((place) => place.id != null && !place.scribbled && !ratingByLabel[String(place.id)]);
  const neither = ACTIONS.filter((action) => !ratingById[action.id] && !boardById[action.id]);

  const chartOnlyList = el("ul", { class: "plain" });
  for (const rating of chartOnly) {
    const action = actionById[rating.id];
    chartOnlyList.append(el("li", {}, [
      action ? rowLink(action.id, action.name) : el("span", { text: String(rating.id) }),
      el("span", { text: action
        ? " was on the chart and is not on the sheet."
        : " was on the chart, is not on the sheet, and is not a row in the table." }),
    ]));
  }
  const sheetOnlyList = el("ul", { class: "plain" });
  for (const place of sheetOnly) {
    const action = actionById[place.id];
    const box = BOX_BY_ID[place.box];
    sheetOnlyList.append(el("li", {}, [
      action ? rowLink(action.id, action.name) : el("span", { text: String(place.id) }),
      el("span", { text: `${action ? "" : ", which is not a row in the table,"} is in ${box.name} on the sheet and has no point on the chart.` }),
    ]));
  }
  const neitherList = el("ul", { class: "plain" });
  for (const action of neither) neitherList.append(el("li", {}, [rowLink(action.id, action.name)]));

  diff.replaceChildren(
    el("h3", { text: "Lower impact on the sheet than on the chart" }),
    listFor(lower),
    el("h3", { text: "Higher impact on the sheet than on the chart" }),
    listFor(higher),
    el("h3", { text: "Same impact row, different feasibility column" }),
    listFor(columnOnly),
    sameLine,
    el("h3", { text: "On the chart and not on the sheet" }),
    chartOnlyList,
    el("h3", { text: "On the sheet and not on the chart" }),
    sheetOnlyList,
    el("h3", { text: "On neither" }),
    neitherList,
  );
}

function recommendedWhen(action) {
  const place = boardById[action.id];
  if (!place) return null;
  if (place.box === "reassess") return "awareness";
  if (place.box === "strategic" || place.box === "capacity") return "planning";
  return action.cost === "Low" ? "opportunities" : "budget";
}

function whenCell(action) {
  const when = recommendedWhen(action);
  if (!when) return el("td", { class: "when-cell", text: "—" });
  return el("td", { class: "when-cell" }, [
    el("a", { href: `#when-${when}`, text: WHEN_SHORT[when] }),
  ]);
}

function sequenceReason(action, place) {
  const box = BOX_BY_ID[place.box];
  const rating = ratingById[action.id];
  const parts = [`${box.name}. Printed cost ${action.cost}.`];
  if (place.writtenOn) parts.push(`Written on the sticker for ${place.writtenOn}.`);
  if (rating) {
    parts.push(`Chart impact ${rating.impact.toFixed(1)}, feasibility ${rating.feasibility.toFixed(1)}.`);
    const chartBox = chartBoxFor(rating);
    if (chartBox.id !== place.box) parts.push(`The chart reading was ${chartBox.name}.`);
  } else {
    parts.push("No point on the chart.");
  }
  return parts.join(" ");
}

function renderSequence() {
  const mount = document.getElementById("sequence-columns");
  const grid = el("div", { class: "when-grid" });
  const buckets = Object.fromEntries(WHEN.map((column) => [column.id, []]));
  for (const action of ACTIONS) {
    const when = recommendedWhen(action);
    if (when) buckets[when].push(action);
  }
  for (const column of WHEN) {
    const boxFirst = { quick: 0, "high-value": 1, efficient: 2, strategic: 0, capacity: 1, reassess: 0 };
    const items = buckets[column.id].sort((a, b) => {
      const boxDiff = boxFirst[boardById[a.id].box] - boxFirst[boardById[b.id].box];
      if (boxDiff) return boxDiff;
      const left = ratingById[a.id];
      const right = ratingById[b.id];
      if (left && !right) return -1;
      if (!left && right) return 1;
      if (left && right && left.impact !== right.impact) return right.impact - left.impact;
      if (left && right && left.feasibility !== right.feasibility) return right.feasibility - left.feasibility;
      return a.id - b.id;
    });
    const list = el("ul");
    for (const action of items) {
      const place = boardById[action.id];
      list.append(el("li", {}, [
        el("a", { href: `#a-${action.id}`, text: `${action.id}. ${action.name}` }),
        el("p", { class: "note", text: sequenceReason(action, place) }),
      ]));
    }
    grid.append(el("article", { class: `when-col ${column.className}`, id: `when-${column.id}` }, [
      el("h3", { text: column.name }),
      el("p", { class: "note", text: `${items.length} actions` }),
      list,
    ]));
  }
  mount.replaceChildren(grid);

  const waiting = ACTIONS.filter((action) => !recommendedWhen(action));
  const notes = document.getElementById("sequence-notes");
  const list = el("ul", { class: "plain" });
  for (const action of waiting) list.append(el("li", {}, [el("a", { href: `#a-${action.id}`, text: `${action.id}. ${action.name}` })]));
  notes.replaceChildren(
    el("p", { text: "The recommendation has no year for these rows. They have no box on the board." }),
    list,
    el("p", { text: "47 and 48 are pencil circles on the six-box board and are not rows in the table, so the recommendation gives them no year. On the later sequencing sheet, both are written in 2030+ Awareness." }),
  );
}

function placedNote(place, compareEarlier, brief) {
  const action = actionById[place.id];
  const parts = [];
  if (place.onLine) {
    parts.push(`The sticker sits on the line between this column and ${WHEN_BY_ID[place.onLine].name}. The number is read in ${WHEN_BY_ID[place.when].name}.`);
  }
  if (!action) {
    const board = BOARD.find((item) => item.id === place.id);
    const box = board ? BOX_BY_ID[board.box].name : "the six-box sheet";
    parts.push(brief
      ? "Written in pencil. Not a row in the action table."
      : `On the six-box sheet, ${place.id} is a pencil circle in ${box}. It is not a row in the table. The recommendation had no year for it.`);
  } else if (brief) {
    const board = boardById[action.id];
    parts.push(board
      ? `${BOX_BY_ID[board.box].name}. Printed cost ${action.cost}.`
      : `Not on the six-box sheet. Printed cost ${action.cost}.`);
  } else if (!boardById[action.id]) {
    parts.push(`This row is not on the six-box sheet, so the recommendation had no year for it. Printed cost ${action.cost}.`);
  } else {
    const box = BOX_BY_ID[boardById[action.id].box];
    const recommended = recommendedWhen(action);
    const where = recommended === place.when
      ? "The recommendation had this in the same column."
      : `The recommendation had this in ${WHEN_BY_ID[recommended].name}.`;
    parts.push(`${box.name}. Printed cost ${action.cost}. ${where}`);
  }
  if (compareEarlier && !brief) {
    const previous = SEQUENCE_PLACED.find((item) => item.id === place.id);
    parts.push(previous && previous.when === place.when
      ? "It was already in this column on the earlier photograph."
      : "This mark was not on the earlier photograph.");
  }
  return parts.join(" ");
}

function renderPlacement(places, prefix, options = {}) {
  const compareEarlier = options.compareEarlier;
  const brief = options.brief;
  const mount = document.getElementById(`${prefix}-columns`);
  const grid = el("div", { class: "when-grid" });
  const earlier = [];
  const later = [];
  const same = [];
  const added = [];
  for (const column of WHEN) {
    const items = places.filter((place) => place.when === column.id);
    const chips = el("div", { class: "stickers" });
    const list = el("ul");
    for (const place of items) {
      const action = actionById[place.id];
      const chipClass = place.handwritten ? "sticker pencil" : `sticker ${place.color}`;
      const chip = action
        ? el("a", { class: chipClass, href: `#a-${action.id}`, text: String(place.id) })
        : el("span", { class: chipClass, text: String(place.id) });
      chips.append(chip);
      const title = action
        ? el("a", { href: `#a-${action.id}`, text: action.name })
        : el("span", { text: "Written in pencil." });
      list.append(el("li", { id: `${prefix}-${place.id}` }, [
        title,
        el("p", { class: "note", text: placedNote(place, compareEarlier, brief) }),
      ]));
      const recommended = action ? recommendedWhen(action) : null;
      if (!recommended) added.push(place);
      else if (recommended === place.when) same.push(place);
      else if (WHEN_RANK[place.when] < WHEN_RANK[recommended]) earlier.push(place);
      else later.push(place);
    }
    grid.append(el("article", { class: `when-col ${column.className}`, id: `${prefix}-${column.id}` }, [
      el("h3", { text: column.name }),
      el("p", { class: "note", text: `${items.length} on the sheet` }),
      chips,
      list,
    ]));
  }
  mount.replaceChildren(grid);

  const line = (place) => {
    const action = actionById[place.id];
    const who = action
      ? el("a", { href: `#a-${action.id}`, text: `${place.id}. ${action.name}` })
      : el("span", { text: String(place.id) });
    const recommended = action ? recommendedWhen(action) : null;
    const sentence = !recommended
      ? ` is in ${WHEN_BY_ID[place.when].name}. The recommendation had no year for it.`
      : recommended === place.when
        ? ` is in ${WHEN_BY_ID[place.when].name}, the same column as the recommendation.`
        : ` is in ${WHEN_BY_ID[place.when].name}. The recommendation had it in ${WHEN_BY_ID[recommended].name}.`;
    return el("li", {}, [who, el("span", { text: sentence })]);
  };
  const diff = document.getElementById(`${prefix}-diff`);
  const blocks = [
    el("h3", { text: "Earlier than the recommendation" }),
    el("ul", { class: "plain" }, earlier.map(line)),
    el("h3", { text: "Later than the recommendation" }),
    el("ul", { class: "plain" }, later.map(line)),
    el("h3", { text: "The same column" }),
    el("ul", { class: "plain" }, same.map(line)),
    el("h3", { text: "On the sheet, with no recommended year" }),
    el("ul", { class: "plain" }, added.map(line)),
  ];
  if (compareEarlier) {
    const placedIds = new Set(places.filter((place) => actionById[place.id]).map((place) => place.id));
    const waiting = ACTIONS.filter((action) => !placedIds.has(action.id));
    const waitingList = el("ul", { class: "plain" });
    for (const action of waiting) {
      waitingList.append(el("li", {}, [el("a", { href: `#a-${action.id}`, text: `${action.id}. ${action.name}` })]));
    }
    blocks.push(
      el("h3", { text: "Still only in the recommendation" }),
      el("p", { text: "These rows are not on this photograph." }),
      waitingList,
    );
  }
  diff.replaceChildren(...blocks);
}

function reveal(actionId) {
  state.q = "";
  state.impact = "All";
  state.cost = "All";
  state.origin = "All";
  document.getElementById("q").value = "";
  for (const group of ["impact-filters", "cost-filters", "origin-filters"]) {
    for (const button of document.getElementById(group).querySelectorAll("button")) {
      button.setAttribute("aria-pressed", button.dataset.value === "All" ? "true" : "false");
    }
  }
  renderActions();
  const node = document.getElementById(`a-${actionId}`);
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#a-${actionId}`);
}

function openHash() {
  const hash = location.hash.replace("#", "");
  if (hash.startsWith("a-")) {
    const id = Number(hash.slice(2));
    if (actionById[id]) reveal(id);
  } else if (hash.startsWith("g-") || hash.startsWith("rate-") || hash.startsWith("box-") || hash.startsWith("when-") || hash.startsWith("placed-") || hash.startsWith("later-")) {
    document.getElementById(hash)?.scrollIntoView({ block: "center" });
  }
}

document.getElementById("q").addEventListener("input", (event) => {
  state.q = event.target.value;
  renderActions();
});

renderStats();
renderLegend();
chipSet("impact-filters", IMPACTS, "impact");
chipSet("cost-filters", COSTS, "cost");
chipSet("origin-filters", [
  { value: "Guide", label: "Cites the guide" },
  { value: "Committee", label: "Committee only" },
], "origin");
renderActions();
renderCrosswalk();
renderResidents();
renderRatings();
renderBoard();
renderSequence();
renderPlacement(SEQUENCE_PLACED, "placed", {});
renderPlacement(SEQUENCE_LATER, "later", { compareEarlier: true, brief: true });
openHash();
window.addEventListener("hashchange", openHash);

const report = coverage();
if (report.missing.length || report.duplicated.length) {
  console.warn("Guide coverage problem", report);
}
