/**
 * Carimba a versão da release no system.json — roda com `npm run release -- 0.3.0`.
 *
 * Por que existe: o Foundry decide se há atualização comparando o campo
 * `version` do manifesto publicado com o da cópia instalada. O nome da tag do
 * git não entra nessa conta. Uma release cujo system.json repete a versão
 * anterior é invisível: o Foundry busca o manifesto, vê o mesmo número e conclui
 * que já está em dia.
 *
 * Foi o que aconteceu entre a v0.0.3 e a v0.2.0 — quatro tags, todas com
 * `version: "0.1.0"` dentro. Por isso o número passa a ser carimbado por um
 * script, e não digitado à mão.
 *
 * `manifest` continua apontando para a release *latest*, que é o endereço fixo
 * que o Foundry consulta para saber se saiu coisa nova; `download` aponta para o
 * zip *desta* versão, para que instalar uma versão específica continue possível.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CAMINHO = path.join(ROOT, "system.json");

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** Compara duas versões semânticas: >0 se `a` for maior que `b`. */
export function compararVersoes(a, b) {
  const partes = v => v.split("-")[0].split(".").map(Number);
  const [x, y] = [partes(a), partes(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  }
  return 0;
}

function main() {
  const versao = String(process.argv[2] ?? "").replace(/^v/, "");
  if (!SEMVER.test(versao)) {
    console.error(
      `Versão inválida: "${process.argv[2] ?? ""}".\n` +
        "Uso: npm run release -- 0.3.0   (ou v0.3.0)"
    );
    process.exit(1);
  }

  const sistema = JSON.parse(fs.readFileSync(CAMINHO, "utf8"));
  const anterior = sistema.version;

  if (compararVersoes(versao, anterior) <= 0) {
    console.error(
      `A versão ${versao} não é maior que a atual (${anterior}).\n` +
        "O Foundry só oferece a atualização quando o número sobe."
    );
    process.exit(1);
  }

  const base = sistema.url?.replace(/\/$/, "") ?? "";
  const novos = {
    version: versao,
    manifest: `${base}/releases/latest/download/system.json`,
    download: `${base}/releases/download/v${versao}/system.zip`
  };

  // Troca cirúrgica no texto, e não `JSON.stringify` do objeto inteiro: um
  // reserializado achataria a formatação à mão do arquivo e encheria o diff de
  // ruído que não tem nada a ver com a release.
  let texto = fs.readFileSync(CAMINHO, "utf8");
  for (const [chave, valor] of Object.entries(novos)) {
    const alvo = new RegExp(`("${chave}"\\s*:\\s*)"[^"]*"`);
    if (!alvo.test(texto)) {
      console.error(`system.json não tem o campo "${chave}".`);
      process.exit(1);
    }
    texto = texto.replace(alvo, `$1${JSON.stringify(valor)}`);
  }
  fs.writeFileSync(CAMINHO, texto, "utf8");

  console.log(`system.json: ${anterior} -> ${versao}`);
  console.log(`  manifest: ${novos.manifest}`);
  console.log(`  download: ${novos.download}`);
  console.log("\nAgora:");
  console.log("  npm run build:packs && npm run check");
  console.log(`  git commit -am "Versão ${versao}" && git push`);
  console.log(`  git tag v${versao} && git push origin v${versao}`);
}

if (import.meta.filename === process.argv[1]) main();
