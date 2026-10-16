	const fs = require("fs");
const path = require("path");
const config = require("../config.js");
const axios = require("axios");

// Função para buscar imagem temática via Openverse (sem API key)
async function buscarImagemTematica(termo) {
  try {
    // 1. Requisição para a API do Openverse
    const r = await axios.get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(termo)}&page_size=15&aspect_ratio=wide`, {
      timeout: 10000 // 10 segundos de limite
    });

    const resultados = r.data?.results || [];
    
    // 2. Fallback: se não encontrar nada, usa uma imagem genérica
    if (resultados.length === 0) {
      return "https://picsum.photos/600/400"; 
    }

    // 3. Escolhe uma imagem aleatória do resultado
    const imagem = resultados[Math.floor(Math.random() * resultados.length)];
    return imagem.url || imagem.thumbnail;
  } catch (erro) {
    console.log("Erro ao buscar imagem temática:", erro.message);
    return "https://picsum.photos/600/400"; // Fallback em caso de erro
  }
}
// ==============================================
// 📦 ARQUIVOS
// ==============================================
const ARQ_RPG = path.join(__dirname, "..", "dados", "rpg.json");
const ARQ_MENU_RPG = path.join(__dirname, "..", "personalize_aqui", "menu_rpg.txt");

// ==============================================
// 💾 PERSISTÊNCIA
// ==============================================
function lerRPG() {
  try {
    if (!fs.existsSync(ARQ_RPG)) return { usuarios: {}, modorpg: false };
    const d = JSON.parse(fs.readFileSync(ARQ_RPG, "utf8"));
    if (!d.usuarios) d.usuarios = {};
    if (d.modorpg === undefined) d.modorpg = false;
    return d;
  } catch { return { usuarios: {}, modorpg: false }; }
}

function salvarRPG(dados) {
  try {
    fs.mkdirSync(path.dirname(ARQ_RPG), { recursive: true });
    fs.writeFileSync(ARQ_RPG, JSON.stringify(dados, null, 2));
  } catch (e) { console.log("Erro salvando RPG:", e.message); }
}

function getUsuario(dados, num) {
  if (!dados.usuarios[num]) {
    dados.usuarios[num] = {
      moedas: 0,
      xp: 0,
      nivel: 1,
      msgs: 0,
      comandos: 0,
      jid: null,
      inventario: {
        picareta: 0,
        vara_pesca: 0,
        isca: 0,
        ficha: 0,
        bilhete: 0,
        raspadinha: 0,
        escudo: 0,
        racao: 0
      },
      escudoEquipado: false,
      // 🏦 Banco
      banco: {
        bancoId: null,
        deposito: 0,
        totalRendido: 0,
        ultimoRendimento: Date.now()
      },
      // 🐾 Pet
      pets: [],
      petAtivo: null,
      familia: { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] },
      emprestimo: { ativo: false, valor: 0, pedidoEm: 0, expiraEm: 0, ultimoPedido: 0, jid: null }, // 👈 ADICIONA
      ultimoInvestir: 0,
      ultimoMinerar: 0,
      ultimoPescar: 0,
      ultimoJob: 0,
      ultimoCassino: 0,
      ultimoLoteria: 0,
      raspadinhasHoje: 0,
      ultimoDiaRaspadinha: "",
      ultimoMsgsDia: "",
      ultimoMsgsTotal: 0,
      roubos: []
    };
  }

  // Migração: garante campos novos em usuários antigos
  const u = dados.usuarios[num];
  if (!u.inventario) u.inventario = {};
  if (u.inventario.racao === undefined) u.inventario.racao = 0;
  if (!u.banco) u.banco = { bancoId: null, deposito: 0, totalRendido: 0, ultimoRendimento: Date.now() };
  if (!u.pets) u.pets = [];
  if (u.petAtivo === undefined) u.petAtivo = null;
  if (!u.familia) u.familia = { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] };
  if (!u.emprestimo) u.emprestimo = { ativo: false, valor: 0, pedidoEm: 0, expiraEm: 0, ultimoPedido: 0, jid: null }; // 👈 ADICIONA
  if (!u.familia.pedidos) u.familia.pedidos = [];
  if (!u.familia.pedidosCasar) u.familia.pedidosCasar = [];
  return u;
}
// ==============================================
// 🧮 HELPERS
// ==============================================
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatarTempo(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const p = [];
  if (h > 0) p.push(`${h}h`);
  if (m > 0) p.push(`${m}m`);
  if (seg > 0 || p.length === 0) p.push(`${seg}s`);
  return p.join(" ");
}

function cooldownRestante(ultimo, cooldownMs) {
  const passou = Date.now() - ultimo;
  if (passou >= cooldownMs) return null;
  return cooldownMs - passou;
}

function xpNecessario(nivel) {
  return Math.floor(100 * Math.pow(1.15, nivel - 1));
}

// 👇 Pega só o primeiro número do resto (evita pegar o LID do @user)
function pegarValor(resto) {
  const primeiro = (resto || "").trim().split(/\s+/)[0] || "";
  return parseInt(primeiro.replace(/[^\d]/g, "")) || 0;
}

// ==============================================
// 🎁 ITENS
// ==============================================
const MINERIOS = [
  { nome: "Pedra", valor: 5, raridade: 30 },
  { nome: "Carvão", valor: 15, raridade: 25 },
  { nome: "Ferro", valor: 30, raridade: 20 },
  { nome: "Ouro", valor: 80, raridade: 12 },
  { nome: "Diamante", valor: 200, raridade: 7 },
  { nome: "Esmeralda", valor: 350, raridade: 4 },
  { nome: "Rubi", valor: 600, raridade: 1.5 },
  { nome: "Safira", valor: 1200, raridade: 0.4 },
  { nome: "Lendário", valor: 5000, raridade: 0.1 }
];

const PEIXES = [
  { nome: "Sardinha", valor: 8, raridade: 30 },
  { nome: "Tilápia", valor: 20, raridade: 25 },
  { nome: "Bagre", valor: 40, raridade: 20 },
  { nome: "Tucunaré", valor: 90, raridade: 12 },
  { nome: "Dourado", valor: 250, raridade: 7 },
  { nome: "Pintado", valor: 450, raridade: 4 },
  { nome: "Polvo Gigante", valor: 800, raridade: 1.5 },
  { nome: "Kraken Baby", valor: 1500, raridade: 0.4 },
  { nome: "Lendário do Mar", valor: 6000, raridade: 0.1 }
];

const JOBS = [
  { nome: "Entregador", valor: [80, 150] },
  { nome: "Cozinheiro", valor: [120, 200] },
  { nome: "Programador", valor: [200, 350] },
  { nome: "Pintor", valor: [100, 180] },
  { nome: "Músico", valor: [150, 300] },
  { nome: "Piloto", valor: [250, 500] }
];

const IMAGENS_MINERAR = [
  "https://loremflickr.com/600/400/mining",
  "https://loremflickr.com/600/400/mine",
  "https://loremflickr.com/600/400/goldmine",
  "https://loremflickr.com/600/400/cave",
  "https://loremflickr.com/600/400/diamond"
];

const IMAGENS_PESCAR = [
  "https://loremflickr.com/600/400/fishing",
  "https://loremflickr.com/600/400/fish",
  "https://loremflickr.com/600/400/ocean",
  "https://loremflickr.com/600/400/sea",
  "https://loremflickr.com/600/400/lake"
];

const IMAGENS_TRABALHO = [
  "https://loremflickr.com/600/400/work",
  "https://loremflickr.com/600/400/office",
  "https://loremflickr.com/600/400/business",
  "https://loremflickr.com/600/400/professional",
  "https://loremflickr.com/600/400/career"
];
// ==============================================
// 🏦 BANCOS
// ==============================================
const BANCOS = [
{ id: "aurora", nome: "🌱 Aurora Financeira", min: 100, rende: 5 },
{ id: "imperial", nome: "🏛️ Império Bancário", min: 550, rende: 34 },
{ id: "safira", nome: "💠 Safira Capital", min: 1500, rende: 98 },
{ id: "diamante", nome: "💎 Diamante Finance", min: 3000, rende: 220 },
{ id: "tita", nome: "🔱 Titã Investimentos", min: 6000, rende: 500 },
{ id: "eclipse", nome: "💜 Eclipse Bank", min: 12000, rende: 1100 },
{ id: "supremo", nome: "👑 Supremo Capital", min: 25000, rende: 2500 },
{ id: "infinity", nome: "🖤 Infinity Bank", min: 50000, rende: 6000 }
];
// ==============================================
// 🐾 PETS
// ==============================================
const PETS = [
  { id: 1, nome: "Galinha", preco: 300, forca: 5, tipo: "terrestre" },
  { id: 2, nome: "Coelho", preco: 500, forca: 8, tipo: "terrestre" },
  { id: 3, nome: "Gato", preco: 1000, forca: 15, tipo: "terrestre" },
  { id: 4, nome: "Cachorro", preco: 2000, forca: 25, tipo: "terrestre" },
  { id: 5, nome: "Leopardo", preco: 4000, forca: 45, tipo: "terrestre" },
  { id: 6, nome: "T-Rex", preco: 8000, forca: 80, tipo: "dinossauro" },
  { id: 7, nome: "Baleia", preco: 12000, forca: 100, tipo: "aquático" },
  { id: 8, nome: "Mosasauro", preco: 20000, forca: 150, tipo: "aquático" },
  { id: 9, nome: "Dragão", preco: 40000, forca: 250, tipo: "mítico" },
  { id: 10, nome: "Hydra", preco: 70000, forca: 500, tipo: "mítico" }
];
// ==============================================
// 📄 MENU RPG
// ==============================================
function carregarMenuRPG() {
  try {
    return fs.readFileSync(ARQ_MENU_RPG, "utf8");
  } catch {
    return "❌ Arquivo personalize_aqui/menu_rpg.txt não encontrado!";
  }
}

// ==============================================
// 🎲 SORTEIO POR RARIDADE
// ==============================================
function sortearItem(lista) {
  const total = lista.reduce((s, i) => s + i.raridade, 0);
  let r = Math.random() * total;
  for (const item of lista) {
    r -= item.raridade;
    if (r <= 0) return item;
  }
  return lista[0];
}

// ==============================================
// 🏦 HELPERS DE BANCO
// ==============================================
function calcularRendimento(conta) {
  if (!conta.bancoId || !conta.deposito) return { rendimento: 0 };
  const agora = Date.now();
  const decorrido = agora - (conta.ultimoRendimento || agora);
  const horas = decorrido / 3600000;
  const banco = BANCOS.find(b => b.id === conta.bancoId);
  const porHora = banco?.rende || 0;
  const rendimento = Math.floor(porHora * horas);
  return { rendimento, horas };
}

module.exports = {
  comandos: [

// ==============================================
// 💰 EMPRÉSTIMO
// ==============================================
{
  nome: "emprestimo",
  descricao: "Pede um empréstimo de 10.000 moedas",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);
    u.jid = euJid;

    const VALOR = 10000;
    const UMA_SEMANA = 7 * 24 * 60 * 60 * 1000;
    const UM_DIA = 24 * 60 * 60 * 1000;

    if (!u.emprestimo) u.emprestimo = { ativo: false, valor: 0, pedidoEm: 0, expiraEm: 0, ultimoPedido: 0 };

    // Já tem empréstimo ativo?
    if (u.emprestimo.ativo) {
      const falta = u.emprestimo.expiraEm - Date.now();
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text:
          `⚠️ Você já tem um empréstimo ativo!\n\n` +
          `> 💰 Valor: *${u.emprestimo.valor}* moedas\n` +
          `> ⏰ Expira em: *${formatarTempo(falta)}*\n\n` +
          `> Use *!pagar* pra quitar.`
      });
    }

    // Já pediu na última semana?
    const desdeUltimo = Date.now() - (u.emprestimo.ultimoPedido || 0);
    if (desdeUltimo < UMA_SEMANA) {
      const falta = UMA_SEMANA - desdeUltimo;
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text:
          `⏰ Você só pode pedir 1 empréstimo por semana.\n\n` +
          `> ⏳ Espere: *${formatarTempo(falta)}*`
      });
    }

    // Concede
    u.moedas += VALOR;
    u.emprestimo = {
      ativo: true,
      valor: VALOR,
      pedidoEm: Date.now(),
      expiraEm: Date.now() + UM_DIA,
      ultimoPedido: Date.now(),
      jid: euJid
    };
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `💰 *EMPRÉSTIMO CONCEDIDO!*\n\n` +
        `> 👤 @${num}\n` +
        `> 💵 Valor: *${VALOR.toLocaleString("pt-BR")}* moedas\n` +
        `> ⏰ Prazo: *1 dia*\n` +
        `> 📅 Pagar até: *${new Date(u.emprestimo.expiraEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}*\n\n` +
        `> ⚠️ Pague com *!pagar* antes do prazo!\n` +
        `> 🚫 Se não pagar, vou descontar o valor do seu saldo.`,
      mentions: [euJid]
    });
  }
},

// ==============================================
// 💸 PAGAR
// ==============================================
{
  nome: "pagar",
  descricao: "Paga o empréstimo",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);
    u.jid = euJid;

    if (!u.emprestimo?.ativo) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: "📭 Você não tem empréstimo ativo.\n\n> Use *!emprestimo* pra pedir."
      });
    }

    const valor = u.emprestimo.valor;

    // Já tem o valor?
    if (u.moedas >= valor) {
      u.moedas -= valor;
      u.emprestimo.ativo = false;
      u.emprestimo.valor = 0;
      salvarRPG(dados);

      return sock.sendMessage(idChat, {
        text:
          `✅ *EMPRÉSTIMO PAGO!*\n\n` +
          `> 👤 @${num}\n` +
          `> 💵 Valor pago: *${valor.toLocaleString("pt-BR")}* moedas\n` +
          `> 💰 Saldo restante: *${u.moedas.toLocaleString("pt-BR")}*\n\n` +
          `> Obrigado pela honestidade! 🙏`,
        mentions: [euJid]
      });
    }

    // Não tem o valor todo — paga o que pode e fica devendo
    const pago = u.moedas;
    const falta = valor - pago;

    u.moedas = -falta; // fica negativo
    u.emprestimo.ativo = false;
    u.emprestimo.valor = 0;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `⚠️ *PAGAMENTO PARCIAL!*\n\n` +
        `> 👤 @${num}\n` +
        `> 💵 Valor devido: *${valor.toLocaleString("pt-BR")}*\n` +
        `> 💰 Você pagou: *${pago.toLocaleString("pt-BR")}*\n` +
        `> 🔴 Restante: *${falta.toLocaleString("pt-BR")}*\n\n` +
        `> 📉 Seu saldo ficou: *${u.moedas.toLocaleString("pt-BR")}*\n` +
        `> ⚠️ Você está com saldo *negativo* até quitar!`,
      mentions: [euJid]
    });
  }
},

// ==============================================
// 💍 CASAR
// ==============================================
{
  nome: "casar",
  descricao: "Pede alguém em casamento",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!alvoJid) return sock.sendMessage(idChat, { text: "❌ Uso: *!casar @user*" });

    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const alvoNum = normalizarNumero(alvoJid);

    if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode casar consigo mesmo." });

    const dados = lerRPG();
    const eu = getUsuario(dados, num);
    const ele = getUsuario(dados, alvoNum);

    if (!eu.familia) eu.familia = { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] };
    if (!ele.familia) ele.familia = { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] };

    eu.jid = euJid;
    ele.jid = alvoJid;

    if (eu.familia.conjuge) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ Você já é casado.` });
    }

    if (ele.familia.conjuge) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ @${alvoNum} já é casado.`, mentions: [alvoJid] });
    }

    if (!ele.familia.pedidosCasar) ele.familia.pedidosCasar = [];
    if (ele.familia.pedidosCasar.includes(num)) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `⚠️ Você já pediu @${alvoNum} em casamento.`, mentions: [alvoJid] });
    }

    ele.familia.pedidosCasar.push(num);
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `💍 *PEDIDO DE CASAMENTO!*\n\n` +
        `> @${num} pediu @${alvoNum} em casamento! 💕\n\n` +
        `> @${alvoNum}, use:\n` +
        `> ✅ *!aceitarcasar* — aceitar\n` +
        `> ❌ *!recusarcasar* — recusar`,
      mentions: [euJid, alvoJid]
    });
  }
},

// ==============================================
// ✅ ACEITARCASAR
// ==============================================
{
  nome: "aceitarcasar",
  descricao: "Aceita um pedido de casamento",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.familia?.pedidosCasar?.length) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "📭 Você não tem pedidos de casamento." });
    }

    const pretendente = u.familia.pedidosCasar.shift();
    const ele = getUsuario(dados, pretendente);
    const pretendenteJid = ele.jid || `${pretendente}@s.whatsapp.net`;

    u.familia.conjuge = pretendente;
    ele.familia.conjuge = num;

    u.jid = euJid;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `💍💕 *CASAMENTO REALIZADO!* 💕💍\n\n` +
        `> @${num} e @${pretendente} agora são casados!\n\n` +
        `> 🎉 Que sejam muito felizes!`,
      mentions: [euJid, pretendenteJid]
    });
  }
},

// ==============================================
// ❌ RECUSARCASAR
// ==============================================
{
  nome: "recusarcasar",
  descricao: "Recusa um pedido de casamento",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.familia?.pedidosCasar?.length) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "📭 Você não tem pedidos de casamento." });
    }

    const recusado = u.familia.pedidosCasar.shift();
    const ele = getUsuario(dados, recusado);
    const recusadoJid = ele.jid || `${recusado}@s.whatsapp.net`;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `💔 Você recusou o pedido de @${recusado}.`,
      mentions: [recusadoJid]
    });
  }
},

// ==============================================
// 💔 DIVORCIAR
// ==============================================
{
  nome: "divorciar",
  descricao: "Divorcia do cônjuge",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.familia?.conjuge) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Você não é casado." });
    }

    const ex = u.familia.conjuge;
    const ele = getUsuario(dados, ex);
    const exJid = ele.jid || `${ex}@s.whatsapp.net`;

    u.familia.conjuge = null;
    if (ele.familia) ele.familia.conjuge = null;

    u.jid = euJid;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `💔 *DIVÓRCIO*\n\n> @${num} e @${ex} se divorciaram.`,
      mentions: [euJid, exJid]
    });
  }
},

// ==============================================
// 👨‍👩‍👧 ADOTAR
// ==============================================
{
  nome: "adotar",
  descricao: "Adota um usuário (só se for casado)",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!alvoJid) return sock.sendMessage(idChat, { text: "❌ Uso: *!adotar @user*" });

    const euJid = msg.key.participant || msg.key.remoteJid;
    const paiNum = normalizarNumero(euJid);
    const filhoNum = normalizarNumero(alvoJid);

    if (paiNum === filhoNum) return sock.sendMessage(idChat, { text: "❌ Não pode se adotar." });

    const dados = lerRPG();
    const pai = getUsuario(dados, paiNum);
    const filho = getUsuario(dados, filhoNum);

    if (!pai.familia) pai.familia = { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] };
    if (!filho.familia) filho.familia = { pais: [], filhos: [], conjuge: null, pedidos: [], pedidosCasar: [] };

    pai.jid = euJid;
    filho.jid = alvoJid;

    if (!pai.familia.conjuge) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: "❌ Você precisa ser *casado* pra adotar.\n\n> Use *!casar @user* primeiro."
      });
    }

    if (pai.familia.filhos.length >= 10) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Você já tem 10 filhos." });
    }

    if (filho.familia.pais.length >= 2) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ @${filhoNum} já tem 2 pais.`, mentions: [alvoJid] });
    }

    if (pai.familia.filhos.includes(filhoNum)) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `⚠️ @${filhoNum} já é seu filho.`, mentions: [alvoJid] });
    }

    if (!filho.familia.pedidos) filho.familia.pedidos = [];
    filho.familia.pedidos.push(paiNum);
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `👨‍👩‍👧 *PEDIDO DE ADOÇÃO*\n\n` +
        `> @${paiNum} quer adotar @${filhoNum}!\n\n` +
        `> @${filhoNum}, use:\n` +
        `> ✅ *!aceitaradocao* — aceitar\n` +
        `> ❌ *!recusaradocao* — recusar`,
      mentions: [euJid, alvoJid]
    });
  }
},

// ==============================================
// ✅ ACEITARADOCAO
// ==============================================
{
  nome: "aceitaradocao",
  descricao: "Aceita um pedido de adoção",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.familia?.pedidos?.length) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "📭 Você não tem pedidos de adoção." });
    }

    const paiNum = u.familia.pedidos.shift();
    const pai = getUsuario(dados, paiNum);
    const paiJid = pai.jid || `${paiNum}@s.whatsapp.net`;

    if (!pai.familia) pai.familia = { pais: [], filhos: [], conjuge: null };
    if (!pai.familia.filhos.includes(num)) pai.familia.filhos.push(num);
    if (!u.familia.pais.includes(paiNum)) u.familia.pais.push(paiNum);

    const conjuge = pai.familia.conjuge;
    let conjugeJid = null;
    if (conjuge) {
      const conj = getUsuario(dados, conjuge);
      conjugeJid = conj.jid || `${conjuge}@s.whatsapp.net`;
      if (!conj.familia) conj.familia = { pais: [], filhos: [], conjuge: null };
      if (!conj.familia.filhos.includes(num)) conj.familia.filhos.push(num);
      if (!u.familia.pais.includes(conjuge)) u.familia.pais.push(conjuge);
    }

    u.jid = euJid;
    salvarRPG(dados);

    const mencoes = [euJid, paiJid];
    if (conjugeJid) mencoes.push(conjugeJid);

    await sock.sendMessage(idChat, {
      text:
        `✅ *ADOÇÃO ACEITA!*\n\n` +
        `> 🎉 @${num} agora é filho de @${paiNum}` +
        (conjuge ? ` e @${conjuge}` : "") + `!`,
      mentions: mencoes
    });
  }
},

// ==============================================
// ❌ RECUSARADOCAO
// ==============================================
{
  nome: "recusaradocao",
  descricao: "Recusa um pedido de adoção",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.familia?.pedidos?.length) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "📭 Você não tem pedidos de adoção." });
    }

    const recusadoNum = u.familia.pedidos.shift();
    const recusado = getUsuario(dados, recusadoNum);
    const recusadoJid = recusado.jid || `${recusadoNum}@s.whatsapp.net`;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `❌ Você recusou a adoção de @${recusadoNum}.`,
      mentions: [recusadoJid]
    });
  }
},

// ==============================================
// 👋 EXPULSARFILHO
// ==============================================
{
  nome: "expulsarfilho",
  descricao: "Expulsa um filho",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const filhoJid = ctx?.mentionedJid?.[0];
    if (!filhoJid) return sock.sendMessage(idChat, { text: "❌ Uso: *!expulsarfilho @user*" });

    const euJid = msg.key.participant || msg.key.remoteJid;
    const paiNum = normalizarNumero(euJid);
    const filhoNum = normalizarNumero(filhoJid);

    const dados = lerRPG();
    const pai = getUsuario(dados, paiNum);
    const filho = getUsuario(dados, filhoNum);

    if (!pai.familia?.filhos?.includes(filhoNum)) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ @${filhoNum} não é seu filho.`, mentions: [filhoJid] });
    }

    pai.familia.filhos = pai.familia.filhos.filter(f => f !== filhoNum);
    if (filho.familia?.pais) filho.familia.pais = filho.familia.pais.filter(p => p !== paiNum);

    pai.jid = euJid;
    filho.jid = filhoJid;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `👋 @${filhoNum} foi expulso da família de @${paiNum}.`,
      mentions: [euJid, filhoJid]
    });
  }
},

// ==============================================
// 👶 MEUSFILHOS
// ==============================================
{
  nome: "meusfilhos",
  descricao: "Mostra seus filhos",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);
    u.jid = euJid;
    salvarRPG(dados);

    const filhos = u.familia?.filhos || [];

    if (!filhos.length) {
      return sock.sendMessage(idChat, { text: "👨‍👩‍👧 Você ainda não tem filhos." });
    }

    const mentions = [];
    const linhas = filhos.map((f, i) => {
      const filho = getUsuario(dados, f);
      const jid = filho.jid || `${f}@s.whatsapp.net`;
      mentions.push(jid);
      return `┃ ${i + 1}. @${f}`;
    }).join("\n");

    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `👨‍👩‍👧 *SEUS FILHOS*\n\n> Total: *${filhos.length}*\n\n${linhas}`,
      mentions
    });
  }
},

// ==============================================
// 🏠 MINHAFAMILIA
// ==============================================
{
  nome: "minhafamilia",
  descricao: "Mostra sua família",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);
    u.jid = euJid;
    salvarRPG(dados);

    const pais = u.familia?.pais || [];
    const filhos = u.familia?.filhos || [];

    const mentions = [euJid];
    let txt = `👨‍👩‍👧 *SUA FAMÍLIA*\n\n> 👤 Você: @${num}\n\n`;

    if (pais.length) {
      txt += `> 👨 *PAIS:*\n`;
      pais.forEach(p => {
        const pai = getUsuario(dados, p);
        const jid = pai.jid || `${p}@s.whatsapp.net`;
        mentions.push(jid);
        txt += `> ┃ @${p}\n`;
      });
      txt += `\n`;
    }

    if (filhos.length) {
      txt += `> 👶 *FILHOS:*\n`;
      filhos.forEach(f => {
        const filho = getUsuario(dados, f);
        const jid = filho.jid || `${f}@s.whatsapp.net`;
        mentions.push(jid);
        txt += `> ┃ @${f}\n`;
      });
      txt += `\n`;
    }

    if (!pais.length && !filhos.length) {
      txt += `> _Você não tem família ainda._\n`;
    }

    salvarRPG(dados);
    await sock.sendMessage(idChat, { text: txt, mentions });
  }
},

// ==============================================
// 🌳 ARVOREGENEALOGICA
// ==============================================
{
  nome: "arvoregenealogica",
  descricao: "Mostra sua árvore genealógica",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);
    u.jid = euJid;

    const mentions = [euJid];
    let txt = `🌳 *ÁRVORE GENEALÓGICA*\n\n`;

    const pais = u.familia?.pais || [];
    if (pais.length) {
      txt += `> 👨 *PAIS:*\n`;
      pais.forEach(p => {
        const pai = getUsuario(dados, p);
        const jid = pai.jid || `${p}@s.whatsapp.net`;
        mentions.push(jid);
        txt += `> ┃ @${p}\n`;

        const avos = pai.familia?.pais || [];
        avos.forEach(av => {
          const avo = getUsuario(dados, av);
          const avJid = avo.jid || `${av}@s.whatsapp.net`;
          mentions.push(avJid);
          txt += `> ┃   └ 🧓 @${av}\n`;
        });
      });
      txt += `\n`;
    }

    txt += `> 👤 *VOCÊ:* @${num}\n\n`;

    const filhos = u.familia?.filhos || [];
    if (filhos.length) {
      txt += `> 👶 *FILHOS:*\n`;
      filhos.forEach(f => {
        const filho = getUsuario(dados, f);
        const jid = filho.jid || `${f}@s.whatsapp.net`;
        mentions.push(jid);
        txt += `> ┃ @${f}\n`;

        const netos = filho.familia?.filhos || [];
        netos.forEach(n => {
          const neto = getUsuario(dados, n);
          const nJid = neto.jid || `${n}@s.whatsapp.net`;
          mentions.push(nJid);
          txt += `> ┃   └ 👶 @${n}\n`;
        });
      });
    }

    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: txt,
      mentions: [...new Set(mentions)]
    });
  }
},

// ==============================================
// 💵 MESADA
// ==============================================
{
  nome: "mesada",
  descricao: "Manda mesada pra um filho",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0];
    if (!alvoJid) return sock.sendMessage(idChat, { text: "❌ Uso: *!mesada @user <valor>*" });

    const valorStr = (resto || "").trim().split(/\s+/).find(p => /^\d+$/.test(p));
    const valor = parseInt(valorStr);
    if (!valor || valor < 1) return sock.sendMessage(idChat, { text: "❌ Valor inválido." });

    const euJid = msg.key.participant || msg.key.remoteJid;
    const paiNum = normalizarNumero(euJid);
    const filhoNum = normalizarNumero(alvoJid);

    const dados = lerRPG();
    const pai = getUsuario(dados, paiNum);
    const filho = getUsuario(dados, filhoNum);

    if (!pai.familia?.filhos?.includes(filhoNum)) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ @${filhoNum} não é seu filho.`, mentions: [alvoJid] });
    }

    if (pai.moedas < valor) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ Você só tem *${pai.moedas}* moedas.` });
    }

    pai.moedas -= valor;
    filho.moedas += valor;

    pai.jid = euJid;
    filho.jid = alvoJid;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `💵 *MESADA ENVIADA!*\n\n` +
        `> 📤 De: @${paiNum}\n` +
        `> 📥 Para: @${filhoNum}\n` +
        `> 💰 Valor: *${valor}* moedas`,
      mentions: [euJid, alvoJid]
    });
  }
},

// ==============================================
// 🎁 PRESENTEAR
// ==============================================
{
  nome: "presentear",
  descricao: "Presenteia alguém com um item da mochila",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0];
    if (!alvoJid) return sock.sendMessage(idChat, { text: "❌ Uso: *!presentear @user <item> <qtd>*" });

    const partes = (resto || "").trim().toLowerCase().split(/\s+/).filter(p => p && !p.startsWith("@"));
    const item = partes[0];
    const qtd = parseInt(partes[1]) || 1;

    if (!item) return sock.sendMessage(idChat, {
      text:
        `❌ Uso: *!presentear @user <item> <qtd>*\n\n` +
        `> Ex: *!presentear @user isca 5*\n` +
        `> Veja seus itens com *!mochila*`
    });

    const euJid = msg.key.participant || msg.key.remoteJid;
    const num = normalizarNumero(euJid);
    const alvoNum = normalizarNumero(alvoJid);

    if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode presentear a si mesmo." });

    const dados = lerRPG();
    const u = getUsuario(dados, num);
    const v = getUsuario(dados, alvoNum);

    if ((u.inventario[item] || 0) < qtd) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: `❌ Você não tem *${qtd}x ${item}*. Você tem *${u.inventario[item] || 0}*.`
      });
    }

    u.inventario[item] -= qtd;
    v.inventario[item] = (v.inventario[item] || 0) + qtd;

    u.jid = euJid;
    v.jid = alvoJid;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `🎁 *PRESENTE ENVIADO!*\n\n` +
        `> 📤 De: @${num}\n` +
        `> 📥 Para: @${alvoNum}\n` +
        `> 🎁 Item: *${qtd}x ${item}*`,
      mentions: [euJid, alvoJid]
    });
  }
},
// PRESENTEAR
{
  nome: "presentear",
  descricao: "Presenteia alguém com um item da mochila",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvo = ctx?.mentionedJid?.[0];
    if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!presentear @user <item> <qtd>*" });

    const partes = (resto || "").trim().toLowerCase().split(/\s+/).filter(p => p && !p.startsWith("@"));
    const item = partes[0];
    const qtd = parseInt(partes[1]) || 1;

    if (!item) return sock.sendMessage(idChat, {
      text:
        `❌ Uso: *!presentear @user <item> <qtd>*\n\n` +
        `> Ex: *!presentear @user isca 5*\n` +
        `> Veja seus itens com *!mochila*`
    });

    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const alvoNum = normalizarNumero(alvo);

    if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode presentear a si mesmo." });

    const dados = lerRPG();
    const u = getUsuario(dados, num);
    const v = getUsuario(dados, alvoNum);

    if ((u.inventario[item] || 0) < qtd) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: `❌ Você não tem *${qtd}x ${item}*. Você tem *${u.inventario[item] || 0}*.`
      });
    }

    u.inventario[item] -= qtd;
    v.inventario[item] = (v.inventario[item] || 0) + qtd;
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `🎁 *PRESENTE ENVIADO!*\n\n` +
        `> 📤 De: @${num}\n` +
        `> 📥 Para: @${alvoNum}\n` +
        `> 🎁 Item: *${qtd}x ${item}*`,
      mentions: [msg.key.participant || msg.key.remoteJid, alvo]
    });
  }
},
    // ==============================================
    // 📋 MENU RPG
    // ==============================================
    {
      nome: "menurpg",
      descricao: "Mostra o menu RPG",
      async executar({ sock, idChat, msg, PREFIXO, NOME_BOT, DONO_PRINCIPAL_NOME }) {
        const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

        let texto = carregarMenuRPG()
          .replace(/{PREFIXO}/g, PREFIXO || "!")
          .replace(/{BOT}/g, NOME_BOT || "Bot")
          .replace(/{DONO}/g, DONO_PRINCIPAL_NOME || "Dono")
          .replace(/{DATA}/g, data);

        const caminhoMeta = path.join(__dirname, "..", "dados", "menu_midia_menurpg.json");
        let midia = null;
        try {
          if (fs.existsSync(caminhoMeta)) {
            const meta = JSON.parse(fs.readFileSync(caminhoMeta, "utf8"));
            if (meta && typeof meta.arquivo === "string") {
              const caminhoArq = path.join(__dirname, "..", "dados", meta.arquivo);
              if (fs.existsSync(caminhoArq)) {
                midia = { meta, buffer: fs.readFileSync(caminhoArq) };
              }
            }
          }
        } catch {}

        const remetente = msg.key.participant || msg.key.remoteJid;

        if (midia?.meta?.tipo === "image") {
          await sock.sendMessage(idChat, { image: midia.buffer, caption: texto, mentions: [remetente] });
        } else if (midia?.meta?.tipo === "video") {
          await sock.sendMessage(idChat, { video: midia.buffer, caption: texto, mentions: [remetente], gifPlayback: true });
        } else {
          await sock.sendMessage(idChat, { text: texto, mentions: [remetente] });
        }
      }
    },

// ==============================================
// 🏦 BANCO (depositar)
// ==============================================
{
  nome: "banco",
  descricao: "Deposita no banco",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    // Sem argumento → lista
if (!resto) {
  let txt = `╭━━━〔 🏦 *BANCOS DISPONÍVEIS* 〕━━━╮\n┃\n`;
  for (const b of BANCOS) {
    txt += `┃ ${b.nome}\n`;
    txt += `┃   🆔 ID: *${b.id}*\n`;
    txt += `┃   💰 Depósito mín: *${b.min.toLocaleString("pt-BR")}*\n`;
    txt += `┃   📈 Rende: *+${b.rende}*/hora\n┃\n`;
  }
  txt += `╰━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  txt += `> Use: *!banco <id> <valor>*\n`;
  txt += `> Ex: *!banco aurora 300*`;
  salvarRPG(dados);
  return sock.sendMessage(idChat, { text: txt });
}
    const partes = (resto || "").trim().toLowerCase().split(/\s+/);
    const bancoId = partes[0];
    const valor = parseInt((partes[1] || "").replace(/[^\d]/g, ""));

    const banco = BANCOS.find(b => b.id === bancoId);
    if (!banco) return sock.sendMessage(idChat, { text: "❌ Banco inválido. Use *!banco* pra ver." });

    if (!valor || valor < banco.min) {
      return sock.sendMessage(idChat, {
        text: `❌ Depósito mínimo no *${banco.nome}*: *${banco.min.toLocaleString("pt-BR")}* moedas.`
      });
    }

    if (u.moedas < valor) {
      return sock.sendMessage(idChat, { text: `❌ Você só tem *${u.moedas.toLocaleString("pt-BR")}* moedas.` });
    }

    // Se já tem banco ativo e tá depositando em outro → bloqueia
    if (u.banco.bancoId && u.banco.bancoId !== banco.id && u.banco.deposito > 0) {
      const bancoAtual = BANCOS.find(b => b.id === u.banco.bancoId);
      return sock.sendMessage(idChat, {
        text: `❌ Você já tem conta no *${bancoAtual?.nome}*. Saque tudo antes de mudar.`
      });
    }

    // Credita rendimento anterior
    if (u.banco.deposito > 0) {
      const { rendimento } = calcularRendimento(u.banco);
      u.banco.deposito += rendimento;
      u.banco.totalRendido += rendimento;
    }

    // Debita do saldo e deposita
    u.moedas -= valor;
    u.banco.bancoId = banco.id;
    u.banco.deposito += valor;
    u.banco.ultimoRendimento = Date.now();
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `✅ *DEPÓSITO REALIZADO!*\n\n` +
        `> 🏦 Banco: *${banco.nome}*\n` +
        `> 💰 Depositou: *${valor.toLocaleString("pt-BR")}*\n` +
        `> 📊 Total no banco: *${u.banco.deposito.toLocaleString("pt-BR")}*\n` +
        `> 📈 Rende: *+${banco.rende}*/hora`
    });
  }
},

// ==============================================
// 🏦 SALDOBANCO
// ==============================================
{
  nome: "saldobanco",
  descricao: "Mostra saldo do banco",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.banco.bancoId) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Você não tem conta em banco. Use *!banco*." });
    }

    const { rendimento } = calcularRendimento(u.banco);
    const totalAtual = u.banco.deposito + rendimento;
    const banco = BANCOS.find(b => b.id === u.banco.bancoId);

    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `╭━━━〔 🏦 *CONTA BANCÁRIA* 〕━━━╮\n┃\n` +
        `┃ 👤 @${num}\n` +
        `┃ 🏦 Banco: *${banco?.nome || "?"}*\n` +
        `┃ 💰 Depósito: *${u.banco.deposito.toLocaleString("pt-BR")}*\n` +
        `┃ ✨ Rendendo: *+${rendimento.toLocaleString("pt-BR")}*\n` +
        `┃ 💵 Total: *${totalAtual.toLocaleString("pt-BR")}*\n` +
        `┃ 📊 Já rendeu: *${u.banco.totalRendido.toLocaleString("pt-BR")}*\n┃\n` +
        `┃ 📈 Rende: *+${banco?.rende || 0}*/hora\n┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`,
      mentions: [msg.key.participant || msg.key.remoteJid]
    });
  }
},

// ==============================================
// 💸 SACAR
// ==============================================
{
  nome: "sacar",
  descricao: "Saca do banco",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.banco.bancoId) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Você não tem conta em banco." });
    }

    const { rendimento } = calcularRendimento(u.banco);
    const totalAtual = u.banco.deposito + rendimento;

    const valorStr = (resto || "").trim().split(/\s+/)[0] || "";
    const valor = valorStr ? parseInt(valorStr.replace(/[^\d]/g, "")) : totalAtual;

    if (!valor || valor <= 0) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Valor inválido." });
    }

    if (valor > totalAtual) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: `❌ Você só tem *${totalAtual.toLocaleString("pt-BR")}* no banco.`
      });
    }

    u.moedas += valor;
    u.banco.totalRendido += rendimento;
    u.banco.deposito = totalAtual - valor;
    u.banco.ultimoRendimento = Date.now();

    if (u.banco.deposito <= 0) {
      u.banco.bancoId = null;
      u.banco.deposito = 0;
    }

    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `💸 *SAQUE REALIZADO!*\n\n` +
        `> 💰 Sacou: *${valor.toLocaleString("pt-BR")}*\n` +
        `> 🏦 Restante: *${u.banco.deposito.toLocaleString("pt-BR")}*\n` +
        `> 💵 Carteira: *${u.moedas.toLocaleString("pt-BR")}*`
    });
  }
},

// ==============================================
// 🛒 PETSHOP
// ==============================================
{
  nome: "petshop",
  descricao: "Mostra os pets disponíveis",
  async executar({ sock, idChat }) {
    let txt = `╭━━━〔 🐾 *PETSHOP* 〕━━━╮\n┃\n`;
    for (const p of PETS) {
      txt += `┃ 🆔 *${p.id}* — ${p.nome}\n`;
      txt += `┃    💰 ${p.preco.toLocaleString("pt-BR")} | ⚔️ ${p.forca} | 🌍 ${p.tipo}\n┃\n`;
    }
    txt += `╰━━━━━━━━━━━━━━━━━╯\n\n> Use: *!buypet <id>*`;
    await sock.sendMessage(idChat, { text: txt });
  }
},

// ==============================================
// 🛍️ BUYPET
// ==============================================
{
  nome: "buypet",
  descricao: "Compra um pet",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const id = parseInt((resto || "").trim());
    if (!id) return sock.sendMessage(idChat, { text: "❌ Uso: *!buypet <id>* (veja *!petshop*)" });

    const pet = PETS.find(p => p.id === id);
    if (!pet) return sock.sendMessage(idChat, { text: "❌ Pet não encontrado." });

    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (u.petAtivo) {
      return sock.sendMessage(idChat, {
        text: `❌ Você já tem *${u.petAtivo.nome}* ativo.\n\n> Use *!soltarpet* antes.`
      });
    }

    if (u.moedas < pet.preco) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: `❌ Você precisa de *${pet.preco.toLocaleString("pt-BR")}* moedas.`
      });
    }

    u.moedas -= pet.preco;
    const novo = {
      id: pet.id,
      nome: pet.nome,
      apelido: pet.nome,
      nivel: 1,
      xp: 0,
      forca: pet.forca,
      tipo: pet.tipo,
      fome: 100
    };
    u.petAtivo = novo;
    u.pets.push(novo);
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `🎉 *PET ADQUIRIDO!*\n\n> 🐾 ${pet.nome}\n> ⚔️ Força: *${pet.forca}*\n> 🌍 Tipo: *${pet.tipo}*`
    });
  }
},

// ==============================================
// 🐾 EQUIPARPET
// ==============================================
{
  nome: "equiparpet",
  descricao: "Equipa um pet",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const nome = (resto || "").trim().toLowerCase();
    if (!nome) return sock.sendMessage(idChat, { text: "❌ Uso: *!equiparpet <nome>*" });

    const dados = lerRPG();
    const u = getUsuario(dados, num);
    if (!u.pets?.length) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pets." }); }

    const pet = u.pets.find(p => p.nome.toLowerCase() === nome);
    if (!pet) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem esse pet." }); }

    u.petAtivo = pet;
    salvarRPG(dados);

    await sock.sendMessage(idChat, { text: `✅ *${pet.nome}* é seu pet ativo!` });
  }
},

// ==============================================
// ✏️ NOMEARPET
// ==============================================
{
  nome: "nomearpet",
  descricao: "Renomeia o pet",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const nome = (resto || "").trim();
    if (!nome) return sock.sendMessage(idChat, { text: "❌ Uso: *!nomearpet <nome>*" });

    const dados = lerRPG();
    const u = getUsuario(dados, num);
    if (!u.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }

    u.petAtivo.apelido = nome;
    salvarRPG(dados);

    await sock.sendMessage(idChat, { text: `✅ Pet renomeado para *${nome}*!` });
  }
},

// ==============================================
// 👋 SOLTARPET
// ==============================================
{
  nome: "soltarpet",
  descricao: "Solta o pet atual",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }

    const nome = u.petAtivo.nome;
    u.pets = u.pets.filter(p => p.nome !== nome || p.apelido !== u.petAtivo.apelido);
    u.petAtivo = null;
    salvarRPG(dados);

    await sock.sendMessage(idChat, { text: `👋 Você soltou *${nome}* na natureza.` });
  }
},

// ==============================================
// 📊 STATUSPET
// ==============================================
{
  nome: "statuspet",
  descricao: "Mostra status do pet",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }

    const pet = u.petAtivo;
    const xpProx = Math.floor(50 * Math.pow(1.2, pet.nivel - 1));
    const barra = "█".repeat(Math.floor(pet.fome / 10)) + "░".repeat(10 - Math.floor(pet.fome / 10));
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `╭━━━〔 🐾 *STATUS DO PET* 〕━━━╮\n┃\n` +
        `┃ 🏷️ Nome: *${pet.apelido || pet.nome}*\n` +
        `┃ 🐾 Espécie: *${pet.nome}*\n` +
        `┃ 🌍 Tipo: *${pet.tipo}*\n` +
        `┃ 🎯 Nível: *${pet.nivel}*\n` +
        `┃ ✨ XP: *${pet.xp}* / ${xpProx}\n` +
        `┃ ⚔️ Força: *${pet.forca}*\n` +
        `┃ 🍖 Fome: [${barra}] ${pet.fome}%\n┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`,
      mentions: [msg.key.participant || msg.key.remoteJid]
    });
  }
},

// ==============================================
// 🍖 ALIMENTARPET
// ==============================================
{
  nome: "alimentarpet",
  descricao: "Alimenta o pet",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }
    if (u.petAtivo.fome >= 100) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "🍖 Seu pet já tá cheio!" }); }

    if ((u.inventario.racao || 0) <= 0) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: "❌ Você não tem *ração*. Compre com *!comprar racao 5*." });
    }

    u.inventario.racao -= 1;
    u.petAtivo.fome = Math.min(100, u.petAtivo.fome + 20);
    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text: `🍖 *${u.petAtivo.apelido || u.petAtivo.nome}* comeu! Fome: *${u.petAtivo.fome}%*`
    });
  }
},

// ==============================================
// 💪 TREINARPET
// ==============================================
{
  nome: "treinarpet",
  descricao: "Treina o pet",
  async executar({ sock, idChat, msg, resto, normalizarNumero }) {
    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const dados = lerRPG();
    const u = getUsuario(dados, num);

    if (!u.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }

    if (!resto) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text:
          `🏋️ *EXERCÍCIOS*\n\n` +
          `> *1.* Corrida — 50 moedas | +2 Força | -15 Fome\n` +
          `> *2.* Natação — 100 moedas | +5 Força | -25 Fome\n` +
          `> *3.* Combate — 200 moedas | +12 Força | -40 Fome\n\n` +
          `> Use: *!treinarpet 1*`
      });
    }

    const op = parseInt(resto);
    const treinos = {
      1: { nome: "Corrida", custo: 50, forca: 2, fome: 15 },
      2: { nome: "Natação", custo: 100, forca: 5, fome: 25 },
      3: { nome: "Combate", custo: 200, forca: 12, fome: 40 }
    };

    const treino = treinos[op];
    if (!treino) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Exercício inválido." }); }

    if (u.petAtivo.fome < treino.fome) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, {
        text: `🍖 Seu pet tá com fome (${u.petAtivo.fome}%). Alimente ele antes.`
      });
    }

    if (u.moedas < treino.custo) {
      salvarRPG(dados);
      return sock.sendMessage(idChat, { text: `❌ Você precisa de *${treino.custo}* moedas.` });
    }

    u.moedas -= treino.custo;
    u.petAtivo.forca += treino.forca;
    u.petAtivo.fome = Math.max(0, u.petAtivo.fome - treino.fome);
    u.petAtivo.xp += 20;

    let xpProx = Math.floor(50 * Math.pow(1.2, u.petAtivo.nivel - 1));
    let subiu = false;
    while (u.petAtivo.xp >= xpProx) {
      u.petAtivo.xp -= xpProx;
      u.petAtivo.nivel++;
      u.petAtivo.forca += 5;
      xpProx = Math.floor(50 * Math.pow(1.2, u.petAtivo.nivel - 1));
      subiu = true;
    }

    salvarRPG(dados);

    await sock.sendMessage(idChat, {
      text:
        `🏋️ *TREINO: ${treino.nome}*\n\n` +
        `> ⚔️ +${treino.forca} Força\n` +
        `> 🍖 -${treino.fome} Fome\n` +
        `> ✨ +20 XP` +
        (subiu ? `\n\n> 🎉 *Subiu pro nível ${u.petAtivo.nivel}!*` : "")
    });
  }
},

// ==============================================
// ⚔️ BATALHARPET
// ==============================================
{
  nome: "batalharpet",
  descricao: "Batalha pet vs pet",
  async executar({ sock, idChat, msg, normalizarNumero }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvo = ctx?.mentionedJid?.[0];
    if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!batalharpet @user*" });

    const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
    const alvoNum = normalizarNumero(alvo);
    if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode batalhar consigo." });

    const dados = lerRPG();
    const eu = getUsuario(dados, num);
    const oponente = getUsuario(dados, alvoNum);

    if (!eu.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "❌ Você não tem pet ativo." }); }
    if (!oponente.petAtivo) { salvarRPG(dados); return sock.sendMessage(idChat, { text: `❌ @${alvoNum} não tem pet ativo.`, mentions: [alvo] }); }

    if (eu.petAtivo.fome < 20) { salvarRPG(dados); return sock.sendMessage(idChat, { text: "🍖 Seu pet tá com fome demais." }); }
    if (oponente.petAtivo.fome < 20) { salvarRPG(dados); return sock.sendMessage(idChat, { text: `🍖 O pet de @${alvoNum} tá com fome.`, mentions: [alvo] }); }

    const poder1 = eu.petAtivo.forca + rand(1, 20);
    const poder2 = oponente.petAtivo.forca + rand(1, 20);

    const ganhador = poder1 > poder2 ? "eu" : "ele";

    if (ganhador === "eu") {
      const premio = rand(50, 200);
      eu.moedas += premio;
      eu.petAtivo.forca += 3;
      eu.petAtivo.fome = Math.max(0, eu.petAtivo.fome - 10);
      oponente.petAtivo.fome = Math.max(0, oponente.petAtivo.fome - 5);
      salvarRPG(dados);

      await sock.sendMessage(idChat, {
        text:
          `⚔️ *BATALHA DE PETS!*\n\n` +
          `> 🐾 *${eu.petAtivo.apelido || eu.petAtivo.nome}* — Poder: ${poder1}\n` +
          `> 🐾 *${oponente.petAtivo.apelido || oponente.petAtivo.nome}* (@${alvoNum}) — Poder: ${poder2}\n\n` +
          `> 🏆 *VENCEDOR: ${eu.petAtivo.apelido || eu.petAtivo.nome}!*\n` +
          `> 💰 +${premio} moedas\n` +
          `> ⚔️ +3 Força`,
        mentions: [alvo]
      });
    } else {
      const premio = rand(50, 200);
      oponente.moedas += premio;
      oponente.petAtivo.forca += 3;
      oponente.petAtivo.fome = Math.max(0, oponente.petAtivo.fome - 10);
      eu.petAtivo.fome = Math.max(0, eu.petAtivo.fome - 5);
      salvarRPG(dados);

      await sock.sendMessage(idChat, {
        text:
          `⚔️ *BATALHA DE PETS!*\n\n` +
          `> 🐾 *${eu.petAtivo.apelido || eu.petAtivo.nome}* — Poder: ${poder1}\n` +
          `> 🐾 *${oponente.petAtivo.apelido || oponente.petAtivo.nome}* (@${alvoNum}) — Poder: ${poder2}\n\n` +
          `> 🏆 *VENCEDOR: ${oponente.petAtivo.apelido || oponente.petAtivo.nome}!*\n` +
          `> 💰 +${premio} moedas pra @${alvoNum}\n` +
          `> ⚔️ +3 Força`,
        mentions: [alvo]
      });
    }
  }
},
    // ==============================================
    // 💰 SALDO
    // ==============================================
    {
      nome: "saldo",
      descricao: "Mostra suas moedas",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);
        salvarRPG(dados);

        const xpProx = xpNecessario(u.nivel);
        const xpFalta = Math.max(0, xpProx - u.xp);

        await sock.sendMessage(idChat, {
          text:
            `╭━〔 💰 *SALDO* 〕━╮\n` +
            `┃\n` +
            `┃ 👤 @${num}\n` +
            `┃ 💰 Moedas: *${u.moedas}*\n` +
            `┃ 🎯 Nível: *${u.nivel}*\n` +
            `┃ ✨ XP: *${u.xp}* / ${xpProx} (faltam ${xpFalta})\n` +
            `┃ 💬 Msgs: *${u.msgs}*\n` +
            `┃ ⚙️ Comandos: *${u.comandos}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━╯`,
          mentions: [msg.key.participant || msg.key.remoteJid]
        });
      }
    },

    // ==============================================
    // 📈 INVESTIR
    // ==============================================
    {
      nome: "investir",
      descricao: "Investe uma quantia",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const valor = pegarValor(resto);

        if (!valor || valor < 50) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!investir <valor>* (mín 50)" });
        }

        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (u.moedas < valor) {
          return sock.sendMessage(idChat, { text: `❌ Você só tem *${u.moedas}* moedas.` });
        }

        const cd = cooldownRestante(u.ultimoInvestir, 60 * 60 * 1000);
        if (cd) {
          return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}*.` });
        }

        const chance = Math.random();
        let variacao;
        if (chance < 0.4) variacao = rand(-50, 0) / 100;
        else if (chance < 0.75) variacao = rand(0, 40) / 100;
        else variacao = rand(40, 80) / 100;

        const lucro = Math.floor(valor * variacao);
        const resultado = valor + lucro;

        u.moedas -= valor;
        u.moedas += resultado;
        u.ultimoInvestir = Date.now();
        u.comandos++;
        salvarRPG(dados);

        const emoji = lucro >= 0 ? "📈" : "📉";
        const sinal = lucro >= 0 ? "+" : "";

        await sock.sendMessage(idChat, {
          text:
            `${emoji} *INVESTIMENTO*\n\n` +
            `> 💰 Investiu: *${valor}*\n` +
            `> 📊 Resultado: *${sinal}${lucro}*\n` +
            `> 💵 Recebeu: *${resultado}*\n` +
            `> 🏦 Saldo final: *${u.moedas}*`
        });
      }
    },

    // ==============================================
    // 🥷 ROUBAR
    // ==============================================
    {
      nome: "roubar",
      descricao: "Tenta roubar alguém",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const alvo = ctx?.mentionedJid?.[0] || ctx?.participant;

        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque alguém: *!roubar @user*" });

        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const alvoNum = normalizarNumero(alvo);

        if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode se roubar." });

        const dados = lerRPG();
        const u = getUsuario(dados, num);
        const v = getUsuario(dados, alvoNum);

        const roubos = (u.roubos || []).filter(r => Date.now() - r < 5 * 3600 * 1000);
        if (roubos.length >= 5) {
          return sock.sendMessage(idChat, { text: "⏰ Você já roubou 5 pessoas nas últimas 5 horas." });
        }

        const escudoAtivo = v.escudoEquipado;
        const chanceFalha = escudoAtivo ? 0.75 : 0.6;

        if (Math.random() < chanceFalha) {
          const perda = Math.floor(u.moedas * 0.1);
          u.moedas -= perda;
          u.roubos = u.roubos || [];
          u.roubos.push(Date.now());
          salvarRPG(dados);
          return sock.sendMessage(idChat, {
            text:
              `🚨 *VOCÊ FOI PEGO!*\n\n` +
              `> Tentou roubar @${alvoNum} mas falhou.\n` +
              `> 💸 Perdeu *${perda}* moedas.` +
              (escudoAtivo ? `\n> 🛡️ Vítima tinha escudo!` : ""),
            mentions: [alvo]
          });
        }

        const roubado = Math.min(v.moedas, rand(50, 500));
        v.moedas -= roubado;
        u.moedas += roubado;
        u.roubos = u.roubos || [];
        u.roubos.push(Date.now());
        u.comandos++;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `🥷 *ROUBO BEM-SUCEDIDO!*\n\n> Roubou *${roubado}* moedas de @${alvoNum}! 💰`,
          mentions: [alvo]
        });
      }
    },

    // ==============================================
    // ⛏️ MINERAR
    // ==============================================
    {
      nome: "minerar",
      descricao: "Minera recursos",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (!u.inventario.picareta || u.inventario.picareta <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de uma *picareta*. Compre com *!comprar picareta 1*." });
        }

        const cd = cooldownRestante(u.ultimoMinerar, 30 * 60 * 1000);
        if (cd) {
          return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}* pra minerar de novo.` });
        }

        const item = sortearItem(MINERIOS);
        u.inventario[`min_${item.nome}`] = (u.inventario[`min_${item.nome}`] || 0) + 1;
        u.ultimoMinerar = Date.now();
        u.xp += 5;
        u.comandos++;
        salvarRPG(dados);

        const img = IMAGENS_MINERAR[Math.floor(Math.random() * IMAGENS_MINERAR.length)];

        try {
          await sock.sendMessage(idChat, {
            image: { url: img },
            caption:
              `⛏️ *MINERAÇÃO*\n\n` +
              `> Você encontrou: *${item.nome}*\n` +
              `> 💰 Valor de venda: *${item.valor}*\n` +
              `> ✨ +5 XP`
          });
        } catch {
          await sock.sendMessage(idChat, {
            text: `⛏️ Você encontrou *${item.nome}* (valor: ${item.valor})`
          });
        }
      }
    },

    // ==============================================
    // 🎣 PESCAR
    // ==============================================
    {
      nome: "pescar",
      descricao: "Pesca recursos",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (!u.inventario.vara_pesca || u.inventario.vara_pesca <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de uma *vara de pesca*. Compre com *!comprar vara_pesca 1*." });
        }
        if (u.inventario.isca <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de *isca*. Compre com *!comprar isca 10*." });
        }

        const cd = cooldownRestante(u.ultimoPescar, 60 * 60 * 1000);
        if (cd) {
          return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}*.` });
        }

        const item = sortearItem(PEIXES);
        u.inventario[`peixe_${item.nome}`] = (u.inventario[`peixe_${item.nome}`] || 0) + 1;
        u.inventario.isca -= 1;
        u.ultimoPescar = Date.now();
        u.xp += 8;
        u.comandos++;
        salvarRPG(dados);

        const img = IMAGENS_PESCAR[Math.floor(Math.random() * IMAGENS_PESCAR.length)];

        try {
          await sock.sendMessage(idChat, {
            image: { url: img },
            caption:
              `🎣 *PESCARIA*\n\n` +
              `> Você pescou: *${item.nome}*\n` +
              `> 💰 Valor: *${item.valor}*\n` +
              `> 🪱 Iscas restantes: *${u.inventario.isca}*\n` +
              `> ✨ +8 XP`
          });
        } catch {
          await sock.sendMessage(idChat, {
            text: `🎣 Você pescou *${item.nome}* (valor: ${item.valor})`
          });
        }
      }
    },

    // ==============================================
    // 💼 JOB
    // ==============================================
    {
      nome: "trabalhar",
      descricao: "Trabalha e ganha moedas",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        const cd = cooldownRestante(u.ultimoJob, 90 * 60 * 1000);
        if (cd) {
          return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}* pra trabalhar de novo.` });
        }

        const job = JOBS[Math.floor(Math.random() * JOBS.length)];
        const ganho = rand(job.valor[0], job.valor[1]);

        u.moedas += ganho;
        u.ultimoJob = Date.now();
        u.xp += 10;
        u.comandos++;
        salvarRPG(dados);

// No comando "job", onde você define a variável img:
// Encontre a linha que define a imagem (ex: const img = ...) e substitua por:

const termoBusca = `${job.nome} trabalhando`;
const img = await buscarImagemTematica(termoBusca);

        try {
          await sock.sendMessage(idChat, {
            image: { url: img },
            caption:
              `💼 *TRABALHO*\n\n` +
              `> 👤 Profissão: *${job.nome}*\n` +
              `> 💰 Ganhou: *${ganho}* moedas\n` +
              `> ✨ +10 XP`
          });
        } catch {
          await sock.sendMessage(idChat, {
            text: `💼 Você trabalhou como *${job.nome}* e ganhou *${ganho}* moedas!`
          });
        }
      }
    },

    // ==============================================
    // 🎰 CASSINO
    // ==============================================
    {
      nome: "cassino",
      descricao: "Aposta no cassino",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const valor = pegarValor(resto);

        if (!valor || valor < 10) return sock.sendMessage(idChat, { text: "❌ Uso: *!cassino <valor>* (mín 10)" });

        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (u.inventario.ficha <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de uma *ficha*. Compre com *!comprar ficha 1*." });
        }
        if (u.moedas < valor) return sock.sendMessage(idChat, { text: `❌ Você só tem *${u.moedas}* moedas.` });

        const cd = cooldownRestante(u.ultimoCassino, 2 * 60 * 60 * 1000);
        if (cd) return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}*.` });

        u.inventario.ficha -= 1;
        u.ultimoCassino = Date.now();

        if (Math.random() < 0.1) {
          const premio = Math.floor(valor * 2.5);
          u.moedas += premio;
          salvarRPG(dados);
          await sock.sendMessage(idChat, {
            text: `🎰 *CASSINO*\n\n> 🎉 *VOCÊ GANHOU!*\n> 💰 Recebeu: *${premio}*\n> 🏦 Saldo: *${u.moedas}*`
          });
        } else {
          u.moedas -= valor;
          salvarRPG(dados);
          await sock.sendMessage(idChat, {
            text: `🎰 *CASSINO*\n\n> 😢 *VOCÊ PERDEU!*\n> 💸 Perdeu: *${valor}*\n> 🏦 Saldo: *${u.moedas}*`
          });
        }
      }
    },

    // ==============================================
    // 🎟️ LOTERIA
    // ==============================================
    {
      nome: "loteria",
      descricao: "Aposta na loteria",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const nums = (resto || "").trim().split(/\s+/).map(n => parseInt(n)).filter(n => n >= 1 && n <= 10);

        if (nums.length !== 3) {
          return sock.sendMessage(idChat, { text: "🎟️ Escolha 3 números de 1 a 10.\nEx: *!loteria 3 7 10*" });
        }

        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (u.inventario.bilhete <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de um *bilhete*. Compre com *!comprar bilhete 1*." });
        }

        const cd = cooldownRestante(u.ultimoLoteria, 12 * 60 * 60 * 1000);
        if (cd) return sock.sendMessage(idChat, { text: `⏰ Espere *${formatarTempo(cd)}*.` });

        u.inventario.bilhete -= 1;
        u.ultimoLoteria = Date.now();

        const sorteados = [rand(1, 10), rand(1, 10), rand(1, 10)];
        const acertos = nums.filter(n => sorteados.includes(n)).length;

        let premio = 0;
        if (acertos === 3) premio = 50000;
        else if (acertos === 2) premio = 5000;
        else if (acertos === 1) premio = 500;

        u.moedas += premio;
        u.comandos++;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text:
            `🎟️ *LOTERIA*\n\n` +
            `> 🎯 Seus: *${nums.join(", ")}*\n` +
            `> 🎲 Sorteados: *${sorteados.join(", ")}*\n` +
            `> ✅ Acertos: *${acertos}/3*\n\n` +
            `> 💰 Prêmio: *${premio}*\n` +
            `> 🏦 Saldo: *${u.moedas}*`
        });
      }
    },

    // ==============================================
    // 🎫 RASPADINHA
    // ==============================================
    {
      nome: "raspadinha",
      descricao: "Raspa uma raspadinha",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (u.inventario.raspadinha <= 0) {
          return sock.sendMessage(idChat, { text: "❌ Você precisa de uma *raspadinha*. Compre com *!comprar raspadinha 1*." });
        }

        const hoje = new Date().toDateString();
        if (u.ultimoDiaRaspadinha !== hoje) {
          u.ultimoDiaRaspadinha = hoje;
          u.raspadinhasHoje = 0;
        }

        if (u.raspadinhasHoje >= 3) {
          return sock.sendMessage(idChat, { text: "⏰ Você já raspou 3 raspadinhas hoje. Volte amanhã." });
        }

        u.inventario.raspadinha -= 1;
        u.raspadinhasHoje += 1;

        const premio = rand(100, 1000);
        u.moedas += premio;
        u.xp += 3;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `🎫 *RASPADINHA*\n\n> 🎉 Ganhou *${premio}* moedas!\n> 📊 Hoje: *${u.raspadinhasHoje}/3*`
        });
      }
    },

    // ==============================================
    // 🎒 MOCHILA
    // ==============================================
    {
      nome: "mochila",
      descricao: "Mostra seu inventário",
      async executar({ sock, idChat, msg, normalizarNumero }) {
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);
        salvarRPG(dados);

        const inv = u.inventario;
        const itens = [];

        if (inv.picareta) itens.push(`⛏️ Picareta: ${inv.picareta}`);
        if (inv.vara_pesca) itens.push(`🎣 Vara de pesca: ${inv.vara_pesca}`);
        if (inv.isca) itens.push(`🪱 Isca: ${inv.isca}`);
        if (inv.ficha) itens.push(`🎰 Ficha: ${inv.ficha}`);
        if (inv.bilhete) itens.push(`🎟️ Bilhete: ${inv.bilhete}`);
        if (inv.raspadinha) itens.push(`🎫 Raspadinha: ${inv.raspadinha}`);
        if (inv.escudo) itens.push(`🛡️ Escudo: ${inv.escudo} ${u.escudoEquipado ? "(equipado)" : ""}`);
	if (inv.racao) itens.push(`🍖 Ração: ${inv.racao}`);

        for (const [k, v] of Object.entries(inv)) {
          if (k.startsWith("min_")) itens.push(`⛏️ ${k.replace("min_", "")}: ${v}`);
          if (k.startsWith("peixe_")) itens.push(`🐟 ${k.replace("peixe_", "")}: ${v}`);
        }

        await sock.sendMessage(idChat, {
          text:
            `🎒 *MOCHILA*\n\n` +
            `> 👤 @${num}\n` +
            `> 💰 Moedas: *${u.moedas}*\n\n` +
            (itens.length ? itens.join("\n") : "_Vazio_"),
          mentions: [msg.key.participant || msg.key.remoteJid]
        });
      }
    },

    // ==============================================
    // 🛒 LOJA
    // ==============================================
    {
      nome: "loja",
      descricao: "Mostra a loja",
      async executar({ sock, idChat }) {
        await sock.sendMessage(idChat, {
          text:
            `╭━〔 🛒 *LOJA RPG* 〕━╮\n┃\n` +
`┃ ⛏️ Picareta — *150*\n` +
`┃ 🎣 Vara de pesca — *150*\n` +
`┃ 🪱 Isca — *5* cada\n` +
`┃ 🎰 Ficha — *80*\n` +
`┃ 🎟️ Bilhete — *50*\n` +
`┃ 🎫 Raspadinha — *60*\n` +
`┃ 🛡️ Escudo — *500* (25% proteção)\n` +
`┃ 🍖 Ração — *25*\n` +
	    `┃ Use: *!comprar <item> <qtd>*\n╰━━━━━━━━━━━━━━━╯`
        });
      }
    },

    // ==============================================
    // 🛒 COMPRAR
    // ==============================================
    {
      nome: "comprar",
      descricao: "Compra itens da loja",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const partes = (resto || "").trim().toLowerCase().split(/\s+/);
        const item = partes[0];
        const qtd = parseInt(partes[1]) || 1;

const PRECOS = {
  picareta: 150,
  vara: 150,
  vara_pesca: 150,
  isca: 5,
  iscas: 5,
  ficha: 80,
  fichas: 80,
  bilhete: 50,
  bilhetes: 50,
  raspadinha: 60,
  raspadinhas: 60,
  escudo: 500,
  racao: 25,
  racoes: 25
};
        const preco = PRECOS[item];
        if (!preco) {
          return sock.sendMessage(idChat, { text: "❌ Item inválido. Veja *!loja*." });
        }

        const total = preco * qtd;
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (u.moedas < total) {
          return sock.sendMessage(idChat, { text: `❌ Você precisa de *${total}*. Só tem *${u.moedas}*.` });
        }

let chave = item;
if (item === "vara" || item === "vara_pesca") chave = "vara_pesca";
if (item === "iscas") chave = "isca";
if (item === "fichas") chave = "ficha";
if (item === "bilhetes") chave = "bilhete";
if (item === "raspadinhas") chave = "raspadinha";
if (item === "racoes") chave = "racao";

        u.moedas -= total;
        u.inventario[chave] = (u.inventario[chave] || 0) + qtd;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `✅ Comprou *${qtd}x ${chave}* por *${total}*.\n💰 Saldo: *${u.moedas}*`
        });
      }
    },

    // ==============================================
    // 🛡️ EQUIPAR
    // ==============================================
    {
      nome: "equipar",
      descricao: "Equipa um item",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const item = (resto || "").trim().toLowerCase();
        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        if (item === "escudo") {
          if (u.inventario.escudo <= 0) {
            return sock.sendMessage(idChat, { text: "❌ Você não tem escudo." });
          }
          u.escudoEquipado = true;
          salvarRPG(dados);
          return sock.sendMessage(idChat, { text: "🛡️ *Escudo equipado!* (25% proteção)" });
        }

        return sock.sendMessage(idChat, { text: "❌ Item inválido. Use: *!equipar escudo*" });
      }
    },

    // ==============================================
    // 🏆 RANK RPG
    // ==============================================
    {
      nome: "rankrpg",
      descricao: "Ranking global",
      async executar({ sock, idChat, resto }) {
        const tipo = (resto || "rico").trim().toLowerCase();
        const dados = lerRPG();
        const lista = Object.entries(dados.usuarios || {});

        if (!lista.length) return sock.sendMessage(idChat, { text: "📭 Sem dados ainda." });

        let ordenado, titulo, chave, emoji;

        if (tipo === "nivel" || tipo === "level") {
          ordenado = lista.sort((a, b) => (b[1].nivel || 0) - (a[1].nivel || 0));
          titulo = "🏆 *TOP NÍVEIS*";
          chave = "nivel";
          emoji = "🎯";
        } else {
          ordenado = lista.sort((a, b) => (b[1].moedas || 0) - (a[1].moedas || 0));
          titulo = "💰 *TOP RICOS*";
          chave = "moedas";
          emoji = "💰";
        }

        const top = ordenado.slice(0, 10);
        const mentions = [];
        const linhas = top.map(([num, u], i) => {
          const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
          const jid = u.jid || `${num}@s.whatsapp.net`;
          mentions.push(jid);
          return `┃ ${medalha} @${num} — ${emoji} ${u[chave]}`;
        }).join("\n");

        await sock.sendMessage(idChat, {
          text: `${titulo}\n\n${linhas}`,
          mentions
        });
      }
    },

    // ==============================================
    // 🎁 DOAR
    // ==============================================
    {
      nome: "doar",
      descricao: "Doa moedas",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const alvo = ctx?.mentionedJid?.[0] || ctx?.participant;

        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!doar <valor> @user*" });

        const valor = pegarValor(resto);
        if (!valor || valor < 1) return sock.sendMessage(idChat, { text: "❌ Valor inválido." });

        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const alvoNum = normalizarNumero(alvo);

        if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode doar pra si." });

        const dados = lerRPG();
        const u = getUsuario(dados, num);
        const v = getUsuario(dados, alvoNum);

        if (u.moedas < valor) return sock.sendMessage(idChat, { text: `❌ Você só tem *${u.moedas}* moedas.` });

        u.moedas -= valor;
        v.moedas += valor;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `🎁 *DOAÇÃO*\n\n> 📤 De: @${num}\n> 📥 Para: @${alvoNum}\n> 💰 Valor: *${valor}*`,
          mentions: [msg.key.participant || msg.key.remoteJid, alvo]
        });
      }
    },

    // ==============================================
    // 💸 PIX
    // ==============================================
    {
      nome: "pix",
      descricao: "Faz um pix",
      async executar({ sock, idChat, msg, resto, normalizarNumero, NOME_BOT }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const alvo = ctx?.mentionedJid?.[0] || ctx?.participant;

        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!pix <valor> @user*" });

        const valor = pegarValor(resto);
        if (!valor || valor < 1) return sock.sendMessage(idChat, { text: "❌ Valor inválido." });

        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const alvoNum = normalizarNumero(alvo);

        if (num === alvoNum) return sock.sendMessage(idChat, { text: "❌ Não pode fazer pix pra si." });

        const dados = lerRPG();
        const u = getUsuario(dados, num);
        const v = getUsuario(dados, alvoNum);

        if (u.moedas < valor) return sock.sendMessage(idChat, { text: `❌ Você só tem *${u.moedas}* moedas.` });

        u.moedas -= valor;
        v.moedas += valor;
        salvarRPG(dados);

        const id = "PIX" + Date.now().toString().slice(-10);

        await sock.sendMessage(idChat, {
          text:
            `╭━━━〔 💸 *COMPROVANTE PIX* 〕━━━╮\n┃\n` +
            `┃ 🆔 ID: *${id}*\n` +
            `┃ 📤 De: @${num}\n` +
            `┃ 📥 Para: @${alvoNum}\n` +
            `┃ 💰 Valor: *${valor}*\n` +
            `┃ 📅 ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n` +
            `┃ ✅ Status: *CONCLUÍDO*\n┃\n` +
            `┃ 🏦 ${NOME_BOT || "HoshinoBot"}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          mentions: [msg.key.participant || msg.key.remoteJid, alvo]
        });
      }
    },

    // ==============================================
    // 💎 VENDER
    // ==============================================
    {
      nome: "vender",
      descricao: "Vende recursos",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const nome = (resto || "").trim();
        if (!nome) return sock.sendMessage(idChat, { text: "❌ Uso: *!vender <nome do item>*" });

        const num = normalizarNumero(msg.key.participant || msg.key.remoteJid);
        const dados = lerRPG();
        const u = getUsuario(dados, num);

        const itemMin = MINERIOS.find(m => m.nome.toLowerCase() === nome.toLowerCase());
        const itemPeixe = PEIXES.find(p => p.nome.toLowerCase() === nome.toLowerCase());

        let chave, valorTotal, quantidade;

        if (itemMin) {
          chave = `min_${itemMin.nome}`;
          quantidade = u.inventario[chave] || 0;
          valorTotal = itemMin.valor;
        } else if (itemPeixe) {
          chave = `peixe_${itemPeixe.nome}`;
          quantidade = u.inventario[chave] || 0;
          valorTotal = itemPeixe.valor;
        } else {
          return sock.sendMessage(idChat, { text: "❌ Item não encontrado." });
        }

        if (quantidade <= 0) return sock.sendMessage(idChat, { text: `❌ Você não tem *${nome}*.` });

        const ganho = valorTotal * quantidade;
        u.moedas += ganho;
        u.inventario[chave] = 0;
        u.xp += 2;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `💎 Vendeu *${quantidade}x ${nome}* por *${ganho}*!\n💰 Saldo: *${u.moedas}*`
        });
      }
    },

    // ==============================================
    // ⚙️ MODORPG
    // ==============================================
    {
      nome: "modorpg",
      descricao: "Ativa/desativa o RPG (só adm)",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!modorpg on/off*" });
        }

        const dados = lerRPG();
        dados.modorpg = op === "on";
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: op === "on" ? "✅ *RPG ATIVADO!*" : "❌ *RPG DESATIVADO!*"
        });
      }
    },

    // ==============================================
    // 👑 ADDMOEDAS
    // ==============================================
    {
      nome: "addmoedas",
      descricao: "Adiciona moedas a alguém",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const alvo = ctx?.mentionedJid?.[0] || ctx?.participant;
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!addmoedas <valor> @user*" });

        const valor = pegarValor(resto);
        if (!valor) return sock.sendMessage(idChat, { text: "❌ Valor inválido." });

        const alvoNum = normalizarNumero(alvo);
        const dados = lerRPG();
        const v = getUsuario(dados, alvoNum);
        v.moedas += valor;
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `👑 Adicionado *${valor}* moedas pra @${alvoNum}.\n💰 Saldo: *${v.moedas}*`,
          mentions: [alvo]
        });
      }
    },

    // ==============================================
    // 👑 DELMOEDAS
    // ==============================================
    {
      nome: "delmoedas",
      descricao: "Remove moedas de alguém",
      async executar({ sock, idChat, msg, resto, normalizarNumero }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const alvo = ctx?.mentionedJid?.[0] || ctx?.participant;
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Uso: *!delmoedas <valor> @user*" });

        const valor = pegarValor(resto);
        if (!valor) return sock.sendMessage(idChat, { text: "❌ Valor inválido." });

        const alvoNum = normalizarNumero(alvo);
        const dados = lerRPG();
        const v = getUsuario(dados, alvoNum);
        v.moedas = Math.max(0, v.moedas - valor);
        salvarRPG(dados);

        await sock.sendMessage(idChat, {
          text: `👑 Removido *${valor}* moedas de @${alvoNum}.\n💰 Saldo: *${v.moedas}*`,
          mentions: [alvo]
        });
      }
    }
  ],

  // ==============================================
  // 🎁 HOOK: MOEDAS DIÁRIAS + XP + NÍVEL
  // ==============================================
  async aoReceberMensagem({ idChat, remetente, msg, sock }) {
    try {
      const num = remetente.split("@")[0].split(":")[0].replace(/\D/g, "");
      if (!num) return;

      const dados = lerRPG();
      if (!dados.modorpg) return;

      const u = getUsuario(dados, num);
      u.jid = remetente; // 👈 salva JID completo (pra marcar no rank)

      const hoje = new Date().toDateString();

      // 🎁 Bônus diário
      if (!u.ultimoMsgsDia || u.ultimoMsgsDia !== hoje) {
        const ganho = Math.floor(Math.random() * 401) + 100;
        u.moedas += ganho;
        u.ultimoMsgsDia = hoje;

        try {
          await sock.sendMessage(idChat, {
            text: `🎁 *BÔNUS DIÁRIO!*\n\n> +*${ganho}* moedas pra @${num}\n> 💰 Saldo: *${u.moedas}*`,
            mentions: [remetente]
          });
        } catch {}
      }

      u.msgs++;
      u.xp += 2;

      let xpProx = xpNecessario(u.nivel);
      let subiu = false;
      while (u.xp >= xpProx && u.nivel < 70) {
        u.xp -= xpProx;
        u.nivel++;
        u.moedas += 500;
        xpProx = xpNecessario(u.nivel);
        subiu = true;
      }

      salvarRPG(dados);

      if (subiu) {
        try {
          await sock.sendMessage(idChat, {
            text: `🎉 @${num} subiu pro *nível ${u.nivel}*!\n💰 +500 moedas!`,
            mentions: [remetente]
          });
        } catch {}
      }
    } catch (e) {
      console.log("Erro hook RPG:", e.message);
    }
  }
};
