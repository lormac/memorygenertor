let exportRunning = false;
let testSlideOnly = null;

async function exportGraduationVideo() {
  if (exportRunning) {
    setStatus("Export already running.");
    return;
  }

  exportRunning = true;
  setStatus("Starting canvas export...");

  const link = document.getElementById("videoDownloadLink");
  if (link) link.classList.add("hidden");

  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  const assets = await loadAssets();
  await document.fonts.ready;
  drawSlide1Frame(ctx, assets, 0);
  await wait(500);

  const stream = canvas.captureStream(30);
  const finalStream = new MediaStream(stream.getVideoTracks());

  const musicPlayer = document.getElementById("musicPlayer");

  if (musicPlayer && musicPlayer.src) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      window.audioContext = new AudioContextClass();
      const audioContext = window.audioContext;

      const source = audioContext.createMediaElementSource(musicPlayer);
      const destination = audioContext.createMediaStreamDestination();

      source.connect(destination);
      source.connect(audioContext.destination);

      destination.stream.getAudioTracks().forEach(track => {
        finalStream.addTrack(track);
      });

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

    } catch (err) {
      console.warn("Music could not be added to export:", err);
      setStatus("Music could not be added, exporting video only.");
    }
  }

  const chunks = [];

  const recorder = new MediaRecorder(finalStream, {
    mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm",
    videoBitsPerSecond: 12000000
  });

  recorder.ondataavailable = e => {
    if (e.data.size) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = "graduation_test_slides_1_2.webm";
    link.textContent = "Download WebM Video";
    link.classList.remove("hidden");

    setStatus("Done. Download link is ready.");
    exportRunning = false;
  };

  recorder.start();

  await wait(400);

  if (musicPlayer && musicPlayer.src) {
    try {
      musicPlayer.pause();
      musicPlayer.currentTime = 0;
      await musicPlayer.play();
      setStatus("Recording video with music...");
    } catch (err) {
      console.warn("Music failed to start after recorder began:", err);
      setStatus("Music was selected but could not start. Click play on the audio once, pause it, then export again.");
    }
  }

  const songLength =
    musicPlayer && musicPlayer.duration && !isNaN(musicPlayer.duration)
      ? musicPlayer.duration
      : 112;

  const timing = calculateRepeatAwareDurations(songLength);
  const d = timing.durations;

  setStatus(
    "Recording " +
    timing.runs +
    " run(s). Each run is about " +
    Math.round(timing.total) +
    " seconds."
  );

  const slideDurations = {
    1: 6000, 2: 6000, 3: 8000, 4: 10000, 5: 7000,
    6: 19000, 7: 21000, 8: 9000, 9: 12000, 10: 14000
  };

  if (testSlideOnly) {
    setStatus("Recording Slide " + testSlideOnly + " only...");
    await renderSlide(ctx, assets, testSlideOnly, slideDurations[testSlideOnly]);
  } else {
    for (let run = 0; run < timing.runs; run++) {
      await renderSlide(ctx, assets, 1,  d[1]  * 1000);
      await renderSlide(ctx, assets, 2,  d[2]  * 1000);
      await renderSlide(ctx, assets, 3,  d[3]  * 1000);
      await renderSlide(ctx, assets, 4,  d[4]  * 1000);
      await renderSlide(ctx, assets, 5,  d[5]  * 1000);
      await renderSlide(ctx, assets, 6,  d[6]  * 1000);
      await renderSlide(ctx, assets, 7,  d[7]  * 1000);
      await renderSlide(ctx, assets, 8,  d[8]  * 1000);
      await renderSlide(ctx, assets, 9,  d[9]  * 1000);
      await renderSlide(ctx, assets, 10, d[10] * 1000);
    }
  }

  await wait(500);
  recorder.stop();
}

function setStatus(msg) {
  const s = document.getElementById("exportStatus");
  if (s) {
    s.classList.remove("hidden");
    s.textContent = msg;
  }
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function loadAssets() {
  setStatus("Loading all slide backgrounds and photos...");

  return {
    bg1: await loadImg("slides/slide_01.png"),
    bg2: await loadImg("slides/slide_02.png"),
    bg3: await loadImg("slides/slide_03.png"),
    bg4: await loadImg("slides/slide_04.png"),
    bg5: await loadImg("slides/slide_05.png"),
    bg6: await loadImg("slides/slide_06.png"),
    bg7: await loadImg("slides/slide_07.png"),
    bg8: await loadImg("slides/slide_08.png"),
    bg9: await loadImg("slides/slide_09.png"),
    bg10: await loadImg("slides/slide_10.png"),

    photo1: await loadFile("photo1"),

    photo2a: await loadMultiFile("slide2Photos", 0),
    photo2b: await loadMultiFile("slide2Photos", 1),

    photo4: await loadFile("photo4"),
    photo5: await loadFile("photo5"),

    slide4CenterPhoto: await loadFile("slide4CenterPhoto"),
    slide4Photos: await loadMultiSet("slide4Photos", 4),
    slide5Photos: await loadMultiSet("slide5Photos", 5),
    slide6Photos: await loadMultiSet("slide6Photos", 6),
    slide7Photos: await loadMultiSet("slide7Photos", 6),

    photo28: await loadFile("photo28"),

    slide9Photos: await loadMultiSet("slide9Photos", 5),
    slide10Photos: await loadMultiSet("slide10Photos", 7)
  };
}

async function loadMultiSet(id, count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(await loadMultiFile(id, i));
  }
  return arr;
}

function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadFile(id) {
  return new Promise(resolve => {
    const input = document.getElementById(id);
    if (!input || !input.files || !input.files[0]) return resolve(null);

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(input.files[0]);
  });
}

function loadMultiFile(id, index) {
  return new Promise(resolve => {
    const input = document.getElementById(id);
    if (!input || !input.files || !input.files[index]) return resolve(null);

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(input.files[index]);
  });
}

async function renderSlide(ctx, assets, slideNum, duration) {
  setStatus("Recording Slide " + slideNum + "...");

  const start = performance.now();

  return new Promise(resolve => {
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);

      if (slideNum === 1)  drawSlide1Frame(ctx, assets, t);
      if (slideNum === 2)  drawSlide2Frame(ctx, assets, t);
      if (slideNum === 3)  drawSlide3Frame(ctx, assets, t);
      if (slideNum === 4)  drawSlide4Frame(ctx, assets, t);
      if (slideNum === 5)  drawSlide5Frame(ctx, assets, t);
      if (slideNum === 6)  drawSlide6Frame(ctx, assets, t);
      if (slideNum === 7)  drawSlide7Frame(ctx, assets, t);
      if (slideNum === 8)  drawSlide8Frame(ctx, assets, t);
      if (slideNum === 9)  drawSlide9Frame(ctx, assets, t);
      if (slideNum === 10) drawSlide10Frame(ctx, assets, t);

      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }

    requestAnimationFrame(frame);
  });
}

function clear(ctx) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1920, 1080);
}

function drawSlide1Frame(ctx, assets, t) {
  clear(ctx);

  drawPhoto(ctx, assets.photo1, 28.83, 35.39, 40.25, 42.08, t);

  if (assets.bg1) ctx.drawImage(assets.bg1, 0, 0, 1920, 1080);

  const a = Math.min(1, t / 0.3);

  drawScriptText(ctx, document.getElementById("slide1Text1").value, 30.32, 13.71, 40.07, 13.07, 120, a);
  drawText(ctx, document.getElementById("slide1Text2").value, 30.86, 82.15, 35.23, 12.96, 84, a);
}

function drawSlide2Frame(ctx, assets, t) {
  clear(ctx);

  drawPhoto(ctx, assets.photo2a, 9.9, 24.63, 21.72, 59.72, t);
  drawPhoto(ctx, assets.photo2b, 41.67, 36.76, 17.29, 47.59, t);

  if (assets.bg2) ctx.drawImage(assets.bg2, 0, 0, 1920, 1080);

  const a = Math.min(1, t / 0.3);

  drawText(ctx, document.getElementById("slide2Text1").value, 66.41, 14.72, 25.1, 19.81, 104, a);
  drawMultiText(ctx, document.getElementById("slide2Text2").value, 71.25, 54.35, 15.47, 16.94, 74, a);
}

function drawPhoto(ctx, img, xp, yp, wp, hp, t) {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (!img) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PHOTO", x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }

  const zoom = 1 + t * 0.12;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(zoom, zoom);

  drawCover(ctx, img, -w / 2, -h / 2, w, h);

  ctx.restore();
}

function drawCover(ctx, img, x, y, w, h) {
  if (!img) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 38px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PHOTO", x + w / 2, y + h / 2);
    return;
  }

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const s = Math.max(w / iw, h / ih);
  const nw = iw * s;
  const nh = ih * s;

  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
}

function drawText(ctx, text, xp, yp, wp, hp, size, alpha) {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;

  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 " + size + "px Montserrat";

  const gold = ctx.createLinearGradient(0, cy - size, 0, cy + size);
  gold.addColorStop(0, "#fff7cf");
  gold.addColorStop(0.35, "#f6df8f");
  gold.addColorStop(0.6, "#c89528");
  gold.addColorStop(1, "#fff1b8");

  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.strokeStyle = "rgba(0,0,0,.65)";
  ctx.shadowColor = "rgba(0,0,0,.95)";
  ctx.shadowBlur = 18;

  ctx.strokeText(text || "", cx, cy);
  ctx.fillStyle = gold;
  ctx.fillText(text || "", cx, cy);

  ctx.restore();
}

function drawMultiText(ctx, text, xp, yp, wp, hp, size, alpha) {
  const lines = String(text || "").split("\n");
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;
  const lh = size * 1.12;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 " + size + "px Montserrat";

  ctx.lineWidth = Math.max(3, size * 0.055);
  ctx.strokeStyle = "rgba(0,0,0,.68)";
  ctx.shadowColor = "rgba(0,0,0,.95)";
  ctx.shadowBlur = 18;

  const startY = y + h / 2 - ((lines.length - 1) * lh) / 2;

  lines.forEach((line, i) => {
    const cy = startY + i * lh;

    const gold = ctx.createLinearGradient(0, cy - size, 0, cy + size);
    gold.addColorStop(0, "#fff7cf");
    gold.addColorStop(0.35, "#f6df8f");
    gold.addColorStop(0.6, "#c89528");
    gold.addColorStop(1, "#fff1b8");

    ctx.strokeText(line, x + w / 2, cy);
    ctx.fillStyle = gold;
    ctx.fillText(line, x + w / 2, cy);
  });

  ctx.restore();
}

function drawScriptText(ctx, text, xp, yp, wp, hp, size, alpha) {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#F6DF8F";
  ctx.font = "400 " + size + "px 'Great Vibes'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.95)";
  ctx.shadowBlur = 14;

  ctx.fillText(text || "", x + w / 2, y + h / 2);

  ctx.restore();
}

function drawSlide3Frame(ctx, assets, t) {
  clear(ctx);

  if (assets.bg3) {
    ctx.drawImage(assets.bg3, 0, 0, 1920, 1080);
  }

  const move = smoothstep(t, 0.20, 0.75);
  const frameX = lerp(9, 59, move);

  const oldAlpha = 1 - smoothstep(t, 0.28, 0.48);
  const newAlpha = smoothstep(t, 0.52, 0.72);

  ctx.save();
  ctx.globalAlpha = oldAlpha;
  drawFramedPhoto(ctx, assets.photo4, frameX, 24, 32, 56, t);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = newAlpha;
  drawFramedPhoto(ctx, assets.photo5, frameX, 24, 32, 56, t);
  ctx.restore();

  if (oldAlpha > 0.01) {
    drawMultiText(
      ctx,
      document.getElementById("slide3Text1")?.value || "",
      58, 32, 34, 20, 78,
      oldAlpha
    );
  }

  if (newAlpha > 0.01) {
    drawMultiText(
      ctx,
      document.getElementById("slide3Text2")?.value || "",
      7, 32, 34, 20, 82,
      newAlpha
    );
  }
}

async function exportCurrentSlideOnly() {
  const picker = document.getElementById("slidePicker");
  const selected = picker ? picker.value : "slide_01";

  testSlideOnly = Number(selected.replace("slide_", ""));

  exportRunning = false; // always allow single-slide export to start fresh
  setStatus("Preparing Slide " + testSlideOnly + " export...");

  await exportGraduationVideo();

  testSlideOnly = null;
}

async function exportSingleSlideForTesting(slideNum) {
  // placeholder
}

function drawFrameForSlide(ctx, assets, slideNum, t) {
  if (slideNum === 1)  drawSlide1Frame(ctx, assets, t);
  if (slideNum === 2)  drawSlide2Frame(ctx, assets, t);
  if (slideNum === 3)  drawSlide3Frame(ctx, assets, t);
  if (slideNum === 4)  drawSlide4Frame(ctx, assets, t);
  if (slideNum === 5)  drawSlide5Frame(ctx, assets, t);
  if (slideNum === 6)  drawSlide6Frame(ctx, assets, t);
  if (slideNum === 7)  drawSlide7Frame(ctx, assets, t);
  if (slideNum === 8)  drawSlide8Frame(ctx, assets, t);
  if (slideNum === 9)  drawSlide9Frame(ctx, assets, t);
  if (slideNum === 10) drawSlide10Frame(ctx, assets, t);
}

function drawSlide4Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg4) ctx.drawImage(assets.bg4, 0, 0, 1920, 1080);

  drawCirclePhoto(ctx, assets.slide4CenterPhoto, 38, 25, 24, 46, t);

  const cx = 960;
  const cy = 540;
  const rx = 620;
  const ry = 360;
  const rot = t * Math.PI * 2;

  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rx / 2 - 145;
    const y = cy + Math.sin(a) * ry / 2 - 145;
    drawCirclePhotoPx(ctx, assets.slide4Photos[i], x, y, 290, 290, t);
  }

  drawMultiText(ctx, document.getElementById("slide4Text")?.value || "", 5, 80, 90, 12, 74, Math.min(1, t / 0.3));
}

function drawSlide5Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg5) ctx.drawImage(assets.bg5, 0, 0, 1920, 1080);

  const pos = [
    [8, 14], [33, 9], [68, 15], [18, 63], [62, 63]
  ];

  for (let i = 0; i < 5; i++) {
    const a = smoothstep(t, i * 0.12, i * 0.12 + 0.22);
    ctx.save();
    ctx.globalAlpha = a;
    drawFramedPhoto(ctx, assets.slide5Photos[i], pos[i][0], pos[i][1], 18, 32, t);
    ctx.restore();
  }

  drawMultiText(ctx, document.getElementById("slide5Text")?.value || "", 28, 40, 44, 20, 76, smoothstep(t, 0.48, 0.7));
}

function drawSlide6Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg6) ctx.drawImage(assets.bg6, 0, 0, 1920, 1080);

  const baseX = 14;
  const baseY = 14;
  const rotations = [-7, 5, -3, 8, -5, 2];

  for (let i = 5; i >= 0; i--) {
    let drop = 0;
    if (i < 5) {
      drop = smoothstep(t, (i + 1) * 0.15, (i + 1) * 0.15 + 0.08);
    }

    ctx.save();
    ctx.globalAlpha = 1 - drop;
    const x = baseX + drop * (i % 2 === 0 ? -45 : 45);
    const y = baseY + drop * 85;
    const captionsOn = document.getElementById("polaroidCaptionsOn")?.checked;
const captionText = captionsOn
  ? document.getElementById("polaroidCaption" + (i + 1))?.value || ""
  : "";

drawPolaroid(ctx, assets.slide6Photos[i], x, y, 33, 62, rotations[i], t, captionText);
    ctx.restore();
  }

  drawMultiText(ctx, document.getElementById("slide6Text")?.value || "", 53, 32, 38, 20, 74, smoothstep(t, 0.05, 0.18));
}

function drawSlide7Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg7) ctx.drawImage(assets.bg7, 0, 0, 1920, 1080);

  const pos = [
    [8, 15], [39, 15], [70, 15],
    [8, 60], [39, 60], [70, 60]
  ];

  const active = Math.min(5, Math.floor(t * 6));

  for (let i = 0; i < 6; i++) {
    const bright = i === active ? 1 : 0.35;
    ctx.save();
    ctx.globalAlpha = bright;
    drawFramedPhoto(ctx, assets.slide7Photos[i], pos[i][0], pos[i][1], 18.75, 22.2, t);
    ctx.restore();
  }

  drawMultiText(ctx, document.getElementById("slide7Text")?.value || "", 28, 43, 44, 18, 78, 1);
}

function drawSlide8Frame(ctx, assets, t) {
  clear(ctx);

  ctx.save();
  const x = 11.67 / 100 * 1920;
  const y = 10.09 / 100 * 1080;
  const w = 30.78 / 100 * 1920;
  const h = 78.43 / 100 * 1080;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-11 * Math.PI / 180);
  drawPhotoPx(ctx, assets.photo28, -w / 2, -h / 2, w, h, t);
  ctx.restore();

  if (assets.bg8) ctx.drawImage(assets.bg8, 0, 0, 1920, 1080);

  drawMultiText(ctx, document.getElementById("slide8Text")?.value || "", 59.58, 30.28, 33.54, 47.87, 84, smoothstep(t, 0.1, 0.35));
}

function drawSlide9Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg9) ctx.drawImage(assets.bg9, 0, 0, 1920, 1080);

  drawFramedPhoto(ctx, assets.slide9Photos[0], 37, 20, 26, 48, t);

  const pos = [[15, 18], [70, 18], [15, 63], [70, 63]];
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.globalAlpha = smoothstep(t, 0.08 + i * 0.1, 0.22 + i * 0.1);
    drawFramedPhoto(ctx, assets.slide9Photos[i + 1], pos[i][0], pos[i][1], 15.6, 20.4, t);
    ctx.restore();
  }

  drawMultiText(ctx, document.getElementById("slide9Text")?.value || "", 28, 78, 44, 14, 76, smoothstep(t, 0.45, 0.65));
}

function drawSlide10Frame(ctx, assets, t) {
  clear(ctx);
  if (assets.bg10) ctx.drawImage(assets.bg10, 0, 0, 1920, 1080);

  drawFramedPhoto(ctx, assets.slide10Photos[0], 35, 18, 30, 55, t);

  const pos = [
    [12, 10], [75, 12], [5, 42],
    [82, 42], [15, 75], [72, 75]
  ];

  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.globalAlpha = smoothstep(t, 0.05 + i * 0.06, 0.2 + i * 0.06);
    drawFramedPhoto(ctx, assets.slide10Photos[i + 1], pos[i][0], pos[i][1], 14, 18, t);
    ctx.restore();
  }

  drawScriptText(
    ctx,
    document.getElementById("slide10Text")?.value || "",
    24, 78, 52, 16, 110,
    smoothstep(t, 0.35, 0.55)
  );
}

function drawPhotoPx(ctx, img, x, y, w, h, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (!img) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }

  const zoom = 1 + t * 0.08;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(zoom, zoom);
  drawCover(ctx, img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawFramedPhoto(ctx, img, xp, yp, wp, hp, t) {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  ctx.restore();

  drawPhotoPx(ctx, img, x, y, w, h, t);
}

function drawCirclePhoto(ctx, img, xp, yp, wp, hp, t) {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;
  drawCirclePhotoPx(ctx, img, x, y, w, h, t);
}

function drawCirclePhotoPx(ctx, img, x, y, w, h, t) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  drawCover(ctx, img, x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPolaroid(ctx, img, xp, yp, wp, hp, deg, t, captionText = "") {
  const x = xp / 100 * 1920;
  const y = yp / 100 * 1080;
  const w = wp / 100 * 1920;
  const h = hp / 100 * 1080;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(deg * Math.PI / 180);

  ctx.fillStyle = "#fffdf4";
  ctx.fillRect(-w / 2, -h / 2, w, h);

  drawPhotoPx(ctx, img, -w / 2 + 34, -h / 2 + 34, w - 68, h - 140, t);

  if (captionText) {
    ctx.save();
    ctx.fillStyle = "#111";
    ctx.font = "700 44px 'Permanent Marker', 'Comic Sans MS', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const captionY = h / 2 - 52;
    fitCanvasText(ctx, captionText, 0, captionY, w - 60, 44);

    ctx.restore();
  }

  ctx.restore();
}

function fitCanvasText(ctx, text, x, y, maxWidth, startSize) {
  let size = startSize;

  while (size > 18) {
    ctx.font = "700 " + size + "px 'Permanent Marker', 'Comic Sans MS', cursive";

    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }

    size -= 2;
  }

  ctx.fillText(text, x, y);
}

function calculateRepeatAwareDurations(songSeconds) {
  const base = {
    1: 6, 2: 6, 3: 8, 4: 10, 5: 7,
    6: 19, 7: 21, 8: 9, 9: 12, 10: 14
  };

  const baseTotal = Object.values(base).reduce((a, b) => a + b, 0);

  const runs = songSeconds >= baseTotal * 1.5 ? 2 : 1;
  const targetPerRun = songSeconds / runs;

  const locked = [3, 6, 7, 10];
  const flexible = [1, 2, 4, 5, 8, 9];

  const lockedTotal = locked.reduce((sum, n) => sum + base[n], 0);
  const flexibleTotal = flexible.reduce((sum, n) => sum + base[n], 0);

  const targetFlexibleTotal = targetPerRun - lockedTotal;
  const scale = targetFlexibleTotal / flexibleTotal;

  const min = { 1: 4, 2: 4, 4: 7, 5: 5, 8: 7, 9: 8 };
  const max = { 1: 9, 2: 9, 4: 13, 5: 10, 8: 12, 9: 15 };

  const result = { ...base };

  flexible.forEach(n => {
    result[n] = Math.max(min[n], Math.min(max[n], base[n] * scale));
  });

  return {
    runs,
    durations: result,
    targetPerRun,
    total: Object.values(result).reduce((a, b) => a + b, 0)
  };
}

function smoothstep(t, a, b) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
