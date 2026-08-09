/**
 * Gera os compêndios LevelDB em packs/ a partir de tools/pack-data.mjs,
 * usando a CLI oficial do Foundry (@foundryvtt/foundryvtt-cli).
 *
 * Uso: npm run build:packs
 */
import fs from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { PACKS, JOURNAL_PACKS, MACRO_PACKS } from "./pack-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "packs-src");
const OUT = path.join(ROOT, "packs");

const ID_RE = /^[a-zA-Z0-9]{16}$/;

/** Garante que todo _id seja válido e único dentro do pack. */
function registrarId(ids, id, rotulo) {
  if (!ID_RE.test(id)) throw new Error(`id inválido (${rotulo}): ${id}`);
  if (ids.has(id)) throw new Error(`id duplicado (${rotulo}): ${id}`);
  ids.add(id);
}

fs.rmSync(SRC, { recursive: true, force: true });

/* -------- Packs de Item -------- */
for (const [packName, dados] of Object.entries(PACKS)) {
  const dir = path.join(SRC, packName);
  fs.mkdirSync(dir, { recursive: true });
  const ids = new Set();

  for (const f of dados.folders ?? []) {
    registrarId(ids, f._id, `pasta ${f.name}`);
    const doc = {
      _id: f._id,
      _key: `!folders!${f._id}`,
      name: f.name,
      type: "Item",
      folder: f.folder ?? null,
      sorting: "a",
      sort: f.sort ?? 0,
      color: f.color ?? null,
      flags: {}
    };
    fs.writeFileSync(path.join(dir, `folder-${f._id}.json`), JSON.stringify(doc, null, 2));
  }

  dados.items.forEach((i, idx) => {
    registrarId(ids, i._id, `item ${i.name}`);
    const doc = {
      _id: i._id,
      _key: `!items!${i._id}`,
      name: i.name,
      type: i.type,
      img: i.img ?? "icons/svg/item-bag.svg",
      folder: i.folder ?? null,
      system: i.system,
      effects: [],
      sort: (idx + 1) * 100000,
      flags: {},
      ownership: { default: 0 }
    };
    fs.writeFileSync(path.join(dir, `item-${i._id}.json`), JSON.stringify(doc, null, 2));
  });

  await compilePack(dir, path.join(OUT, packName), { log: false });
  console.log(`OK ${packName}: ${(dados.folders ?? []).length} pastas, ${dados.items.length} itens`);
}

/* -------- Packs de JournalEntry (referência de regras) -------- */
for (const [packName, dados] of Object.entries(JOURNAL_PACKS ?? {})) {
  const dir = path.join(SRC, packName);
  fs.mkdirSync(dir, { recursive: true });
  const ids = new Set();

  dados.entries.forEach((e, idx) => {
    registrarId(ids, e._id, `journal ${e.name}`);
    // Cada página vira uma entrada própria no LevelDB
    const pages = (e.pages ?? []).map((p, pIdx) => {
      registrarId(ids, p._id, `página ${p.name}`);
      return {
        _id: p._id,
        _key: `!journal.pages!${e._id}.${p._id}`,
        name: p.name,
        type: "text",
        title: { show: true, level: 1 },
        text: { format: 1, content: p.content },
        image: {},
        video: { controls: true, volume: 0.5 },
        src: null,
        system: {},
        sort: (pIdx + 1) * 100000,
        ownership: { default: -1 },
        flags: {},
        _stats: {}
      };
    });

    const doc = {
      _id: e._id,
      _key: `!journal!${e._id}`,
      name: e.name,
      pages,
      folder: null,
      sort: (idx + 1) * 100000,
      ownership: { default: 0 },
      flags: {},
      _stats: {}
    };
    fs.writeFileSync(path.join(dir, `journal-${e._id}.json`), JSON.stringify(doc, null, 2));
  });

  await compilePack(dir, path.join(OUT, packName), { log: false });
  console.log(`OK ${packName}: ${dados.entries.length} entrada(s) de diário`);
}

/* -------- Packs de Macro -------- */
for (const [packName, dados] of Object.entries(MACRO_PACKS ?? {})) {
  const dir = path.join(SRC, packName);
  fs.mkdirSync(dir, { recursive: true });
  const ids = new Set();

  for (const m of dados.macros) {
    registrarId(ids, m._id, `macro ${m.name}`);
    const command = m.command ?? fs.readFileSync(path.join(ROOT, m.file), "utf8");
    const doc = {
      _id: m._id,
      _key: `!macros!${m._id}`,
      name: m.name,
      type: m.type ?? "script",
      author: null,
      img: m.img ?? "icons/svg/dice-target.svg",
      scope: m.scope ?? "global",
      command,
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags: {},
      _stats: {}
    };
    fs.writeFileSync(path.join(dir, `macro-${m._id}.json`), JSON.stringify(doc, null, 2));
  }

  await compilePack(dir, path.join(OUT, packName), { log: false });
  console.log(`OK ${packName}: ${dados.macros.length} macro(s)`);
}

console.log("Compêndios gerados em packs/");
