const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

// ==============================================
// 🔧 CONFIGURAÇÃO
// ==============================================
const PASTA_DIST = path.join(__dirname, "..", "hoshinobot-dist");

// Arquivos pra ofuscar
const ARQUIVOS_OFUSCAR = [
  "index.js",
  "package.json",
  "config_visual.js"
];

// Pastas pra ofuscar (recursivo)
const PASTAS_OFUSCAR = [
  "comandos"
];

// Pastas/arquivos pra COPIAR sem ofuscar
const COPIAR_LIMPO = [
  "config.js",
  "personalize_aqui"
];

// ==============================================
// 🛠️ FUNÇÕES
// ==============================================
function garantirPasta(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ofuscarArquivo(caminho, destino) {
  try {
    const codigo = fs.readFileSync(caminho, "utf8");
    const ofuscado = JavaScriptObfuscator.obfuscate(codigo, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false,          // deixa false pra não travar
      disableConsoleOutput: false,
      identifierNamesGenerator: "hexadecimal",
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: false,            // desliga pra não quebrar
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ["base64"],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 4,
      stringArrayWrappersType: "function",
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    }).getObfuscatedCode();

    garantirPasta(path.dirname(destino));
    fs.writeFileSync(destino, ofuscado);
    console.log(`✅ Ofuscado: ${path.relative(__dirname, caminho)}`);
  } catch (e) {
    console.log(`❌ Erro ofuscando ${caminho}: ${e.message}`);
  }
}

function ofuscarPasta(pastaOrigem, pastaDestino) {
  if (!fs.existsSync(pastaOrigem)) return;
  garantirPasta(pastaDestino);

  const itens = fs.readdirSync(pastaOrigem);
  for (const item of itens) {
    const origem = path.join(pastaOrigem, item);
    const destino = path.join(pastaDestino, item);

    const stat = fs.statSync(origem);
    if (stat.isDirectory()) {
      ofuscarPasta(origem, destino);
    } else if (item.endsWith(".js")) {
      ofuscarArquivo(origem, destino);
    } else {
      garantirPasta(path.dirname(destino));
      fs.copyFileSync(origem, destino);
    }
  }
}

function copiarLimpo(origem, destino) {
  if (!fs.existsSync(origem)) return;
  const stat = fs.statSync(origem);

  if (stat.isDirectory()) {
    garantirPasta(destino);
    const itens = fs.readdirSync(origem);
    for (const item of itens) {
      copiarLimpo(path.join(origem, item), path.join(destino, item));
    }
  } else {
    garantirPasta(path.dirname(destino));
    fs.copyFileSync(origem, destino);
    console.log(`📋 Copiado limpo: ${path.relative(__dirname, origem)}`);
  }
}

// ==============================================
// 🚀 BUILD
// ==============================================
console.log("🔨 Iniciando build...\n");

// Limpa o dist
if (fs.existsSync(PASTA_DIST)) {
  fs.rmSync(PASTA_DIST, { recursive: true, force: true });
}
garantirPasta(PASTA_DIST);

// 1. Ofusca arquivos soltos
for (const arq of ARQUIVOS_OFUSCAR) {
  const origem = path.join(__dirname, arq);
  const destino = path.join(PASTA_DIST, arq);
  if (fs.existsSync(origem)) {
    // package.json é JSON, não ofusca (senão quebra)
    if (arq === "package.json") {
      fs.copyFileSync(origem, destino);
      console.log(`📋 Copiado: ${arq}`);
    } else {
      ofuscarArquivo(origem, destino);
    }
  }
}

// 2. Ofusca pastas
for (const pasta of PASTAS_OFUSCAR) {
  ofuscarPasta(path.join(__dirname, pasta), path.join(PASTA_DIST, pasta));
}

// 3. Copia limpo
for (const item of COPIAR_LIMPO) {
  copiarLimpo(path.join(__dirname, item), path.join(PASTA_DIST, item));
}

console.log("\n🎉 Build concluído! Arquivos prontos em:", PASTA_DIST);
