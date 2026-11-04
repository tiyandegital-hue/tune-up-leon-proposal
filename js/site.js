/* ============================================================
   TUNE UP LEÓN — lógica compartida
   BUSINESS: la ÚNICA constante con los datos del negocio.
   Para reutilizar este sitio con otro taller, cambia solo esto.
   ============================================================ */
document.documentElement.classList.add("js");
const BUSINESS = {  name: "Tune Up León",          // nombre comercial (reportado)
  city: "León, Gto.",
  address: "Calz. de los Héroes 120 A, La Martinica, León, Guanajuato",
  phoneDisplay: "+52 477 730 5690",
  phoneIntl: "524777305690",      // para wa.me (número público reportado)
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tune+Up+Le%C3%B3n+Calz.+de+los+H%C3%A9roes+120+A+Le%C3%B3n+Guanajuato",
  googleRating: "5.0",
  googleReviews: "8",             // según Google, tal como se encontró
};
const waLink = (text) =>
  `https://wa.me/${BUSINESS.phoneIntl}?text=${encodeURIComponent(text)}`;

/* ---------- Inyección de marca ---------- */
document.querySelectorAll("[data-brand]").forEach((el) => {
  el.textContent = BUSINESS.name;
});
document.querySelectorAll("[data-brand-city]").forEach((el) => {
  el.textContent = BUSINESS.city;
});
document.querySelectorAll("[data-wa]").forEach((a) => {
  a.href = waLink(a.dataset.wa || `Hola, ${BUSINESS.name}. Necesito una cotización.`);
});
document.querySelectorAll("[data-tel]").forEach((a) => {
  a.href = `tel:+${BUSINESS.phoneIntl}`;
  a.textContent = BUSINESS.phoneDisplay;
});
document.querySelectorAll("[data-maps]").forEach((a) => { a.href = BUSINESS.mapsUrl; });
document.querySelectorAll("[data-rating]").forEach((el) => {
  el.textContent = `${BUSINESS.googleRating}★ (${BUSINESS.googleReviews} reseñas en Google)`;
});
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Nav móvil ---------- */
const burger = document.querySelector(".burger");
const navLinks = document.querySelector(".nav-links");
if (burger && navLinks) {
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

/* ---------- Reveal on scroll (con fallback sin JS) ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

/* ============================================================
   Motor del chat demo — máquina de estados con guion.
   Escenas: cada paso es {bot:[...msgs], quick:[{label,goto}] | input | card | status}
   Todo el contenido del guion está marcado como "ejemplo".
   ============================================================ */
function now() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function makeChat(rootId, scenes, startKey) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const log = root.querySelector(".chat");
  const foot = root.querySelector(".chat-foot");
  const input = foot ? foot.querySelector("input") : null;
  const sendBtn = foot ? foot.querySelector(".send") : null;
  let state = { step: startKey, freeText: null };

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  function addMsg(kind, html, opts = {}) {
    const d = document.createElement("div");
    d.className = `msg ${kind}`;
    d.innerHTML = (opts.tag ? `<span class="tag">${opts.tag}</span>` : "") + html +
      `<span class="meta">${now()}</span>`;
    log.appendChild(d); scrollDown();
    return d;
  }
  function addTyping() {
    const t = document.createElement("div");
    t.className = "typing"; t.setAttribute("aria-hidden", "true");
    t.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(t); scrollDown();
    return t;
  }
  function clearQuick() { log.querySelectorAll(".quick").forEach((q) => q.remove()); }

  async function botSay(msgs, tag) {
    for (const m of msgs) {
      const t = addTyping();
      await delay(650 + Math.random() * 500);
      t.remove();
      addMsg("bot", m, { tag });
      await delay(350);
    }
  }

  function showQuick(options, onPick) {
    clearQuick();
    const q = document.createElement("div");
    q.className = "quick"; q.setAttribute("role", "group"); q.setAttribute("aria-label", "Opciones");
    options.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = o.label;
      b.addEventListener("click", () => {
        q.querySelectorAll("button").forEach((x) => (x.disabled = true));
        addMsg("user", o.label);
        onPick(o);
      });
      q.appendChild(b);
    });
    log.appendChild(q); scrollDown();
  }

  async function run(key) {
    const s = scenes[key];
    if (!s) return;
    state.step = key;
    if (s.clear) log.innerHTML = "";
    await botSay(s.bot || [], s.tag);
    if (s.quick) showQuick(s.quick, async (o) => {
      await delay(300);
      if (o.say) addMsg("bot", o.say, { tag: s.tag });
      run(o.goto);
    });
    else if (s.input) {
      if (!foot || !input) { run(s.input.goto); return; }
      input.placeholder = s.input.placeholder;
      input.disabled = false; input.focus();
      const handler = (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        foot.removeEventListener("submit", handler);
        input.value = ""; input.disabled = true;
        addMsg("user", escapeHtml(v));
        state.freeText = v;
        delay(300).then(() => run(s.input.goto));
      };
      foot.addEventListener("submit", handler);
      if (sendBtn) sendBtn.onclick = () => foot.requestSubmit();
    }
    else if (s.card) {
      const c = document.createElement("div");
      c.className = "quote-card";
      c.innerHTML = s.card();
      log.appendChild(c); scrollDown();
      await delay(500);
      run(s.next);
    }
    else if (s.status) {
      for (const st of s.status) {
        const line = document.createElement("div");
        line.className = "statusline";
        line.innerHTML = `<span class="dot"></span><span>${st}</span>`;
        log.appendChild(line); scrollDown();
        await delay(900);
        line.classList.add("done");
      }
      await delay(600);
      run(s.next);
    }
    else if (s.done) {
      const bar = document.createElement("div");
      bar.className = "demo-bar";
      bar.innerHTML = s.done();
      root.appendChild(bar);
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  run(startKey);
  return { run };
}

/* ---------- Guion COMPACTO (inicio) ---------- */
function compactScenes() {
  return {
    start: {
      bot: [
        `¡Hola! 👋 Soy el asistente virtual de <b>${BUSINESS.name}</b>. ¿Qué le pasa a tu auto?`,
      ],
      tag: "Demo · ejemplo",
      quick: [
        { label: "🔊 Ruido al frenar", goto: "frenos" },
        { label: "🔧 Afinación", goto: "afinacion" },
        { label: "🛞 Vibra el volante", goto: "suspension" },
      ],
    },
    frenos: {
      bot: [
        "Un ruido al frenar suele ser <b>balatas gastadas</b> o discos que necesitan rectificado.",
        "Con una foto del disco o una revisión de 15 min te confirmo el diagnóstico exacto.",
      ],
      tag: "Demo · ejemplo",
      next: "cotiza",
      card: () => `
        <span class="tag">Estimación de ejemplo</span>
        <div class="q-row"><span>Balatas delanteras (ejemplo)</span><span>$900 – $1,200 MXN</span></div>
        <div class="q-row"><span>Rectificado de discos (ejemplo)</span><span>$400 – $700 MXN</span></div>
        <div class="q-row"><span class="q-total">Rango estimado</span><span class="q-total">$1,400 – $1,900 MXN</span></div>
        <div style="font-size:12px;color:#8696a0;margin-top:8px">* Rango de ejemplo. La cotización final se confirma en revisión.</div>`,
    },
    afinacion: {
      bot: [
        "La <b>afinación</b> incluye bujías, filtros, limpieza de inyectores y revisión de 20 puntos.",
        "La mayoría de los autos sale el mismo día. 🕒",
      ],
      tag: "Demo · ejemplo",
      next: "cotiza",
      card: () => `
        <span class="tag">Estimación de ejemplo</span>
        <div class="q-row"><span>Afinación 4 cilindros (ejemplo)</span><span>$1,100 – $1,600 MXN</span></div>
        <div class="q-row"><span>Afinación 6 cilindros (ejemplo)</span><span>$1,500 – $2,200 MXN</span></div>
        <div class="q-row"><span class="q-total">Tiempo estimado</span><span class="q-total">2 – 3 horas</span></div>
        <div style="font-size:12px;color:#8696a0;margin-top:8px">* Rango de ejemplo. La cotización final se confirma en revisión.</div>`,
    },
    suspension: {
      bot: [
        "La vibración en el volante puede venir de <b>amortiguadores, rotulas o alineación</b>.",
        "Te agendo una revisión gratuita de suspensión y te digo exactamente qué es.",
      ],
      tag: "Demo · ejemplo",
      next: "cotiza",
      card: () => `
        <span class="tag">Estimación de ejemplo</span>
        <div class="q-row"><span>Revisión de suspensión (ejemplo)</span><span>Sin costo</span></div>
        <div class="q-row"><span>Alineación + balanceo (ejemplo)</span><span>$600 – $900 MXN</span></div>
        <div class="q-row"><span class="q-total">Diagnóstico</span><span class="q-total">En 20 min</span></div>
        <div style="font-size:12px;color:#8696a0;margin-top:8px">* Rango de ejemplo. La cotización final se confirma en revisión.</div>`,
    },
    cotiza: {
      bot: ["¿Quieres que te aparte un lugar para revisión?"],
      tag: "Demo · ejemplo",
      quick: [
        { label: "Sí, agendar", goto: "agendado" },
        { label: "Solo la cotización", goto: "solo" },
      ],
    },
    agendado: {
      bot: [
        "✅ <b>Listo (ejemplo):</b> revisión apartada para <b>mañana 10:00 AM</b>.",
        `Te esperamos en ${BUSINESS.address}.`,
        "Así funcionaría el bot real: cotiza, agenda y avisa — 24/7, sin que nadie conteste el teléfono.",
      ],
      tag: "Demo · ejemplo",
      done: () => `
        <span class="ejemplo">Fin de la demo · ejemplo</span>
        <a class="btn btn-sm" href="bot.html">Ver demo completa →</a>`,
    },
    solo: {
      bot: [
        "Perfecto. Guarda este chat: cuando quieras agendar, solo escribe <b>“cita”</b>.",
        `O llámanos directo: <b>${BUSINESS.phoneDisplay}</b> 📞`,
      ],
      tag: "Demo · ejemplo",
      done: () => `
        <span class="ejemplo">Fin de la demo · ejemplo</span>
        <a class="btn btn-sm" href="bot.html">Ver demo completa →</a>`,
    },
  };
}

/* ---------- Guion COMPLETO (página bot.html) ---------- */
function fullScenes() {
  return {
    start: {
      clear: true,
      bot: [
        `¡Hola! 👋 Bienvenido a <b>${BUSINESS.name}</b>, tu taller en León.`,
        "Soy el asistente virtual. Puedo <b>cotizarte</b>, <b>agendarte</b> una cita y <b>avisarte</b> cuando tu auto esté listo.",
        "¿Qué necesita tu auto hoy?",
      ],
      tag: "Demo interactiva · ejemplo",
      quick: [
        { label: "🔊 Ruido al frenar", goto: "foto" },
        { label: "🔧 Afinación / servicio", goto: "modelo" },
        { label: "🛞 Suspensión / alineación", goto: "foto" },
        { label: "💧 Fuga o goteo", goto: "foto" },
      ],
    },
    foto: {
      bot: [
        "¿Me puedes mandar una <b>foto</b> del problema? Con eso el mecánico te da un rango más preciso.",
        "(En esta demo, toca el botón para simular la foto 📸)",
      ],
      tag: "Demo · ejemplo",
      quick: [
        { label: "📸 Enviar foto (ejemplo)", goto: "fotoOk", say: "¡Foto recibida! Un momento… 🔍" },
        { label: "Sin foto, continuar", goto: "modelo" },
      ],
    },
    fotoOk: {
      bot: [
        `<img src="assets/servicio-motor.jpg" alt="Foto de ejemplo del motor" style="border-radius:10px;max-width:220px">`,
        "Gracias. Con la foto y los síntomas, el rango estimado es el siguiente:",
      ],
      tag: "Demo · ejemplo",
      next: "cotizaFull",
      card: () => `
        <span class="tag">Estimación de ejemplo</span>
        <div class="q-row"><span>Diagnóstico con foto (ejemplo)</span><span>Sin costo</span></div>
        <div class="q-row"><span>Reparación estimada (ejemplo)</span><span>$1,400 – $2,400 MXN</span></div>
        <div class="q-row"><span class="q-total">Tiempo en taller</span><span class="q-total">Medio día</span></div>
        <div style="font-size:12px;color:#8696a0;margin-top:8px">* Rango de ejemplo. La cotización final se confirma en revisión física.</div>`,
    },
    modelo: {
      bot: ["Perfecto. ¿Qué <b>auto</b> es? Escríbeme marca, modelo y año."],
      tag: "Demo · ejemplo",
      input: { placeholder: "Ej.: Versa 2019 (ejemplo)…", goto: "modeloOk" },
    },
    modeloOk: {
      bot: [
        "Anotado ✅. Para ese auto, la afinación completa queda así:",
      ],
      tag: "Demo · ejemplo",
      next: "cotizaFull",
      card: () => `
        <span class="tag">Estimación de ejemplo</span>
        <div class="q-row"><span>Afinación mayor (ejemplo)</span><span>$1,500 – $2,200 MXN</span></div>
        <div class="q-row"><span>Incluye (ejemplo)</span><span>Bujías, filtros, inyectores</span></div>
        <div class="q-row"><span class="q-total">Tiempo en taller</span><span class="q-total">2 – 3 horas</span></div>
        <div style="font-size:12px;color:#8696a0;margin-top:8px">* Rango de ejemplo. La cotización final se confirma en revisión física.</div>`,
    },
    cotizaFull: {
      bot: ["¿Te aparto un lugar? Elige el horario que prefieras:"],
      tag: "Demo · ejemplo",
      quick: [
        { label: "Mañana 10:00 AM", goto: "confirmado" },
        { label: "Mañana 4:00 PM", goto: "confirmado" },
        { label: "Pasado mañana 9:00 AM", goto: "confirmado" },
      ],
    },
    confirmado: {
      bot: [
        "✅ <b>Cita confirmada (ejemplo):</b> revisión general.",
        `📍 ${BUSINESS.address}<br>Te mandaremos un recordatorio una hora antes.`,
        "Y esto es lo mejor: <b>mientras reparamos tu auto, te avisamos de cada avance</b>. Mira:",
      ],
      tag: "Demo · ejemplo",
      next: "estatus",
      status: [
        "📥 Auto recibido en el taller",
        "🔍 Diagnóstico en curso…",
        "🔧 Reparación en proceso",
        "✅ <b>¡Tu auto ya está listo para recoger! 🎉</b>",
      ],
    },
    estatus: {
      bot: [
        "Así de simple: el cliente <b>nunca tiene que llamar para preguntar</b> “¿ya quedó?”.",
        "En el bot real esto llega automáticamente al WhatsApp del cliente, 24/7, en español.",
        `¿Quieres esto para tu taller? Escríbenos: <b>${BUSINESS.phoneDisplay}</b>`,
      ],
      tag: "Demo · ejemplo",
      done: () => `
        <span class="ejemplo">Fin de la demo · todo es ejemplo</span>
        <a class="btn btn-wa btn-sm" data-wa="Hola, vi la demo del bot de ${BUSINESS.name} y me interesa." href="#">Pedir este bot por WhatsApp →</a>`,
    },
  };
}

/* ---------- Arranque por página ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("chat-compact")) makeChat("chat-compact", compactScenes(), "start");
  if (document.getElementById("chat-full")) {
    makeChat("chat-full", fullScenes(), "start");
    const again = document.getElementById("reiniciar");
    if (again) again.addEventListener("click", () => {
      document.querySelector("#chat-full .chat").innerHTML = "";
      const bar = document.querySelector("#chat-full .demo-bar");
      if (bar) bar.remove();
      makeChat("chat-full", fullScenes(), "start");
    });
  }
  /* re-aplicar wa.me a enlaces creados dinámicamente */
  const obs = new MutationObserver(() => {
    document.querySelectorAll("[data-wa]").forEach((a) => {
      if (!a.dataset.waDone) {
        a.href = waLink(a.dataset.wa || `Hola, ${BUSINESS.name}. Necesito una cotización.`);
        a.dataset.waDone = "1";
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });
});
