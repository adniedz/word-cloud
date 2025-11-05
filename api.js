// Configuration globale

let gristData = [];
let currentMask = null;
let colorSchemes = {
  beta:[
    "#005ba7",
    "#004279",
    "#efcd54",
    "#1bb2ad",
    "#FFEE73",
    "#00284b",
  ],
  mix1: d3.schemeCategory10,
  mix2: d3.schemeTableau10,
  blues: d3.schemeBlues[9].reverse(),
  reds: d3.schemeReds[9].reverse(),
  greens: d3.schemeGreens[9].reverse(),
  custom: [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
  ],
};

// Initialisation du widget Grist

function ready() {
  grist.ready({
    columns: [
      { name: "word", title: "Mot", type: "Text" },
      {
        name: "frequency",
        title: "Fréquence",
        type: "Int",
        optional: true,
      },
      { name: "weight", title: "Poids", type: "Numeric", optional: true },
    ],
    requiredAccess: "read table",
  });

  grist.onRecord(function (record) {
    console.log("Données reçues:", record);
  });

  grist.onRecords(function (records, mappings) {
    const mapped = grist.mapColumnNames(records);
    processGristData(mapped, mappings);
  });
}

// Traitement des données Grist

function processGristData(records) {
  gristData = records
    .map((record) => {
      const word = record.word || "";
      const frequency = record.frequency || record.weight || 1;
      return {
        text: String(word).trim(),
        size: Math.max(1, Number(frequency) || 1),
      };
    })
    .filter((item) => item.text.length > 0);

  if (gristData.length === 0) {
    showError(
      "Aucune donnée valide trouvée. Vérifiez que la colonne 'Mot' contient du texte."
    );
    return;
  }

  // Normalisation des tailles
  const maxSize = Math.max(...gristData.map((d) => d.size));
  const minSize = Math.min(...gristData.map((d) => d.size));
  const sizeRange = maxSize - minSize || 1;

  gristData.forEach((d) => {
    d.normalizedSize = ((d.size - minSize) / sizeRange) * 0.8 + 0.2; // Entre 0.2 et 1
  });

  generateWordCloud();
}

// Génération du nuage de mots

function generateWordCloud() {
  if (gristData.length === 0) {
    showError(
      "Aucune donnée disponible. Assurez-vous que la table contient des mots."
    );
    return;
  }

  showLoading(true);
  clearError();

  const width = parseInt(document.getElementById("width").value) || 800;
  const height = parseInt(document.getElementById("height").value) || 400;
  const minFont = parseInt(document.getElementById("minFont").value) || 10;
  const maxFont = parseInt(document.getElementById("maxFont").value) || 60;
  const rotation = parseInt(document.getElementById("rotation").value) || 0;
  const colorScheme = document.getElementById("colorScheme").value;

  // Nettoyage du SVG existant
  d3.select("#wordcloud").selectAll("*").remove();

  const svg = d3
    .select("#wordcloud")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  // Configuration des couleurs
  const colors = colorSchemes[colorScheme] || colorSchemes.custom;
  const colorScale = d3.scaleOrdinal(colors);

  // Configuration du layout
  const layout = d3.layout
    .cloud()
    .size([width, height])
    .words(
      gristData.map((d) => ({
        text: d.text,
        size: minFont + (maxFont - minFont) * d.normalizedSize,
        originalSize: d.size,
      }))
    )
    .padding(5)
    .rotate(rotation)
    .font("Impact, Arial, sans-serif")
    .fontSize((d) => d.size)
    .spiral("archimedean");

  // Application du masque si disponible
  if (currentMask) {
    layout.maskCanvas(currentMask);
  }

  layout.on("end", function (words) {
    showLoading(false);

    if (words.length === 0) {
      showError(
        "Impossible de placer les mots. Essayez d'augmenter les dimensions ou de réduire la taille de police."
      );
      return;
    }

    // Rendu des mots
    const text = g
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-size", (d) => d.size + "px")
      .style("font-family", "Impact, Arial, sans-serif")
      .style("fill", (d, i) => colorScale(i))
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        (d) => "translate(" + d.x + "," + d.y + ") rotate(" + d.rotate + ")"
      )
      .text((d) => d.text)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .style("opacity", 0.7)
          .style("stroke", "#333")
          .style("stroke-width", "1px");

        // Affichage d'un tooltip
        showTooltip(event, d);
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 1).style("stroke", "none");
        hideTooltip();
      });

    console.log(
      "Nuage généré avec " +
        words.length +
        " mots sur " +
        gristData.length +
        " mots disponibles"
    );
  });

  layout.start();
}

// Fonctions utilitaires

function showError(message) {
  document.getElementById("error").textContent = message;
}

function clearError() {
  document.getElementById("error").textContent = "";
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

// Tooltip

let tooltip = null;

function showTooltip(event, d) {
  if (!tooltip) {
    tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8) ")
      .style("color", "white")
      .style("padding", "5px 10px")
      .style("border - radius", "5px")
      .style("font - size", "12px")
      .style("pointer - events", "none")
      .style("z - index", "1000");
  }

  tooltip
    .style("display", "block")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 10 + "px")
    .html("<strong>" + d.text + "</strong><br>Fréquence: " + d.originalSize);
}

function hideTooltip() {
  if (tooltip) {
    tooltip.style("display", "none");
  }
}

// Export du nuage de mots

function exportWordCloud() {
  const svg = document.getElementById("wordcloud");
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const width = parseInt(document.getElementById("width").value);
  const height = parseInt(document.getElementById("height").value);

  canvas.width = width;
  canvas.height = height;

  const img = new Image();
  img.onload = function () {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = "wordcloud.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  img.src =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

// Toggle des contrôles
function toggleControls() {
  const controls = document.querySelector(".controls");
  const container = document.querySelector(".container");
  const toggleBtn = document.getElementById("toggleControls");
  const icon = toggleBtn.querySelector(".material-icons");

  controls.classList.toggle("hidden");
  container.classList.toggle("fullscreen");

  if (controls.classList.contains("hidden")) {
    icon.textContent = "Réglages";
    toggleBtn.title = "Afficher les réglages";
  } else {
    icon.textContent = "Plein écran";
    toggleBtn.title = "Masquer les réglages";
  }
}

// Événements
document.getElementById("width").addEventListener("change", generateWordCloud);
document.getElementById("height").addEventListener("change", generateWordCloud);
document
  .getElementById("minFont")
  .addEventListener("change", generateWordCloud);
document
  .getElementById("maxFont")
  .addEventListener("change", generateWordCloud);
document
  .getElementById("rotation")
  .addEventListener("change", generateWordCloud);
document
  .getElementById("colorScheme")
  .addEventListener("change", generateWordCloud);
// Toggle controls
const toggleBtn = document.getElementById("toggleControls");
if (toggleBtn) {
  toggleBtn.addEventListener("click", toggleControls);
}

// Initialisation

if (typeof grist !== "undefined") {
  ready();
} else {
  // Mode test avec des données factices
  console.log("Mode test - Grist non disponible");
  gristData = [
    { text: "JavaScript", size: 80, normalizedSize: 1 },
    { text: "Python", size: 70, normalizedSize: 0.875 },
    { text: "HTML", size: 60, normalizedSize: 0.75 },
    { text: "CSS", size: 50, normalizedSize: 0.625 },
    { text: "React", size: 40, normalizedSize: 0.5 },
    { text: "Vue", size: 30, normalizedSize: 0.375 },
    { text: "Node", size: 20, normalizedSize: 0.25 },
    { text: "Express", size: 10, normalizedSize: 0.125 },
  ];
  setTimeout(generateWordCloud, 100);
}
