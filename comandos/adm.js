const fs = require("fs");
const path = require("path");

// ==============================================
// 📦 ARQUIVOS
// ==============================================
const ARQ_GRUPOS = path.join(__dirname, "..", "dados", "grupos.json");
const ARQ_ADVS = path.join(__dirname, "..", "dados", "advs.json");
const ARQ_PARCERIAS = path.join(__dirname, "..", "dados", "parcerias.json");
const ARQ_NEGRA = path.join(__dirname, "..", "dados", "listanegra.json");

// ==============================================
// 🛠️ HELPERS
// ==============================================
function ler(arq, padrao = {}) {
  try {
    if (!fs.existsSync(arq)) return padrao;
    return JSON.parse(fs.readFileSync(arq, "utf8"));
  } catch { return padrao; }
}

function salvar(arq, dados) {
  try {
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    fs.writeFileSync(arq, JSON.stringify(dados, null, 2));
  } catch (e) { console.log("Erro salvando:", e.message); }
}

function normalizar(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0].replace(/\D/g, "");
}

function pegarAlvo(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant
    || null;
}

function pegarCitada(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.stanzaId || null;
}

// ==============================================
// 📄 MENU_ADM (com mídia)
// ==============================================
function carregarMenuAdm() {
  const ARQ = path.join(__dirname, "..", "personalize_aqui", "menu_adm.txt");
  try {
    return fs.readFileSync(ARQ, "utf8");
  } catch {
    return "❌ Arquivo personalize_aqui/menu_adm.txt não encontrado!";
  }
}

module.exports = {
  comandos: [
    // ==============================================
    // 📋 MENU_ADM
    // ==============================================
{
  nome: "menuadm",
  descricao: "Mostra o menu de administração",
  async executar({ sock, idChat, msg, PREFIXO, NOME_BOT, DONO_PRINCIPAL_NOME }) {
    const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

    let texto = carregarMenuAdm()
      .replace(/{PREFIXO}/g, PREFIXO || "!")
      .replace(/{BOT}/g, NOME_BOT || "Bot")
      .replace(/{DONO}/g, DONO_PRINCIPAL_NOME || "Dono")
      .replace(/{DATA}/g, data);

    const caminhoMeta = path.join(__dirname, "..", "dados", "menu_midia_menuadm.json");
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
      await sock.sendMessage(idChat, {
        video: midia.buffer, caption: texto, mentions: [remetente],
        gifPlayback: true
      });
    } else {
      await sock.sendMessage(idChat, { text: texto, mentions: [remetente] });
    }
  }
},
    // ==============================================
    // 💈 MODERAÇÃO
    // ==============================================
    {
      nome: "ban",
      descricao: "Bane um usuário do grupo",
      async executar({ sock, idChat, msg }) {
        if (!idChat.endsWith("@g.us")) return;
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        try {
          await sock.groupParticipantsUpdate(idChat, [alvo], "remove");
          await sock.sendMessage(idChat, {
            text: `🚫 *@${normalizar(alvo)} foi banido!*`,
            mentions: [alvo]
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "promover",
      descricao: "Promove um usuário a admin",
      async executar({ sock, idChat, msg }) {
        if (!idChat.endsWith("@g.us")) return;
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        try {
          await sock.groupParticipantsUpdate(idChat, [alvo], "promote");
          await sock.sendMessage(idChat, {
            text: `👑 *@${normalizar(alvo)} agora é admin!*`,
            mentions: [alvo]
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "rebaixar",
      descricao: "Rebaixa um admin",
      async executar({ sock, idChat, msg }) {
        if (!idChat.endsWith("@g.us")) return;
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        try {
          await sock.groupParticipantsUpdate(idChat, [alvo], "demote");
          await sock.sendMessage(idChat, {
            text: `⬇️ *@${normalizar(alvo)} foi rebaixado!*`,
            mentions: [alvo]
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "mute",
      descricao: "Silencia um usuário (só funciona com admin)",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        if (!dados[idChat].mutados) dados[idChat].mutados = [];
        if (!dados[idChat].mutados.includes(alvo)) dados[idChat].mutados.push(alvo);
        salvar(ARQ_GRUPOS, dados);

        await sock.sendMessage(idChat, {
          text: `🔇 *@${normalizar(alvo)} foi mutado!*`,
          mentions: [alvo]
        });
      }
    },

    {
      nome: "unmute",
      descricao: "Remove o mute de um usuário",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_GRUPOS, {});
        if (dados[idChat]?.mutados) {
          dados[idChat].mutados = dados[idChat].mutados.filter(x => x !== alvo);
          salvar(ARQ_GRUPOS, dados);
        }

        await sock.sendMessage(idChat, {
          text: `🔊 *@${normalizar(alvo)} foi desmutado!*`,
          mentions: [alvo]
        });
      }
    },

    // ==============================================
    // ⚠️ SISTEMA DE ADV
    // ==============================================
    {
      nome: "adv",
      descricao: "Dá uma advertência num usuário",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_ADVS, {});
        const chave = `${idChat}|${alvo}`;
        dados[chave] = (dados[chave] || 0) + 1;
        salvar(ARQ_ADVS, dados);

        const total = dados[chave];

        await sock.sendMessage(idChat, {
          text:
            `⚠️ *ADVERTÊNCIA*\n\n` +
            `> 👤 @${normalizar(alvo)}\n` +
            `> 📊 Total: *${total}/3*\n` +
            (total >= 3 ? `\n> 🚫 Atingiu 3 advs! Removendo do grupo...` : ""),
          mentions: [alvo]
        });

        if (total >= 3 && idChat.endsWith("@g.us")) {
          try {
            await sock.groupParticipantsUpdate(idChat, [alvo], "remove");
            delete dados[chave];
            salvar(ARQ_ADVS, dados);
          } catch {}
        }
      }
    },

    {
      nome: "veradv",
      descricao: "Mostra as advs de um usuário",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_ADVS, {});
        const total = dados[`${idChat}|${alvo}`] || 0;

        await sock.sendMessage(idChat, {
          text: `📊 @${normalizar(alvo)} tem *${total}/3* advertências.`,
          mentions: [alvo]
        });
      }
    },

    {
      nome: "rmadv",
      descricao: "Remove uma adv",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_ADVS, {});
        const chave = `${idChat}|${alvo}`;
        dados[chave] = Math.max(0, (dados[chave] || 0) - 1);
        salvar(ARQ_ADVS, dados);

        await sock.sendMessage(idChat, {
          text: `✅ Adv de @${normalizar(alvo)} reduzida para *${dados[chave]}/3*.`,
          mentions: [alvo]
        });
      }
    },

    {
      nome: "zeraradv",
      descricao: "Zera as advs de um usuário",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque ou responda alguém." });

        const dados = ler(ARQ_ADVS, {});
        delete dados[`${idChat}|${alvo}`];
        salvar(ARQ_ADVS, dados);

        await sock.sendMessage(idChat, {
          text: `🧹 Advs de @${normalizar(alvo)} zeradas!`,
          mentions: [alvo]
        });
      }
    },

    // ==============================================
    // ✨ GERENCIAMENTO DO GRUPO
    // ==============================================
    {
      nome: "abrir",
      descricao: "Abre o grupo",
      async executar({ sock, idChat }) {
        try {
          await sock.groupSettingUpdate(idChat, "not_announcement");
          await sock.sendMessage(idChat, { text: "🔓 *Grupo aberto!* Todos podem falar." });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "fechar",
      descricao: "Fecha o grupo (só adm fala)",
      async executar({ sock, idChat }) {
        try {
          await sock.groupSettingUpdate(idChat, "announcement");
          await sock.sendMessage(idChat, { text: "🔒 *Grupo fechado!* Só admins podem falar." });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

{
  nome: "fechargp",
  descricao: "Agenda fechamento do grupo",
  async executar({ sock, idChat, resto }) {
    const hora = (resto || "").trim();
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return sock.sendMessage(idChat, {
        text: "❌ Uso: *!fechargp 00:00* (formato HH:MM)"
      });
    }

    const ARQ = path.join(__dirname, "..", "dados", "grupos.json");
    const dados = ler(ARQ, {});
    if (!dados[idChat]) dados[idChat] = {};

    dados[idChat].agendarFechar = hora;
    dados[idChat].ultimoFechar = null; // 👈 RESETA o "já fechou hoje"
    salvar(ARQ, dados);

    await sock.sendMessage(idChat, {
      text: `⏰ Grupo será fechado automaticamente às *${hora}*.`
    });
  }
},

{
  nome: "abrirgp",
  descricao: "Agenda abertura do grupo",
  async executar({ sock, idChat, resto }) {
    const hora = (resto || "").trim();
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return sock.sendMessage(idChat, {
        text: "❌ Uso: *!abrirgp 00:00* (formato HH:MM)"
      });
    }

    const ARQ = path.join(__dirname, "..", "dados", "grupos.json");
    const dados = ler(ARQ, {});
    if (!dados[idChat]) dados[idChat] = {};

    dados[idChat].agendarAbrir = hora;
    dados[idChat].ultimoAbrir = null; // 👈 RESETA
    salvar(ARQ, dados);

    await sock.sendMessage(idChat, {
      text: `⏰ Grupo será aberto automaticamente às *${hora}*.`
    });
  }
},
// ==============================================
// ❌ CANCELARFECHARGP
// ==============================================
{
  nome: "cancelarfechargp",
  descricao: "Cancela o agendamento de fechar o grupo",
  async executar({ sock, idChat }) {
    if (!idChat.endsWith("@g.us")) {
      return sock.sendMessage(idChat, { text: "❌ Só funciona em grupos." });
    }

    const ARQ = path.join(__dirname, "..", "dados", "grupos.json");
    const dados = ler(ARQ, {});

    if (!dados[idChat]?.agendarFechar) {
      return sock.sendMessage(idChat, {
        text: "📭 Não tem agendamento de fechamento pra cancelar."
      });
    }

    const horaAntiga = dados[idChat].agendarFechar;
    delete dados[idChat].agendarFechar;
    salvar(ARQ, dados);

    await sock.sendMessage(idChat, {
      text: `🗑️ *Agendamento cancelado!*\n\n> Horário antigo: *${horaAntiga}*`
    });
  }
},

// ==============================================
// ❌ CANCELARABRIRGP
// ==============================================
{
  nome: "cancelarabrirgp",
  descricao: "Cancela o agendamento de abrir o grupo",
  async executar({ sock, idChat }) {
    if (!idChat.endsWith("@g.us")) {
      return sock.sendMessage(idChat, { text: "❌ Só funciona em grupos." });
    }

    const ARQ = path.join(__dirname, "..", "dados", "grupos.json");
    const dados = ler(ARQ, {});

    if (!dados[idChat]?.agendarAbrir) {
      return sock.sendMessage(idChat, {
        text: "📭 Não tem agendamento de abertura pra cancelar."
      });
    }

    const horaAntiga = dados[idChat].agendarAbrir;
    delete dados[idChat].agendarAbrir;
    salvar(ARQ, dados);

    await sock.sendMessage(idChat, {
      text: `🗑️ *Agendamento cancelado!*\n\n> Horário antigo: *${horaAntiga}*`
    });
  }
},
    {
      nome: "legendafechar",
      descricao: "Define legenda ao fechar o grupo",
      async executar({ sock, idChat, msg }) {
        // Pega a legenda da mensagem quotada ou do texto depois do comando
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let texto = "";

        if (quoted?.conversation) texto = quoted.conversation;
        else if (quoted?.extendedTextMessage?.text) texto = quoted.extendedTextMessage.text;

        if (!texto) {
          const ARQ_CFG = path.join(__dirname, "..", "personalize_aqui", "legenda_fechar.txt");
          fs.mkdirSync(path.dirname(ARQ_CFG), { recursive: true });
          fs.writeFileSync(ARQ_CFG, "", "utf8");
          return sock.sendMessage(idChat, {
            text: "❌ Responda uma mensagem com o texto que quer usar como legenda."
          });
        }

        const ARQ = path.join(__dirname, "..", "personalize_aqui", "legenda_fechar.txt");
        fs.mkdirSync(path.dirname(ARQ), { recursive: true });
        fs.writeFileSync(ARQ, texto, "utf8");
        await sock.sendMessage(idChat, { text: "✅ *Legenda de fechar salva!*" });
      }
    },

    {
      nome: "legendaabrir",
      descricao: "Define legenda ao abrir o grupo",
      async executar({ sock, idChat, msg }) {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let texto = "";
        if (quoted?.conversation) texto = quoted.conversation;
        else if (quoted?.extendedTextMessage?.text) texto = quoted.extendedTextMessage.text;

        if (!texto) {
          return sock.sendMessage(idChat, {
            text: "❌ Responda uma mensagem com o texto que quer usar como legenda."
          });
        }

        const ARQ = path.join(__dirname, "..", "personalize_aqui", "legenda_abrir.txt");
        fs.mkdirSync(path.dirname(ARQ), { recursive: true });
        fs.writeFileSync(ARQ, texto, "utf8");
        await sock.sendMessage(idChat, { text: "✅ *Legenda de abrir salva!*" });
      }
    },

    {
      nome: "foto_fechar",
      descricao: "Define foto ao fechar o grupo",
      async executar({ sock, idChat, msg, downloadMediaMessage }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted?.imageMessage) {
          return sock.sendMessage(idChat, {
            text: "❌ Responda a uma *foto* com *!foto_fechar*"
          });
        }

        try {
          const buffer = await downloadMediaMessage(
            { key: { remoteJid: ctx.remoteJid || idChat, id: ctx.stanzaId, fromMe: false }, message: quoted },
            "buffer", {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          );

          const ARQ = path.join(__dirname, "..", "dados", "foto_fechar.jpg");
          fs.mkdirSync(path.dirname(ARQ), { recursive: true });
          fs.writeFileSync(ARQ, buffer);

          await sock.sendMessage(idChat, { text: "✅ *Foto de fechar salva!*" });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "foto_abrir",
      descricao: "Define foto ao abrir o grupo",
      async executar({ sock, idChat, msg, downloadMediaMessage }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted?.imageMessage) {
          return sock.sendMessage(idChat, {
            text: "❌ Responda a uma *foto* com *!foto_abrir*"
          });
        }

        try {
          const buffer = await downloadMediaMessage(
            { key: { remoteJid: ctx.remoteJid || idChat, id: ctx.stanzaId, fromMe: false }, message: quoted },
            "buffer", {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          );

          const ARQ = path.join(__dirname, "..", "dados", "foto_abrir.jpg");
          fs.mkdirSync(path.dirname(ARQ), { recursive: true });
          fs.writeFileSync(ARQ, buffer);

          await sock.sendMessage(idChat, { text: "✅ *Foto de abrir salva!*" });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "setnomegp",
      descricao: "Muda o nome do grupo",
      async executar({ sock, idChat, resto }) {
        if (!resto) return sock.sendMessage(idChat, { text: "❌ Uso: *!setnomegp <nome>*" });
        try {
          await sock.groupUpdateSubject(idChat, resto);
          await sock.sendMessage(idChat, { text: `✅ Nome do grupo alterado para *${resto}*` });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "set_descricao",
      descricao: "Muda a descrição do grupo",
      async executar({ sock, idChat, resto }) {
        if (!resto) return sock.sendMessage(idChat, { text: "❌ Uso: *!set_descricao <texto>*" });
        try {
          await sock.groupUpdateDescription(idChat, resto);
          await sock.sendMessage(idChat, { text: "✅ Descrição atualizada!" });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "infogrupo",
      descricao: "Mostra informações do grupo",
      async executar({ sock, idChat }) {
        try {
          const meta = await sock.groupMetadata(idChat);
          let link = "indisponível";
          try {
            const codigo = await sock.groupInviteCode(idChat);
            link = `https://chat.whatsapp.com/${codigo}`;
          } catch {}

          const criador = meta.participants?.find(p => p.admin === "superadmin");
          const adms = meta.participants?.filter(p => p.admin).length || 0;

          const texto =
            `📊 *INFORMAÇÕES DO GRUPO*\n\n` +
            `> 📌 *Nome:* ${meta.subject}\n` +
            `> 🆔 *ID:* \`${idChat}\`\n` +
            `> 👥 *Membros:* ${meta.participants?.length || 0}\n` +
            `> 👑 *Admins:* ${adms}\n` +
            `> 🧑 *Criador:* ${criador ? "@" + normalizar(criador.id) : "?"}\n` +
            `> 🔗 *Link:* ${link}\n` +
            `> 📝 *Descrição:* ${meta.desc || "sem descrição"}\n` +
            `> 🕒 *Criado em:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleString("pt-BR") : "?"}`;

          await sock.sendMessage(idChat, {
            text: texto,
            mentions: criador ? [criador.id] : []
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "link",
      descricao: "Manda o link do grupo",
      async executar({ sock, idChat }) {
        try {
          const codigo = await sock.groupInviteCode(idChat);
          await sock.sendMessage(idChat, {
            text: `🔗 *Link do grupo:*\n\nhttps://chat.whatsapp.com/${codigo}`
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "resetlink",
      descricao: "Reseta o link do grupo",
      async executar({ sock, idChat }) {
        try {
          await sock.groupRevokeInvite(idChat);
          await sock.sendMessage(idChat, { text: "♻️ *Link resetado!*" });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "somente_adm",
      descricao: "Configura mensagens só pra adm",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!somente_adm on/off*" });
        }
        try {
          if (op === "on") {
            await sock.groupSettingUpdate(idChat, "announcement");
            await sock.sendMessage(idChat, { text: "🔒 *Somente admins podem falar!*" });
          } else {
            await sock.groupSettingUpdate(idChat, "not_announcement");
            await sock.sendMessage(idChat, { text: "🔓 *Todos podem falar!*" });
          }
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "totag",
      descricao: "Marca todos os membros",
      async executar({ sock, idChat, msg, resto }) {
        try {
          const meta = await sock.groupMetadata(idChat);
          const todos = meta.participants.map(p => p.id);
          const autor = msg.key.participant;

          const texto =
            `📢 *MARCADOS* (${todos.length})\n\n` +
            (resto ? `> ${resto}\n\n` : "") +
            todos.map(t => `┃ @${normalizar(t)}`).join("\n");

          await sock.sendMessage(idChat, {
            text: texto.slice(0, 4000),
            mentions: todos
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "r",
      descricao: "Apaga a mensagem respondida",
      async executar({ sock, idChat, msg }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const idAlvo = ctx?.stanzaId;
        const autorAlvo = ctx?.participant;

        if (!idAlvo) {
          return sock.sendMessage(idChat, { text: "❌ Responda a mensagem que quer apagar." });
        }

        try {
          await sock.sendMessage(idChat, {
            delete: {
              remoteJid: idChat,
              fromMe: sock.user?.id?.split(":")[0] === normalizar(autorAlvo),
              id: idAlvo,
              participant: autorAlvo
            }
          });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    // ==============================================
    // 🩸 PROTEÇÃO
    // ==============================================
    {
      nome: "antiimg",
      descricao: "Ativa/desativa anti-imagem",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!antiimg on/off*" });
        }
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].antiimg = op === "on";
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: `🖼️ Anti-imagem: *${op === "on" ? "✅ ON" : "❌ OFF"}*` });
      }
    },

    {
      nome: "antifig",
      descricao: "Ativa/desativa anti-figurinha",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!antifig on/off*" });
        }
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].antifig = op === "on";
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: `🎨 Anti-figurinha: *${op === "on" ? "✅ ON" : "❌ OFF"}*` });
      }
    },

    {
      nome: "antiaudio",
      descricao: "Ativa/desativa anti-áudio",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!antaudio on/off*" });
        }
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].antaudio = op === "on";
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: `🎤 Anti-áudio: *${op === "on" ? "✅ ON" : "❌ OFF"}*` });
      }
    },

    {
      nome: "antivideo",
      descricao: "Ativa/desativa anti-vídeo",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!antivideo on/off*" });
        }
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].antivideo = op === "on";
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: `🎥 Anti-vídeo: *${op === "on" ? "✅ ON" : "❌ OFF"}*` });
      }
    },

    {
      nome: "antilink",
      descricao: "Ativa/desativa anti-link",
      async executar({ sock, idChat, resto }) {
        const op = (resto || "").trim().toLowerCase();
        if (!["on", "off"].includes(op)) {
          return sock.sendMessage(idChat, { text: "❌ Uso: *!antilink on/off*" });
        }
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].antilink = op === "on";
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: `🔗 Anti-link: *${op === "on" ? "✅ ON" : "❌ OFF"}*` });
      }
    },

    // ==============================================
    // 🤝 PARCERIAS
    // ==============================================
{
  nome: "modo",
  descricao: "Ativa/desativa modo parceria",
  async executar({ sock, idChat, resto }) {
    const partes = (resto || "").trim().toLowerCase().split(/\s+/);
    const opcao = partes[0];
    const valor = partes[1];

    if (opcao !== "parceria" || !["on", "off"].includes(valor)) {
      return sock.sendMessage(idChat, {
        text:
          `❌ Uso:\n` +
          `> *!modo parceria on* — ativar\n` +
          `> *!modo parceria off* — desativar`
      });
    }

    const dados = ler(ARQ_PARCERIAS, {});
    if (!dados[idChat]) dados[idChat] = {};
    dados[idChat].ativo = valor === "on";
    salvar(ARQ_PARCERIAS, dados);

    await sock.sendMessage(idChat, {
      text: valor === "on"
        ? "🤝 *Modo parceria ATIVADO!*"
        : "❌ *Modo parceria DESATIVADO!*"
    });
  }
},

{
  nome: "addparceria",
  descricao: "Adiciona uma parceria",
  async executar({ sock, idChat, msg, resto }) {
    // Verifica se o modo parceria tá ativo
    const cfgParceria = ler(ARQ_PARCERIAS, {});
    if (!cfgParceria[idChat]?.ativo) {
      return sock.sendMessage(idChat, {
        text: "❌ O modo parceria tá desativado.\n\n> Use *!modo parceria on* primeiro."
      });
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!alvoJid) {
      return sock.sendMessage(idChat, {
        text: "❌ Uso: *!addparceria @user <quantia>*\n\n> Ex: *!addparceria @user 5*"
      });
    }

    // Pega só o valor depois da menção
    const textoLimpo = (resto || "").replace(/@\S+/g, "").trim();
    const quantia = parseInt(textoLimpo.replace(/[^\d]/g, "")) || 0;

    if (quantia < 1) {
      return sock.sendMessage(idChat, {
        text: "❌ Você precisa definir um limite diário.\n\n> Ex: *!addparceria @user 5*"
      });
    }

    const numAlvo = String(alvoJid).split("@")[0].split(":")[0].replace(/\D/g, "");
    const hoje = new Date().toDateString();

    const dados = cfgParceria;
    if (!dados[idChat]) dados[idChat] = { ativo: true, lista: [] };
    if (!dados[idChat].lista) dados[idChat].lista = [];

    // Verifica se já é parceiro (compara por número normalizado)
    const idx = dados[idChat].lista.findIndex(
      p => String(p.jid || "").split("@")[0].split(":")[0].replace(/\D/g, "") === numAlvo
    );

    const registro = {
      jid: alvoJid,
      num: numAlvo,
      quantia,
      usados: 0,
      ultimoDia: hoje,
      data: Date.now()
    };

    if (idx >= 0) {
      // Já existe → atualiza
      dados[idChat].lista[idx] = registro;
      salvar(ARQ_PARCERIAS, dados);

      return sock.sendMessage(idChat, {
        text:
          `🤝 *Parceria atualizada!*\n\n` +
          `> 👤 @${numAlvo}\n` +
          `> 🔗 Novo limite diário: *${quantia} links*\n` +
          `> 🔄 Contador resetado.`,
        mentions: [alvoJid]
      });
    }

    // Nova parceria
    dados[idChat].lista.push(registro);
    salvar(ARQ_PARCERIAS, dados);

    await sock.sendMessage(idChat, {
      text:
        `🤝 *Parceria adicionada!*\n\n` +
        `> 👤 @${numAlvo}\n` +
        `> 🔗 Limite diário: *${quantia} links*\n\n` +
        `> ⏰ Reset diário às *00:00*`,
      mentions: [alvoJid]
    });
  }
},
    {
      nome: "delparceria",
      descricao: "Remove uma parceria",
      async executar({ sock, idChat, msg }) {
        const alvo = pegarAlvo(msg);
        if (!alvo) return sock.sendMessage(idChat, { text: "❌ Marque alguém." });

        const dados = ler(ARQ_PARCERIAS, {});
        if (dados[idChat]?.lista) {
          dados[idChat].lista = dados[idChat].lista.filter(p => p.jid !== alvo);
          salvar(ARQ_PARCERIAS, dados);
        }
        await sock.sendMessage(idChat, {
          text: `🗑️ Parceria de @${normalizar(alvo)} removida!`,
          mentions: [alvo]
        });
      }
    },

    {
      nome: "lista_parceria",
      descricao: "Lista as parcerias do grupo",
      async executar({ sock, idChat }) {
        const dados = ler(ARQ_PARCERIAS, {});
        const lista = dados[idChat]?.lista || [];

        if (!lista.length) {
          return sock.sendMessage(idChat, { text: "📭 *Nenhuma parceria cadastrada.*" });
        }

        const linhas = lista.map((p, i) =>
          `┃ ${i + 1}. @${normalizar(p.jid)} — 💰 ${p.quantia}`
        ).join("\n");

        await sock.sendMessage(idChat, {
          text:
            `🤝 *PARCERIAS DO GRUPO*\n\n` +
            `> Total: *${lista.length}*\n\n` +
            linhas,
          mentions: lista.map(p => p.jid)
        });
      }
    },

    // ==============================================
    // 🚫 LISTA NEGRA
    // ==============================================
{
  nome: "add_listanegra",
  descricao: "Adiciona à lista negra e bane",
  async executar({ sock, idChat, msg }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!alvoJid) return sock.sendMessage(idChat, { text: "❌ Marque alguém." });

    const ARQ = path.join(__dirname, "..", "dados", "listanegra.json");
    const dados = ler(ARQ, { lista: [] });
    if (!dados.lista) dados.lista = [];

    const numAlvo = String(alvoJid).split("@")[0].split(":")[0].replace(/\D/g, "");

    // Verifica se já tá
    if (dados.lista.some(l => String(l).split("@")[0].split(":")[0].replace(/\D/g, "") === numAlvo)) {
      return sock.sendMessage(idChat, {
        text: `⚠️ @${numAlvo} já tá na lista negra.`,
        mentions: [alvoJid]
      });
    }

    dados.lista.push(alvoJid);
    salvar(ARQ, dados);

    // 👇 Bane do grupo (se tiver no grupo)
    if (idChat.endsWith("@g.us")) {
      try {
        await sock.groupParticipantsUpdate(idChat, [alvoJid], "remove");
      } catch (e) {
        console.log("Erro ao banir:", e.message);
      }
    }

    await sock.sendMessage(idChat, {
      text: `⛔ @${numAlvo} foi adicionado à lista negra e banido!`,
      mentions: [alvoJid]
    });
  }
},

{
  nome: "rm_listanegra",
  descricao: "Remove da lista negra",
  async executar({ sock, idChat, msg, resto }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const alvoJid = ctx?.mentionedJid?.[0] || ctx?.participant;

    const ARQ = path.join(__dirname, "..", "dados", "listanegra.json");
    const dados = ler(ARQ, { lista: [] });

    let removido = null;

    if (alvoJid) {
      const numAlvo = String(alvoJid).split("@")[0].split(":")[0].replace(/\D/g, "");
      const antes = dados.lista.length;
      dados.lista = dados.lista.filter(l => String(l).split("@")[0].split(":")[0].replace(/\D/g, "") !== numAlvo);
      if (dados.lista.length < antes) removido = numAlvo;
    } else if (resto) {
      // Remove por número/id
      const num = String(resto).replace(/\D/g, "");
      const antes = dados.lista.length;
      dados.lista = dados.lista.filter(l => String(l).split("@")[0].split(":")[0].replace(/\D/g, "") !== num);
      if (dados.lista.length < antes) removido = num;
    }

    if (!removido) {
      return sock.sendMessage(idChat, { text: "❌ Não achei esse usuário na lista negra." });
    }

    salvar(ARQ, dados);

    await sock.sendMessage(idChat, {
      text: `✅ @${removido} foi removido da lista negra.`,
      mentions: alvoJid ? [alvoJid] : []
    });
  }
},

    {
      nome: "listanegra",
      descricao: "Lista a lista negra",
      async executar({ sock, idChat }) {
        const dados = ler(ARQ_NEGRA, { lista: [] });
        const lista = dados.lista || [];

        if (!lista.length) {
          return sock.sendMessage(idChat, { text: "📭 *Lista negra vazia.*" });
        }

        const linhas = lista.map((l, i) => `┃ ${i + 1}. @${normalizar(l)}`).join("\n");

        await sock.sendMessage(idChat, {
          text: `⛔ *LISTA NEGRA*\n\n> Total: *${lista.length}*\n\n${linhas}`,
          mentions: lista
        });
      }
    },

    // ==============================================
    // 🔰 BEM-VINDO / SAÍDA
    // ==============================================
    {
      nome: "ativar_bemvindo",
      descricao: "Ativa boas-vindas",
      async executar({ sock, idChat }) {
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].bemvindo = true;
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: "✅ *Boas-vindas ATIVADO!*" });
      }
    },

    {
      nome: "desativar_bemvindo",
      descricao: "Desativa boas-vindas",
      async executar({ sock, idChat }) {
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].bemvindo = false;
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: "❌ *Boas-vindas DESATIVADO!*" });
      }
    },

    {
      nome: "textobemvindo",
      descricao: "Define o texto de boas-vindas",
      async executar({ sock, idChat, resto }) {
        if (!resto) return sock.sendMessage(idChat, { text: "❌ Uso: *!textobemvindo <texto>*\n\nUse {user} pra marcar a pessoa." });
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].textoBemvindo = resto;
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: "✅ Texto de boas-vindas salvo!" });
      }
    },

    {
      nome: "midiabemvindo",
      descricao: "Define mídia de boas-vindas",
      async executar({ sock, idChat, msg, downloadMediaMessage }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
          return sock.sendMessage(idChat, { text: "❌ Responda uma foto/vídeo com *!midiabemvindo*" });
        }

        const tipo = quoted.imageMessage ? "image" : "video";
        try {
          const buffer = await downloadMediaMessage(
            { key: { remoteJid: ctx.remoteJid || idChat, id: ctx.stanzaId, fromMe: false }, message: quoted },
            "buffer", {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          );

          const ext = tipo === "image" ? "jpg" : "mp4";
          const ARQ = path.join(__dirname, "..", "dados", `bemvindo_${idChat}.${ext}`);
          fs.mkdirSync(path.dirname(ARQ), { recursive: true });
          fs.writeFileSync(ARQ, buffer);

          const dados = ler(ARQ_GRUPOS, {});
          if (!dados[idChat]) dados[idChat] = {};
          dados[idChat].midiaBemvindo = { tipo, arquivo: `bemvindo_${idChat}.${ext}` };
          salvar(ARQ_GRUPOS, dados);

          await sock.sendMessage(idChat, { text: `✅ Mídia de boas-vindas salva! (${tipo})` });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    },

    {
      nome: "textosaiu",
      descricao: "Define o texto de saída",
      async executar({ sock, idChat, resto }) {
        if (!resto) return sock.sendMessage(idChat, { text: "❌ Uso: *!textosaiu <texto>*\n\nUse {user} pra marcar." });
        const dados = ler(ARQ_GRUPOS, {});
        if (!dados[idChat]) dados[idChat] = {};
        dados[idChat].textoSaiu = resto;
        salvar(ARQ_GRUPOS, dados);
        await sock.sendMessage(idChat, { text: "✅ Texto de saída salvo!" });
      }
    },

    {
      nome: "midiasaiu",
      descricao: "Define mídia de saída",
      async executar({ sock, idChat, msg, downloadMediaMessage }) {
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
          return sock.sendMessage(idChat, { text: "❌ Responda uma foto/vídeo com *!midiasaiu*" });
        }

        const tipo = quoted.imageMessage ? "image" : "video";
        try {
          const buffer = await downloadMediaMessage(
            { key: { remoteJid: ctx.remoteJid || idChat, id: ctx.stanzaId, fromMe: false }, message: quoted },
            "buffer", {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          );

          const ext = tipo === "image" ? "jpg" : "mp4";
          const ARQ = path.join(__dirname, "..", "dados", `saiu_${idChat}.${ext}`);
          fs.mkdirSync(path.dirname(ARQ), { recursive: true });
          fs.writeFileSync(ARQ, buffer);

          const dados = ler(ARQ_GRUPOS, {});
          if (!dados[idChat]) dados[idChat] = {};
          dados[idChat].midiaSaiu = { tipo, arquivo: `saiu_${idChat}.${ext}` };
          salvar(ARQ_GRUPOS, dados);

          await sock.sendMessage(idChat, { text: `✅ Mídia de saída salva! (${tipo})` });
        } catch (e) {
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    }
  ]
};
