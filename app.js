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
];

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
  else {
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
  };
  const direction = {
    id: state.dir === "asc" ? "1 to 45" : "45 to 1",
    name: state.dir === "asc" ? "A to Z" : "Z to A",
    source: state.dir === "asc" ? "EL through committee" : "committee through EL",
    impact: state.dir === "asc" ? "Direct first" : "Supporting first",
    cost: state.dir === "asc" ? "Low first" : "High first",
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
  } else if (hash.startsWith("g-")) {
    document.getElementById(hash)?.scrollIntoView({ block: "start" });
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
openHash();

const report = coverage();
if (report.missing.length || report.duplicated.length) {
  console.warn("Guide coverage problem", report);
}
