const HEIR_GROUPS = [
  {
    title: "Pasangan",
    description: "Isi salah satu saja: suami atau jumlah istri yang masih hidup.",
    fields: [
      { key: "husband", label: "Suami", hint: "Centang jika ada suami yang masih hidup", binary: true, checkbox: true },
      { key: "wives", label: "Istri", hint: "Jumlah istri yang masih hidup" },
    ],
  },
  {
    title: "Orang Tua & Kakek Nenek",
    description: "Masukkan ahli waris dari garis atas yang masih hidup.",
    fields: [
      { key: "father", label: "Ayah", hint: "Centang jika ayah masih hidup", binary: true, checkbox: true },
      { key: "mother", label: "Ibu", hint: "Centang jika ibu masih hidup", binary: true, checkbox: true },
      { key: "paternalGrandfather", label: "Kakek dari Ayah", hint: "Centang jika kakek dari ayah masih hidup", binary: true, checkbox: true },
      { key: "maternalGrandfather", label: "Kakek dari Ibu", hint: "Centang jika kakek dari ibu masih hidup", binary: true, checkbox: true },
      { key: "paternalGrandmother", label: "Nenek dari Ayah", hint: "Centang jika nenek dari ayah masih hidup", binary: true, checkbox: true },
      { key: "maternalGrandmother", label: "Nenek dari Ibu", hint: "Centang jika nenek dari ibu masih hidup", binary: true, checkbox: true },
    ],
  },
  {
    title: "Keturunan",
    description: "Cucu di sini dipahami sebagai cucu dari jalur anak laki-laki untuk mode faraid.",
    fields: [
      { key: "sons", label: "Anak Laki-Laki", hint: "Jumlah anak laki-laki" },
      { key: "daughters", label: "Anak Perempuan", hint: "Jumlah anak perempuan" },
      { key: "grandsons", label: "Cucu Laki-Laki", hint: "Jumlah cucu laki-laki" },
      { key: "granddaughters", label: "Cucu Perempuan", hint: "Jumlah cucu perempuan" },
      { key: "greatGrandsons", label: "Cicit Laki-Laki", hint: "Jumlah cicit laki-laki" },
      { key: "greatGranddaughters", label: "Cicit Perempuan", hint: "Jumlah cicit perempuan" },
    ],
  },
  {
    title: "Saudara",
    description: "Saudara seibu dibagi rata, sedangkan bil ghair memakai pola 2:1.",
    fields: [
      { key: "fullBrothers", label: "Saudara Laki-Laki Kandung", hint: "Jumlah saudara kandung laki-laki" },
      { key: "fullSisters", label: "Saudara Perempuan Kandung", hint: "Jumlah saudara kandung perempuan" },
      { key: "paternalBrothers", label: "Saudara Laki-Laki Seayah", hint: "Jumlah saudara seayah laki-laki" },
      { key: "paternalSisters", label: "Saudara Perempuan Seayah", hint: "Jumlah saudara seayah perempuan" },
      { key: "maternalBrothers", label: "Saudara Laki-Laki Seibu", hint: "Jumlah saudara seibu laki-laki" },
      { key: "maternalSisters", label: "Saudara Perempuan Seibu", hint: "Jumlah saudara seibu perempuan" },
    ],
  },
  {
    title: "Kerabat Lanjutan",
    description: "Kelompok ini hanya aktif jika seluruh ahli waris laki-laki yang lebih dekat tidak ada.",
    fields: [
      { key: "fullNephews", label: "Keponakan Kandung", hint: "Jumlah keponakan kandung laki-laki" },
      { key: "paternalNephews", label: "Keponakan Seayah", hint: "Jumlah keponakan seayah laki-laki" },
      { key: "fullUncles", label: "Paman Kandung", hint: "Jumlah paman kandung" },
      { key: "paternalUncles", label: "Paman Seayah", hint: "Jumlah paman seayah" },
    ],
  },
];

const FIELD_META = Object.fromEntries(
  HEIR_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, field]))
);
const HEIR_ORDER = HEIR_GROUPS.flatMap((group) => group.fields.map((field) => field.key));

const DEFAULT_INPUT = {
  method: "khi",
  totalEstate: 100000000,
  husband: 0,
  wives: 0,
  father: 0,
  mother: 0,
  paternalGrandfather: 0,
  maternalGrandfather: 0,
  paternalGrandmother: 0,
  maternalGrandmother: 0,
  sons: 0,
  daughters: 0,
  grandsons: 0,
  granddaughters: 0,
  greatGrandsons: 0,
  greatGranddaughters: 0,
  fullBrothers: 0,
  fullSisters: 0,
  paternalBrothers: 0,
  paternalSisters: 0,
  maternalBrothers: 0,
  maternalSisters: 0,
  fullNephews: 0,
  paternalNephews: 0,
  fullUncles: 0,
  paternalUncles: 0,
};

const STORAGE_KEY = "waris-app-state";
let currentMethod = "khi";
const ZERO = fraction(0, 1);
const ONE = fraction(1, 1);

let formElement;
let heirGroupsElement;
let formMessageElement;
let resultsViewElement;
let resultsBodyElement;
let summaryEstateElement;
let summaryDistributableElement;
let summaryOriginElement;
let specialCasesElement;
let resetButtonElement;
let submitButtonElement;
let resultsTfootElement;
let resultsPanelElement;
let resultsAnimationTimeout;

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  renderHeirGroups();
  bindEvents();
  hydrateStoredInput();
});

function cacheElements() {
  formElement = document.getElementById("waris-form");
  heirGroupsElement = document.getElementById("heir-groups");
  formMessageElement = document.getElementById("form-message");
  resultsViewElement = document.getElementById("results-view");
  resultsBodyElement = document.getElementById("results-body");
  summaryEstateElement = document.getElementById("summary-estate");
  summaryDistributableElement = document.getElementById("summary-distributable");
  summaryOriginElement = document.getElementById("summary-origin");
  specialCasesElement = document.getElementById("special-cases");
  resetButtonElement = document.getElementById("reset-button");
  submitButtonElement = formElement.querySelector('button[type="submit"]');
  resultsTfootElement = document.getElementById("results-tfoot");
  resultsPanelElement = document.querySelector(".panel-results");
}

function bindEvents() {
  formElement.addEventListener("submit", handleSubmit);
  resetButtonElement.addEventListener("click", resetForm);
  document.querySelectorAll('input[name="method"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      currentMethod = event.target.value;
    });
  });
  const activeMethod = document.querySelector('input[name="method"]:checked');
  currentMethod = activeMethod ? activeMethod.value : DEFAULT_INPUT.method;
}

function renderHeirGroups() {
  heirGroupsElement.innerHTML = HEIR_GROUPS.map(renderGroup).join("");
}

function renderGroup(group) {
  return `
    <section class="section-block">
      <div class="section-headline">
        <div>
          <p class="section-kicker">Ahli Waris</p>
          <h3>${group.title}</h3>
        </div>
        <p class="section-copy">${group.description}</p>
      </div>
      <div class="input-grid">
        ${group.fields.map(renderField).join("")}
      </div>
    </section>
  `;
}

function renderField(field) {
  if (field.checkbox) {
    return `
      <label class="field-card checkbox-card" for="${field.key}">
        <span class="field-label">${field.label}</span>
        <span class="checkbox-row">
          <input type="checkbox" id="${field.key}" name="${field.key}" value="1" />
          <small class="field-hint">${field.hint}</small>
        </span>
      </label>
    `;
  }

  const maxAttr = field.binary ? ' max="1"' : "";
  return `
    <label class="field-card" for="${field.key}">
      <span class="field-label">${field.label}</span>
      <input type="number" id="${field.key}" name="${field.key}" min="0" step="1" value="0"${maxAttr} />
      <small class="field-hint">${field.hint}</small>
    </label>
  `;
}

function hydrateStoredInput() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      fillForm(DEFAULT_INPUT);
      return;
    }
    fillForm({ ...DEFAULT_INPUT, ...JSON.parse(raw) });
  } catch (error) {
    fillForm(DEFAULT_INPUT);
  }
}

function resetForm() {
  fillForm(DEFAULT_INPUT);
  setFormMessage("");
  resultsBodyElement.innerHTML = "";
  specialCasesElement.innerHTML = "";
  resultsTfootElement.innerHTML = "";
  resultsViewElement.hidden = true;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Penyimpanan lokal hanya bonus.
  }
}

function fillForm(data) {
  const method = data.method ?? DEFAULT_INPUT.method;
  currentMethod = method;
  document.querySelectorAll('input[name="method"]').forEach((radio) => {
    radio.checked = radio.value === method;
  });
  document.getElementById("totalEstate").value = data.totalEstate ?? DEFAULT_INPUT.totalEstate;

  HEIR_ORDER.forEach((key) => {
    const element = document.getElementById(key);
    if (element) {
      if (FIELD_META[key].checkbox) {
        element.checked = Boolean(data[key]);
      } else {
        element.value = data[key] ?? 0;
      }
    }
  });
}

function handleSubmit(event) {
  event.preventDefault();
  performCalculation();
}

function performCalculation() {
  const input = readForm();
  const validationMessage = validateInput(input);
  if (validationMessage) {
    setFormMessage(validationMessage);
    resultsViewElement.hidden = true;
    return;
  }

  try {
    const result = calculateInheritance(input);
    if (!result?.valid) {
      throw new Error(result?.message || "Perhitungan tidak dapat diproses.");
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch (error) {
      // Penyimpanan lokal hanya bonus.
    }

    setFormMessage("");
    renderResults(result);
  } catch (error) {
    resultsViewElement.hidden = true;
    setFormMessage(error?.message || "Perhitungan tidak dapat diproses.");
  }
}

function setFormMessage(message) {
  formMessageElement.textContent = message;
}

function readForm() {
  const raw = {
    method: document.querySelector('input[name="method"]:checked')?.value ?? currentMethod,
    totalEstate: readNumber("totalEstate"),
  };

  HEIR_ORDER.forEach((key) => {
    raw[key] = FIELD_META[key].checkbox ? (document.getElementById(key).checked ? 1 : 0) : readNumber(key);
  });

  return normalizeInput(raw);
}

function readNumber(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
}

function normalizeInput(raw) {
  const normalized = { ...DEFAULT_INPUT, ...raw };
  normalized.method = raw.method === "faraid" ? "faraid" : "khi";
  normalized.totalEstate = clampNumber(raw.totalEstate, 0);

  HEIR_ORDER.forEach((key) => {
    const field = FIELD_META[key];
    const value = clampNumber(raw[key], 0);
    normalized[key] = field.binary ? Math.min(1, value) : value;
  });

  return normalized;
}

function validateInput(input) {
  const totalHeirs = HEIR_ORDER.reduce((sum, key) => sum + input[key], 0);
  if (input.husband > 0 && input.wives > 0) {
    return "Pilih salah satu saja: suami atau istri.";
  }
  if (totalHeirs === 0) {
    return "Masukkan minimal satu ahli waris.";
  }
  return "";
}

function clampNumber(value, minValue) {
  return Math.max(minValue, Math.floor(Number.isFinite(value) ? value : 0));
}

function calculateInheritance(input) {
  const totalHeirs = HEIR_ORDER.reduce((sum, key) => sum + input[key], 0);
  if (input.husband > 0 && input.wives > 0) {
    return { valid: false, message: "Pilih salah satu saja: suami atau istri." };
  }
  if (totalHeirs === 0) {
    return { valid: false, message: "Masukkan minimal satu ahli waris." };
  }

  const estate = resolveEstate(input);
  const special = detectSpecialCase(input);
  const rawResult = special || calculateGeneralCase(input);

  return finalizeOutput(input, estate, rawResult);
}

function resolveEstate(input) {
  const notes = [];
  let distributable = input.totalEstate;
  let excludedJointAssets = 0;

  if ((input.husband > 0 || input.wives > 0) && input.method === "khi") {
    excludedJointAssets = input.totalEstate / 2;
    distributable = input.totalEstate - excludedJointAssets;
    notes.push("[KHI] 1/2 harta dipisahkan lebih dahulu sebagai bagian gono-gini pasangan yang masih hidup.");
  }

  return {
    totalEstate: input.totalEstate,
    distributableEstate: distributable,
    excludedJointAssets,
    notes,
  };
}

function detectSpecialCase(input) {
  if (isGharrawain(input)) {
    return buildGharrawain(input);
  }
  if (isMusytarakah(input)) {
    return buildMusytarakah(input);
  }
  if (isAkdariyah(input)) {
    return buildAkdariyah(input);
  }

  return null;
}

function isGharrawain(input) {
  if (!input.mother || !input.father) {
    return false;
  }
  if (!(input.husband > 0 || input.wives > 0)) {
    return false;
  }

  const allowed = new Set(["husband", "wives", "mother", "father"]);
  return HEIR_ORDER.every((key) => allowed.has(key) || input[key] === 0);
}

function isMusytarakah(input) {
  const hasDescendant =
    input.sons +
      input.daughters +
      input.grandsons +
      input.granddaughters +
      input.greatGrandsons +
      input.greatGranddaughters >
    0;
  const maternalTotal = input.maternalBrothers + input.maternalSisters;
  const fullTotal = input.fullBrothers + input.fullSisters;
  const grandmotherPresent = input.paternalGrandmother + input.maternalGrandmother > 0;
  const allowed = new Set([
    "husband",
    "mother",
    "paternalGrandmother",
    "maternalGrandmother",
    "maternalBrothers",
    "maternalSisters",
    "fullBrothers",
    "fullSisters",
  ]);
  const onlyAllowedHeirs = HEIR_ORDER.every((key) => allowed.has(key) || input[key] === 0);

  return (
    input.husband === 1 &&
    !hasDescendant &&
    input.father === 0 &&
    input.paternalGrandfather === 0 &&
    maternalTotal >= 2 &&
    fullTotal > 0 &&
    (input.mother === 1 || grandmotherPresent) &&
    input.wives === 0 &&
    onlyAllowedHeirs
  );
}

function isAkdariyah(input) {
  const sisterCount = input.fullSisters + input.paternalSisters;
  const hasDescendant =
    input.sons +
      input.daughters +
      input.grandsons +
      input.granddaughters +
      input.greatGrandsons +
      input.greatGranddaughters >
    0;
  const otherHeirs = HEIR_ORDER.some((key) => {
    if (["husband", "mother", "paternalGrandfather", "fullSisters", "paternalSisters"].includes(key)) {
      return false;
    }
    return input[key] > 0;
  });

  return (
    input.husband === 1 &&
    input.mother === 1 &&
    input.paternalGrandfather === 1 &&
    input.father === 0 &&
    !hasDescendant &&
    sisterCount === 1 &&
    input.fullBrothers === 0 &&
    input.paternalBrothers === 0 &&
    !otherHeirs
  );
}

function buildGharrawain(input) {
  const rows = createRows(input);
  const cases = ["Gharrawain"];
  const notes = ["Suami/istri mengambil bagian lebih dahulu, lalu ibu mendapat 1/3 dari sisa, dan sisanya untuk ayah."];

  if (input.husband) {
    awardFixed(rows, "husband", fraction(1, 2), "1/2", "Suami mendapat 1/2 karena tidak ada keturunan.");
    awardFixed(rows, "mother", fraction(1, 6), "1/3 sisa", "Ibu menerima 1/3 dari sisa setelah bagian suami.");
    awardFinal(rows, "father", fraction(1, 3), "Sisa", "Ayah menerima sisa setelah gharrawain diterapkan.");
  } else {
    awardFixed(rows, "wives", fraction(1, 4), "1/4", "Istri mendapat 1/4 karena tidak ada keturunan.");
    awardFixed(rows, "mother", fraction(1, 4), "1/3 sisa", "Ibu menerima 1/3 dari sisa setelah bagian istri.");
    awardFinal(rows, "father", fraction(1, 2), "Sisa", "Ayah menerima sisa setelah gharrawain diterapkan.");
  }

  return {
    rows,
    cases,
    notes,
    assumptions: [],
    originHint: null,
  };
}

function buildMusytarakah(input) {
  const rows = createRows(input);
  const cases = ["Musytarakah"];
  const notes = ["Kasus musytarakah: saudara kandung ikut berbagi dalam porsi 1/3 bersama saudara seibu."];
  const assumptions = ["Dalam musytarakah ini, porsi gabungan saudara seibu dan saudara kandung dibagi rata per orang."];

  awardFixed(rows, "husband", fraction(1, 2), "1/2", "Suami mendapat 1/2.");

  const grandmotherItems = [
    { key: "paternalGrandmother", count: input.paternalGrandmother, weight: 1 },
    { key: "maternalGrandmother", count: input.maternalGrandmother, weight: 1 },
  ].filter((item) => item.count > 0);

  if (input.mother) {
    awardFixed(rows, "mother", fraction(1, 6), "1/6", "Ibu mendapat 1/6 pada musytarakah.");
  } else if (grandmotherItems.length) {
    distributeShares(rows, grandmotherItems, fraction(1, 6), "1/6", "Nenek yang hadir menggantikan posisi ibu pada musytarakah.", true);
  }

  distributeShares(
    rows,
    [
      { key: "maternalBrothers", count: input.maternalBrothers, weight: 1 },
      { key: "maternalSisters", count: input.maternalSisters, weight: 1 },
      { key: "fullBrothers", count: input.fullBrothers, weight: 1 },
      { key: "fullSisters", count: input.fullSisters, weight: 1 },
    ],
    fraction(1, 3),
    "1/3 bersama",
    "Saudara seibu dan saudara kandung berbagi porsi musytarakah.",
    true
  );

  return {
    rows,
    cases,
    notes,
    assumptions,
    originHint: null,
  };
}

function buildAkdariyah(input) {
  const rows = createRows(input);
  const cases = ["Akdariyah"];
  const notes = ["Kasus akdariyah dihitung dengan penggabungan bagian kakek dan saudari lalu dipecah menurut rasio 2:1."];
  const assumptions = ["Versi ini mengikuti tashih akdariyah ke 27 saham agar pembagian utuh."];

  awardFinal(rows, "husband", fraction(9, 27), "Akdariyah", "Suami memperoleh 9 dari 27 saham.");
  awardFinal(rows, "mother", fraction(6, 27), "Akdariyah", "Ibu memperoleh 6 dari 27 saham.");
  awardFinal(rows, "paternalGrandfather", fraction(8, 27), "Akdariyah", "Kakek memperoleh 8 dari 27 saham.");

  if (input.fullSisters) {
    awardFinal(rows, "fullSisters", fraction(4, 27), "Akdariyah", "Saudari kandung memperoleh 4 dari 27 saham.");
  } else {
    awardFinal(rows, "paternalSisters", fraction(4, 27), "Akdariyah", "Saudari seayah memperoleh 4 dari 27 saham.");
  }

  return {
    rows,
    cases,
    notes,
    assumptions,
    originHint: 27,
  };
}

function calculateGeneralCase(input) {
  const rows = createRows(input);
  const state = deriveState(input);
  const notes = [];
  const assumptions = [
    "Aplikasi ini membaca hanya ahli waris yang Anda isi; ahli waris yang tidak diinput dianggap tidak ada.",
    "Nilai harta dianggap sudah bersih dari utang, wasiat, dan biaya pemakaman.",
  ];
  const cases = [];

  const grandfatherSiblingCase =
    state.activePaternalGrandfather &&
    !state.hasDescendant &&
    state.fullSiblingTotal + state.paternalSiblingTotal > 0;

  if (grandfatherSiblingCase) {
    cases.push("Muqasamah");
    assumptions.push(
      "Muqasamah dimodelkan dengan memilih bagian kakek yang paling menguntungkan antara 1/6, 1/3 sisa, atau berbagi seperti saudara laki-laki."
    );
  } else if (state.activePaternalGrandfather && state.fullSiblingTotal + state.paternalSiblingTotal > 0) {
    assumptions.push(
      "Kasus kakek bersama saudara saat ada keturunan disederhanakan dengan mengutamakan bagian kakek pada model ini."
    );
  }

  let fatherResiduary = false;
  let grandfatherResiduary = false;
  let fullSiblingResiduary = false;
  let fullSistersAsabah = false;
  let paternalSiblingResiduary = false;
  let paternalSistersAsabah = false;

  if (input.husband) {
    awardFixed(
      rows,
      "husband",
      state.hasDescendant ? fraction(1, 4) : fraction(1, 2),
      state.hasDescendant ? "1/4" : "1/2",
      state.hasDescendant
        ? "Suami turun menjadi 1/4 karena ada keturunan."
        : "Suami mendapat 1/2 karena tidak ada keturunan."
    );
  }

  if (input.wives) {
    awardFixed(
      rows,
      "wives",
      state.hasDescendant ? fraction(1, 8) : fraction(1, 4),
      state.hasDescendant ? "1/8" : "1/4",
      state.hasDescendant
        ? "Para istri bersama-sama mendapat 1/8 karena ada keturunan."
        : "Para istri bersama-sama mendapat 1/4 karena tidak ada keturunan."
    );
  }

  if (input.mother) {
    const motherShare = state.hasDescendant || state.siblingTotal > 1 ? fraction(1, 6) : fraction(1, 3);
    awardFixed(
      rows,
      "mother",
      motherShare,
      motherShare.d === 6 ? "1/6" : "1/3",
      motherShare.d === 6
        ? "Ibu mendapat 1/6 karena ada keturunan atau saudara lebih dari satu."
        : "Ibu mendapat 1/3 karena tidak ada keturunan dan saudara tidak lebih dari satu."
    );
  }

  if (input.father) {
    if (state.hasMaleDescendant) {
      awardFixed(rows, "father", fraction(1, 6), "1/6", "Ayah mendapat 1/6 karena ada keturunan laki-laki.");
    } else if (state.hasFemaleDescendant) {
      awardFixed(rows, "father", fraction(1, 6), "1/6 + sisa", "Ayah mendapat 1/6 dan berhak atas sisa karena hanya ada keturunan perempuan.");
      fatherResiduary = true;
    } else {
      fatherResiduary = true;
    }
  }

  if (input.paternalGrandfather) {
    if (input.father) {
      blockRow(rows, "paternalGrandfather", "Kakek dari ayah terhalang oleh ayah.");
    } else if (!grandfatherSiblingCase) {
      if (state.hasMaleDescendant) {
        awardFixed(rows, "paternalGrandfather", fraction(1, 6), "1/6", "Kakek dari ayah mendapat 1/6 karena ada keturunan laki-laki.");
      } else if (state.hasFemaleDescendant) {
        awardFixed(rows, "paternalGrandfather", fraction(1, 6), "1/6 + sisa", "Kakek dari ayah mendapat 1/6 dan berhak atas sisa karena hanya ada keturunan perempuan.");
        grandfatherResiduary = true;
      } else {
        grandfatherResiduary = true;
      }
    }
  }

  if (input.maternalGrandfather) {
    blockRow(rows, "maternalGrandfather", "Kakek dari ibu selalu mahjub.");
  }

  const paternalGrandmotherEligible = input.paternalGrandmother > 0 && !input.father && !input.mother;
  const maternalGrandmotherEligible = input.maternalGrandmother > 0 && !input.mother;

  if (input.paternalGrandmother && !paternalGrandmotherEligible) {
    blockRow(rows, "paternalGrandmother", "Nenek dari ayah terhalang oleh ayah atau ibu.");
  }
  if (input.maternalGrandmother && !maternalGrandmotherEligible) {
    blockRow(rows, "maternalGrandmother", "Nenek dari ibu terhalang oleh ibu.");
  }

  if (paternalGrandmotherEligible && maternalGrandmotherEligible) {
    awardFixed(rows, "paternalGrandmother", fraction(1, 12), "1/12", "Nenek dari ayah berbagi 1/6 bersama nenek dari ibu.");
    awardFixed(rows, "maternalGrandmother", fraction(1, 12), "1/12", "Nenek dari ibu berbagi 1/6 bersama nenek dari ayah.");
  } else if (paternalGrandmotherEligible) {
    awardFixed(rows, "paternalGrandmother", fraction(1, 6), "1/6", "Nenek dari ayah mendapat 1/6.");
  } else if (maternalGrandmotherEligible) {
    awardFixed(rows, "maternalGrandmother", fraction(1, 6), "1/6", "Nenek dari ibu mendapat 1/6.");
  }

  if (input.sons > 0) {
    pushUnique(cases, "Muassib");
    if (input.grandsons > 0) {
      blockRow(rows, "grandsons", "Cucu laki-laki terhalang oleh anak laki-laki.");
    }
    if (input.granddaughters > 0) {
      blockRow(rows, "granddaughters", "Cucu perempuan terhalang oleh anak laki-laki.");
    }
    if (input.greatGrandsons > 0) {
      blockRow(rows, "greatGrandsons", "Cicit laki-laki terhalang oleh anak laki-laki.");
    }
    if (input.greatGranddaughters > 0) {
      blockRow(rows, "greatGranddaughters", "Cicit perempuan terhalang oleh anak laki-laki.");
    }
  }

  if (input.daughters > 0) {
    if (input.sons > 0) {
      pushUnique(cases, "Muassib");
    } else {
      awardFixed(
        rows,
        "daughters",
        input.daughters === 1 ? fraction(1, 2) : fraction(2, 3),
        input.daughters === 1 ? "1/2" : "2/3",
        input.daughters === 1
          ? "Seorang anak perempuan mendapat 1/2 karena tidak ada anak laki-laki."
          : "Dua atau lebih anak perempuan mendapat 2/3 karena tidak ada anak laki-laki."
      );
    }
  }

  if (input.grandsons > 0 && input.sons === 0 && input.granddaughters > 0) {
    pushUnique(cases, "Muassib");
  }

  if (input.granddaughters > 0 && input.sons === 0 && input.grandsons === 0) {
    if (input.daughters > 0) {
      awardFixed(rows, "granddaughters", fraction(1, 6), "1/6", "Cucu perempuan mendapat 1/6 karena ada anak perempuan.");
    } else {
      awardFixed(
        rows,
        "granddaughters",
        input.granddaughters === 1 ? fraction(1, 2) : fraction(2, 3),
        input.granddaughters === 1 ? "1/2" : "2/3",
        input.granddaughters === 1
          ? "Seorang cucu perempuan mendapat 1/2."
          : "Dua atau lebih cucu perempuan mendapat 2/3."
      );
    }
  }

  if (input.grandsons > 0 || input.granddaughters > 0) {
    if (input.greatGrandsons > 0) {
      blockRow(rows, "greatGrandsons", "Cicit laki-laki terhalang karena sudah ada cucu.");
    }
    if (input.greatGranddaughters > 0) {
      blockRow(rows, "greatGranddaughters", "Cicit perempuan terhalang karena sudah ada cucu.");
    }
  } else {
    if (input.greatGrandsons > 0 && input.sons === 0 && input.greatGranddaughters > 0) {
      pushUnique(cases, "Muassib");
    }

    if (input.greatGranddaughters > 0 && input.sons === 0 && input.greatGrandsons === 0) {
      if (input.daughters > 0) {
        awardFixed(rows, "greatGranddaughters", fraction(1, 6), "1/6", "Cicit perempuan mendapat 1/6 karena ada keturunan perempuan di atasnya.");
      } else {
        awardFixed(
          rows,
          "greatGranddaughters",
          input.greatGranddaughters === 1 ? fraction(1, 2) : fraction(2, 3),
          input.greatGranddaughters === 1 ? "1/2" : "2/3",
          input.greatGranddaughters === 1
            ? "Seorang cicit perempuan mendapat 1/2."
            : "Dua atau lebih cicit perempuan mendapat 2/3."
        );
      }
    }
  }

  if (state.maternalSiblingTotal > 0) {
    if (state.hasDescendant || input.father || state.activePaternalGrandfather) {
      blockRow(rows, "maternalBrothers", "Saudara seibu terhalang oleh keturunan, ayah, atau kakek dari ayah.");
      blockRow(rows, "maternalSisters", "Saudara seibu terhalang oleh keturunan, ayah, atau kakek dari ayah.");
    } else {
      distributeShares(
        rows,
        [
          { key: "maternalBrothers", count: input.maternalBrothers, weight: 1 },
          { key: "maternalSisters", count: input.maternalSisters, weight: 1 },
        ],
        state.maternalSiblingTotal === 1 ? fraction(1, 6) : fraction(1, 3),
        state.maternalSiblingTotal === 1 ? "1/6" : "1/3",
        "Saudara seibu berbagi rata dalam satu kelompok.",
        true
      );
    }
  }

  if (grandfatherSiblingCase) {
    if (state.fullSiblingTotal > 0) {
      blockRow(rows, "paternalBrothers", "Saudara seayah terhalang oleh saudara kandung yang lebih dekat.");
      blockRow(rows, "paternalSisters", "Saudara seayah terhalang oleh saudara kandung yang lebih dekat.");
    }
  } else if (state.activePaternalGrandfather) {
    blockRow(rows, "fullBrothers", "Saudara kandung disisihkan karena kakek dari ayah lebih diutamakan pada model ini.");
    blockRow(rows, "fullSisters", "Saudari kandung disisihkan karena kakek dari ayah lebih diutamakan pada model ini.");
    blockRow(rows, "paternalBrothers", "Saudara seayah disisihkan karena kakek dari ayah lebih diutamakan pada model ini.");
    blockRow(rows, "paternalSisters", "Saudari seayah disisihkan karena kakek dari ayah lebih diutamakan pada model ini.");
  } else {
    if (state.fullSiblingTotal > 0) {
      if (input.father || state.hasMaleDescendant) {
        blockRow(rows, "fullBrothers", "Saudara kandung terhalang oleh ayah atau keturunan laki-laki.");
        blockRow(rows, "fullSisters", "Saudari kandung terhalang oleh ayah atau keturunan laki-laki.");
      } else if (input.fullBrothers > 0) {
        fullSiblingResiduary = true;
        pushUnique(cases, "Muassib");
      } else if (state.hasFemaleDescendant) {
        fullSistersAsabah = true;
      } else {
        awardFixed(
          rows,
          "fullSisters",
          input.fullSisters === 1 ? fraction(1, 2) : fraction(2, 3),
          input.fullSisters === 1 ? "1/2" : "2/3",
          input.fullSisters === 1
            ? "Seorang saudari kandung mendapat 1/2."
            : "Dua atau lebih saudari kandung mendapat 2/3."
        );
      }
    }

    if (state.paternalSiblingTotal > 0) {
      if (input.father || state.hasMaleDescendant) {
        blockRow(rows, "paternalBrothers", "Saudara seayah terhalang oleh ayah atau keturunan laki-laki.");
        blockRow(rows, "paternalSisters", "Saudari seayah terhalang oleh ayah atau keturunan laki-laki.");
      } else if (input.paternalBrothers > 0) {
        if (state.fullSiblingTotal > 0) {
          blockRow(rows, "paternalBrothers", "Saudara seayah terhalang oleh saudara kandung.");
          blockRow(rows, "paternalSisters", "Saudari seayah terhalang oleh saudara kandung.");
        } else {
          paternalSiblingResiduary = true;
          pushUnique(cases, "Muassib");
        }
      } else if (input.fullBrothers > 0 || input.fullSisters >= 2) {
        blockRow(rows, "paternalSisters", "Saudari seayah terhalang oleh saudara kandung yang lebih kuat.");
      } else if (state.hasFemaleDescendant && state.fullSiblingTotal === 0) {
        paternalSistersAsabah = true;
      } else if (input.fullSisters === 1 && !state.hasDescendant) {
        awardFixed(rows, "paternalSisters", fraction(1, 6), "1/6", "Saudari seayah mendapat 1/6 sebagai penyempurna bersama satu saudari kandung.");
      } else if (state.fullSiblingTotal === 0) {
        awardFixed(
          rows,
          "paternalSisters",
          input.paternalSisters === 1 ? fraction(1, 2) : fraction(2, 3),
          input.paternalSisters === 1 ? "1/2" : "2/3",
          input.paternalSisters === 1
            ? "Seorang saudari seayah mendapat 1/2."
            : "Dua atau lebih saudari seayah mendapat 2/3."
        );
      } else {
        blockRow(rows, "paternalSisters", "Saudari seayah terhalang oleh ahli waris yang lebih dekat.");
      }
    }
  }

  const fixedTotal = sumRowShares(rows, "fixedShare");
  let residue = compareFractions(ONE, fixedTotal) >= 0 ? subtractFractions(ONE, fixedTotal) : ZERO;
  let residuaryApplied = false;

  if (compareFractions(fixedTotal, ONE) > 0) {
    const factor = divideFractions(ONE, fixedTotal);
    scaleFixedShares(rows, factor);
    notes.push("Terjadi aul karena jumlah bagian tetap melebihi satu kesatuan.");
    cases.push("Aul");
    residue = ZERO;
  } else if (compareFractions(residue, ZERO) > 0) {
    if (input.sons > 0) {
      distributeShares(
        rows,
        [
          { key: "sons", count: input.sons, weight: 2 },
          { key: "daughters", count: input.daughters, weight: 1 },
        ],
        residue,
        "Ashabah",
        "Anak laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
        false
      );
      residuaryApplied = true;
    } else if (input.grandsons > 0 && input.sons === 0) {
      distributeShares(
        rows,
        [
          { key: "grandsons", count: input.grandsons, weight: 2 },
          { key: "granddaughters", count: input.granddaughters, weight: 1 },
        ],
        residue,
        "Ashabah",
        "Cucu laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
        false
      );
      residuaryApplied = true;
    } else if (input.greatGrandsons > 0 && input.sons === 0 && input.grandsons === 0 && input.granddaughters === 0) {
      distributeShares(
        rows,
        [
          { key: "greatGrandsons", count: input.greatGrandsons, weight: 2 },
          { key: "greatGranddaughters", count: input.greatGranddaughters, weight: 1 },
        ],
        residue,
        "Ashabah",
        "Cicit laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
        false
      );
      residuaryApplied = true;
    } else if (fatherResiduary) {
      awardFinal(rows, "father", residue, "Sisa", "Ayah mengambil sisa harta.");
      residuaryApplied = true;
    } else if (grandfatherSiblingCase) {
      applyMuqasamah(rows, input, residue, notes);
      residuaryApplied = true;
    } else if (grandfatherResiduary) {
      awardFinal(rows, "paternalGrandfather", residue, "Sisa", "Kakek dari ayah mengambil sisa harta.");
      residuaryApplied = true;
    } else if (fullSiblingResiduary) {
      distributeShares(
        rows,
        [
          { key: "fullBrothers", count: input.fullBrothers, weight: 2 },
          { key: "fullSisters", count: input.fullSisters, weight: 1 },
        ],
        residue,
        "Ashabah",
        "Saudara kandung berbagi sisa dengan rasio 2:1.",
        false
      );
      residuaryApplied = true;
    } else if (fullSistersAsabah) {
      distributeShares(
        rows,
        [{ key: "fullSisters", count: input.fullSisters, weight: 1 }],
        residue,
        "AM",
        "Saudari kandung menjadi ashabah ma'al ghair bersama keturunan perempuan.",
        false
      );
      residuaryApplied = true;
    } else if (paternalSiblingResiduary) {
      distributeShares(
        rows,
        [
          { key: "paternalBrothers", count: input.paternalBrothers, weight: 2 },
          { key: "paternalSisters", count: input.paternalSisters, weight: 1 },
        ],
        residue,
        "Ashabah",
        "Saudara seayah berbagi sisa dengan rasio 2:1.",
        false
      );
      residuaryApplied = true;
    } else if (paternalSistersAsabah) {
      distributeShares(
        rows,
        [{ key: "paternalSisters", count: input.paternalSisters, weight: 1 }],
        residue,
        "AM",
        "Saudari seayah menjadi ashabah ma'al ghair bersama keturunan perempuan.",
        false
      );
      residuaryApplied = true;
    } else if (canTakeResidualFullNephews(input)) {
      distributeShares(rows, [{ key: "fullNephews", count: input.fullNephews, weight: 1 }], residue, "Ashabah", "Keponakan kandung mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.", false);
      residuaryApplied = true;
    } else if (canTakeResidualPaternalNephews(input)) {
      distributeShares(rows, [{ key: "paternalNephews", count: input.paternalNephews, weight: 1 }], residue, "Ashabah", "Keponakan seayah mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.", false);
      residuaryApplied = true;
    } else if (canTakeResidualFullUncles(input)) {
      distributeShares(rows, [{ key: "fullUncles", count: input.fullUncles, weight: 1 }], residue, "Ashabah", "Paman kandung mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.", false);
      residuaryApplied = true;
    } else if (canTakeResidualPaternalUncles(input)) {
      distributeShares(rows, [{ key: "paternalUncles", count: input.paternalUncles, weight: 1 }], residue, "Ashabah", "Paman seayah mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.", false);
      residuaryApplied = true;
    }

    if (!residuaryApplied && compareFractions(residue, ZERO) > 0) {
      const raddTargets = getRaddTargets(rows);
      if (raddTargets.length > 0) {
        const raddTotal = sumFractions(raddTargets.map((row) => row.fixedShare));
        raddTargets.forEach((row) => {
          const extra = multiplyFractions(residue, divideFractions(row.fixedShare, raddTotal));
          awardFinal(rows, row.key, extra, "Radd", "Sisa harta dibagikan kembali secara proporsional karena tidak ada ashabah penerima sisa.");
        });
        notes.push("Tidak ada ashabah yang mengambil sisa, sehingga sisa dibagikan melalui radd.");
        cases.push("Radd");
      }
    }
  }

  return {
    rows,
    cases,
    notes,
    assumptions,
    originHint: null,
  };
}

function applyMuqasamah(rows, input, residue, notes) {
  const hasFull = input.fullBrothers + input.fullSisters > 0;
  const siblingItems = hasFull
    ? [
        { key: "fullBrothers", count: input.fullBrothers, weight: 2 },
        { key: "fullSisters", count: input.fullSisters, weight: 1 },
      ]
    : [
        { key: "paternalBrothers", count: input.paternalBrothers, weight: 2 },
        { key: "paternalSisters", count: input.paternalSisters, weight: 1 },
      ];

  const siblingWeight = siblingItems.reduce((sum, item) => sum + item.count * item.weight, 0);
  const optionSixth = fraction(1, 6);
  const optionThird = divideFractions(residue, fraction(3, 1));
  const optionShareWithSiblings = siblingWeight > 0 ? multiplyFractions(residue, fraction(2, siblingWeight + 2)) : residue;

  let chosen = optionSixth;
  let label = "1/6";

  if (compareFractions(optionThird, chosen) > 0) {
    chosen = optionThird;
    label = "1/3 sisa";
  }
  if (compareFractions(optionShareWithSiblings, chosen) > 0) {
    chosen = optionShareWithSiblings;
    label = "Muqasamah";
  }

  awardFinal(rows, "paternalGrandfather", chosen, label, "Kakek dari ayah mengambil bagian terbaik menurut muqasamah.");

  const siblingResidue = subtractFractions(residue, chosen);
  if (compareFractions(siblingResidue, ZERO) > 0 && siblingWeight > 0) {
    distributeShares(rows, siblingItems, siblingResidue, "Sisa muqasamah", "Saudara menerima sisa setelah bagian kakek dipilih menurut muqasamah.", false);
  }

  notes.push(`Muqasamah dipilih dengan bagian kakek sebesar ${label}.`);
}

function canTakeResidualFullNephews(input) {
  return (
    input.fullNephews > 0 &&
    input.sons === 0 &&
    input.grandsons === 0 &&
    input.greatGrandsons === 0 &&
    input.father === 0 &&
    input.paternalGrandfather === 0 &&
    input.fullBrothers === 0 &&
    input.paternalBrothers === 0
  );
}

function canTakeResidualPaternalNephews(input) {
  return input.paternalNephews > 0 && input.fullNephews === 0 && canTakeResidualFullNephews({ ...input, fullNephews: 0 });
}

function canTakeResidualFullUncles(input) {
  return (
    input.fullUncles > 0 &&
    input.sons === 0 &&
    input.grandsons === 0 &&
    input.greatGrandsons === 0 &&
    input.father === 0 &&
    input.paternalGrandfather === 0 &&
    input.fullBrothers === 0 &&
    input.paternalBrothers === 0 &&
    input.fullNephews === 0 &&
    input.paternalNephews === 0
  );
}

function canTakeResidualPaternalUncles(input) {
  return input.paternalUncles > 0 && input.fullUncles === 0 && canTakeResidualFullUncles({ ...input, fullUncles: 0 });
}

function deriveState(input) {
  const hasMaleDescendant = input.sons > 0 || input.grandsons > 0 || input.greatGrandsons > 0;
  const hasFemaleDescendant = input.daughters > 0 || input.granddaughters > 0 || input.greatGranddaughters > 0;

  return {
    hasMaleDescendant,
    hasFemaleDescendant,
    hasDescendant: hasMaleDescendant || hasFemaleDescendant,
    siblingTotal:
      input.fullBrothers +
      input.fullSisters +
      input.paternalBrothers +
      input.paternalSisters +
      input.maternalBrothers +
      input.maternalSisters,
    maternalSiblingTotal: input.maternalBrothers + input.maternalSisters,
    fullSiblingTotal: input.fullBrothers + input.fullSisters,
    paternalSiblingTotal: input.paternalBrothers + input.paternalSisters,
    activePaternalGrandfather: input.paternalGrandfather > 0 && input.father === 0,
  };
}

function finalizeOutput(input, estate, rawResult) {
  const rowList = HEIR_ORDER.filter((key) => rawResult.rows[key]).map((key) => {
    const row = rawResult.rows[key];
    const perPersonShare = row.count > 0 ? divideFractions(row.share, fraction(row.count, 1)) : ZERO;
    const totalAmount = estate.distributableEstate * toDecimal(row.share);
    const perPersonAmount = row.count > 0 ? totalAmount / row.count : 0;
    const receives = compareFractions(row.share, ZERO) > 0;

    if (!receives && row.notes.length === 0) {
      row.notes.push("Tidak mendapat bagian pada komposisi ini.");
    }

    return {
      key: row.key,
      label: row.label,
      count: row.count,
      baseText: row.bases.length > 0 ? row.bases.join(" + ") : "-",
      amountText: formatCurrency(totalAmount),
      perPersonText: receives
        ? `${formatCurrency(perPersonAmount)} (${fractionToText(perPersonShare)})`
        : "-",
      noteText: row.notes.join(" "),
      statusClass: receives ? "receives" : "blocked",
      statusLabel: receives ? "Menerima" : "Mahjub / 0",
      bases: [...row.bases],
      share: row.share,
      fixedShare: row.fixedShare,
      saham: 0,
    };
  });

  const warisDasar = buildWarisDasarResult(rowList);
  const asalMasalah = warisDasar.asal_masalah;
  const sahamMap = Object.fromEntries(warisDasar.hasil.map((item) => [item.nama, item.saham]));
  rowList.forEach((row) => {
    row.saham = sahamMap[row.key] || 0;
    row.hasAshabahPart = hasAshabahPart(row);
    row.shareText = formatDisplayShare(row);
    row.statusLabel = compareFractions(row.share, ZERO) <= 0
      ? "Mahjub / 0"
      : row.hasAshabahPart
      ? "Ashabah"
      : "Menerima";
  });
  const jumlahSaham = warisDasar.jumlah_saham;

  return {
    valid: true,
    rows: rowList,
    summary: {
      estate: formatCurrency(estate.totalEstate),
      distributable: formatCurrency(estate.distributableEstate),
      distributableRaw: estate.distributableEstate,
      origin: `${asalMasalah}`,
    },
    cases: rawResult.cases,
    notes: [...estate.notes, ...rawResult.notes],
    saham: { asalMasalah, jumlahSaham },
  };
}

function renderResults(result) {
  resultsViewElement.hidden = false;

  summaryEstateElement.textContent = result.summary.estate;
  summaryDistributableElement.textContent = result.summary.distributable;
  summaryOriginElement.textContent = result.summary.origin + " saham";

  const caseMarkup = result.cases.length
    ? result.cases.map((item) => `<span class="case-chip">${item}</span>`).join("")
    : "";
  const noteMarkup = Array.isArray(result.notes) && result.notes.length
    ? `
      <div class="result-notes">
        ${result.notes.map((note) => `<div class="result-note">${note}</div>`).join("")}
      </div>
    `
    : "";
  specialCasesElement.innerHTML = `${caseMarkup}${noteMarkup}`;

  const { asalMasalah, jumlahSaham } = result.saham;
  const dist = result.summary.distributableRaw;

  resultsBodyElement.innerHTML = result.rows
    .map((row) => {
      const hartaTotal = row.saham > 0 ? formatCurrency((row.saham / jumlahSaham) * dist) : "-";
      const hartaPerOrang =
        row.saham > 0 && row.count > 0
          ? formatCurrency((row.saham / jumlahSaham / row.count) * dist)
          : "-";
      return `
        <tr>
          <td>
            <div><strong>${row.label}</strong></div>
            <span class="result-status ${row.statusClass}">${row.statusLabel}</span>
          </td>
          <td>${row.count}</td>
          <td>${row.shareText}</td>
          <td class="result-share">${row.saham > 0 ? row.saham : "-"}</td>
          <td>${hartaTotal}</td>
          <td>${hartaPerOrang}</td>
          <td class="muted">${row.noteText}</td>
        </tr>`;
    })
    .join("");

  const tfoot = document.getElementById("results-tfoot");
  if (tfoot) {
    const aulRadd =
      jumlahSaham > asalMasalah
        ? `<span class="case-chip" style="font-size:.8rem">Aul — Jumlah Saham > Asal Masalah</span>`
        : jumlahSaham < asalMasalah
        ? `<span class="case-chip" style="font-size:.8rem">Radd — sisa dikembalikan</span>`
        : "";
    tfoot.innerHTML = `
      <tr class="tfoot-row">
        <td colspan="3"><strong>Asal Masalah</strong></td>
        <td class="result-share"><strong>${asalMasalah}</strong></td>
        <td colspan="3">${aulRadd}</td>
      </tr>
      <tr class="tfoot-row tfoot-hl">
        <td colspan="3"><strong>Jumlah Saham</strong></td>
        <td class="result-share"><strong>${jumlahSaham}</strong></td>
        <td colspan="3" class="muted">Harta dibagi = ${result.summary.distributable}</td>
      </tr>`;
  }

  focusResultsPanel();
}

function focusResultsPanel() {
  if (!resultsPanelElement || !resultsViewElement) {
    return;
  }

  if (resultsAnimationTimeout) {
    clearTimeout(resultsAnimationTimeout);
  }

  resultsPanelElement.classList.remove("results-panel-focus");
  resultsViewElement.classList.remove("results-view-enter");

  void resultsPanelElement.offsetWidth;

  resultsPanelElement.classList.add("results-panel-focus");
  resultsViewElement.classList.add("results-view-enter");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  requestAnimationFrame(() => {
    resultsPanelElement.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  resultsAnimationTimeout = window.setTimeout(() => {
    resultsPanelElement.classList.remove("results-panel-focus");
    resultsViewElement.classList.remove("results-view-enter");
  }, prefersReducedMotion ? 0 : 1200);
}

function createRows(input) {
  const rows = {};

  HEIR_ORDER.forEach((key) => {
    if (input[key] > 0) {
      rows[key] = {
        key,
        label: FIELD_META[key].label,
        count: input[key],
        share: ZERO,
        fixedShare: ZERO,
        bases: [],
        notes: [],
      };
    }
  });

  return rows;
}

function buildWarisDasarResult(rows) {
  const bagian = rows
    .filter((row) => compareFractions(row.share, ZERO) > 0)
    .map((row) => ({
      nama: row.key,
      pembilang: row.share.n,
      penyebut: row.share.d,
    }));

  if (bagian.length === 0) {
    return {
      asal_masalah: 1,
      jumlah_saham: 0,
      hasil: [],
    };
  }

  const asalMasalah = lcmAll(bagian.map((item) => item.penyebut)) || 1;
  const hasil = bagian.map((item) => ({
    nama: item.nama,
    saham: (item.pembilang / item.penyebut) * asalMasalah,
  }));
  const jumlahSaham = hasil.reduce((sum, item) => sum + item.saham, 0);

  return {
    asal_masalah: asalMasalah,
    jumlah_saham: jumlahSaham,
    hasil,
  };
}

function hasAshabahPart(row) {
  const hasShare = compareFractions(row.share, ZERO) > 0;
  const hasFixedShare = compareFractions(row.fixedShare, ZERO) > 0;
  const hasExtraBeyondFixed = compareFractions(row.share, row.fixedShare) > 0;
  const hasAshabahBasis = row.bases.some((basis) => isAshabahBasis(basis));

  if (!hasShare) {
    return false;
  }

  if (hasExtraBeyondFixed) {
    return true;
  }

  return !hasFixedShare && hasAshabahBasis;
}

function isAshabahBasis(basis) {
  const normalized = String(basis || "").trim().toLowerCase();

  return normalized === "ashabah"
    || normalized === "am"
    || normalized === "sisa"
    || normalized === "sisa muqasamah"
    || normalized === "muqasamah";
}

function formatDisplayShare(row) {
  if (compareFractions(row.share, ZERO) <= 0) {
    return "0";
  }

  if (!row.hasAshabahPart) {
    return fractionToText(row.share);
  }

  if (compareFractions(row.fixedShare, ZERO) > 0) {
    return `${fractionToText(row.fixedShare)} + Ashabah`;
  }

  return "Ashabah";
}

function awardFixed(rows, key, share, basis, note) {
  if (!rows[key] || compareFractions(share, ZERO) <= 0) {
    return;
  }

  rows[key].share = addFractions(rows[key].share, share);
  rows[key].fixedShare = addFractions(rows[key].fixedShare, share);
  pushUnique(rows[key].bases, basis);
  if (note) {
    pushUnique(rows[key].notes, note);
  }
}

function awardFinal(rows, key, share, basis, note) {
  if (!rows[key] || compareFractions(share, ZERO) <= 0) {
    return;
  }

  rows[key].share = addFractions(rows[key].share, share);
  pushUnique(rows[key].bases, basis);
  if (note) {
    pushUnique(rows[key].notes, note);
  }
}

function blockRow(rows, key, note) {
  if (!rows[key]) {
    return;
  }
  if (note) {
    pushUnique(rows[key].notes, note);
  }
}

function distributeShares(rows, items, totalShare, basis, note, asFixed) {
  const activeItems = items.filter((item) => item.count > 0 && rows[item.key]);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.count * item.weight, 0);

  if (!totalWeight || compareFractions(totalShare, ZERO) <= 0) {
    return;
  }

  activeItems.forEach((item) => {
    const groupShare = multiplyFractions(totalShare, fraction(item.count * item.weight, totalWeight));
    if (asFixed) {
      awardFixed(rows, item.key, groupShare, basis, note);
    } else {
      awardFinal(rows, item.key, groupShare, basis, note);
    }
  });
}

function scaleFixedShares(rows, factor) {
  Object.values(rows).forEach((row) => {
    row.share = multiplyFractions(row.share, factor);
    row.fixedShare = multiplyFractions(row.fixedShare, factor);
  });
}

function getRaddTargets(rows) {
  const fixedReceivers = Object.values(rows).filter((row) => compareFractions(row.fixedShare, ZERO) > 0);
  const withoutSpouses = fixedReceivers.filter((row) => row.key !== "husband" && row.key !== "wives");

  return withoutSpouses.length > 0 ? withoutSpouses : fixedReceivers;
}

function sumRowShares(rows, property) {
  return Object.values(rows).reduce((sum, row) => addFractions(sum, row[property]), ZERO);
}

function sumFractions(items) {
  return items.reduce((sum, item) => addFractions(sum, item), ZERO);
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}

function lcm(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.abs(a * b) / gcd(a, b);
}

function lcmAll(items) {
  return items.reduce((result, value) => (value ? lcm(result || value, value) : result), 0);
}

function fraction(numerator, denominator = 1) {
  if (denominator === 0) {
    throw new Error("Denominator tidak boleh nol.");
  }

  if (numerator === 0) {
    return { n: 0, d: 1 };
  }

  const sign = denominator < 0 ? -1 : 1;
  const cleanNumerator = numerator * sign;
  const cleanDenominator = Math.abs(denominator);
  const divisor = gcd(cleanNumerator, cleanDenominator);

  return {
    n: cleanNumerator / divisor,
    d: cleanDenominator / divisor,
  };
}

function addFractions(a, b) {
  return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
}

function subtractFractions(a, b) {
  return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
}

function multiplyFractions(a, b) {
  return fraction(a.n * b.n, a.d * b.d);
}

function divideFractions(a, b) {
  return fraction(a.n * b.d, a.d * b.n);
}

function compareFractions(a, b) {
  return a.n * b.d - b.n * a.d;
}

function fractionToText(value) {
  if (value.n === 0) {
    return "0";
  }
  if (value.d === 1) {
    return String(value.n);
  }
  return `${value.n}/${value.d}`;
}

function toDecimal(value) {
  return value.n / value.d;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

if (typeof window !== "undefined") {
  window.calculateInheritance = calculateInheritance;
}
