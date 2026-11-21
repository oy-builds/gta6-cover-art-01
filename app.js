/* CoverForge — original, fully offline cover-art maker.
   No network calls, no external assets. All drawing is done locally on canvas. */
(function () {
  "use strict";

  var W = 1024, H = 1536; // 2:3 portrait, export width 1024px (>= 1024 required)
  var canvas = document.getElementById("coverCanvas");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");

  var els = {
    photoInput: document.getElementById("photoInput"),
    dropZone: document.getElementById("dropZone"),
    demoBtn: document.getElementById("demoBtn"),
    clearPhotoBtn: document.getElementById("clearPhotoBtn"),
    zoom: document.getElementById("zoomInput"),
    focus: document.getElementById("focusInput"),
    title: document.getElementById("titleInput"),
    subtitle: document.getElementById("subtitleInput"),
    tag: document.getElementById("tagInput"),
    grain: document.getElementById("grainInput"),
    exportBtn: document.getElementById("exportBtn")
  };

  var state = { photo: null, photoName: "" };

  function currentStyle() {
    var checked = document.querySelector('input[name="style"]:checked');
    return checked ? checked.value : "sunset";
  }
  function setStatus(msg) { statusEl.textContent = msg; }

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

  function drawDemoScene(c, style) {
    var sky = c.createLinearGradient(0, 0, 0, H);
    if (style === "neon") {
      sky.addColorStop(0, "#070b2e"); sky.addColorStop(0.45, "#33135e"); sky.addColorStop(0.72, "#8b1e83"); sky.addColorStop(1, "#0b2b3a");
    } else if (style === "halftone") {
      sky.addColorStop(0, "#fde047"); sky.addColorStop(0.5, "#fb923c"); sky.addColorStop(1, "#0ea5a4");
    } else {
      sky.addColorStop(0, "#ffd166"); sky.addColorStop(0.38, "#ff7b6b"); sky.addColorStop(0.68, "#c94f8e"); sky.addColorStop(1, "#155e63");
    }
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    // Sun / moon disc
    c.beginPath(); c.arc(W * 0.68, H * 0.30, 150, 0, Math.PI * 2);
    c.fillStyle = style === "neon" ? "#f0abfc" : "rgba(255,244,200,0.95)"; c.fill();
    c.beginPath(); c.arc(W * 0.68, H * 0.30, 185, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,0.14)"; c.fill();

    // Distant skyline (generic rectangles, original)
    c.fillStyle = "rgba(12,14,34,0.55)";
    var buildings = [[0, 120, 880], [130, 90, 830], [240, 150, 900], [410, 100, 845], [530, 170, 905], [720, 110, 835], [840, 140, 890], [960, 80, 860]];
    buildings.forEach(function (b) { c.fillRect(b[0], b[2], b[1], H * 0.62 - b[2] + 260); });

    // Sea / ground band
    var sea = c.createLinearGradient(0, H * 0.62, 0, H);
    sea.addColorStop(0, "rgba(255,255,255,0.22)"); sea.addColorStop(0.12, "rgba(10,30,50,0.35)"); sea.addColorStop(1, "rgba(5,10,24,0.88)");
    c.fillStyle = sea; c.fillRect(0, H * 0.62, W, H * 0.38);
    c.strokeStyle = "rgba(255,255,255,0.28)"; c.lineWidth = 3;
    for (var i = 0; i < 7; i++) {
      var y = H * 0.66 + i * 34;
      c.beginPath(); c.moveTo(60 + (i % 3) * 90, y); c.lineTo(420 + (i % 4) * 110, y); c.stroke();
    }
    drawPalm(c, 120, H * 0.70, 1.15, false);
    drawPalm(c, W - 70, H * 0.74, 1.45, true);
    drawPalm(c, W - 300, H * 0.68, 0.8, false);
  }

  /* ---------- Photo: cover-fit with zoom + vertical focus ---------- */
  function drawPhotoCover(c, img, style) {
    var zoom = Number(els.zoom.value) / 100;
    var focus = Number(els.focus.value) / 100;
    var scale = Math.max(W / img.width, H / img.height) * zoom;
    var dw = img.width * scale, dh = img.height * scale;
    var dx = (W - dw) / 2;
    var dy = (H - dh) * focus;
    c.save();
    if (style === "sunset") c.filter = "saturate(1.35) contrast(1.08) brightness(1.03)";
    else if (style === "neon") c.filter = "saturate(1.25) contrast(1.18) brightness(0.92) hue-rotate(-8deg)";
    else if (style === "halftone") c.filter = "saturate(1.6) contrast(1.28) brightness(1.05)";
    c.drawImage(img, dx, dy, dw, dh);
    c.restore();
  }

  /* ---------- Treatment overlays ---------- */
  function overlaySunset(c) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,120,80,0.20)"); g.addColorStop(0.5, "rgba(180,40,120,0.10)"); g.addColorStop(1, "rgba(0,40,50,0.38)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    var bottom = c.createLinearGradient(0, H * 0.58, 0, H);
    bottom.addColorStop(0, "rgba(0,0,0,0)"); bottom.addColorStop(1, "rgba(0,0,0,0.82)");
    c.fillStyle = bottom; c.fillRect(0, H * 0.58, W, H * 0.42);
  }
  function overlayNeon(c) {
    var g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "rgba(30,0,90,0.34)"); g.addColorStop(0.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,60,90,0.36)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#22d3ee"; c.lineWidth = 10; c.strokeRect(26, 26, W - 52, H - 52);
    c.strokeStyle = "#e879f9"; c.lineWidth = 4; c.strokeRect(48, 48, W - 96, H - 96);
    var top = c.createLinearGradient(0, 0, 0, H * 0.36);
    top.addColorStop(0, "rgba(0,0,20,0.72)"); top.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = top; c.fillRect(0, 0, W, H * 0.36);
  }
  function overlayHalftone(c) {
    c.save(); c.globalAlpha = 0.16; c.fillStyle = "#000";
    for (var y = 12; y < H; y += 26) for (var x = 12; x < W; x += 26) {
      c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.strokeStyle = "#111111"; c.lineWidth = 28; c.strokeRect(14, 14, W - 28, H - 28);
  }

  var noiseCanvas = null;
  function drawGrain(c) {
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
    var pat = c.createPattern(noiseCanvas, "repeat"); c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
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
  function drawTag(c, text, style) {
    if (!text) return;
    c.save(); c.font = "700 30px system-ui,sans-serif";
    var w = c.measureText(text.toUpperCase()).width + 36;
    var x = style === "neon" ? (W - w) / 2 : W - w - 52, y = 58;
    c.fillStyle = style === "halftone" ? "#111" : "rgba(0,0,0,0.62)";
    c.beginPath(); c.roundRect(x, y, w, 52, 10); c.fill();
    c.fillStyle = style === "halftone" ? "#facc15" : "#ffd166";
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text.toUpperCase(), x + w / 2, y + 27); c.restore();
  }
  function drawTitles(c, style) {
    var title = (els.title.value || "UNTITLED").toUpperCase();
    var subtitle = els.subtitle.value || "";
    c.save();
    if (style === "sunset") {
      c.textAlign = "left"; c.fillStyle = "#ffffff";
      c.font = "900 118px " + TITLE_FONT;
      var lines = wrapText(c, title, W - 120);
      lines.forEach(function (ln, i) {
        c.shadowColor = "rgba(0,0,0,0.65)"; c.shadowBlur = 18; c.shadowOffsetY = 6;
        c.fillText(ln, 60, H - 300 + i * 116);
      });
      c.shadowColor = "transparent"; c.font = "500 40px system-ui,sans-serif"; c.fillStyle = "#ffe9c9";
      var subtitleY = H - 292 + lines.length * 116 + 44;
      wrapText(c, subtitle, W - 120).slice(0, 2).forEach(function (ln, i) { c.fillText(ln, 62, subtitleY + i * 48); });
      c.fillStyle = "rgba(255,93,143,1)"; c.fillRect(60, H - 348, 120, 10);
    } else if (style === "neon") {
      c.textAlign = "center"; c.font = "900 112px " + TITLE_FONT; c.fillStyle = "#ffffff";
      c.shadowColor = "#22d3ee"; c.shadowBlur = 34;
      var nlines = wrapText(c, title, W - 140);
      nlines.forEach(function (ln, i) { c.fillText(ln, W / 2, 148 + i * 110); });
      c.shadowBlur = 0; c.fillStyle = "#e879f9"; c.fillRect(W / 2 - 130, 168 + nlines.length * 108, 260, 8);
      c.font = "500 38px system-ui,sans-serif"; c.fillStyle = "#e0faff";
      wrapText(c, subtitle, W - 180).forEach(function (ln, i) { c.fillText(ln, W / 2, H - 150 + i * 46); });
    } else { // halftone — angled yellow banner
      c.translate(W / 2, H - 330); c.rotate(-0.045);
      c.fillStyle = "#facc15"; c.fillRect(-W / 2 + 36, -118, W - 72, 236);
      c.strokeStyle = "#111"; c.lineWidth = 8; c.strokeRect(-W / 2 + 36, -118, W - 72, 236);
      c.textAlign = "center"; c.fillStyle = "#111"; c.font = "900 108px " + TITLE_FONT;
      var hlines = wrapText(c, title, W - 170);
      hlines.slice(0, 2).forEach(function (ln, i) { c.fillText(ln, 0, -6 + i * 100); });
      c.rotate(0.045); c.translate(-W / 2, -(H - 330));
      c.textAlign = "center"; c.font = "700 38px system-ui,sans-serif"; c.fillStyle = "#ffffff";
      c.shadowColor = "rgba(0,0,0,0.8)"; c.shadowBlur = 10;
      wrapText(c, subtitle, W - 160).forEach(function (ln, i) { c.fillText(ln, W / 2, H - 130 + i * 46); });
    }
    c.restore();
  }

  /* ---------- Main render ---------- */
  var rafPending = false;
  function render() {
    var style = currentStyle();
    ctx.clearRect(0, 0, W, H);
    if (state.photo) drawPhotoCover(ctx, state.photo, style); else drawDemoScene(ctx, style);
    if (style === "sunset") overlaySunset(ctx); else if (style === "neon") overlayNeon(ctx); else overlayHalftone(ctx);
    if (els.grain.checked) drawGrain(ctx);
    drawTag(ctx, els.tag.value, style);
    drawTitles(ctx, style);
  }
  function requestRender() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(function () { rafPending = false; render(); });
  }

  /* ---------- Photo loading ---------- */
  function loadPhotoFile(file) {
    if (!file || !/^image\//.test(file.type)) { setStatus("That file is not an image — please choose a photo."); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.photo = img; state.photoName = file.name;
      setStatus("Photo loaded: " + file.name + ". Preview updated — export when ready.");
      requestRender();
    };
    img.onerror = function () { URL.revokeObjectURL(url); setStatus("Could not read that image file."); };
    img.src = url;
  }

  els.dropZone.addEventListener("click", function () { els.photoInput.click(); });
  els.dropZone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.photoInput.click(); } });
  els.photoInput.addEventListener("change", function () { if (els.photoInput.files[0]) loadPhotoFile(els.photoInput.files[0]); });
  ["dragenter", "dragover"].forEach(function (ev) {
    els.dropZone.addEventListener(ev, function (e) { e.preventDefault(); els.dropZone.classList.add("dragging"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    els.dropZone.addEventListener(ev, function (e) { e.preventDefault(); els.dropZone.classList.remove("dragging"); });
  });
  els.dropZone.addEventListener("drop", function (e) {
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadPhotoFile(file);
  });
  els.demoBtn.addEventListener("click", function () { state.photo = null; setStatus("Demo scene loaded. Add your own photo anytime."); requestRender(); });
  els.clearPhotoBtn.addEventListener("click", function () { state.photo = null; els.photoInput.value = ""; setStatus("Photo cleared — demo scene shown."); requestRender(); });

  [els.zoom, els.focus, els.title, els.subtitle, els.tag, els.grain].forEach(function (el) {
    el.addEventListener("input", requestRender); el.addEventListener("change", requestRender);
  });
  document.querySelectorAll('input[name="style"]').forEach(function (el) { el.addEventListener("change", requestRender); });

  /* ---------- Export PNG (download) ---------- */
  function exportPNG() {
    render();
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) { setStatus("Export failed in this browser — try again."); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "coverforge-cover-1024.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        setStatus("PNG exported: 1024 x 1536. Check your downloads.");
      }, "image/png");
    } else {
      var a2 = document.createElement("a");
      a2.href = canvas.toDataURL("image/png"); a2.download = "coverforge-cover-1024.png"; a2.click();
      setStatus("PNG exported: 1024 x 1536. Check your downloads.");
    }
  }
  els.exportBtn.addEventListener("click", exportPNG);

  render();
})();
