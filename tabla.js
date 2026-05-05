import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOHkkkQsDMcL9OxXjKg9YMcC6xM7kke1Q",
  authDomain: "liga-davila.firebaseapp.com",
  projectId: "liga-davila",
  storageBucket: "liga-davila.firebasestorage.app",
  messagingSenderId: "674533365203",
  appId: "1:674533365203:web:841cbe1f23f1efb6230b26"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SERIES = ["Sub-13","Sub-15","Sub-17","Primera","Segunda","Senior"];
let serieActual = "Sub-13";

let equiposGlobal = [];
let partidosGlobal = [];

// 🔥 función clave (normalizar texto)
const norm = (txt) => (txt || "").toString().trim().toLowerCase();

export function iniciarTabla() {
  crearBotones();

  // 🔥 equipos
  onSnapshot(collection(db, "equipos"), (snap) => {
    equiposGlobal = snap.docs.map(d => d.data());
    recalcular();
  });

  // 🔥 partidos
  onSnapshot(collection(db, "partidos"), (snap) => {
    partidosGlobal = snap.docs.map(d => d.data());
    recalcular();
  });
}

function crearBotones() {
  const cont = document.getElementById("series");
  cont.innerHTML = "";

  SERIES.forEach((serie, i) => {
    const btn = document.createElement("div");
    btn.className = "serie-btn";
    btn.innerText = serie;

    if (i === 0) btn.classList.add("active");

    btn.onclick = () => {
      serieActual = serie;
      document.querySelectorAll(".serie-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      recalcular();
    };

    cont.appendChild(btn);
  });
}

function recalcular() {

  if (!equiposGlobal.length) return;

  let tabla = {};

  // 🔥 crear base con nombre NORMALIZADO como clave
  equiposGlobal.forEach(e => {
    if (norm(e.serie) === norm(serieActual)) {

      const key = norm(e.nombre);

      tabla[key] = {
        nombre: e.nombre,
        logo: e.logo || "https://via.placeholder.com/30",
        PJ: 0, G: 0, E: 0, P: 0,
        GF: 0, GC: 0, PTS: 0,
        forma: []
      };
    }
  });

  // 🔥 ordenar partidos sin romper original
  const partidosOrdenados = [...partidosGlobal].sort(
    (a, b) => (a.fecha || 0) - (b.fecha || 0)
  );

  partidosOrdenados.forEach(p => {

    if (!norm(p.serie).includes(norm(serieActual))) return;

    const A = tabla[norm(p.equipoA)];
    const B = tabla[norm(p.equipoB)];

    if (!A || !B) {
      console.log("❌ equipo no encontrado:", p.equipoA, p.equipoB);
      return;
    }

    A.PJ++; B.PJ++;

    const ga = parseInt(p.ga) || 0;
    const gb = parseInt(p.gb) || 0;

    A.GF += ga;
    A.GC += gb;

    B.GF += gb;
    B.GC += ga;

    if (ga > gb) {
      A.G++; A.PTS += 3;
      B.P++;
      A.forma.push("W");
      B.forma.push("L");

    } else if (ga < gb) {
      B.G++; B.PTS += 3;
      A.P++;
      B.forma.push("W");
      A.forma.push("L");

    } else {
      A.E++; B.E++;
      A.PTS++; B.PTS++;
      A.forma.push("D");
      B.forma.push("D");
    }

    if (A.forma.length > 5) A.forma.shift();
    if (B.forma.length > 5) B.forma.shift();
  });

  let lista = Object.values(tabla);

  lista.sort((a, b) =>
    b.PTS - a.PTS || (b.GF - b.GC) - (a.GF - a.GC)
  );

  mostrarTabla(lista);
renderPartidos(partidosGlobal, equiposGlobal);
}

function mostrarTabla(lista) {

  const tabla = document.getElementById("tabla-body");
  tabla.innerHTML = "";

  lista.forEach((e, i) => {

    while (e.forma.length < 5) e.forma.push("");

    tabla.innerHTML += `
    <tr>
      <td>${i+1}</td>
      <td class="club">
        <img src="${e.logo}" class="logo-equipo">
        ${e.nombre}
      </td>
      <td>${e.PJ}</td>
      <td>${e.G}</td>
      <td>${e.E}</td>
      <td>${e.P}</td>
      <td>${e.GF}</td>
      <td>${e.GC}</td>
      <td>${e.GF - e.GC}</td>
      <td><b>${e.PTS}</b></td>
      <td>
        <div class="ultimos5">
          ${e.forma.map(f => {
            if (f === "W") return `<div class="forma win">✓</div>`;
            if (f === "L") return `<div class="forma lose">✕</div>`;
            if (f === "D") return `<div class="forma draw">-</div>`;
            return `<div class="forma empty"></div>`;
          }).join("")}
        </div>
      </td>
    </tr>
    `;
  });
}

function renderPartidos(partidos, equipos) {

  const cont = document.getElementById("partidos-container");
  cont.innerHTML = '<div class="partidos"></div>';

  const wrapper = cont.querySelector(".partidos");

  // 🔥 agrupar por fecha
  let fechas = {};

const mapaEquipos = {};

equipos.forEach(e => {
  mapaEquipos[norm(e.nombre)] = e;
});
  
  partidos.forEach(p => {

  const seriePartido = norm(p.serie).replace(/[^0-9]/g, "");
  const serieActualNum = norm(serieActual).replace(/[^0-9]/g, "");

  if (seriePartido !== serieActualNum) return;

  if (!fechas[p.fecha]) fechas[p.fecha] = [];
  fechas[p.fecha].push(p);
});

  Object.keys(fechas).sort().forEach(f => {

    const fechaDiv = document.createElement("div");
    fechaDiv.className = "fecha";

    fechaDiv.innerHTML = `
      <div class="fecha-header">Fecha ${f}</div>
      <div class="partidos-lista"></div>
    `;

    const lista = fechaDiv.querySelector(".partidos-lista");

    fechas[f].forEach(p => {

      const equipoA = mapaEquipos[norm(p.equipoA)];
const equipoB = mapaEquipos[norm(p.equipoB)];

      const div = document.createElement("div");
      div.className = "partido";

      div.innerHTML = `
  <span>${equipoA?.nombre || p.equipoA}</span>
  <div class="score">${p.ga} - ${p.gb}</div>
  <span>${equipoB?.nombre || p.equipoB}</span>
`;

      lista.appendChild(div);
    });

    // 🔽 desplegable
    fechaDiv.querySelector(".fecha-header").onclick = () => {
      lista.style.display = lista.style.display === "block" ? "none" : "block";
    };

    wrapper.appendChild(fechaDiv);
  });
}
