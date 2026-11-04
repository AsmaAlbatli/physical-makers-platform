/* ============================================================
   منصة صناع الحركة والنشاط البدني
   محرك التفاعل: المراحل، الاختبارات، النجوم، والفيديوهات
   إعداد المعلمة تهاني الباتلي
   ============================================================ */
(function () {
  "use strict";

  const STAR_PATH = "M12 2.4l3 6.2 6.8.9-5 4.8 1.2 6.7-6-3.2-6 3.2 1.2-6.7-5-4.8 6.8-.9Z";
  const STORAGE_KEY = "physical-makers-v1";
  const SITE_URL = "https://asmaalbatli.github.io/physical-makers-platform/";
  const LETTERS = ["أ", "ب", "ج"];
  const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const TOTAL_STARS = STAGES.length * SPORT_ORDER.length * 3;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CONFETTI_COLORS = ["#ffc83d", "#ff4d9d", "#6d5dfc", "#00cfe8", "#12b886", "#ff8a3d"];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    stageGrid: $("#stageGrid"),
    stagePanels: $("#stagePanels"),
    totalStars: $("#totalStars"),
    progressTotal: $("#progressTotal"),
    progressTotalBar: $("#progressTotalBar"),
    soundToggle: $("#soundToggle"),
    resetProgress: $("#resetProgress"),
    quizModal: $("#quizModal"),
    quizIcon: $("#quizIcon"),
    quizStage: $("#quizStage"),
    quizTitle: $("#quizTitle"),
    quizCount: $("#quizCount"),
    quizProgress: $("#quizProgress"),
    quizBody: $("#quizBody"),
    videoModal: $("#videoModal"),
    videoFrame: $("#videoFrame"),
    videoTitle: $("#videoTitle"),
    videoDesc: $("#videoDesc"),
    videoChannel: $("#videoChannel"),
    videoDuration: $("#videoDuration"),
    videoLink: $("#videoLink"),
    videoGrid: $("#videoGrid"),
    confettiLayer: $("#confettiLayer"),
    liveRegion: $("#liveRegion"),
    toTop: $("#toTop")
  };

  const state = {
    best: {},
    sound: true,
    lastStage: "g1"
  };

  let activeStageId = "g1";
  let activeModal = null;
  let lastFocusedElement = null;
  let quiz = null;
  let audioContext = null;

  /* ---------- أدوات مساعدة ---------- */
  function ar(number) {
    return String(number).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });
  }

  function starSvg(isEarned, className = "") {
    return `<svg class="star ${isEarned ? "is-earned" : "is-off"} ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${STAR_PATH}"/></svg>`;
  }

  function quizKey(stageId, sportKey) {
    return `${stageId}:${sportKey}`;
  }

  function getBest(stageId, sportKey) {
    const value = state.best[quizKey(stageId, sportKey)];
    if (!value || typeof value.score !== "number") return null;
    const score = Math.max(0, Math.min(3, value.score));
    return {
      score,
      stars: Math.max(0, Math.min(3, typeof value.stars === "number" ? value.stars : score)),
      total: typeof value.total === "number" ? value.total : 3
    };
  }

  function getStageStats(stage) {
    let stars = 0;
    let done = 0;
    SPORT_ORDER.forEach((sportKey) => {
      const best = getBest(stage.id, sportKey);
      if (best) {
        done += 1;
        stars += best.stars;
      }
    });
    return { stars, done, total: SPORT_ORDER.length, maxStars: SPORT_ORDER.length * 3 };
  }

  function getTotalStars() {
    return STAGES.reduce((total, stage) => total + getStageStats(stage).stars, 0);
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  /* ---------- الحفظ المحلي ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;

      if (saved.best && typeof saved.best === "object") {
        Object.keys(saved.best).forEach((key) => {
          const value = saved.best[key];
          if (!value || typeof value.score !== "number") return;
          const score = Math.max(0, Math.min(3, Math.round(value.score)));
          const stars = Math.max(0, Math.min(3, typeof value.stars === "number" ? Math.round(value.stars) : score));
          state.best[key] = { score, stars, total: 3 };
        });
      }

      if (saved.sound === false) state.sound = false;
      if (STAGES.some((stage) => stage.id === saved.lastStage)) state.lastStage = saved.lastStage;
    } catch (error) {
      state.best = {};
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* المتصفح قد يمنع الحفظ المحلي في وضع التصفح الخاص */
    }
  }

  function announce(message) {
    if (!els.liveRegion) return;
    els.liveRegion.textContent = "";
    window.setTimeout(() => {
      els.liveRegion.textContent = message;
    }, 40);
  }

  /* ---------- عرض المراحل ---------- */
  function renderStageGrid() {
    els.stageGrid.innerHTML = STAGES.map((stage) => {
      const stats = getStageStats(stage);
      const percent = Math.round((stats.stars / stats.maxStars) * 100);
      return `
        <button class="stage-card ${stage.id === activeStageId ? "is-active" : ""}"
          id="tab-${stage.id}" type="button" role="tab" data-stage="${stage.id}"
          aria-selected="${stage.id === activeStageId}" aria-controls="stage-${stage.id}"
          aria-label="${esc(stage.name)}، ${ar(stats.done)} من ${ar(stats.total)} اختبارات، ${ar(stats.stars)} من ${ar(stats.maxStars)} نجمة"
          tabindex="${stage.id === activeStageId ? "0" : "-1"}"
          style="--c1:${stage.color};--c2:${stage.color2}">
          <span class="stage-card-check" aria-hidden="true">✓</span>
          <span class="stage-card-top">
            <span class="stage-card-icon" aria-hidden="true">${stage.icon}</span>
            <span class="stage-card-num" aria-hidden="true">${stage.number}</span>
          </span>
          <strong class="stage-card-name">الصف ${esc(stage.short)}</strong>
          <span class="stage-card-meta">${esc(stage.tag)} · ${esc(stage.age)}</span>
          <span class="stage-card-stars" data-stage-card-stars="${stage.id}">
            ${starSvg(stats.stars > 0)} ${ar(stats.stars)}/${ar(stats.maxStars)}
          </span>
          <span class="stage-card-bar" aria-hidden="true"><i style="width:${percent}%"></i></span>
        </button>`;
    }).join("");
  }

  function renderStageBanner(stage) {
    const stats = getStageStats(stage);
    const percent = Math.round((stats.stars / stats.maxStars) * 100);
    const doneText = stats.done === 0 ? "لم تبدأ بعد" : `${ar(stats.done)} من ${ar(stats.total)} اختبارات`;

    return `
      <div class="stage-banner">
        <div class="stage-banner-copy">
          <span class="stage-kicker">${stage.icon} ${esc(stage.tag)}</span>
          <h2>${esc(stage.name)} <span class="stage-age">${esc(stage.age)}</span></h2>
          <p class="stage-intro">${esc(stage.intro)}</p>
          <div class="focus-chips" aria-label="مهارات هذه المرحلة">
            ${stage.focus.map((focus) => `<span>${esc(focus)}</span>`).join("")}
          </div>
        </div>
        <div class="stage-progress">
          <div class="progress-ring" data-ring="${stage.id}" style="--p:${percent}" aria-hidden="true">
            <span data-ring-text="${stage.id}">${ar(stats.stars)}/${ar(stats.maxStars)}</span>
          </div>
          <div class="stage-progress-text">
            <strong data-stage-done="${stage.id}">${doneText}</strong>
            <small data-stage-stars="${stage.id}">${ar(stats.stars)} من ${ar(stats.maxStars)} نجمة</small>
          </div>
        </div>
      </div>`;
  }

  function renderSportCard(stage, sportKey) {
    const sport = SPORTS[sportKey];
    const video = VIDEOS[sport.videoKey];
    const goals = stage.goals[sportKey];
    const key = quizKey(stage.id, sportKey);
    const best = getBest(stage.id, sportKey);
    const stars = best ? best.stars : 0;
    const doneLabel = best
      ? (best.stars > 0 ? `${starSvg(true)} ${ar(best.stars)}` : "تمت المحاولة")
      : "";

    return `
      <article class="sport-card" style="--sport:${sport.color};--sport-dark:${sport.dark};--sport-soft:${sport.soft}">
        <div class="sport-media">
          <img src="${sport.image}" alt="${esc(sport.name)} — ${esc(stage.name)}" loading="lazy">
          <span class="sport-emoji" aria-hidden="true">${sport.icon}</span>
          <span class="sport-stars" data-card-stars="${key}" aria-label="${best ? `أفضل نتيجة: ${ar(stars)} من ${ar(3)} نجوم` : "لم تُسجل نتيجة بعد"}">
            ${[1, 2, 3].map((index) => starSvg(index <= stars)).join("")}
          </span>
          <span class="sport-duration" aria-hidden="true">▶ ${esc(video.duration)}</span>
          <span class="card-done" data-done="${key}" ${best ? "" : "hidden"}>${doneLabel}</span>
        </div>
        <div class="sport-body">
          <div class="sport-head">
            <h3>${esc(sport.name)}</h3>
            <span class="quiz-count">٣ أسئلة</span>
          </div>
          <p class="sport-tagline">${esc(sport.tagline)}</p>
          <ul class="skill-list">
            ${goals.map((goal) => `<li>${esc(goal)}</li>`).join("")}
          </ul>
          <div class="sport-actions">
            <button class="btn-quiz" type="button" data-quiz="${key}">
              اختبر نفسك <span aria-hidden="true">✨</span>
            </button>
            <button class="btn-video" type="button" data-video="${sport.videoKey}">
              شاهد <span aria-hidden="true">▶</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderStagePanels() {
    els.stagePanels.innerHTML = STAGES.map((stage) => `
      <section class="stage-panel" id="stage-${stage.id}" data-stage="${stage.id}"
        role="tabpanel" aria-labelledby="tab-${stage.id}" ${stage.id === activeStageId ? "" : "hidden"}
        style="--c1:${stage.color};--c2:${stage.color2}">
        ${renderStageBanner(stage)}
        <div class="sport-grid">
          ${SPORT_ORDER.map((sportKey) => renderSportCard(stage, sportKey)).join("")}
        </div>
      </section>`).join("");
  }

  function renderVideoGrid() {
    els.videoGrid.innerHTML = SPORT_ORDER.map((sportKey) => {
      const sport = SPORTS[sportKey];
      const video = VIDEOS[sport.videoKey];
      return `
        <button class="video-tile" type="button" data-video="${sportKey}" style="--vcolor:${sport.color}"
          aria-label="شاهد فيديو ${esc(video.title)}">
          <span class="video-thumb">
            <img src="${video.thumb}" alt="" loading="lazy">
            <span class="play-badge" aria-hidden="true">▶</span>
            <span class="video-time">${esc(video.duration)}</span>
          </span>
          <span class="video-tile-body">
            <span class="video-sport">${sport.icon} ${esc(sport.name)}</span>
            <span class="video-title">${esc(video.title)}</span>
            <span class="video-meta-text">${esc(video.channel)}</span>
          </span>
        </button>`;
    }).join("");
  }

  /* ---------- تحديث النجوم والتقدم ---------- */
  function refreshProgress() {
    const total = getTotalStars();
    els.totalStars.textContent = ar(total);
    if (els.progressTotal) els.progressTotal.textContent = ar(total);
    if (els.progressTotalBar) els.progressTotalBar.style.width = `${Math.round((total / TOTAL_STARS) * 100)}%`;

    STAGES.forEach((stage) => {
      const stats = getStageStats(stage);
      const percent = Math.round((stats.stars / stats.maxStars) * 100);

      const card = $(`#tab-${stage.id}`);
      if (card) {
        const starsHolder = $(`[data-stage-card-stars="${stage.id}"]`, card);
        if (starsHolder) {
          starsHolder.innerHTML = `${starSvg(stats.stars > 0)} ${ar(stats.stars)}/${ar(stats.maxStars)}`;
        }
        const bar = $(".stage-card-bar i", card);
        if (bar) bar.style.width = `${percent}%`;
        card.setAttribute(
          "aria-label",
          `${stage.name}، ${ar(stats.done)} من ${ar(stats.total)} اختبارات، ${ar(stats.stars)} من ${ar(stats.maxStars)} نجمة`
        );
      }

      const ring = $(`[data-ring="${stage.id}"]`);
      const ringText = $(`[data-ring-text="${stage.id}"]`);
      const doneText = $(`[data-stage-done="${stage.id}"]`);
      const starsText = $(`[data-stage-stars="${stage.id}"]`);

      if (ring) ring.style.setProperty("--p", String(percent));
      if (ringText) ringText.textContent = `${ar(stats.stars)}/${ar(stats.maxStars)}`;
      if (doneText) {
        doneText.textContent = stats.done === 0
          ? "لم تبدأ بعد"
          : `${ar(stats.done)} من ${ar(stats.total)} اختبارات`;
      }
      if (starsText) starsText.textContent = `${ar(stats.stars)} من ${ar(stats.maxStars)} نجمة`;

      SPORT_ORDER.forEach((sportKey) => {
        const key = quizKey(stage.id, sportKey);
        const best = getBest(stage.id, sportKey);
        const stars = best ? best.stars : 0;
        const holder = $(`[data-card-stars="${key}"]`);
        const badge = $(`[data-done="${key}"]`);

        if (holder) {
          holder.innerHTML = [1, 2, 3].map((index) => starSvg(index <= stars)).join("");
          holder.setAttribute(
            "aria-label",
            best ? `أفضل نتيجة: ${ar(stars)} من ${ar(3)} نجوم` : "لم تُسجل نتيجة بعد"
          );
        }

        if (badge) {
          if (best) {
            badge.hidden = false;
            badge.innerHTML = best.stars > 0
              ? `${starSvg(true)} ${ar(best.stars)}`
              : "تمت المحاولة";
            badge.setAttribute("aria-label", `أفضل نتيجة: ${ar(best.stars)} من ${ar(3)} نجوم`);
          } else {
            badge.hidden = true;
          }
        }
      });
    });
  }

  /* ---------- التنقل بين المراحل ---------- */
  function activateStage(stageId, options = {}) {
    const { scroll = false, updateHash = true, focusTab = false } = options;
    if (!STAGES.some((stage) => stage.id === stageId)) return;

    activeStageId = stageId;
    state.lastStage = stageId;
    persist();

    $$(".stage-card", els.stageGrid).forEach((card) => {
      const isActive = card.dataset.stage === stageId;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-selected", String(isActive));
      card.tabIndex = isActive ? 0 : -1;
    });

    $$(".stage-panel", els.stagePanels).forEach((panel) => {
      panel.hidden = panel.dataset.stage !== stageId;
    });

    if (updateHash) {
      try {
        history.replaceState(null, "", `#${stageId}`);
      } catch (error) {
        /* تجاهل */
      }
    }

    if (focusTab) {
      const activeTab = $(`#tab-${stageId}`);
      if (activeTab) activeTab.focus({ preventScroll: true });
    }

    if (scroll) {
      const panel = $(`#stage-${stageId}`);
      if (panel) {
        panel.scrollIntoView({
          behavior: REDUCED_MOTION ? "auto" : "smooth",
          block: "start"
        });
      }
    }
  }

  /* ---------- الصوت ---------- */
  function ensureAudio() {
    if (!state.sound) return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playNote(frequency, delay, duration, type = "sine", volume = 0.06) {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playCorrectSound() {
    playNote(659.25, 0, 0.16, "sine", 0.07);
    playNote(880, 0.12, 0.24, "sine", 0.065);
  }

  function playWrongSound() {
    playNote(220, 0, 0.18, "triangle", 0.05);
    playNote(174.61, 0.14, 0.24, "triangle", 0.045);
  }

  function playResultSound(score) {
    if (score === 3) {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        playNote(frequency, index * 0.12, 0.3, "sine", 0.06);
      });
    } else if (score >= 1) {
      [523.25, 659.25].forEach((frequency, index) => {
        playNote(frequency, index * 0.14, 0.26, "sine", 0.05);
      });
    } else {
      playNote(392, 0, 0.3, "sine", 0.04);
    }
  }

  function updateSoundButton() {
    if (!els.soundToggle) return;
    els.soundToggle.setAttribute("aria-pressed", String(state.sound));
    els.soundToggle.setAttribute(
      "aria-label",
      state.sound ? "إيقاف المؤثرات الصوتية" : "تشغيل المؤثرات الصوتية"
    );
    els.soundToggle.title = state.sound ? "المؤثرات الصوتية مفعّلة" : "المؤثرات الصوتية متوقفة";
  }

  /* ---------- النوافذ ---------- */
  function openModal(modal, focusSelector = ".modal-close") {
    if (!modal) return;
    if (activeModal === modal) return;
    if (activeModal) closeModal(activeModal, false);

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeModal = modal;
    modal.hidden = false;
    document.body.classList.add("modal-open");

    if (focusSelector) {
      window.setTimeout(() => {
        const target = modal.querySelector(focusSelector);
        if (target && document.contains(target)) target.focus({ preventScroll: true });
      }, 50);
    }
  }

  function closeModal(modal, restoreFocus = true) {
    if (!modal) return;
    modal.hidden = true;
    if (modal === els.videoModal) stopVideo();
    if (modal === els.quizModal) quiz = null;
    document.body.classList.remove("modal-open");
    if (activeModal === modal) activeModal = null;

    if (restoreFocus && lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function trapFocus(event) {
    if (!activeModal || event.key !== "Tab") return;
    const focusable = $$(
      "a[href], button:not([disabled]), iframe, input, [tabindex]:not([tabindex='-1'])",
      activeModal
    ).filter((element) => !element.hidden && element.getClientRects().length > 0);

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const focusIsInside = activeModal.contains(document.activeElement);

    if (event.shiftKey && (!focusIsInside || document.activeElement === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!focusIsInside || document.activeElement === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- الفيديو ---------- */
  function openVideo(sportKey) {
    const video = VIDEOS[sportKey];
    const sport = SPORTS[sportKey];
    if (!video || !sport) return;

    els.videoTitle.textContent = video.title;
    els.videoDesc.textContent = video.description;
    els.videoChannel.textContent = video.channel;
    els.videoDuration.textContent = video.duration;
    els.videoLink.href = `https://www.youtube.com/watch?v=${video.youtubeId}`;
    els.videoFrame.title = `${sport.name}: ${video.title}`;
    els.videoFrame.src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    openModal(els.videoModal, ".modal-close");
  }

  function stopVideo() {
    if (els.videoFrame) els.videoFrame.src = "about:blank";
  }

  /* ---------- الاختبار ---------- */
  function startQuiz(stageId, sportKey) {
    const stage = STAGES.find((item) => item.id === stageId);
    const sport = SPORTS[sportKey];
    if (!stage || !sport || !stage.quizzes[sportKey]) return;

    const questions = stage.quizzes[sportKey];
    quiz = {
      stageId,
      sportKey,
      questions,
      index: 0,
      score: 0,
      answered: false,
      optionOrders: questions.map((question) => shuffle(Array.from(question.options.keys())))
    };

    const quizCard = $(".quiz-card", els.quizModal);
    if (quizCard) {
      quizCard.style.setProperty("--quiz-color", sport.color);
      quizCard.style.setProperty("--quiz-soft", sport.soft);
      quizCard.scrollTop = 0;
    }

    els.quizIcon.textContent = sport.icon;
    els.quizStage.textContent = stage.name;
    els.quizTitle.textContent = sport.name;
    els.quizCount.textContent = `السؤال ١ من ${ar(questions.length)}`;
    els.quizProgress.style.width = "0%";
    const track = els.quizProgress.parentElement;
    if (track) track.setAttribute("aria-valuenow", "0");

    openModal(els.quizModal, null);
    renderQuestion();
  }

  function renderQuestion() {
    if (!quiz) return;
    if (quiz.index >= quiz.questions.length) {
      renderResult();
      return;
    }

    const total = quiz.questions.length;
    const question = quiz.questions[quiz.index];
    const order = quiz.optionOrders[quiz.index];
    const progress = Math.round((quiz.index / total) * 100);
    const quizCard = $(".quiz-card", els.quizModal);
    if (quizCard) quizCard.scrollTop = 0;

    quiz.answered = false;
    els.quizCount.textContent = `السؤال ${ar(quiz.index + 1)} من ${ar(total)}`;
    els.quizProgress.style.width = `${progress}%`;
    const track = els.quizProgress.parentElement;
    if (track) track.setAttribute("aria-valuenow", String(progress));

    els.quizBody.innerHTML = `
      <div class="question-layout">
        <figure class="question-visual">
          <img src="assets/img/${question.img}.svg" alt="${esc(question.alt)}">
          <figcaption class="question-visual-caption">تأمّل الصورة قبل الإجابة</figcaption>
        </figure>
        <div class="question-content">
          <span class="question-kicker">اختر الإجابة الصحيحة</span>
          <h3 class="question-text">${esc(question.q)}</h3>
          <div class="options" role="group" aria-label="خيارات الإجابة">
            ${order.map((optionIndex, position) => `
              <button class="option" type="button" data-option="${optionIndex}">
                <span class="option-letter" aria-hidden="true">${LETTERS[position]}</span>
                <span class="option-text">${esc(question.options[optionIndex])}</span>
                <span class="option-mark" aria-hidden="true"></span>
              </button>`).join("")}
          </div>
          <div class="feedback" id="feedback" hidden></div>
          <div class="quiz-actions">
            <span class="quiz-hint">اختر إجابة واحدة</span>
            <button class="btn-next" id="nextBtn" type="button" disabled>
              ${quiz.index === total - 1 ? "عرض النتيجة ⭐" : "السؤال التالي ←"}
            </button>
          </div>
        </div>
      </div>`;

    announce(`السؤال ${ar(quiz.index + 1)} من ${ar(total)}: ${question.q}`);

    window.requestAnimationFrame(() => {
      const firstOption = $(".option", els.quizBody);
      if (firstOption) firstOption.focus({ preventScroll: true });
    });
  }

  function selectAnswer(originalIndex, selectedButton) {
    if (!quiz || quiz.answered) return;
    const question = quiz.questions[quiz.index];
    const total = quiz.questions.length;
    const isCorrect = originalIndex === question.answer;
    quiz.answered = true;

    if (isCorrect) quiz.score += 1;

    $$(".option", els.quizBody).forEach((button) => {
      const optionIndex = Number(button.dataset.option);
      button.disabled = true;
      const mark = $(".option-mark", button);

      if (optionIndex === question.answer) {
        button.classList.add("is-correct");
        if (mark) mark.textContent = "✓";
      } else if (button === selectedButton) {
        button.classList.add("is-wrong");
        if (mark) mark.textContent = "✕";
      } else {
        button.classList.add("is-muted");
      }
    });

    const feedback = $("#feedback", els.quizBody);
    if (feedback) {
      feedback.hidden = false;
      feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
      feedback.innerHTML = isCorrect
        ? `<span class="feedback-icon" aria-hidden="true">🎉</span><span><strong>إجابة صحيحة!</strong> ${esc(question.explain)}</span>`
        : `<span class="feedback-icon" aria-hidden="true">💡</span><span><strong>ليست الإجابة الصحيحة.</strong> الإجابة الصحيحة: <strong>${esc(question.options[question.answer])}</strong>. ${esc(question.explain)}</span>`;
    }

    const nextButton = $("#nextBtn", els.quizBody);
    if (nextButton) {
      nextButton.disabled = false;
      nextButton.textContent = quiz.index === total - 1 ? "عرض النتيجة ⭐" : "السؤال التالي ←";
      window.requestAnimationFrame(() => nextButton.focus({ preventScroll: true }));
    }

    const answeredProgress = Math.round(((quiz.index + 1) / total) * 100);
    els.quizProgress.style.width = `${answeredProgress}%`;
    const track = els.quizProgress.parentElement;
    if (track) track.setAttribute("aria-valuenow", String(answeredProgress));

    announce(isCorrect ? "إجابة صحيحة. أحسنت!" : `إجابة غير صحيحة. الإجابة الصحيحة هي ${question.options[question.answer]}.`);
    if (isCorrect) playCorrectSound();
    else playWrongSound();
  }

  function goToNextQuestion() {
    if (!quiz || !quiz.answered) return;
    quiz.index += 1;
    if (quiz.index >= quiz.questions.length) renderResult();
    else renderQuestion();
  }

  function restartQuiz() {
    if (!quiz) return;
    quiz.index = 0;
    quiz.score = 0;
    quiz.answered = false;
    quiz.optionOrders = quiz.questions.map((question) => shuffle(Array.from(question.options.keys())));
    renderQuestion();
  }

  function renderResult() {
    if (!quiz) return;
    const total = quiz.questions.length;
    const score = quiz.score;
    const stars = score;
    const key = quizKey(quiz.stageId, quiz.sportKey);
    const previous = getBest(quiz.stageId, quiz.sportKey);
    const hadBest = Boolean(previous);
    const previousBest = previous ? previous.score : 0;
    const isNewBest = !hadBest || score > previousBest;

    if (isNewBest) {
      state.best[key] = {
        score,
        total,
        stars,
        completedAt: new Date().toISOString()
      };
      persist();
    }

    refreshProgress();

    const bestScore = Math.max(previousBest, score);
    const bestLabel = !hadBest
      ? "تم حفظ محاولتك الأولى 🌟"
      : score > previousBest
        ? "🏅 رقم قياسي جديد!"
        : `أفضل نتيجة لك: ${ar(bestScore)} من ${ar(total)}`;

    const resultCopy = {
      3: {
        title: "مبدع! أداء رائع",
        text: "لقد أتقنت هذه المهارة وجمعت النجوم الثلاث! هل تجرّب مهارة أخرى؟"
      },
      2: {
        title: "أحسنت! أنت قريب جدًا",
        text: "نتيجة جميلة! راجع الشرح المرفق، ثم أعد المحاولة لتجمع النجوم الثلاث."
      },
      1: {
        title: "خطوة جميلة، استمر!",
        text: "كل محاولة تعلّمك شيئًا جديدًا. أعد المحاولة وستجمع نجومًا أكثر."
      },
      0: {
        title: "لا بأس، المحاولة بداية!",
        text: "اقرأ الشرح بهدوء وشاهد الفيديو، ثم جرّب مرة أخرى. أنت تستطيع!"
      }
    };
    const copy = resultCopy[stars] || resultCopy[0];
    const starsHtml = [1, 2, 3].map((index) => starSvg(index <= stars, "result-star")).join("");

    els.quizBody.innerHTML = `
      <div class="result">
        <span class="result-kicker">نتيجتك في ${esc(SPORTS[quiz.sportKey].name)}</span>
        <div class="result-stars" aria-label="${ar(stars)} من ${ar(3)} نجوم">${starsHtml}</div>
        <h2>${copy.title}</h2>
        <p>${copy.text}</p>
        <div class="result-score">
          <strong>${ar(score)}</strong>
          <span>من ${ar(total)} إجابات صحيحة</span>
        </div>
        <div class="result-actions">
          <button class="btn-result btn-result--primary" type="button" data-retry>أعد المحاولة ↻</button>
          <button class="btn-result btn-result--ghost" type="button" data-close-quiz>مهارة أخرى</button>
        </div>
        <small class="result-best">${bestLabel}</small>
      </div>`;

    announce(`انتهى الاختبار. نتيجتك ${ar(score)} من ${ar(total)}، وحصلت على ${ar(stars)} من ${ar(3)} نجوم.`);

    if (stars >= 2) launchConfetti();
    playResultSound(stars);

    window.requestAnimationFrame(() => {
      const retry = $("[data-retry]", els.quizBody);
      if (retry) retry.focus({ preventScroll: true });
    });
  }

  /* ---------- الكونفيتي ---------- */
  function launchConfetti() {
    if (REDUCED_MOTION || !els.confettiLayer) return;
    for (let index = 0; index < 42; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
      piece.style.setProperty("--drift", `${(Math.random() * 2 - 1) * 130}px`);
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.2}s`;
      piece.style.width = `${6 + Math.random() * 6}px`;
      piece.style.height = `${10 + Math.random() * 8}px`;
      els.confettiLayer.appendChild(piece);
      window.setTimeout(() => piece.remove(), 3800);
    }
  }

  /* ---------- شريط التنقل والتمرير ---------- */
  const navSections = [
    { id: "top", el: $(".hero") },
    { id: "how", el: $("#how") },
    { id: "stages", el: $("#stages") },
    { id: "videos", el: $("#videos") },
    { id: "about", el: $("#about") }
  ];

  function onScroll() {
    if (els.toTop) els.toTop.classList.toggle("is-visible", window.scrollY > 620);

    const navLinks = $$(".nav-link");
    if (!navLinks.length) return;
    const marker = window.scrollY + 190;
    let current = "top";

    navSections.forEach((section) => {
      if (section.el && section.el.offsetTop <= marker) current = section.id;
    });

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    });
  }

  /* ---------- ربط الأحداث ---------- */
  function bindEvents() {
    els.stageGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-stage]");
      if (card) activateStage(card.dataset.stage, { scroll: true });
    });

    els.stageGrid.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const cards = $$(".stage-card", els.stageGrid);
      const currentIndex = cards.indexOf(document.activeElement);
      if (currentIndex < 0) return;

      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex + 1) % cards.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex - 1 + cards.length) % cards.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = cards.length - 1;

      event.preventDefault();
      const nextCard = cards[nextIndex];
      activateStage(nextCard.dataset.stage, { scroll: false, focusTab: true });
    });

    els.stagePanels.addEventListener("click", (event) => {
      const quizButton = event.target.closest("[data-quiz]");
      if (quizButton) {
        const [stageId, sportKey] = quizButton.dataset.quiz.split(":");
        startQuiz(stageId, sportKey);
        return;
      }

      const videoButton = event.target.closest("[data-video]");
      if (videoButton) openVideo(videoButton.dataset.video);
    });

    els.videoGrid.addEventListener("click", (event) => {
      const videoButton = event.target.closest("[data-video]");
      if (videoButton) openVideo(videoButton.dataset.video);
    });

    els.quizBody.addEventListener("click", (event) => {
      const optionButton = event.target.closest("[data-option]");
      if (optionButton && els.quizBody.contains(optionButton)) {
        selectAnswer(Number(optionButton.dataset.option), optionButton);
        return;
      }

      if (event.target.closest("#nextBtn")) {
        goToNextQuestion();
        return;
      }

      if (event.target.closest("[data-retry]")) {
        restartQuiz();
        return;
      }

      if (event.target.closest("[data-close-quiz]")) {
        closeModal(els.quizModal);
      }
    });

    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close]");
      if (!closer) return;
      const modalName = closer.dataset.close;
      if (modalName === "video") closeModal(els.videoModal);
      if (modalName === "quiz") closeModal(els.quizModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeModal) {
        closeModal(activeModal);
        return;
      }
      trapFocus(event);
    });

    els.soundToggle.addEventListener("click", () => {
      state.sound = !state.sound;
      persist();
      updateSoundButton();
      announce(state.sound ? "تم تشغيل المؤثرات الصوتية" : "تم إيقاف المؤثرات الصوتية");
    });

    els.resetProgress.addEventListener("click", () => {
      const confirmed = window.confirm("هل تريد إعادة ضبط جميع النجوم والنتائج؟ لا يمكن التراجع عن هذه الخطوة.");
      if (!confirmed) return;
      state.best = {};
      persist();
      refreshProgress();
      announce("تمت إعادة ضبط تقدمك ونجومك");
    });

    if (els.toTop) {
      els.toTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" });
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", () => {
      const stageId = location.hash.replace("#", "");
      if (STAGES.some((stage) => stage.id === stageId)) {
        activateStage(stageId, { scroll: true, updateHash: false });
      }
    });
  }

  /* ---------- التشغيل ---------- */
  function init() {
    loadState();
    renderStageGrid();
    renderStagePanels();
    renderVideoGrid();
    bindEvents();
    updateSoundButton();
    refreshProgress();

    const hashStage = location.hash.replace("#", "");
    const initialStage = STAGES.some((stage) => stage.id === hashStage)
      ? hashStage
      : (STAGES.some((stage) => stage.id === state.lastStage) ? state.lastStage : "g1");

    activateStage(initialStage, { scroll: false, updateHash: false });
    onScroll();
  }

  init();
})();
