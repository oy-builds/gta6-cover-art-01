/* CoverForge — original, fully offline multi-panel cover-art maker.
   No network calls, no external assets. All drawing is done locally on canvas.
   One photo can fill every panel with a different crop, or each panel can show
   a different photo; every panel has its own zoom and position. */
(function () {
  "use strict";

  var canvas = document.getElementById("coverCanvas");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");
  var previewMeta = document.getElementById("previewMeta");
  var photoListEl = document.getElementById("photoList");
  var panelPickerEl = document.getElementById("panelPicker");

  var els = {
    photoInput: document.getElementById("photoInput"),
    dropZone: document.getElementById("dropZone"),
    demoBtn: document.getElementById("demoBtn"),
    clearPhotosBtn: document.getElementById("clearPhotosBtn"),
    panelSource: document.getElementById("panelSource"),
    panelZoom: document.getElementById("panelZoom"),
    panelX: document.getElementById("panelX"),
    panelY: document.getElementById("panelY"),
    title: document.getElementById("titleInput"),
    subtitle: document.getElementById("subtitleInput"),
    tag: document.getElementById("tagInput"),
    grain: document.getElementById("grainInput"),
    exportBtn: document.getElementById("exportBtn")
  };

  /* ---------- Panels: a five-panel poster layout, in canvas fractions ---------- */
  var PANEL_LAYOUT = [
    { x: 0.00, y: 0.00, w: 0.60, h: 0.62 },  // hero, top left
    { x: 0.60, y: 0.00, w: 0.40, h: 0.31 },  // top right
    { x: 0.60, y: 0.31, w: 0.40, h: 0.31 },  // middle right
    { x: 0.00, y: 0.62, w: 0.36, h: 0.38 },  // bottom left
    { x: 0.36, y: 0.62, w: 0.64, h: 0.38 }   // bottom right
  ];
  // Default crop per panel, so one photo reads as five different shots.
  var PANEL_CROPS = [
    { zoom: 1.00, ox: 0,   oy: 0   },
    { zoom: 1.35, ox: 25,  oy: -10 },
    { zoom: 1.50, ox: -20, oy: 15  },
    { zoom: 1.30, ox: 15,  oy: 25  },
    { zoom: 1.20, ox: -10, oy: -20 }
  ];

  var state = {
    photos: [],           // [{ img, name }] — the person's own photos, read locally
    selectedPanel: 0,
    panels: PANEL_LAYOUT.map(function (p, i) {
      return { source: -1, zoom: PANEL_CROPS[i].zoom, ox: PANEL_CROPS[i].ox, oy: PANEL_CROPS[i].oy };
    })
  };

  function currentStyle() {
    var checked = document.querySelector('input[name="style"]:checked');
    return checked ? checked.value : "sunset";
  }
  function setStatus(msg) { statusEl.textContent = msg; }
  function panelRect(i, w, h) {
    var p = PANEL_LAYOUT[i];
    var g = Math.max(4, Math.round(w * 0.006)); // gutter between panels
    return { x: p.x * w + g, y: p.y * h + g, w: p.w * w - g * 2, h: p.h * h - g * 2 };
  }

  /* ---------- Demo scene: an original generated gradient landscape ---------- */
  function drawPalm(c, x, y, s, flip) {
    c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
    c.strokeStyle = "rgba(10,12,26,0.92)"; c.lineWidth = 13; c.lineCap = "round";
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(18, -90, 42, -168); c.stroke();
    c.lineWidth = 9;
    var fronds = [[42, -168, 118, -205], [42, -168, 96, -228], [42, -168, 30, -238], [42, -168, -34, -214], [42, -168, -58, -182]];
    fronds.forEach(function (f) {
      c.beginPath(); c.moveTo(f[0], f[1]); c.quadraticCurveTo((f[0] + f[2]) / 2, f[3] - 22, f[2], f[3]); c.stroke();
    });
    c.restore();
  }

  // Draws the demo scene inside one panel rect; the variant shifts the
  // composition so neighbouring panels do not look like the same shot.
  function drawDemoScene(c, style, rect, variant) {
    var w = rect.w, h = rect.h;
    c.save(); c.translate(rect.x, rect.y);
    var sky = c.createLinearGradient(0, 0, 0, h);
    if (style === "neon") {
      sky.addColorStop(0, "#070b2e"); sky.addColorStop(0.45, "#33135e"); sky.addColorStop(0.72, "#8b1e83"); sky.addColorStop(1, "#0b2b3a");
    } else if (style === "halftone") {
      sky.addColorStop(0, "#fde047"); sky.addColorStop(0.5, "#fb923c"); sky.addColorStop(1, "#0ea5a4");
    } else {
      sky.addColorStop(0, "#ffd166"); sky.addColorStop(0.38, "#ff7b6b"); sky.addColorStop(0.68, "#c94f8e"); sky.addColorStop(1, "#155e63");
    }
    c.fillStyle = sky; c.fillRect(0, 0, w, h);

    // Sun / moon disc
    var sunX = w * (0.68 - 0.09 * (variant % 3)), sunY = h * (0.30 + 0.03 * variant), sunR = Math.min(w, h) * 0.17;
    c.beginPath(); c.arc(sunX, sunY, sunR * 1.23, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,0.14)"; c.fill();
    c.beginPath(); c.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    c.fillStyle = style === "neon" ? "#f0abfc" : "rgba(255,244,200,0.95)"; c.fill();

    // Distant skyline (generic rectangles, original)
    c.fillStyle = "rgba(12,14,34,0.55)";
    var buildings = [[0.00, 0.12, 0.55], [0.13, 0.09, 0.52], [0.24, 0.15, 0.57], [0.41, 0.10, 0.53], [0.53, 0.17, 0.58], [0.72, 0.11, 0.52], [0.84, 0.14, 0.56], [0.96, 0.08, 0.54]];
    buildings.forEach(function (b) {
      var bx = ((b[0] + variant * 0.03) % 1) * w;
      c.fillRect(bx, b[2] * h, b[1] * w, h * 0.70 - b[2] * h);
    });

    // Sea / ground band
    var sea = c.createLinearGradient(0, h * 0.62, 0, h);
    sea.addColorStop(0, "rgba(255,255,255,0.22)"); sea.addColorStop(0.12, "rgba(10,30,50,0.35)"); sea.addColorStop(1, "rgba(5,10,24,0.88)");
    c.fillStyle = sea; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.strokeStyle = "rgba(255,255,255,0.28)"; c.lineWidth = Math.max(2, h * 0.004);
    for (var i = 0; i < 5; i++) {
      var y = h * 0.68 + i * h * 0.055;
      c.beginPath(); c.moveTo(w * 0.08 + (i % 3) * w * 0.07, y); c.lineTo(w * 0.45 + (i % 4) * w * 0.09, y); c.stroke();
    }
    var ps = h * 0.0013;
    drawPalm(c, w * 0.13, h * 0.74, ps * 1.15, false);
    drawPalm(c, w * 0.93, h * 0.78, ps * 1.45, true);
    drawPalm(c, w * 0.68, h * 0.72, ps * 0.8, false);
    c.restore();
  }

  /* ---------- Photo: cover-fit one photo into one panel, with its own crop ---------- */
  function drawPhotoInPanel(c, img, rect, panel, style) {
    var scale = Math.max(rect.w / img.width, rect.h / img.height) * panel.zoom;
    var dw = img.width * scale, dh = img.height * scale;
    var maxShiftX = Math.max(0, (dw - rect.w) / 2), maxShiftY = Math.max(0, (dh - rect.h) / 2);
    var dx = rect.x + (rect.w - dw) / 2 + (panel.ox / 50) * maxShiftX;
    var dy = rect.y + (rect.h - dh) / 2 + (panel.oy / 50) * maxShiftY;
    c.save();
    if (style === "sunset") c.filter = "saturate(1.35) contrast(1.08) brightness(1.03)";
    else if (style === "neon") c.filter = "saturate(1.25) contrast(1.18) brightness(0.92) hue-rotate(-8deg)";
    else if (style === "halftone") c.filter = "saturate(1.6) contrast(1.28) brightness(1.05)";
    c.drawImage(img, dx, dy, dw, dh);
    c.restore();
  }

  function drawPanel(c, i, w, h, style) {
    var rect = panelRect(i, w, h);
    var panel = state.panels[i];
    c.save();
    c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip();
    var photo = panel.source >= 0 ? state.photos[panel.source] : null;
    if (photo) drawPhotoInPanel(c, photo.img, rect, panel, style);
    else drawDemoScene(c, style, rect, i);
    c.restore();
    c.strokeStyle = style === "halftone" ? "#111111" : "rgba(255,255,255,0.9)";
    c.lineWidth = Math.max(3, w * 0.004);
    c.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  /* ---------- Treatment overlays (whole cover) ---------- */
  function overlaySunset(c, w, h) {
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,120,80,0.20)"); g.addColorStop(0.5, "rgba(180,40,120,0.10)"); g.addColorStop(1, "rgba(0,40,50,0.38)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    var bottom = c.createLinearGradient(0, h * 0.55, 0, h);
    bottom.addColorStop(0, "rgba(0,0,0,0)"); bottom.addColorStop(1, "rgba(0,0,0,0.82)");
    c.fillStyle = bottom; c.fillRect(0, h * 0.55, w, h * 0.45);
  }
  function overlayNeon(c, w, h) {
    var g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(30,0,90,0.34)"); g.addColorStop(0.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,60,90,0.36)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    var m = w * 0.025;
    c.strokeStyle = "#22d3ee"; c.lineWidth = Math.max(6, w * 0.009); c.strokeRect(m, m, w - m * 2, h - m * 2);
    c.strokeStyle = "#e879f9"; c.lineWidth = Math.max(3, w * 0.004); c.strokeRect(m * 1.9, m * 1.9, w - m * 3.8, h - m * 3.8);
    var top = c.createLinearGradient(0, 0, 0, h * 0.36);
    top.addColorStop(0, "rgba(0,0,20,0.72)"); top.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = top; c.fillRect(0, 0, w, h * 0.36);
  }
  function overlayHalftone(c, w, h) {
    var spacing = Math.max(16, h * 0.017);
    c.save(); c.globalAlpha = 0.16; c.fillStyle = "#000";
    for (var y = spacing / 2; y < h; y += spacing) for (var x = spacing / 2; x < w; x += spacing) {
      c.beginPath(); c.arc(x, y, spacing * 0.16, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.strokeStyle = "#111111"; c.lineWidth = Math.max(14, w * 0.026);
    var m = c.lineWidth / 2;
    c.strokeRect(m, m, w - c.lineWidth, h - c.lineWidth);
  }

  var noiseCanvas = null;
  function drawGrain(c, w, h) {
    if (!noiseCanvas) {
      noiseCanvas = document.createElement("canvas"); noiseCanvas.width = 256; noiseCanvas.height = 256;
      var nctx = noiseCanvas.getContext("2d"); var img = nctx.createImageData(256, 256);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 110 + Math.random() * 90;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      nctx.putImageData(img, 0, 0);
    }
    c.save(); c.globalAlpha = 0.07; c.globalCompositeOperation = "overlay";
    var pat = c.createPattern(noiseCanvas, "repeat"); c.fillStyle = pat; c.fillRect(0, 0, w, h); c.restore();
  }

  /* ---------- Text ---------- */
  var TITLE_FONT = '"Arial Black","Impact",system-ui,sans-serif';
  function wrapText(c, text, maxWidth) {
    var words = String(text || "").split(/\s+/).filter(Boolean), lines = [], line = "";
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (c.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }
  function drawTag(c, text, style, w, h) {
    if (!text) return;
    var fs = Math.max(20, w * 0.028);
    c.save(); c.font = "700 " + fs + "px system-ui,sans-serif";
    var tw = c.measureText(text.toUpperCase()).width + fs * 1.2;
    var x = style === "neon" ? (w - tw) / 2 : w - tw - w * 0.05, y = h * 0.04;
    c.fillStyle = style === "halftone" ? "#111" : "rgba(0,0,0,0.62)";
    c.beginPath(); c.roundRect(x, y, tw, fs * 1.7, 10); c.fill();
    c.fillStyle = style === "halftone" ? "#facc15" : "#ffd166";
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text.toUpperCase(), x + tw / 2, y + fs * 0.87); c.restore();
  }
  function drawTitles(c, style, w, h) {
    var title = (els.title.value || "UNTITLED").toUpperCase();
    var subtitle = els.subtitle.value || "";
    c.save();
    if (style === "sunset") {
      var fs = Math.min(w * 0.115, h * 0.115);
      c.font = "900 " + fs + "px " + TITLE_FONT;
      var lines = wrapText(c, title, w * 0.88);
      var subFs = fs * 0.34;
      c.font = "500 " + subFs + "px system-ui,sans-serif";
      var subLines = wrapText(c, subtitle, w * 0.88).slice(0, 2);
      var subTop = h - h * 0.045 - subLines.length * subFs * 1.2;
      var titleBottom = subTop - subFs * 0.7;
      c.textAlign = "left"; c.fillStyle = "#ffffff";
      c.font = "900 " + fs + "px " + TITLE_FONT;
      lines.forEach(function (ln, i) {
        c.shadowColor = "rgba(0,0,0,0.65)"; c.shadowBlur = 18; c.shadowOffsetY = 6;
        c.fillText(ln, w * 0.058, titleBottom - (lines.length - 1 - i) * fs * 0.98);
      });
      c.shadowColor = "transparent"; c.fillStyle = "rgba(255,93,143,1)";
      c.fillRect(w * 0.058, titleBottom - lines.length * fs * 0.98 - fs * 0.32, w * 0.11, Math.max(6, fs * 0.085));
      c.font = "500 " + subFs + "px system-ui,sans-serif"; c.fillStyle = "#ffe9c9";
      subLines.forEach(function (ln, i) { c.fillText(ln, w * 0.06, subTop + subFs + i * subFs * 1.2); });
    } else if (style === "neon") {
      var nfs = Math.min(w * 0.105, h * 0.13);
      c.textAlign = "center"; c.font = "900 " + nfs + "px " + TITLE_FONT; c.fillStyle = "#ffffff";
      c.shadowColor = "#22d3ee"; c.shadowBlur = 34;
      var nlines = wrapText(c, title, w * 0.86);
      nlines.forEach(function (ln, i) { c.fillText(ln, w / 2, h * 0.09 + nfs + i * nfs * 0.98); });
      c.shadowBlur = 0; c.fillStyle = "#e879f9";
      var uw = w * 0.24;
      c.fillRect(w / 2 - uw / 2, h * 0.09 + nfs + nlines.length * nfs * 0.98 + nfs * 0.12, uw, Math.max(5, nfs * 0.07));
      c.font = "500 " + nfs * 0.34 + "px system-ui,sans-serif"; c.fillStyle = "#e0faff";
      wrapText(c, subtitle, w * 0.84).slice(0, 2).forEach(function (ln, i) {
        c.fillText(ln, w / 2, h - h * 0.06 - i * nfs * 0.4);
      });
    } else { // halftone — angled yellow banner
      var hfs = Math.min(w * 0.105, h * 0.115);
      c.translate(w / 2, h * 0.76); c.rotate(-0.045);
      c.font = "900 " + hfs + "px " + TITLE_FONT;
      var hlines = wrapText(c, title, w * 0.82).slice(0, 2);
      var bh = hlines.length * hfs * 1.02 + hfs * 0.7;
      c.fillStyle = "#facc15"; c.fillRect(-w * 0.46, -bh / 2, w * 0.92, bh);
      c.strokeStyle = "#111"; c.lineWidth = Math.max(5, w * 0.007); c.strokeRect(-w * 0.46, -bh / 2, w * 0.92, bh);
      c.textAlign = "center"; c.fillStyle = "#111";
      hlines.forEach(function (ln, i) { c.fillText(ln, 0, -bh / 2 + hfs * 1.05 + i * hfs * 1.02); });
      c.restore(); c.save();
      c.textAlign = "center"; c.font = "700 " + hfs * 0.36 + "px system-ui,sans-serif"; c.fillStyle = "#ffffff";
      c.shadowColor = "rgba(0,0,0,0.8)"; c.shadowBlur = 10;
      wrapText(c, subtitle, w * 0.84).slice(0, 2).forEach(function (ln, i) {
        c.fillText(ln, w / 2, h - h * 0.055 - i * hfs * 0.42);
      });
    }
    c.restore();
  }

  /* ---------- Main render ---------- */
  var rafPending = false;
  function render(showSelection) {
    var w = canvas.width, h = canvas.height;
    var style = currentStyle();
    ctx.fillStyle = "#0b0e1a"; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < PANEL_LAYOUT.length; i++) drawPanel(ctx, i, w, h, style);
    if (style === "sunset") overlaySunset(ctx, w, h); else if (style === "neon") overlayNeon(ctx, w, h); else overlayHalftone(ctx, w, h);
    if (els.grain.checked) drawGrain(ctx, w, h);
    drawTag(ctx, els.tag.value, style, w, h);
    drawTitles(ctx, style, w, h);
    if (showSelection) {
      var rect = panelRect(state.selectedPanel, w, h);
      ctx.save();
      ctx.strokeStyle = "#ffb347"; ctx.lineWidth = Math.max(5, w * 0.006);
      ctx.setLineDash([Math.max(14, w * 0.02), Math.max(10, w * 0.014)]);
      ctx.strokeRect(rect.x - ctx.lineWidth, rect.y - ctx.lineWidth, rect.w + ctx.lineWidth * 2, rect.h + ctx.lineWidth * 2);
      ctx.restore();
    }
  }
  function requestRender() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(function () { rafPending = false; render(true); });
  }

  /* ---------- Panel editor wiring ---------- */
  function rebuildPanelPicker() {
    panelPickerEl.innerHTML = "";
    PANEL_LAYOUT.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "panel-btn" + (i === state.selectedPanel ? " active" : "");
      b.textContent = "Panel " + (i + 1);
      b.addEventListener("click", function () { selectPanel(i); });
      panelPickerEl.appendChild(b);
    });
  }
  function rebuildSourceOptions() {
    var current = state.panels[state.selectedPanel].source;
    els.panelSource.innerHTML = "";
    var demo = document.createElement("option"); demo.value = "-1"; demo.textContent = "Demo scene";
    els.panelSource.appendChild(demo);
    state.photos.forEach(function (photo, i) {
      var o = document.createElement("option"); o.value = String(i); o.textContent = "Photo " + (i + 1) + " — " + photo.name;
      els.panelSource.appendChild(o);
    });
    els.panelSource.value = String(current);
  }
  function syncPanelControls() {
    var p = state.panels[state.selectedPanel];
    rebuildSourceOptions();
    els.panelZoom.value = String(Math.round(p.zoom * 100));
    els.panelX.value = String(p.ox);
    els.panelY.value = String(p.oy);
    rebuildPanelPicker();
  }
  function selectPanel(i) { state.selectedPanel = i; syncPanelControls(); requestRender(); }

  els.panelSource.addEventListener("change", function () {
    state.panels[state.selectedPanel].source = Number(els.panelSource.value);
    requestRender();
  });
  els.panelZoom.addEventListener("input", function () {
    state.panels[state.selectedPanel].zoom = Number(els.panelZoom.value) / 100; requestRender();
  });
  els.panelX.addEventListener("input", function () {
    state.panels[state.selectedPanel].ox = Number(els.panelX.value); requestRender();
  });
  els.panelY.addEventListener("input", function () {
    state.panels[state.selectedPanel].oy = Number(els.panelY.value); requestRender();
  });
  canvas.addEventListener("click", function (e) {
    var r = canvas.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    for (var i = 0; i < PANEL_LAYOUT.length; i++) {
      var p = PANEL_LAYOUT[i];
      if (fx >= p.x && fx < p.x + p.w && fy >= p.y && fy < p.y + p.h) { selectPanel(i); break; }
    }
  });

  /* ---------- Photos ---------- */
  function renderPhotoList() {
    photoListEl.innerHTML = "";
    state.photos.forEach(function (photo, i) {
      var chip = document.createElement("div"); chip.className = "photo-chip";
      var label = document.createElement("span"); label.textContent = "Photo " + (i + 1) + " — " + photo.name;
      var fill = document.createElement("button"); fill.type = "button"; fill.className = "chip-btn"; fill.textContent = "Fill all panels";
      fill.addEventListener("click", function () { fillAllPanels(i); });
      var del = document.createElement("button"); del.type = "button"; del.className = "chip-btn"; del.textContent = "Remove";
      del.addEventListener("click", function () { removePhoto(i); });
      chip.appendChild(label); chip.appendChild(fill); chip.appendChild(del);
      photoListEl.appendChild(chip);
    });
  }
  function fillAllPanels(photoIndex) {
    state.panels.forEach(function (panel, i) {
      panel.source = photoIndex;
      panel.zoom = PANEL_CROPS[i].zoom; panel.ox = PANEL_CROPS[i].ox; panel.oy = PANEL_CROPS[i].oy;
    });
    syncPanelControls(); requestRender();
    setStatus("Photo " + (photoIndex + 1) + " fills every panel, each with its own crop. Select a panel to fine-tune it.");
  }
  function removePhoto(index) {
    state.photos.splice(index, 1);
    state.panels.forEach(function (panel) {
      if (panel.source === index) panel.source = -1;
      else if (panel.source > index) panel.source -= 1;
    });
    renderPhotoList(); syncPanelControls(); requestRender();
    setStatus("Photo removed. Panels that used it show the demo scene again.");
  }
  function loadPhotoFile(file) {
    if (!file || !/^image\//.test(file.type)) { setStatus("That file is not an image — please choose a photo."); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var wasEmpty = state.photos.length === 0;
      state.photos.push({ img: img, name: file.name });
      renderPhotoList();
      if (wasEmpty) fillAllPanels(0);
      else { syncPanelControls(); requestRender(); setStatus("Photo added: " + file.name + ". Assign it to panels in the panel editor."); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); setStatus("Could not read that image file."); };
    img.src = url;
  }

  els.dropZone.addEventListener("click", function () { els.photoInput.click(); });
  els.dropZone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.photoInput.click(); } });
  els.photoInput.addEventListener("change", function () {
    Array.prototype.forEach.call(els.photoInput.files, loadPhotoFile);
    els.photoInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    els.dropZone.addEventListener(ev, function (e) { e.preventDefault(); els.dropZone.classList.add("dragging"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    els.dropZone.addEventListener(ev, function (e) { e.preventDefault(); els.dropZone.classList.remove("dragging"); });
  });
  els.dropZone.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files) Array.prototype.forEach.call(files, loadPhotoFile);
  });
  els.demoBtn.addEventListener("click", function () {
    state.panels.forEach(function (panel) { panel.source = -1; });
    syncPanelControls(); setStatus("Demo scene in every panel. Add your own photos anytime."); requestRender();
  });
  els.clearPhotosBtn.addEventListener("click", function () {
    state.photos = [];
    state.panels.forEach(function (panel) { panel.source = -1; });
    renderPhotoList(); syncPanelControls(); setStatus("Photos removed — demo scene shown."); requestRender();
  });

  [els.title, els.subtitle, els.tag, els.grain].forEach(function (el) {
    el.addEventListener("input", requestRender); el.addEventListener("change", requestRender);
  });
  document.querySelectorAll('input[name="style"]').forEach(function (el) { el.addEventListener("change", requestRender); });

  /* ---------- Export sizes + PNG export ---------- */
  function applySize() {
    var checked = document.querySelector('input[name="size"]:checked');
    var parts = (checked ? checked.value : "1080x1350").split("x");
    canvas.width = Number(parts[0]); canvas.height = Number(parts[1]);
    previewMeta.textContent = canvas.width + " × " + canvas.height + " · PNG";
    requestRender();
  }
  document.querySelectorAll('input[name="size"]').forEach(function (el) { el.addEventListener("change", applySize); });

  function exportPNG() {
    render(false); // export exactly what the cover is — no selection outline
    var name = "coverforge-cover-" + canvas.width + "x" + canvas.height + ".png";
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) { setStatus("Export failed in this browser — try again."); requestRender(); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        setStatus("PNG exported: " + canvas.width + " x " + canvas.height + ". Check your downloads.");
        requestRender();
      }, "image/png");
    } else {
      var a2 = document.createElement("a");
      a2.href = canvas.toDataURL("image/png"); a2.download = name; a2.click();
      setStatus("PNG exported: " + canvas.width + " x " + canvas.height + ". Check your downloads.");
      requestRender();
    }
  }
  els.exportBtn.addEventListener("click", exportPNG);

  syncPanelControls();
  render(true);
})();
