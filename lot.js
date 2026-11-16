function mountLot() {
  var tracked = [];
  var origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opt) {
    tracked.push([this, type, fn, opt]);
    return origAdd.call(this, type, fn, opt);
  };
  var rafId = 0;
  var alive = true;
  var rendererRef = null;
  var resizeObserver = null;
  try {
(function () {
  "use strict";
  function asset(p) {
    var host = (location.hostname || "").toLowerCase();
    var prefixed = host === "preview.grok.genai.mil" || host === "preview.grok.mil" || host === "preview.grokgsac.com";
    var m = prefixed && (location.pathname || "").match(/^\/hds-[a-z0-9]+-\d+-[a-z0-9]+/i);
    if (m) return m[0] + p;
    return p.charAt(0) === "/" ? p.slice(1) : p;
  }
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    var bar = $("veilBar");
    if (bar) { bar.style.animation = "none"; bar.style.transform = "scaleX(1)"; }
    stage.classList.add("is-ready");
    var veil = $("veil");
    if (veil) veil.classList.add("is-gone");
    labels.classList.add("is-intro");
    setTimeout(function () { labels.classList.remove("is-intro"); }, calm ? 0 : 4600);
  }

  /* ---------- config: everything you will swap lives here ---------- */
  // w and h are the coordinate space every hitbox, path and effect uses. The image itself can be any
  // resolution with the same 4:3 framing; it is simply stretched over this space.
  var MAP = { src: asset("/lot/map.jpg"), w: 1600, h: 1200,
    // glow: the plate's lit windows and neon, pre-blurred, on black. Added over the map: faint by day, full at night.
    glow: asset("/lot/glow.jpg") };          // map image and its pixel size

  // Higher-resolution side-view cast. Four walk frames, face and back, mirrored for left.
  var SPRITE = { cols: 4, rows: 2, cellW: 72, cellH: 108, feet: 104, scale: 0.48, fps: 9 };

  // Walkable network in map pixels. Characters only ever move along these edges.
  var NODES = [
    [585,548],[578,628],[522,708],[524,800],[548,862],[588,908],[640,958],[560,1005],   // 0-7  FX door down through the lot
    [768,892],[868,838],[905,788],[968,748],[1122,670],                                  // 8-12 Mustang, Tools sidewalk
    [1198,655],[1228,598],[1205,528],[1262,553],[1370,615],[1540,712],                   // 13-18 crossing, theatre sidewalk
    [1558,805],[1560,890],[1450,975],[1330,925],[1232,902],                              // 19-23 round the station to the booth
    [1135,488],                                                                          // 24 theatre sidewalk, west end
    [340,24],[520,118],[668,196],                                                        // 25-27 alley behind the stage (extras only)
    [935,34],[1080,102],[1210,163],                                                      // 28-30 top street (extras only)
    [120,745],[225,805],                                                                 // 31-32 west lot (extras only)
    [1075,1035],[1235,1055]                                                              // 33-34 car park (extras only)
  ];
  var EDGES = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[6,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],
    [15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[15,24],
    [25,26],[26,27],[28,29],[29,30],[31,32],[33,34]
  ];

  // poly is in map pixels; node is where the character stands for that zone. Small zones first.
  var ZONES = [
    { id: "mustang", toast: "The ’07 Mustang. Hood’s up, still waiting on a part.", node: 8,
      poly: [[672,775],[765,748],[832,800],[785,852],[690,822]] },
    { id: "reel", label: "Demo reel", title: "Demo reel", node: 4,
      poly: [[330,838],[392,728],[498,688],[522,812],[405,905],[335,885]], anchor: [452,930] },
    { id: "resume", label: "Resume by request", title: "Resume by request", node: 23,
      poly: [[1163,790],[1268,722],[1292,760],[1292,862],[1200,885],[1163,862]], anchor: [1250,950] },
    { id: "tools", label: "Tools & R&D", title: "Tools and R&D", node: 11,
      poly: [[695,445],[860,378],[1030,432],[1050,612],[872,782],[700,692]], anchor: [872,330] },
    { id: "credits", label: "Film & TV", title: "Film and television", node: 16,
      poly: [[1150,215],[1290,165],[1395,330],[1385,545],[1300,585],[1172,470]], anchor: [1262,630] },
    { id: "fx", label: "CG/FX Supervisor", nav: "About me", title: "About me", node: 0,
      poly: [[0,205],[250,75],[690,225],[690,560],[455,695],[345,765],[222,720],[215,640],[150,665],[0,590]], anchor: [330,300] }
  ];
  var NAV_ORDER = ["fx", "tools", "credits", "reel", "resume"];
  var HERO_START = 8;

  // Crew with a job: each walks back and forth between two nodes, pausing at both ends.
  var ROUTINES = [[6,0],[8,11],[17,13]];
  // Titles the theatre marquee cycles through.
  var TITLES = ["DUNE: PART ONE", "READY PLAYER ONE", "THE DARK KNIGHT RISES", "VENOM: LET THERE BE CARNAGE",
                "HOUSE OF THE DRAGON", "STRANGER THINGS", "THE RINGS OF POWER", "MASTERS OF THE AIR",
                "DOCTOR STRANGE", "ALITA: BATTLE ANGEL", "JUPITER'S LEGACY"];
  // What crew say when clicked. Placeholder chatter: swap in real facts about your shows.
  var LINES = ["Reel’s playing on the truck.", "Is this the line for catering?", "We’re rolling in five.",
               "Looking for the supervisor? Yellow jacket.", "Ask at the Tools building about the pipeline.",
               "That dragon needs another pass.", "Checking the gate.", "Credits are up on the marquee.",
               "Resume? Ask at the booth.", "Who parked the Mustang here?", "We’ll fix it in post.", "Copy that."];

  // Crew. standing: [x, y, facing away?, mirrored?]. walking: the nodes each extra wanders between.
  var STANDING = [
    [290,775,1,0],[255,792,1,1],[548,556,1,0],[520,1002,1,0],[150,880,0,0],[725,932,0,1],[838,846,1,1],
    [1012,724,0,0],[1232,538,1,0],[1318,588,1,1],[1262,888,1,0],[1050,1022,1,0],[1138,992,1,1],
    [318,785,1,0],[562,885,1,1],[600,575,0,1],[756,926,1,1],[858,862,1,1],[1040,712,0,1],[940,765,0,0],
    [1278,556,1,1],[1335,598,1,0],[1180,505,0,0],[1440,655,0,1],[1292,898,1,1],[1385,930,0,0],
    [1085,1034,0,1],[1180,1060,0,0],[190,770,0,0],[432,72,0,0],[1010,70,0,0]
  ];
  var WALKING = [
    [0,1,2,3,4,5,6,7,8],[6,8,9,10,11,12],[4,5,6,7,8,9],[15,16,17,18,24],[13,14,15,24,17],
    [20,21,22,23],[25,26,27],[28,29,30],[31,32],[33,34],
    [0,1,2,3,4,5,6,7,8],[8,9,10,11,12,13],[15,16,17,18,24],[20,21,22,23],[2,3,4,5,6],[11,12,13,14,15,16]
  ];

  /* ---------- dom ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), canvas = $("gl"), labels = $("labels"), nav = $("nav");
  var panel = $("panel"), panelTitle = $("panelTitle"), panelBody = $("panelBody");
  var hint = $("hint"), toast = $("toast"), debugBox = $("debug"), dbgBtn = $("dbgBtn");
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var byId = {};
  ZONES.forEach(function (z) { byId[z.id] = z; });

  var current = null, hovered = null, debug = false, toastTimer = 0, pending = 0;

  /* ---------- pathfinding on the walk network ---------- */
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }
  function spotAtNode(n) { return { x: NODES[n][0], y: NODES[n][1], a: n, b: n }; }
  // closest point on the network to an arbitrary map position
  function nearestSpot(x, y) {
    var best = null;
    EDGES.forEach(function (e) {
      var A = NODES[e[0]], B = NODES[e[1]], vx = B[0] - A[0], vy = B[1] - A[1];
      var t = ((x - A[0]) * vx + (y - A[1]) * vy) / (vx * vx + vy * vy);
      t = Math.max(0, Math.min(1, t));
      var px = A[0] + vx * t, py = A[1] + vy * t, d = dist(x, y, px, py);
      if (!best || d < best.d) {
        best = { x: px, y: py, d: d, a: t === 1 ? e[1] : e[0], b: t === 0 ? e[0] : e[1] };
      }
    });
    return best;
  }
  // A spot is {x, y, a, b}: at a node when a === b, otherwise somewhere on edge a-b.
  function findPath(from, to) {
    var onSame = (to.a === from.a || to.a === from.b) && (to.b === from.a || to.b === from.b) ||
                 (from.a === to.a || from.a === to.b) && (from.b === to.a || from.b === to.b);
    if (onSame) return [to];
    var N = NODES.length, D = [], prev = [], done = [], i;
    for (i = 0; i < N; i++) { D.push(Infinity); prev.push(-1); done.push(false); }
    D[from.a] = dist(from.x, from.y, NODES[from.a][0], NODES[from.a][1]);
    D[from.b] = Math.min(D[from.b], dist(from.x, from.y, NODES[from.b][0], NODES[from.b][1]));
    for (;;) {
      var u = -1;
      for (i = 0; i < N; i++) if (!done[i] && D[i] < Infinity && (u < 0 || D[i] < D[u])) u = i;
      if (u < 0) break;
      done[u] = true;
      EDGES.forEach(function (e) {
        var v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1;
        if (v < 0) return;
        var w = D[u] + dist(NODES[u][0], NODES[u][1], NODES[v][0], NODES[v][1]);
        if (w < D[v]) { D[v] = w; prev[v] = u; }
      });
    }
    var ea = D[to.a] + dist(to.x, to.y, NODES[to.a][0], NODES[to.a][1]);
    var eb = D[to.b] + dist(to.x, to.y, NODES[to.b][0], NODES[to.b][1]);
    var end = ea <= eb ? to.a : to.b;
    if (D[end] === Infinity) return null;
    var chain = [];
    for (i = end; i >= 0; i = prev[i]) chain.unshift(spotAtNode(i));
    if (to.a !== to.b) chain.push(to);
    return chain;
  }
  function pathLength(actor, path) {
    var len = 0, x = actor.x, y = actor.y;
    path.forEach(function (q) { len += dist(x, y, q.x, q.y); x = q.x; y = q.y; });
    return len;
  }

  /* ---------- actors ---------- */
  function makeActor(spot, speed) {
    return { x: spot.x, y: spot.y, a: spot.a, b: spot.b, path: [], speed: speed, row: 0, flip: 1,
             moving: false, onArrive: null, phase: Math.random() * 4, ox: 0, oy: 0, wait: 0, pool: null, k: 1, hx: 0, hy: 0, mob: 1 };
  }
  function moveActor(actor, dt) {
    var left = actor.speed * dt;
    while (actor.path.length && left > 0) {
      var q = actor.path[0], dx = q.x - actor.x, dy = q.y - actor.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= left) {
        actor.x = q.x; actor.y = q.y; actor.a = q.a; actor.b = q.b;
        actor.path.shift(); left -= d;
      } else {
        // remember which edge we are on, so a new destination can be routed mid-walk
        if (actor.a === actor.b) {
          if (q.a !== q.b) { actor.a = q.a; actor.b = q.b; }
          else if (q.a !== actor.a) actor.b = q.a;
        }
        actor.x += dx / d * left; actor.y += dy / d * left; left = 0;
        if (Math.abs(dx) > 0.5) actor.flip = dx > 0 ? 1 : -1;
        actor.row = dy < 0 ? 1 : 0;
      }
    }
    var was = actor.moving;
    actor.moving = actor.path.length > 0;
    if (was && !actor.moving && actor.onArrive) { var cb = actor.onArrive; actor.onArrive = null; cb(); }
  }

  var hero = makeActor(spotAtNode(HERO_START), 150);
  function travel(spot, done) {
    hero.onArrive = null;
    var path = findPath(hero, spot);
    if (!path) return false;
    var len = pathLength(hero, path);
    if (len < 1) { hero.path = []; if (done) done(); return true; }
    hero.path = path;
    hero.speed = Math.min(187, Math.max(108, len / 5.5));   // long trips get a jog
    hero.onArrive = done || null;
    hero.moving = true;
    return true;
  }

  /* ---------- panel + routing ---------- */
  function setHash(v) {
    try { if (location.hash.replace("#", "") !== v) location.hash = v; } catch (e) {}
  }
  function openPanel(id) {
    var z = byId[id], tpl = $("tpl-" + id);
    if (!z || !tpl) return;
    current = id;
    panelTitle.textContent = z.title;
    panelBody.innerHTML = "";
    panelBody.appendChild(tpl.content.cloneNode(true));
    panel.hidden = false;
    panel.classList.remove("is-in");
    requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add("is-in"); }); });
    panel.scrollTop = 0;
    markNav();
    setHash(id);
    focusOn(NODES[z.node][0], NODES[z.node][1]);
    visit(id);
  }
  panelBody.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || form.id !== "resumeForm") return;
    e.preventDefault();
    var note = document.createElement("p");
    note.textContent = "Request received. The resume goes out the same day.";
    form.replaceWith(note);
  });
  function closePanel() {
    if (!current) return;
    current = null;
    panel.classList.remove("is-in");
    panel.hidden = true;
    panelBody.innerHTML = "";
    markNav();
    setHash("");
  }
  function markNav() {
    Array.prototype.forEach.call(nav.children, function (b) {
      b.setAttribute("aria-current", b.dataset.id === current ? "true" : "false");
    });
    ZONES.forEach(function (z) { if (z.chip) z.chip.classList.toggle("is-on", z.id === current); });
  }
  // instant = open the panel straight away (nav bar, deep links).
  // Otherwise it opens when the character arrives, or after ~2 s on a long walk.
  function go(id, instant) {
    var z = byId[id];
    if (!z) return;
    clearTimeout(pending);
    hint.classList.add("is-gone");
    var spot = spotAtNode(z.node);
    if (z.toast) { travel(spot, function () { say(wrapped ? "She runs. Don’t touch anything." : z.toast); }); return; }
    if (instant) { openPanel(id); travel(spot, function () { arrive(id); }); return; }
    var opened = false;
    var open = function () { if (opened) return; opened = true; clearTimeout(pending); openPanel(id); };
    travel(spot, function () { arrive(id); open(); });
    if (!opened) pending = setTimeout(open, 2200);
  }
  function say(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }
  function route() {
    var id = location.hash.replace("#", "");
    if (id === (current || "")) return;
    if (byId[id] && byId[id].title) go(id, true);
    else if (!id) closePanel();
  }

  /* ---------- call sheet: which sections this visitor has opened ---------- */
  var seen = {}, wrapped = false;
  try { JSON.parse(localStorage.getItem("po-callsheet") || "[]").forEach(function (id) { if (byId[id]) seen[id] = true; }); } catch (e) {}
  var sheetBtn = $("sheetBtn"), sheetBox = $("sheetBox"), sheetList = $("sheetList");
  function allSeen() { return NAV_ORDER.every(function (id) { return seen[id]; }); }
  function drawSheet() {
    var n = NAV_ORDER.filter(function (id) { return seen[id]; }).length;
    sheetBtn.textContent = "Call sheet " + n + "/" + NAV_ORDER.length;
    sheetList.innerHTML = "";
    NAV_ORDER.forEach(function (id) {
      var li = document.createElement("li");
      if (seen[id]) li.className = "is-done";
      li.textContent = (seen[id] ? "✓ " : "○ ") + (byId[id].nav || byId[id].label);
      sheetList.appendChild(li);
    });
  }
  function saveSheet() {
    try { localStorage.setItem("po-callsheet", JSON.stringify(Object.keys(seen))); } catch (e) {}
  }
  function visit(id) {
    if (seen[id]) return;
    seen[id] = true; saveSheet(); drawSheet();
    if (allSeen() && !wrapped) { wrapped = true; say("That’s a wrap. The Mustang finally started."); }
  }
  sheetBtn.addEventListener("click", function () {
    sheetBox.hidden = !sheetBox.hidden;
    sheetBtn.setAttribute("aria-expanded", sheetBox.hidden ? "false" : "true");
  });
  $("sheetReset").addEventListener("click", function () { seen = {}; wrapped = false; saveSheet(); drawSheet(); });
  wrapped = allSeen();
  drawSheet();

  NAV_ORDER.forEach(function (id) {
    var z = byId[id];
    var b = document.createElement("button");
    b.type = "button"; b.textContent = z.nav || z.label; b.dataset.id = id;
    b.addEventListener("click", function () { go(id, true); panelTitle.focus(); });
    nav.appendChild(b);

    var c = document.createElement("button");
    c.type = "button"; c.className = "chip"; c.textContent = z.label; c.tabIndex = -1; // nav bar is the keyboard path
    c.addEventListener("click", function () { go(id, false); });
    c.addEventListener("pointerenter", function () { hovered = z; });
    c.addEventListener("pointerleave", function () { if (hovered === z) hovered = null; });
    labels.appendChild(c);
    z.chip = c;
  });
  $("panelClose").addEventListener("click", closePanel);
  window.addEventListener("hashchange", route);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePanel();
    if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey && !e.altKey) setDebug(!debug);
  });

  function setDebug(on) {
    debug = on;
    debugBox.hidden = !on;
    dbgBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  dbgBtn.addEventListener("click", function () { setDebug(!debug); });
  $("ptsClear").addEventListener("click", function () { $("pts").value = ""; });

  /* ---------- view (2D camera in map pixels) ---------- */
  var vw = 1, vh = 1, minZ = 1, maxZ = 4, sized = false;
  var view = { cx: hero.x, cy: hero.y - 120, z: 1 };
  var camTarget = null, zoomTarget = null;

  function clampView() {
    view.z = Math.min(maxZ, Math.max(minZ, view.z));
    var hx = vw / 2 / view.z, hy = vh / 2 / view.z;
    view.cx = Math.min(MAP.w - hx, Math.max(hx, view.cx));
    view.cy = Math.min(MAP.h - hy, Math.max(hy, view.cy));
  }
  function screenToMap(p) {
    return { x: view.cx + (p.x - vw / 2) / view.z, y: view.cy + (p.y - vh / 2) / view.z };
  }
  function zoomAt(p, z) {
    zoomTarget = null;
    var a = screenToMap(p);
    view.z = z; clampView();
    var b = screenToMap(p);
    view.cx += a.x - b.x; view.cy += a.y - b.y; clampView();
  }
  function focusOn(x, y) { camTarget = { x: x, y: y }; }
  function zoneAt(m) {
    for (var i = 0; i < ZONES.length; i++) if (inside(m, ZONES[i].poly)) return ZONES[i];
    return null;
  }
  function inside(m, poly) {
    var hit = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > m.y) !== (yj > m.y) && m.x < (xj - xi) * (m.y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  /* ---------- three.js scene ---------- */
  var renderer, scene, camera;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  } catch (e) { renderer = null; }

  if (!renderer) {
    stage.classList.add("no-gl");
    stage.style.backgroundImage = "url(" + MAP.src + ")";
    hint.textContent = "The map needs WebGL. Use the section buttons above.";
    calm = true;
    reveal();
    route();
    return;
  }

  rendererRef = renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x0c0d10, 1);
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
  camera.position.z = 10;

  // 1. the plate. World units are map pixels, y flipped (world y = -map y).
  var mapTex = new THREE.Texture();
  function paintMap(image) {
    mapTex.image = image;
    mapTex.needsUpdate = true;
    reveal();
  }
  var mapReq = new XMLHttpRequest();
  mapReq.open("GET", MAP.src);
  mapReq.responseType = "blob";
  mapReq.onprogress = function (e) {
    var bar = $("veilBar");
    if (!bar || !e.lengthComputable || !e.total) return;
    bar.style.animation = "none";
    bar.style.transform = "scaleX(" + Math.max(0.04, Math.min(0.96, e.loaded / e.total)) + ")";
  };
  mapReq.onload = function () {
    var img = new Image();
    var url = URL.createObjectURL(mapReq.response);
    img.onload = function () { URL.revokeObjectURL(url); paintMap(img); };
    img.onerror = function () { URL.revokeObjectURL(url); reveal(); };
    img.src = url;
  };
  mapReq.onerror = function () { new THREE.TextureLoader().load(MAP.src, function (tex) { paintMap(tex.image); }); };
  mapReq.send();
  setTimeout(reveal, 12000);
  mapTex.minFilter = THREE.LinearMipmapLinearFilter;      // mipmaps keep the larger plate clean when zoomed out
  mapTex.magFilter = THREE.LinearFilter;
  mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var plate = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h), new THREE.MeshBasicMaterial({ map: mapTex }));
  plate.position.set(MAP.w / 2, -MAP.h / 2, 0);
  scene.add(plate);

  // 2. hitboxes: a fill and an outline per zone, invisible until hovered or debug is on
  ZONES.forEach(function (z) {
    var shape = new THREE.Shape(z.poly.map(function (p) { return new THREE.Vector2(p[0], -p[1]); }));
    z.fill = new THREE.Mesh(new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0xf7f4ec, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide }));
    z.fill.renderOrder = 1;
    z.line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(z.poly.map(function (p) { return new THREE.Vector3(p[0], -p[1], 0); })),
      new THREE.LineBasicMaterial({ color: 0xf7f4ec, transparent: true, opacity: 0, depthTest: false }));
    z.line.renderOrder = 2;
    scene.add(z.fill); scene.add(z.line);
  });

  // 3. the walk network, only drawn in debug
  var netPts = [];
  EDGES.forEach(function (e) {
    netPts.push(new THREE.Vector3(NODES[e[0]][0], -NODES[e[0]][1], 0), new THREE.Vector3(NODES[e[1]][0], -NODES[e[1]][1], 0));
  });
  var net = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(netPts),
    new THREE.LineBasicMaterial({ color: 0x49d6ea, transparent: true, opacity: 0, depthTest: false }));
  net.renderOrder = 2;
  scene.add(net);

  // 4. people. Placeholder sheets are drawn here; swap makeSheet() for your rendered sheets later.
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function drawPerson(g, ox, oy, f, back, p) {
    var step = f === 1 ? 1 : f === 3 ? -1 : 0;
    var x = ox + 36, hip = oy + 66;
    function mix(hex, amt) {
      var n = parseInt(hex.slice(1), 16);
      var ch = function (c) { return Math.max(0, Math.min(255, Math.round(c + amt * 40))); };
      return "rgb(" + ch((n >> 16) & 255) + "," + ch((n >> 8) & 255) + "," + ch(n & 255) + ")";
    }
    function limb(x0, y0, x1, y1, w, col) {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    function shoe(sx, sy, dir) {
      g.fillStyle = "#1c1916";
      g.beginPath(); g.ellipse(sx + dir * 3, sy, 7, 3.2, 0, 0, 6.3); g.fill();
      g.fillStyle = "rgba(255,255,255,.18)";
      g.fillRect(sx - 2, sy - 1, 4, 1);
    }
    var front = step === 0 ? 4 : step * 10;
    var backOff = step === 0 ? -3 : -step * 8;
    limb(x - 2, hip, x + backOff, hip + 16, 5.5, mix(p.pants, -0.35));
    limb(x + backOff, hip + 16, x + backOff - 2, hip + 34, 5, p.pants);
    shoe(x + backOff - 2, hip + 36, step === 0 ? 1 : -step);
    limb(x + 2, hip, x + front, hip + 15, 5.5, mix(p.pants, 0.15));
    limb(x + front, hip + 15, x + front + 3, hip + 34, 5, mix(p.pants, 0.25));
    shoe(x + front + 3, hip + 36, step === 0 ? 1 : step);

    g.fillStyle = p.shirt;
    g.beginPath();
    g.moveTo(x - 13, oy + 42);
    g.quadraticCurveTo(x - 15, oy + 58, x - 11, hip + 2);
    g.lineTo(x + 12, hip + 2);
    g.quadraticCurveTo(x + 16, oy + 58, x + 13, oy + 42);
    g.quadraticCurveTo(x, oy + 46, x - 13, oy + 42);
    g.fill();
    g.fillStyle = mix(p.shirt, -0.45);
    g.beginPath();
    g.moveTo(x + 1, oy + 44);
    g.lineTo(x + 12, oy + 46);
    g.quadraticCurveTo(x + 15, oy + 58, x + 11, hip + 1);
    g.lineTo(x + 1, hip + 1);
    g.fill();
    if (p.vest) {
      g.fillStyle = p.vest;
      g.beginPath(); g.roundRect ? g.roundRect(x - 7, oy + 48, 14, 14, 2) : g.rect(x - 7, oy + 48, 14, 14);
      g.fill();
    }
    g.fillStyle = mix(p.shirt, 0.4);
    g.fillRect(x - 6, oy + 43, 12, 2.5);

    var swing = step * 7;
    limb(x - 11, oy + 48, x - 16, oy + 62 + swing, 4.2, mix(p.shirt, -0.2));
    limb(x - 16, oy + 62 + swing, x - 14 - swing * 0.3, oy + 74, 3.4, p.skin);
    limb(x + 11, oy + 48, x + 16, oy + 60 - swing, 4.2, p.shirt);
    limb(x + 16, oy + 60 - swing, x + 15 + swing * 0.2, oy + 72, 3.4, p.skin);

    g.fillStyle = p.skin;
    g.fillRect(x - 3, oy + 36, 6, 7);
    g.beginPath(); g.ellipse(x + 1, oy + 26, 11, 12, 0, 0, 6.3); g.fill();
    g.fillStyle = "rgba(0,0,0,.08)";
    g.beginPath(); g.ellipse(x + 6, oy + 28, 5, 10, 0, 0, 6.3); g.fill();

    g.fillStyle = p.hair;
    if (back) {
      g.beginPath(); g.ellipse(x + 1, oy + 25, 12, 13, 0, 0, 6.3); g.fill();
      g.fillRect(x - 8, oy + 24, 6, 16);
    } else {
      g.beginPath();
      g.ellipse(x, oy + 20, 12, 8, 0, Math.PI, 0, true);
      g.fill();
      g.fillRect(x - 11, oy + 16, 18, 6);
      g.beginPath(); g.ellipse(x - 8, oy + 28, 3.2, 5, 0, 0, 6.3); g.fill();
      g.fillStyle = "#161311";
      g.beginPath(); g.ellipse(x + 4, oy + 26, 2.1, 1.5, 0, 0, 6.3); g.fill();
      g.fillStyle = "#f7f4ec";
      g.fillRect(x + 3.2, oy + 25.4, 1, 1);
      g.fillStyle = "rgba(90,50,40,.55)";
      g.fillRect(x + 1, oy + 29, 1.4, 3);
      g.fillStyle = "rgba(140,70,70,.7)";
      g.fillRect(x - 1, oy + 33.5, 4, 1.2);
      if (p.beard) {
        g.fillStyle = p.hair;
        g.beginPath(); g.ellipse(x + 2, oy + 34, 6, 4, 0, 0, Math.PI); g.fill();
      }
      if (p.glasses) {
        g.strokeStyle = "#1a1612"; g.lineWidth = 1;
        g.strokeRect(x - 1, oy + 23.5, 6.5, 4.5);
        g.beginPath(); g.moveTo(x + 5.5, oy + 25.5); g.lineTo(x + 9, oy + 25); g.stroke();
      }
    }
    if (p.cap) {
      g.fillStyle = p.cap;
      g.beginPath(); g.ellipse(x + 1, oy + 16, 12, 4.5, 0, Math.PI, 0); g.fill();
      g.fillRect(x - 11, oy + 14, 22, 3);
      if (!back) { g.beginPath(); g.ellipse(x + 14, oy + 17, 8, 2.2, 0, 0, 6.3); g.fill(); }
    }
  }
  function makeSheet(p) {
    var W = SPRITE.cellW, H = SPRITE.cellH;
    var raw = document.createElement("canvas"); raw.width = W * SPRITE.cols; raw.height = H * SPRITE.rows;
    var g = raw.getContext("2d");
    for (var r = 0; r < SPRITE.rows; r++) for (var f = 0; f < SPRITE.cols; f++) drawPerson(g, f * W, r * H, f, r === 1, p);
    var out = document.createElement("canvas"); out.width = raw.width; out.height = raw.height;
    var o = out.getContext("2d");
    o.imageSmoothingEnabled = false;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) { o.drawImage(raw, d[0], d[1]); });
    o.globalCompositeOperation = "source-in"; o.fillStyle = "#14161a"; o.fillRect(0, 0, out.width, out.height);
    o.globalCompositeOperation = "source-over"; o.drawImage(raw, 0, 0);
    return out;
  }

  var SKIN = ["#f1c9a5", "#d9a47c", "#a8724e", "#70482f"];
  var HAIR = ["#2b2019", "#5a3b22", "#c9a55a", "#8d8d8d", "#101010"];
  var SHIRT = ["#c0483d", "#3d6fb8", "#3f9c8a", "#7b4a2e", "#8a8f9a", "#8a5fb0", "#e6e1d3", "#4f6d3a"];
  var PANTS = ["#2b3350", "#3a3a3e", "#6f6248", "#1e2a3a"];
  function palette(i) {
    var caps = [null, "#22262e", "#6d2e2a", "#1d3a5c", null, "#3d3428"];
    return { skin: SKIN[i % SKIN.length], hair: HAIR[(i * 3 + 1) % HAIR.length],
             shirt: SHIRT[(i * 5 + 2) % SHIRT.length], pants: PANTS[(i * 7) % PANTS.length],
             cap: caps[i % caps.length],
             glasses: i % 6 === 2, beard: i % 5 === 3,
             vest: i % 7 === 1 ? "#2a3140" : null };
  }

  var quad = new THREE.PlaneGeometry(1, 1);
  var blob = new THREE.CircleGeometry(1, 20);
  var blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthTest: false });
  var SW = SPRITE.cellW * SPRITE.scale, SH = SPRITE.cellH * SPRITE.scale;
  var LIFT = (SPRITE.feet - SPRITE.cellH / 2) * SPRITE.scale;   // sprite centre above the feet
  var actors = [];

  function dress(actor, pal) {
    actor.tex = new THREE.CanvasTexture(makeSheet(pal));
    // A sprite sheet cannot be mipmapped: coarse levels average the whole sheet,
    // including the clear padding, into one dark rectangle.
    actor.tex.magFilter = THREE.LinearFilter;
    actor.tex.minFilter = THREE.LinearFilter;
    actor.tex.generateMipmaps = false;
    actor.tex.wrapS = THREE.ClampToEdgeWrapping;
    actor.tex.wrapT = THREE.ClampToEdgeWrapping;
    actor.tex.repeat.set(1 / SPRITE.cols, 1 / SPRITE.rows);
    actor.mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: actor.tex, transparent: true, depthTest: false, side: THREE.DoubleSide }));
    actor.mesh.renderOrder = 4;
    actor.shadow = new THREE.Mesh(blob, blobMat);
    actor.shadow.renderOrder = 3;
    actor.shadow.scale.set(SW * 0.38, SW * 0.16, 1);
    scene.add(actor.shadow); scene.add(actor.mesh);
    actors.push(actor);
    return actor;
  }

  STANDING.forEach(function (s, i) {
    var a = dress(makeActor({ x: s[0], y: s[1], a: 0, b: 0 }, 0), palette(i));
    a.row = s[2]; a.flip = s[3] ? -1 : 1; a.mob = 0.3; a.idle = true;
  });
  // A second shift of crew, mostly planted beside the paths so the lot reads as a working day.
  NODES.forEach(function (p, i) {
    if (i === HERO_START) return;
    var side = (i % 2 ? 1 : -1) * (16 + (i % 3) * 6);
    var a = dress(makeActor({ x: p[0] + side, y: p[1] + ((i % 5) - 2) * 4, a: 0, b: 0 }, 0), palette(40 + i));
    a.row = i % 2; a.flip = side < 0 ? -1 : 1; a.mob = 0.22; a.idle = true;
    if (i % 2 === 0) {
      var b = dress(makeActor({ x: p[0] - side * 0.55, y: p[1] + 13, a: 0, b: 0 }, 0), palette(80 + i));
      b.row = (i + 1) % 2; b.flip = side > 0 ? -1 : 1; b.mob = 0.22; b.idle = true;
    }
  });
  WALKING.forEach(function (pool, i) {
    var a = dress(makeActor(spotAtNode(pool[i % pool.length]), 52 + Math.random() * 18), palette(i + 5));
    a.pool = pool; a.wait = Math.random() * 0.6;
    a.hx = a.ox = Math.random() * 8 - 4; a.hy = a.oy = Math.random() * 4 - 2;
  });
  ROUTINES.forEach(function (loop, i) {
    var a = dress(makeActor(spotAtNode(loop[0]), 56 + Math.random() * 12), palette(i + 11));
    a.loop = loop; a.li = 0; a.wait = Math.random() * 0.4;
    a.hx = a.ox = Math.random() * 8 - 4; a.hy = a.oy = Math.random() * 4 - 2;
  });
  dress(hero, { skin: "#e2b48c", hair: "#3a2a1c", shirt: "#f2c230", pants: "#22262e", cap: "#22262e" });
  hero.k = 1.12; hero.mob = 0;                                                // the player is drawn a little larger than the crew

  // player indicator on the ground: disc, ring and an expanding pulse
  var RING_W = 24, RING_H = 11;
  function flat(color, opacity) {
    return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthTest: false, side: THREE.DoubleSide });
  }
  var disc = new THREE.Mesh(blob, flat(0xf7f4ec, 0.2));
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 64), flat(0xf7f4ec, 0.72));
  var pulse = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 64), flat(0xf7f4ec, 0.28));
  [disc, ring, pulse].forEach(function (m) { m.renderOrder = 3; scene.add(m); });
  // Crowd separation. Anyone closer than NEAR gets nudged apart with a sidestep (so head-on pairs pass
  // each other), then drifts back to their own line. Nobody strays more than REACH from their path.
  // mob is how readily someone gives way: walkers 1, standing crew 0.3, the player 0 (everyone steps around them).
  var NEAR = 32, REACH = 16;
  function separate(dt) {
    var n = actors.length, i, j, A, B;
    for (i = 0; i < n; i++) { actors[i].px = 0; actors[i].py = 0; }
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      A = actors[i]; B = actors[j];
      if (!A.mob && !B.mob) continue;
      var dx = (B.x + B.ox) - (A.x + A.ox), dy = ((B.y + B.oy) - (A.y + A.oy)) * 2;   // depth counts double in this view
      if (Math.abs(dx) >= NEAR || Math.abs(dy) >= NEAR) continue;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d >= NEAR) continue;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      var s = (NEAR - d) / NEAR, nx = dx / d, ny = dy / d;
      var ux = (nx + ny * 0.6) * s, uy = (ny - nx * 0.6) * s * 0.5;
      A.px -= ux; A.py -= uy; B.px += ux; B.py += uy;
    }
    for (i = 0; i < n; i++) {
      A = actors[i];
      if (!A.mob) continue;
      A.ox += (A.px * 70 * A.mob + (A.hx - A.ox) * 2) * dt;
      A.oy += (A.py * 70 * A.mob + (A.hy - A.oy) * 2) * dt;
      var m = Math.sqrt(A.ox * A.ox + A.oy * A.oy * 4);
      if (m > REACH) { A.ox *= REACH / m; A.oy *= REACH / m; }
    }
  }

  // marker over the supervisor so visitors can find them in the crowd
  var tri = new THREE.Shape([new THREE.Vector2(-6, 8), new THREE.Vector2(6, 8), new THREE.Vector2(0, 0)]);
  var marker = new THREE.Mesh(new THREE.ShapeGeometry(tri),
    new THREE.MeshBasicMaterial({ color: 0xf7f4ec, depthTest: false, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  marker.renderOrder = 5;
  scene.add(marker);
  marker.renderOrder = 9;

  /* =====================================================================
     Effects layer. Everything below sits on top of the plate and needs no
     new art: sign glows, marquee, stage fire, steam, pigeons, time of day,
     speech bubbles, and the on-set "take" cycle.
     ===================================================================== */
  var ADD = THREE.AdditiveBlending, now = 0, lineIdx = 0;
  function softCanvas() {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return c;
  }
  var soft = new THREE.CanvasTexture(softCanvas());
  function glowMesh(color, order, blend) {
    var m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: soft, color: color, transparent: true, opacity: 0, depthTest: false, blending: blend || ADD }));
    m.renderOrder = order || 8;
    scene.add(m);
    return m;
  }
  // a flat four-corner patch in map pixels: top-left, top-right, bottom-right, bottom-left
  function patch(c) {
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([c[0][0], -c[0][1], 0, c[1][0], -c[1][1], 0, c[2][0], -c[2][1], 0, c[3][0], -c[3][1], 0], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    return g;
  }

  // --- time of day: a blue multiply wash over the whole lot, driven by the visitor's clock ---
  var lightMode = "auto", lightBtn = $("lightBtn");
  function nightTarget() {
    if (lightMode === "day") return 0;
    if (lightMode === "night") return 1;
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 20 || h < 5) return 1;
    if (h >= 7 && h < 17) return 0;
    return h < 7 ? 1 - (h - 5) / 2 : (h - 17) / 3;
  }
  var night = nightTarget();
  var dusk = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h),
    new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.MultiplyBlending, transparent: true, depthTest: false }));
  dusk.position.set(MAP.w / 2, -MAP.h / 2, 0);
  dusk.renderOrder = 7;
  scene.add(dusk);
  var emis = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h),
    new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(MAP.glow), transparent: true, opacity: 0, depthTest: false, blending: ADD }));
  emis.position.set(MAP.w / 2, -MAP.h / 2, 0);
  emis.renderOrder = 8;
  scene.add(emis);

  // --- foreground cutouts: slices of the plate redrawn in the same depth order as the people, so anyone
  //     standing behind one is covered by it. [x, top y, base y] for each lamp post. ---
  var POSTS = [[1126, 598, 673], [879, 733, 812], [1103, 425, 483], [983, 115, 217], [1331, 688, 757], [1279, 985, 1098], [661, 1105, 1200], [461, 0, 96]];
  var plateMat = new THREE.MeshBasicMaterial({ map: mapTex, transparent: true, depthTest: false });
  function cutout(pts, baseY) {
    var pos = [], uv = [], idx = [], i;
    for (i = 0; i < pts.length; i++) { pos.push(pts[i][0], -pts[i][1], 0); uv.push(pts[i][0] / MAP.w, 1 - pts[i][1] / MAP.h); }
    for (i = 1; i < pts.length - 1; i++) idx.push(0, i + 1, i);
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    var m = new THREE.Mesh(g, plateMat);
    m.material.side = THREE.DoubleSide;
    m.renderOrder = 4;                 // same layer as the people
    m.position.z = baseY * 0.001;      // and sorted against them by where it meets the ground
    scene.add(m);
    return m;
  }
  POSTS.forEach(function (p) { cutout([[p[0] - 5, p[1]], [p[0] + 5, p[1]], [p[0] + 5, p[2] + 3], [p[0] - 5, p[2] + 3]], p[2]); });

  // Buildings and vehicles. The plate is redrawn over anyone whose feet are behind
  // that shape's front edge, so crew disappear behind a wall instead of walking on it.
  // The front edge sits just behind where someone stands at the door, so arrivals stay visible.
  [
    [[[695, 445], [860, 378], [1030, 432], [1050, 612], [872, 720], [700, 640]], 700],   // tools
    [[[1150, 215], [1290, 165], [1395, 330], [1385, 520], [1300, 545], [1172, 450]], 510], // theatre
    [[[266, 77], [392, 71], [687, 227], [687, 400], [264, 400]], 400],                    // stage, over the alley
    [[[330, 838], [392, 728], [498, 688], [522, 812], [405, 860], [335, 850]], 830],     // reel truck
    [[[672, 775], [765, 748], [832, 800], [785, 840], [690, 820]], 830],                 // mustang
    [[[1163, 790], [1268, 722], [1292, 760], [1292, 850], [1200, 870], [1163, 850]], 860] // resume booth
  ].forEach(function (o) { cutout(o[0], o[1]); });

  // --- building covers: a slice of the plate redrawn above the people and the street-lamp light, so neither
  //     shows on a building that stands in front of them. Tinted each frame to match the time of day. ---
  var COVERS = [
    [[266, 77], [392, 71], [687, 227], [687, 262], [264, 262]]      // FX stage roof, in front of the alley
  ].map(function (pts) {
    var m = cutout(pts, 0);
    m.material = new THREE.MeshBasicMaterial({ map: mapTex, transparent: true, depthTest: false, side: THREE.DoubleSide });
    m.renderOrder = 7.8;
    return m;
  });

  // --- post-processing: the scene renders to a texture, then one full-screen pass adds heat shimmer
  //     over the creature stage while it fires, a soft vignette, and the optional CRT look. ---
  var rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
  var postMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uTime: { value: 0 }, uHeat: { value: 0 }, uRetro: { value: 0 },
                uHeatPos: { value: new THREE.Vector2(0.5, 0.5) }, uHeatRad: { value: new THREE.Vector2(0.1, 0.1) } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: [
      "uniform sampler2D tDiffuse; uniform float uTime; uniform float uHeat; uniform float uRetro;",
      "uniform vec2 uHeatPos; uniform vec2 uHeatRad; varying vec2 vUv;",
      "void main() {",
      "  vec2 uv = vUv;",
      "  float f = uHeat * smoothstep(1.0, 0.0, length((uv - uHeatPos) / uHeatRad));",
      "  uv += f * 0.004 * vec2(sin(uv.y * 160.0 + uTime * 11.0), cos(uv.x * 120.0 + uTime * 8.0));",
      "  vec2 c = vUv - 0.5; float r2 = dot(c, c); vec3 col;",
      "  if (uRetro > 0.5) {",
      "    vec2 o = c * (0.0012 + r2 * 0.012);",
      "    col = vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b);",
      "    col *= 0.96 + 0.1 * sin(gl_FragCoord.y * 3.14159);",
      "  } else { col = texture2D(tDiffuse, uv).rgb; }",
      "  col = clamp((col - 0.5) * 1.05 + 0.5, 0.0, 1.0);\n      col *= 1.0 - 0.18 * smoothstep(0.42, 0.98, r2);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"].join("\n"),
    depthTest: false, depthWrite: false
  });
  var postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  var crtBtn = $("crtBtn"), HEAT = { x: 430, y: 628, rx: 130, ry: 85 };
  crtBtn.addEventListener("click", function () {
    var on = postMat.uniforms.uRetro.value < 0.5;
    postMat.uniforms.uRetro.value = on ? 1 : 0;
    crtBtn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  var saveLink = $("saveBtn");
  if (saveLink && saveLink.tagName === "A") saveLink.href = asset("/export/rob-pearson-backlot.zip");
  lightBtn.addEventListener("click", function () {
    lightMode = lightMode === "auto" ? "day" : lightMode === "day" ? "night" : "auto";
    lightBtn.textContent = lightMode === "auto" ? "Auto" : lightMode === "day" ? "Day" : "Night";
  });

  // Ambient lot, off until asked. A generator, distant voices, an occasional pigeon.
  // The stage roar is played from breathe(). sessionStorage keeps the choice for this visit.
  var soundBtn = $("soundBtn"), soundOn = false, audio = null, master = null, soundArmed = false;
  function noiseBuf(seconds, brown) {
    var len = Math.floor(audio.sampleRate * seconds);
    var buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0), last = 0, i, w;
    for (i = 0; i < len; i++) {
      w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else d[i] = w;
    }
    return buf;
  }
  function murmurOnce() {
    if (!soundOn || !audio) return;
    var t = audio.currentTime, dur = 0.4 + Math.random() * 0.8;
    var src = audio.createBufferSource();
    src.buffer = noiseBuf(dur, false);
    var bp = audio.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 260 + Math.random() * 520; bp.Q.value = 0.8;
    var g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.02, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  function coo() {
    if (!soundOn || !audio) return;
    var t = audio.currentTime;
    function note(when, a, b) {
      var o = audio.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(a, when);
      o.frequency.exponentialRampToValueAtTime(b, when + 0.16);
      var g = audio.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.045, when + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
      o.connect(g); g.connect(master);
      o.start(when); o.stop(when + 0.22);
    }
    note(t, 620, 860);
    note(t + 0.24, 740, 520);
  }
  function fireRoar() {
    if (!soundOn || !audio) return;
    var t = audio.currentTime, dur = Math.min(1.35, FIRE_LEN || 1.2);
    var src = audio.createBufferSource();
    src.buffer = noiseBuf(dur, true);
    var bp = audio.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 0.55;
    bp.frequency.setValueAtTime(160, t);
    bp.frequency.exponentialRampToValueAtTime(640, t + 0.22);
    bp.frequency.exponentialRampToValueAtTime(120, t + dur);
    var g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  function startBed() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio) {
      audio = new AC();
      master = audio.createGain();
      master.gain.value = 0.0001;
      master.connect(audio.destination);
      var hum = audio.createBufferSource();
      hum.buffer = noiseBuf(2, true); hum.loop = true;
      var low = audio.createBiquadFilter();
      low.type = "lowpass"; low.frequency.value = 95;
      var hg = audio.createGain(); hg.gain.value = 0.55;
      var lfo = audio.createOscillator(); lfo.frequency.value = 0.06;
      var lfoG = audio.createGain(); lfoG.gain.value = 0.12;
      lfo.connect(lfoG); lfoG.connect(hg.gain);
      hum.connect(low); low.connect(hg); hg.connect(master);
      hum.start(); lfo.start();
      (function loopMurmur() {
        if (!alive) return;
        setTimeout(loopMurmur, soundOn ? 1600 + Math.random() * 3800 : 700);
        if (soundOn) murmurOnce();
      })();
      (function loopCoo() {
        if (!alive) return;
        setTimeout(loopCoo, soundOn ? 14000 + Math.random() * 16000 : 2000);
        if (soundOn) coo();
      })();
    }
    audio.resume();
    var t = audio.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.linearRampToValueAtTime(0.2, t + 0.7);
  }
  function setSound(on) {
    soundOn = !!on;
    if (soundBtn) soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    try { sessionStorage.setItem("lot-sound", soundOn ? "1" : "0"); } catch (e) {}
    if (soundOn) { startBed(); return; }
    if (master && audio) {
      var t = audio.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.3);
      setTimeout(function () { if (!soundOn && audio) audio.suspend(); }, 320);
    }
  }
  if (soundBtn) soundBtn.addEventListener("click", function () { setSound(!soundOn); });
  try { if (sessionStorage.getItem("lot-sound") === "1" && soundBtn) {
    soundOn = true; soundBtn.setAttribute("aria-pressed", "true");
    var armSound = function () { if (soundArmed) return; soundArmed = true; if (soundOn) startBed(); };
    window.addEventListener("pointerdown", armSound, { once: true });
  } } catch (e) {}

  // --- sign and window glows: [zone, x, y, width, height, colour]. They idle low, brighten at night,
  //     and flare in sequence when the player arrives at their zone. ---
  var glows = [
    ["tools", 943, 682, 80, 70, 0x49d6ea], ["tools", 987, 503, 46, 60, 0x4be08a],
    ["fx", 566, 307, 200, 100, 0x52e06a], ["fx", 327, 437, 200, 90, 0x49d6ea], ["fx", 562, 420, 190, 170, 0x52e06a], ["fx", 600, 385, 70, 70, 0xffffff],
    ["reel", 448, 728, 130, 60, 0xffa63d],
    ["credits", 1265, 425, 180, 100, 0xff7a3d], ["credits", 1270, 320, 90, 200, 0xffa63d], ["credits", 1255, 466, 200, 80, 0xffe2a0],
    ["resume", 1223, 800, 80, 60, 0xffd27a], ["resume", 1227, 768, 100, 56, 0xffb347]
  ].map(function (g) {
    var m = glowMesh(g[5]);
    m.position.set(g[1], -g[2], 0); m.scale.set(g[3], g[4], 1);
    return { zone: g[0], mesh: m, boost: 0, kick: 0, seed: Math.random() * 10 };
  });
  var headlights = [[789, 832], [829, 815]].map(function (p) {
    var m = glowMesh(0xfff4d0); m.position.set(p[0], -p[1], 0); m.scale.set(40, 30, 1); return m;
  });
  // Painted sign letters. Each glow is the strokes lifted off the painting.
  // Gain evens them out: the roof sign is already bright paint, so the same
  // additive amount blew it out to white. [file, x, y, w, h, gain]
  var signGlows = [
    ["/lot/sign-rnd.png", 850, 390, 185, 140, 0.85],
    ["/lot/sign-tools.png", 710, 410, 140, 120, 1],
    ["/lot/sign-pipe.png?v=2", 990, 450, 90, 170, 1.2],
    ["/lot/sign-rd2.png", 890, 560, 160, 120, 1.05]
  ].map(function (s) {
    var tex = new THREE.TextureLoader().load(asset(s[0]));
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(s[3], s[4]),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, blending: ADD, side: THREE.DoubleSide }));
    m.position.set(s[1] + s[3] / 2, -(s[2] + s[4] / 2), 0);
    m.renderOrder = 8;
    m.userData.gain = s[5];
    scene.add(m);
    return m;
  });
  var heroGlow = glowMesh(0xf2c230); heroGlow.scale.set(96, 54, 1);

  // --- street lamps: [head x, head y, base y]. At night each gets a bright head, a halo, and a pool of light on the ground. ---
  var LAMPS = [[1140, 592, 670], [879, 730, 810], [1103, 422, 481], [998, 112, 215], [1348, 684, 754], [1293, 980, 1095], [664, 1102, 1198], [461, 2, 94]].map(function (l) {
    var core = glowMesh(0xfff0c8, 7.5), halo = glowMesh(0xffc27a, 7.5), pool = glowMesh(0xffc27a, 7.5);   // 7.5: under the building covers
    core.position.set(l[0], -l[1], 0); core.scale.set(26, 26, 1);
    halo.position.set(l[0], -l[1], 0); halo.scale.set(110, 110, 1);
    pool.position.set(l[0], -(l[2] + 6), 0); pool.scale.set(230, 120, 1);
    return { core: core, halo: halo, pool: pool };
  });

  // --- Tools building: a light runs along each pipe when the player arrives ---
  var PIPES = [
    { c: 0x4d8dff, p: [[720, 610], [833, 680]] }, { c: 0xff8a3d, p: [[693, 617], [767, 657]] },
    { c: 0xff8a3d, p: [[800, 430], [863, 470]] }, { c: 0xc8f6ff, p: [[887, 580], [907, 583], [980, 547], [987, 503]] }
  ];
  PIPES.forEach(function (p) { p.mesh = glowMesh(p.c); p.mesh.scale.set(34, 34, 1); p.t0 = -99; });
  function along(poly, u) {
    var total = 0, i, seg = [];
    for (i = 1; i < poly.length; i++) { seg.push(dist(poly[i - 1][0], poly[i - 1][1], poly[i][0], poly[i][1])); total += seg[i - 1]; }
    var want = total * u;
    for (i = 0; i < seg.length; i++) {
      if (want <= seg[i] || i === seg.length - 1) {
        var k = seg[i] ? Math.min(1, want / seg[i]) : 0;
        return [poly[i][0] + (poly[i + 1][0] - poly[i][0]) * k, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * k];
      }
      want -= seg[i];
    }
    return poly[0];
  }

  // --- theatre marquee: cycles TITLES on the board, with chase bulbs along its edges ---
  var MARQ = [[1182, 414], [1329, 487], [1329, 517], [1182, 444]];
  var mqCanvas = document.createElement("canvas"); mqCanvas.width = 660; mqCanvas.height = 128;
  var mqTex = new THREE.CanvasTexture(mqCanvas);
  mqTex.minFilter = THREE.LinearFilter; mqTex.generateMipmaps = false;
  var mqIdx = -1, mqNext = 0, mqFast = 0;
  function drawMarquee(text) {
    var g = mqCanvas.getContext("2d"), W = mqCanvas.width, H = mqCanvas.height, size = 100;
    g.clearRect(0, 0, W, H);
    do { size -= 4; g.font = "700 " + size + "px \"Barlow Condensed\", \"Arial Narrow\", Arial, sans-serif"; }
    while (g.measureText(text).width > W - 40 && size > 30);
    g.fillStyle = "#14120f";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, H / 2);
    mqTex.needsUpdate = true;
  }
  var marquee = new THREE.Mesh(patch(MARQ), new THREE.MeshBasicMaterial({ map: mqTex, depthTest: false, transparent: true, side: THREE.DoubleSide }));
  marquee.renderOrder = 9;               // above the panel glow, so the letters stay black
  marquee.position.z = 0.513;
  scene.add(marquee);
  // The blank board lights up. The letters are a separate black overlay and do not glow.
  var marqueeLit;
  (function () {
    var c = document.createElement("canvas"); c.width = 512; c.height = 128;
    var g = c.getContext("2d");
    var vg = g.createLinearGradient(0, 0, 0, 128);
    vg.addColorStop(0, "rgba(255,255,255,0)");
    vg.addColorStop(0.16, "rgba(255,236,196,0.55)");
    vg.addColorStop(0.5, "rgba(255,246,220,1)");
    vg.addColorStop(0.84, "rgba(255,236,196,0.55)");
    vg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = vg; g.fillRect(0, 0, 512, 128);
    g.globalCompositeOperation = "destination-in";
    var hg = g.createLinearGradient(0, 0, 512, 0);
    hg.addColorStop(0, "rgba(255,255,255,0)");
    hg.addColorStop(0.06, "rgba(255,255,255,1)");
    hg.addColorStop(0.94, "rgba(255,255,255,1)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hg; g.fillRect(0, 0, 512, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    var panel = [[1174, 404], [1337, 477], [1337, 527], [1174, 454]];
    marqueeLit = new THREE.Mesh(patch(panel), new THREE.MeshBasicMaterial({ map: tex, color: 0xffe2a8, transparent: true, opacity: 0, depthTest: false, blending: ADD, side: THREE.DoubleSide }));
  })();
  marqueeLit.renderOrder = 8;
  marqueeLit.position.z = 0.511;
  scene.add(marqueeLit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (mqIdx >= 0) drawMarquee(TITLES[mqIdx]); });
  // --- live signs: boards whose painted lettering is too small to glow cleanly. The words are drawn as real
  //     text over the board (quad is the area inside the frame), with a lit copy that comes up at night.
  //     Edit `lines` to change the wording. ---
  var LIVE_SIGNS = [
    { quad: [[1199, 744], [1255.5, 770], [1255.5, 802], [1199, 773]], lines: ["RESUME BY", "REQUEST"], color: "#ffd27a", bg: "#38312b", w: 420, h: 204, z: 0.861 }
  ].map(function (spec) {
    var base = document.createElement("canvas"), lit = document.createElement("canvas");
    base.width = lit.width = spec.w; base.height = lit.height = spec.h;
    var bt = new THREE.CanvasTexture(base), lt = new THREE.CanvasTexture(lit);
    [bt, lt].forEach(function (x) { x.minFilter = THREE.LinearFilter; x.generateMipmaps = false; });
    function draw() {
      [base, lit].forEach(function (c, k) {
        var g = c.getContext("2d"), W = c.width, H = c.height, n = spec.lines.length, lh = H / n, size = lh * 1.02, widest, i;
        g.shadowBlur = 0;
        g.fillStyle = k ? "#000" : spec.bg; g.fillRect(0, 0, W, H);
        g.textAlign = "center"; g.textBaseline = "middle";
        do {
          size -= 2; g.font = "600 " + size + "px \"Barlow Condensed\", \"Arial Narrow\", Arial, sans-serif";
          widest = 0;
          for (i = 0; i < n; i++) widest = Math.max(widest, g.measureText(spec.lines[i]).width);
        } while (widest > W * 0.92 && size > 10);
        g.fillStyle = spec.color;
        if (k) { g.shadowColor = spec.color; g.shadowBlur = H * 0.1; }
        for (i = 0; i < n; i++) g.fillText(spec.lines[i], W / 2, lh * (i + 0.5) + size * 0.05);
      });
      bt.needsUpdate = lt.needsUpdate = true;
    }
    draw();
    var geo = patch(spec.quad);
    var bm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: bt, depthTest: false, transparent: true, side: THREE.DoubleSide }));
    bm.renderOrder = 4; bm.position.z = spec.z; scene.add(bm);
    var lm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: lt, depthTest: false, transparent: true, opacity: 0, blending: ADD, side: THREE.DoubleSide }));
    lm.renderOrder = 4; lm.position.z = spec.z + 0.001; scene.add(lm);
    return { draw: draw, lit: lm };
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { LIVE_SIGNS.forEach(function (s) { s.draw(); }); });

  var bulbs = [];
  [[MARQ[0], MARQ[1], -4], [MARQ[3], MARQ[2], 4]].forEach(function (e) {
    for (var i = 0; i < 12; i++) {
      var u = (i + 0.5) / 12, m = glowMesh(0xffd98a);
      m.position.set(e[0][0] + (e[1][0] - e[0][0]) * u, -(e[0][1] + (e[1][1] - e[0][1]) * u + e[2]), 0);
      m.scale.set(13, 13, 1);
      bulbs.push(m);
    }
  });

  // --- demo reel screen: set REEL.src to a short muted mp4 and it plays on the truck; until then it flickers ---
  var REEL = { src: asset("/lot/reel.mp4"), quad: [[401, 779.5], [502.5, 727.5], [502.5, 788.5], [401, 840]] };
  var reelBoost = 0, reelLive = false, reelLit = null;
  var reelMat = new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.08, depthTest: false, blending: ADD, side: THREE.DoubleSide });
  var reelScreen = new THREE.Mesh(patch(REEL.quad), reelMat);
  reelScreen.renderOrder = 4;
  reelScreen.position.z = 0.831;          // just in front of the truck cover, which was painting the still screen over the clip
  scene.add(reelScreen);
  if (REEL.src) {
    var video = document.createElement("video");
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = "auto";
    video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
    video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
    stage.appendChild(video);
    var playReel = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    // swap the painted still for the clip only once frames are really arriving; otherwise the flicker stays
    video.addEventListener("playing", function () {
      if (reelLive) return;
      reelLive = true;
      var vt = new THREE.VideoTexture(video);
      vt.minFilter = THREE.LinearFilter; vt.magFilter = THREE.LinearFilter; vt.generateMipmaps = false;
      reelScreen.material = new THREE.MeshBasicMaterial({ map: vt, depthTest: false, transparent: true, side: THREE.DoubleSide });
      reelLit = new THREE.Mesh(reelScreen.geometry, new THREE.MeshBasicMaterial({ map: vt, depthTest: false, transparent: true, opacity: 0, blending: ADD, side: THREE.DoubleSide }));
      reelLit.renderOrder = 8;                       // a second copy above the night wash, so the screen stays lit after dark
      reelLit.position.z = 0.832;
      scene.add(reelLit);
    });
    video.src = REEL.src;
    playReel();
    // browsers that refuse autoplay start it on the first interaction instead
    ["pointerdown", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, function () { if (video.paused) playReel(); }, { passive: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && video.paused) playReel(); });
  }

  // --- creature stage fire: the yoga-flame strip, played once each time the stage rolls ---
  var FIRE = { x: 371, y: 630, angle: Math.atan2(0.32, 1) };
  var FIRE_N = 15, FW = 128, FH = 102, fireT0 = -1, fireUntil = 0;
  // Content center of each frame, in cell pixels. Frames after the full bloom are
  // drawn smaller toward the mouth, so those get shifted out to the bloom's center.
  var FIRE_CX = [23, 30.1, 35.5, 42.7, 46.8, 50.9, 53.3, 52.9, 53, 53.3, 48.2, 36.4, 27.7, 20.1, 12];
  var FIRE_PEAK = 9;
  var FIRE_HOLD = [0.06, 0.07, 0.08, 0.09, 0.11, 0.13, 0.16, 0.20, 0.18, 0.14, 0.11, 0.09, 0.07, 0.06, 0.08];
  var FIRE_GLOW = [0.15, 0.28, 0.42, 0.58, 0.74, 0.9, 1, 1, 1, 1, 0.7, 0.45, 0.25, 0.12, 0.04];
  var FIRE_AT = [], FIRE_LEN = 0;
  FIRE_HOLD.forEach(function (h) { FIRE_LEN += h; FIRE_AT.push(FIRE_LEN); });
  function fireFrame(age) {
    if (age < 0 || age >= FIRE_LEN) return -1;
    for (var i = 0; i < FIRE_N; i++) if (age < FIRE_AT[i]) return i;
    return FIRE_N - 1;
  }
  var fireTex = new THREE.TextureLoader().load(asset("/lot/fire.png"));
  fireTex.magFilter = THREE.NearestFilter; fireTex.minFilter = THREE.NearestFilter; fireTex.generateMipmaps = false;
  fireTex.wrapS = THREE.ClampToEdgeWrapping; fireTex.wrapT = THREE.ClampToEdgeWrapping;
  fireTex.repeat.set(1 / FIRE_N, 1);
  var fireMesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: fireTex, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  fireMesh.renderOrder = 8;
  fireMesh.rotation.z = -FIRE.angle;
  fireMesh.scale.set(FW, FH, 1);
  fireMesh.visible = false;
  scene.add(fireMesh);
  var fireGlow = glowMesh(0xff7a2d); fireGlow.scale.set(150, 90, 1);
  function breathe() { fireT0 = now; fireUntil = now + FIRE_LEN; fireRoar(); }

  // --- steam off the catering tables (and Mustang exhaust once the call sheet is complete) ---
  var STEAM = [[1050, 945], [1083, 927], [1095, 978], [935, 350]], EXHAUST = [678, 792];
  var puffs = [], steamAcc = 0;
  for (var pi = 0; pi < 24; pi++) puffs.push({ m: glowMesh(0xffffff, 6, THREE.NormalBlending), life: 1, max: 1, x: 0, y: 0, vx: 0, vy: 0, seed: Math.random() * 6 });

  // --- pigeons: three small flocks that take off when anyone walks through, then come back ---
  var FLOCKS = [[668, 946], [1450, 662], [1392, 952]].map(function (f) { return { x: f[0], y: f[1], state: 0, until: 0, cool: 0 }; });
  function birdCanvas() {
    var c = document.createElement("canvas"); c.width = 16; c.height = 6;
    var g = c.getContext("2d");
    px(g, 2, 2, 4, 3, "#8b93a1"); px(g, 5, 1, 2, 2, "#8b93a1"); px(g, 7, 2, 1, 1, "#e0902f"); px(g, 3, 5, 1, 1, "#c96a5a"); px(g, 4, 5, 1, 1, "#c96a5a");
    px(g, 10, 3, 4, 2, "#8b93a1"); px(g, 13, 2, 2, 2, "#8b93a1"); px(g, 9, 0, 2, 3, "#c9ced8"); px(g, 12, 0, 2, 3, "#c9ced8");
    return c;
  }
  var birdSheet = birdCanvas(), birds = [];
  FLOCKS.forEach(function (f) {
    for (var k = 0; k < 4; k++) {
      var tex = new THREE.CanvasTexture(birdSheet);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.repeat.set(0.5, 1);
      var m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, side: THREE.DoubleSide }));
      m.renderOrder = 4; scene.add(m);
      var hx = f.x + (Math.random() - 0.5) * 36, hy = f.y + (Math.random() - 0.5) * 16;
      birds.push({ f: f, m: m, tex: tex, hx: hx, hy: hy, x: hx, alt: 0, t: 0, vx: 0, flip: Math.random() < 0.5 ? 1 : -1 });
    }
  });

  // --- speech bubbles, anchored to a person or a fixed map point ---
  var bubbles = [];
  function dropBubble(b) { if (b.el.parentNode) b.el.parentNode.removeChild(b.el); bubbles.splice(bubbles.indexOf(b), 1); }
  function bubble(target, text, dur, call) {
    bubbles.slice().forEach(function (b) { if (b.target === target) dropBubble(b); });
    if (bubbles.length > 4) dropBubble(bubbles[0]);
    var el = document.createElement("div");
    el.className = "bubble" + (call ? " is-call" : "");
    el.textContent = text;
    labels.appendChild(el);
    bubbles.push({ el: el, target: target, until: now + dur });
  }
  function personAt(m) {
    var best = null;
    actors.forEach(function (a) {
      if (a === hero) return;
      var x = a.x + a.ox, y = a.y + a.oy;
      if (Math.abs(m.x - x) < SW * 0.55 && m.y < y + 4 && m.y > y - SH && (!best || y > best.y + best.oy)) best = a;
    });
    return best;
  }
  function talk(a) { hint.classList.add("is-gone"); bubble(a, LINES[lineIdx++ % LINES.length], 2.8); }

  // --- the take: every so often the creature stage rolls, nearby walkers hold, the dragon breathes fire ---
  var take = { next: 14, phase: 0, t0: 0 }, STAGE = { x: 330, y: 690, r: 270 }, caller = actors[0];

  // called when the player actually reaches a zone
  function arrive(id) {
    if (!renderer) return;
    var i = 0;
    glows.forEach(function (g) { if (g.zone === id) g.kick = now + (i++) * 0.16 + 0.01; });
    if (id === "tools") PIPES.forEach(function (p, k) { p.t0 = now + 0.3 + k * 0.28; });
    if (id === "credits") mqFast = now + 3.5;
    if (id === "fx") breathe();
    if (id === "reel") reelBoost = 1;
  }

  function fx(t, dt) {
    now = t;
    var i, u;

    // opening shot: ease in from the wide view unless the visitor takes over
    if (pts.size) zoomTarget = null;
    if (zoomTarget) {
      view.z += (zoomTarget - view.z) * Math.min(1, dt * 1.6); clampView();
      if (Math.abs(zoomTarget - view.z) < 0.002) zoomTarget = null;
    }

    // time of day
    night += (nightTarget() - night) * Math.min(1, dt * 2.5);
    dusk.material.color.setRGB(1 - 0.62 * night, 1 - 0.55 * night, 1 - 0.28 * night);
    emis.material.opacity = 0.14 + 0.86 * night;
    COVERS.forEach(function (m) { m.material.color.copy(dusk.material.color); });
    marqueeLit.material.opacity = 0.55 + 0.4 * night;
    LIVE_SIGNS.forEach(function (s) { s.lit.material.opacity = 0.14 + 0.86 * night; });

    // glows
    glows.forEach(function (g, k) {
      if (g.kick && t >= g.kick) { g.boost = 1; g.kick = 0; }
      g.boost = Math.max(0, g.boost - dt * 0.45);
      var op = (0.03 + 0.1 * night) * (0.9 + 0.1 * Math.sin(t * 3 + g.seed)) + g.boost * 0.8;
      if (k === 2 && Math.sin(t * 1.7) > 0.9 && Math.sin(t * 43) > 0) op *= 0.15;      // one tube with a bad ballast
      g.mesh.material.opacity = Math.min(1, op);
    });
    var signOp = night * (0.78 + 0.06 * Math.sin(t * 1.6));
    signGlows.forEach(function (m) { m.material.opacity = Math.min(1, signOp * m.userData.gain); });
    headlights.forEach(function (m) { m.material.opacity = wrapped ? 0.85 + 0.05 * Math.sin(t * 30) : 0; });
    heroGlow.position.set(hero.x, -hero.y, 0);
    heroGlow.material.opacity = 0.5 * night;
    LAMPS.forEach(function (l, k) {
      var on = night * (k === 4 && Math.sin(t * 0.9) > 0.96 && Math.sin(t * 37) > 0 ? 0.3 : 1);   // one lamp stutters now and then
      l.core.material.opacity = 0.95 * on; l.halo.material.opacity = 0.4 * on; l.pool.material.opacity = 0.55 * on;
    });

    PIPES.forEach(function (p) {
      u = (t - p.t0) / 1.0;
      if (u >= 0 && u <= 1) {
        var q = along(p.p, u);
        p.mesh.position.set(q[0], -q[1], 0);
        p.mesh.material.opacity = Math.sin(Math.PI * u) * 0.95;
      } else p.mesh.material.opacity = 0;
    });

    // marquee
    if (t >= mqNext) { mqIdx = (mqIdx + 1) % TITLES.length; drawMarquee(TITLES[mqIdx]); mqNext = t + 4.5; }
    var step = Math.floor(t * (t < mqFast ? 16 : 5));
    bulbs.forEach(function (m, k) { m.material.opacity = ((k + step) % 3 === 0 ? 0.95 : 0.12) * (0.55 + 0.45 * night); });

    // reel screen flicker
    reelBoost = Math.max(0, reelBoost - dt * 0.5);
    if (!reelLive) reelMat.opacity = 0.07 + 0.06 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9)) + reelBoost * 0.35;
    else reelLit.material.opacity = Math.min(1, 0.55 * night + reelBoost * 0.3);

    // fire: one pass through the strip, growing out of the mouth and burning down
    var frame = fireT0 >= 0 ? fireFrame(t - fireT0) : -1;
    var firing = frame >= 0;
    if (firing) {
      fireTex.offset.x = frame / FIRE_N;
      var ang = FIRE.angle;
      var reach = FW * 0.46;
      if (frame > FIRE_PEAK) reach += (FIRE_CX[FIRE_PEAK] - FIRE_CX[frame]) / 100 * FW;
      fireMesh.position.set(FIRE.x + Math.cos(ang) * reach, -(FIRE.y + Math.sin(ang) * reach), 0.7);
      fireMesh.material.opacity = frame <= FIRE_PEAK ? 1 : 1 - (frame - FIRE_PEAK) / (FIRE_N - FIRE_PEAK);
      fireMesh.visible = true;
    } else { fireMesh.visible = false; fireMesh.material.opacity = 1; }
    var peak = firing ? FIRE_GLOW[frame] : 0;
    fireGlow.position.set(FIRE.x + 28, -(FIRE.y + 10), 0);
    fireGlow.material.opacity += ((peak * 0.35) - fireGlow.material.opacity) * Math.min(1, dt * 8);
    var pu = postMat.uniforms;
    pu.uTime.value = t % 100;
    pu.uHeat.value += ((firing ? 1 : 0) - pu.uHeat.value) * Math.min(1, dt * 5);
    pu.uHeatPos.value.set(((HEAT.x - view.cx) * view.z + vw / 2) / vw, 1 - ((HEAT.y - view.cy) * view.z + vh / 2) / vh);
    pu.uHeatRad.value.set(HEAT.rx * view.z / vw, HEAT.ry * view.z / vh);

    // steam and exhaust
    steamAcc += dt;
    if (steamAcc > 0.26 && !calm) {
      steamAcc = 0;
      var src = wrapped && Math.random() < 0.35 ? EXHAUST : STEAM[Math.floor(Math.random() * STEAM.length)];
      for (i = 0; i < puffs.length; i++) if (puffs[i].life >= puffs[i].max) {
        var pf = puffs[i];
        pf.x = src[0] + (Math.random() - 0.5) * 8; pf.y = src[1];
        pf.vx = src === EXHAUST ? -14 : (Math.random() - 0.5) * 6; pf.vy = src === EXHAUST ? -5 : -(14 + Math.random() * 8);
        pf.life = 0; pf.max = 2 + Math.random();
        break;
      }
    }
    puffs.forEach(function (pf) {
      if (pf.life < pf.max) {
        pf.life += dt; u = Math.min(1, pf.life / pf.max);
        pf.x += (pf.vx + Math.sin(t * 2 + pf.seed) * 3) * dt; pf.y += pf.vy * dt;
        pf.m.position.set(pf.x, -pf.y, 0);
        pf.m.scale.set(8 + 18 * u, 8 + 18 * u, 1);
        pf.m.material.opacity = Math.sin(Math.PI * u) * 0.3;
      } else pf.m.material.opacity = 0;
    });

    // pigeons
    FLOCKS.forEach(function (f) {
      if (f.state === 0 && t > f.cool && !calm) {
        for (i = 0; i < actors.length; i++) {
          var a = actors[i];
          if (a.moving && dist(a.x + a.ox, a.y + a.oy, f.x, f.y) < 36) { f.state = 1; f.until = t + 8 + Math.random() * 5; break; }
        }
        if (f.state === 1) birds.forEach(function (b) {
          if (b.f === f) { b.t = -Math.random() * 0.25; b.vx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 60); b.flip = b.vx > 0 ? 1 : -1; }
        });
      } else if (f.state === 1 && t >= f.until) {
        f.state = 2; f.landed = 0;
        birds.forEach(function (b) { if (b.f === f) { b.t = -Math.random() * 0.5; b.x = b.hx; b.alt = 120; } });
      }
    });
    birds.forEach(function (b) {
      var f = b.f, op = 1, col = 0;
      if (f.state === 1) {
        b.t += dt;
        if (b.t > 0) { b.x += b.vx * dt; b.alt += (120 + 70 * b.t) * dt; col = 1; op = Math.max(0, Math.min(1, 1 - (b.t - 0.5) / 0.7)); }
      } else if (f.state === 2) {
        b.t += dt; u = Math.max(0, Math.min(1, b.t / 1.1));
        b.alt = 120 * (1 - u) * (1 - u); op = Math.min(1, u * 2); col = u < 1 ? 1 : 0;
        if (u >= 1 && !b.down) { b.down = true; f.landed++; }
        if (f.landed >= 4) { f.state = 0; f.cool = t + 1.5; birds.forEach(function (o) { if (o.f === f) { o.down = false; o.alt = 0; } }); }
      } else { b.x = b.hx; b.alt = 0; }
      b.tex.offset.x = col * 0.5;
      b.m.position.set(b.x, -b.hy + b.alt + 5, b.hy * 0.001);
      b.m.scale.set(b.flip * 13.6, 10.2 * (col ? 0.85 + 0.15 * Math.sin(t * 30) : 1), 1);
      b.m.material.opacity = op;
    });

    // the take
    if (!calm) {
      if (take.phase === 0 && t >= take.next) {
        take.phase = 1; take.t0 = t;
        bubble(caller, "Quiet on set", 1.1, true);
        actors.forEach(function (a) { if ((a.pool || a.loop) && dist(a.x, a.y, STAGE.x, STAGE.y) < STAGE.r) a.hold = true; });
      } else if (take.phase === 1 && t >= take.t0 + 1.2) {
        take.phase = 2; bubble(caller, "Action!", 1.2, true); breathe();
      } else if (take.phase === 2 && t >= take.t0 + 3.6) {
        take.phase = 0; take.next = t + 45 + Math.random() * 20;
        bubble(caller, "Cut!", 1.2, true);
        actors.forEach(function (a) { a.hold = false; });
      }
    }

    // bubbles follow their owners
    bubbles.slice().forEach(function (b) {
      if (t >= b.until) { dropBubble(b); return; }
      var tg = b.target, liftPx = tg.mesh ? SH * (tg.k || 1) : 0;
      var sx = (tg.x + (tg.ox || 0) - view.cx) * view.z + vw / 2;
      var sy = (tg.y + (tg.oy || 0) - liftPx - view.cy) * view.z + vh / 2;
      b.el.style.transform = "translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) translate(-50%,-100%) translateY(-9px)";
    });
  }

  /* ---------- sizing ---------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    vw = Math.max(1, r.width); vh = Math.max(1, r.height);
    renderer.setSize(vw, vh, false);
    var pr = renderer.getPixelRatio();
    rt.setSize(Math.max(1, Math.floor(vw * pr)), Math.max(1, Math.floor(vh * pr)));
    minZ = Math.max(vw / MAP.w, vh / MAP.h);       // "cover": the map always fills the stage
    maxZ = Math.max(minZ * 4, 2.5);
    if (!sized) { view.z = minZ; sized = true; }
    clampView();
  }
  if (window.ResizeObserver) { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage); }
  window.addEventListener("resize", resize);
  resize();
  /* wide shot holds: the painting is the frame */

  /* ---------- pointer input: click, drag to pan, wheel and pinch to zoom ---------- */
  var pts = new Map(), drag = null, pinch = null;
  function rel(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function pinchInfo() {
    var a = Array.from(pts.values());
    var r = canvas.getBoundingClientRect();
    return {
      dist: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1,
      mid: { x: (a[0].x + a[1].x) / 2 - r.left, y: (a[0].y + a[1].y) / 2 - r.top }
    };
  }
  canvas.addEventListener("pointerdown", function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camTarget = null;
    if (pts.size === 1) drag = { moved: 0 };
    else if (pts.size === 2) { drag = null; pinch = pinchInfo(); pinch.z = view.z; }
  });
  canvas.addEventListener("pointermove", function (e) {
    var p = rel(e);
    if (debug) { var m = screenToMap(p); $("coords").textContent = "Map px: " + Math.round(m.x) + ", " + Math.round(m.y); }
    var prev = pts.get(e.pointerId);
    if (!prev) {                       // plain mouse hover
      hovered = zoneAt(screenToMap(p));
      canvas.classList.toggle("is-hot", !!hovered);
      return;
    }
    var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      var now = pinchInfo();
      zoomAt(now.mid, pinch.z * now.dist / pinch.dist);
    } else if (drag) {
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6) {
        canvas.classList.add("is-drag");
        hint.classList.add("is-gone");
        view.cx -= dx / view.z; view.cy -= dy / view.z; clampView();
      }
    }
  });
  function lift(e) {
    var was = drag, had = pts.has(e.pointerId);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    drag = pts.size === 1 ? { moved: 99 } : null;
    canvas.classList.remove("is-drag");
    if (had && was && was.moved <= 6 && e.type === "pointerup") click(rel(e));
  }
  canvas.addEventListener("pointerup", lift);
  canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("pointerleave", function () { if (!pts.size) { hovered = null; canvas.classList.remove("is-hot"); } });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    camTarget = null;
    hint.classList.add("is-gone");
    zoomAt(rel(e), view.z * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  $("zin").addEventListener("click", function () { camTarget = null; zoomAt({ x: vw / 2, y: vh / 2 }, view.z * 1.35); });
  $("zout").addEventListener("click", function () { camTarget = null; zoomAt({ x: vw / 2, y: vh / 2 }, view.z / 1.35); });

  function click(p) {
    var m = screenToMap(p);
    if (debug) {                       // in debug, clicks author points instead of moving the character
      $("pts").value += "[" + Math.round(m.x) + "," + Math.round(m.y) + "],";
      return;
    }
    var who = personAt(m);
    if (who) { talk(who); return; }
    var z = zoneAt(m);
    hint.classList.add("is-gone");
    if (z) { go(z.id, false); return; }
    clearTimeout(pending);
    if (!travel(nearestSpot(m.x, m.y))) say("No route there from here yet.");
  }

  /* ---------- frame loop ---------- */
  var last = 0;
  function frame(ms) {
    if (!alive) return;
    // Some phones hand this callback a clock that never advances, which left every walker waiting forever.
    var t = typeof ms === "number" && ms > 0 ? ms / 1000 : 0;
    var dt = 1 / 60;
    if (last && t > last) dt = Math.min(0.05, t - last);
    else t = (last || 0) + dt;
    last = t;

    separate(dt);
    actors.forEach(function (a) {
      if ((a.pool || a.loop) && !a.moving && !a.hold) {
        a.wait -= dt;
        if (a.wait <= 0) {
          var n = a.loop ? a.loop[a.li = (a.li + 1) % a.loop.length] : a.pool[Math.floor(Math.random() * a.pool.length)];
          var path = findPath(a, spotAtNode(n));
          if (path && pathLength(a, path) > 1) { a.path = path; a.moving = true; }
          a.wait = 0.4 + Math.random() * 1.2;
        }
      }
      if (!a.hold) moveActor(a, dt);
      var idle = !(a.moving && !a.hold);
      var col = 0;
      var sway = 0;
      if (!idle) {
        var seq = [0, 1, 0, 3];
        col = seq[Math.floor(t * SPRITE.fps * Math.max(0.7, a.speed / 75) + a.phase) % 4];
      } else if (!calm) {
        // A small weight shift only. Mirroring them in place read as a pivot, not a person.
        sway = Math.sin(t * 0.7 + a.phase * 4) * (a.idle ? 1.6 : 0.8);
      }
      a.tex.offset.set(col / SPRITE.cols, a.row === 0 ? 1 - 1 / SPRITE.rows : 0);
      var x = a.x + a.ox + sway, y = a.y + a.oy;
      var bob = idle && !calm ? Math.sin(t * 1.35 + a.phase * 2) * (a.idle ? 3.2 : 1.4) : 0;
      var breath = idle && !calm ? 1 + Math.sin(t * 1.45 + a.phase) * (a.idle ? 0.032 : 0.016) : 1;
      a.mesh.position.set(x, -y + LIFT * a.k + bob, y * 0.001);            // z by map y: lower on screen draws in front
      a.mesh.scale.set(a.flip * SW * a.k, SH * a.k * breath, 1);
      a.shadow.position.set(x, -y, 0);
    });
    marker.position.set(hero.x, -hero.y + SH * hero.k * 0.92 + (calm ? 0 : Math.sin(t * 4) * 2.5), 5);

    var gy = -hero.y, ph = calm ? 0 : (t * 0.8) % 1;
    disc.position.set(hero.x, gy, 0.01); disc.scale.set(RING_W, RING_H, 1);
    ring.position.set(hero.x, gy, 0.02); ring.scale.set(RING_W, RING_H, 1);
    pulse.position.set(hero.x, gy, 0.02); pulse.scale.set(RING_W * (1 + ph * 0.9), RING_H * (1 + ph * 0.9), 1);
    pulse.material.opacity = calm ? 0 : 0.28 * (1 - ph);

    if (camTarget) {
      view.cx += (camTarget.x - view.cx) * 0.07;
      view.cy += (camTarget.y - view.cy) * 0.07;
      clampView();
      if (Math.abs(camTarget.x - view.cx) + Math.abs(camTarget.y - view.cy) < 1) camTarget = null;
    }

    var hx = vw / 2 / view.z, hy = vh / 2 / view.z;
    camera.left = -hx; camera.right = hx; camera.top = hy; camera.bottom = -hy;
    camera.position.x = view.cx; camera.position.y = -view.cy;
    camera.updateProjectionMatrix();

    ZONES.forEach(function (z) {
      var on = z === hovered || z.id === current;
      var f = on ? 0.055 : debug ? 0.1 : 0, l = on ? 0.42 : debug ? 0.9 : 0;
      z.fill.material.opacity += (f - z.fill.material.opacity) * 0.25;
      z.line.material.opacity += (l - z.line.material.opacity) * 0.25;
      if (z.chip) {
        z.chip.classList.toggle("is-hot", z === hovered);
        var sx = (z.anchor[0] - view.cx) * view.z + vw / 2, sy = (z.anchor[1] - view.cy) * view.z + vh / 2;
        z.chip.style.transform = "translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) translate(-50%,-50%)";
      }
    });
    net.material.opacity += ((debug ? 0.9 : 0) - net.material.opacity) * 0.25;

    fx(t, dt);
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
    if (alive) rafId = requestAnimationFrame(frame);
  }
  if (alive) rafId = requestAnimationFrame(frame);
  route();
})();

  } finally {
    EventTarget.prototype.addEventListener = origAdd;
  }
  return function dispose() {
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (resizeObserver) resizeObserver.disconnect();
    var vids = document.querySelectorAll("#stage video");
    for (var i = 0; i < vids.length; i++) {
      try { vids[i].pause(); vids[i].removeAttribute("src"); vids[i].load(); } catch (e) {}
    }
    tracked.forEach(function (t) {
      try { t[0].removeEventListener(t[1], t[2], t[3]); } catch (e) {}
    });
    if (audio) { try { audio.close(); } catch (e) {} }
    if (rendererRef) {
      try { rendererRef.dispose(); rendererRef.forceContextLoss(); } catch (e) {}
    }
  };
}

mountLot();
