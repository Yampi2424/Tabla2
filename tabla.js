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

// 🔥 datos en memoria
let equiposGlobal = [];
let partidosGlobal = [];

export function iniciarTabla() {
  crearBotones();

  // 🔥 escuchar equipos en tiempo real
  onSnapshot(collection(db, "equipos"), (snap) => {
    equiposGlobal = snap.docs.map(d => d.data());
    recalcular();
  });

  // 🔥 escuchar partidos en tiempo real
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
      recalcular(); // 🔥 importante
    };

    cont.appendChild(btn);
  });
}

function recalcular() {

  if (!equiposGlobal.length) return;

  let tabla = {};

  // 🔥 crear equipos
  equiposGlobal.forEach(e => {
    if (e.serie === serieActual) {
      tabla[e.nombre] = {
        nombre: e.nombre,
        logo: e.logo || "https://via.placeholder.com/30",
        PJ: 0, G: 0, E: 0, P: 0,
        GF: 0, GC: 0, PTS: 0,
        forma: []
      };
    }
  });

  // 🔥 ordenar partidos por fecha
  partidosGlobal.sort((a, b) => (a.fecha || 0) - (b.fecha || 0));

  partidosGlobal.forEach(p => {

    if (p.serie !== serieActual) return;

    const A = tabla[p.equipoA];
    const B = tabla[p.equipoB];

    if (!A || !B) return;

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

  // 🔥 ordenar tabla
  let lista = Object.values(tabla);

  lista.sort((a, b) =>
    b.PTS - a.PTS || (b.GF - b.GC) - (a.GF - a.GC)
  );

  mostrarTabla(lista);
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
