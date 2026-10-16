const fs = require("fs");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");

// 👇 MUDE PRA SEU USUÁRIO E REPO
const GITHUB_USER = "pauloj222-hue";
const GITHUB_REPO = "hoshino-updates";
const GITHUB_BRANCH = "main";

const PROTEGIDOS = ["auth", "dados", "node_modules", "personalize_aqui", "config.js", ".git"];

function copiarRecursivo(origem, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const item of fs.readdirSync(origem)) {
    const o = path.join(origem, item);
    const d = path.join(destino, item);
    if (fs.statSync(o).isDirectory()) copiarRecursivo(o, d);
    else fs.copyFileSync(o, d);
  }
}

module.exports = {
  comandos: [
    {
      nome: "atualizar",
      descricao: "Atualiza o bot pelo GitHub",
      async executar({ sock, idChat }) {
        await sock.sendMessage(idChat, {
          text: "🔄 *ATUALIZANDO...*\n\n> Baixando do GitHub..."
        });

        try {
          const url = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/archive/refs/heads/${GITHUB_BRANCH}.zip`;
          const r = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
          const zip = new AdmZip(Buffer.from(r.data));

          const temp = path.join(__dirname, "..", "temp_up");
          if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true, force: true });
          fs.mkdirSync(temp, { recursive: true });
          zip.extractAllTo(temp, true);

          const pastas = fs.readdirSync(temp).filter(f => fs.statSync(path.join(temp, f)).isDirectory());
          const origem = path.join(temp, pastas[0]);
          const raiz = path.join(__dirname, "..");

          let copiados = 0;
          for (const item of fs.readdirSync(origem)) {
            if (PROTEGIDOS.includes(item)) continue;
            const o = path.join(origem, item);
            const d = path.join(raiz, item);
            if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
            if (fs.statSync(o).isDirectory()) copiarRecursivo(o, d);
            else fs.copyFileSync(o, d);
            copiados++;
          }

          fs.rmSync(temp, { recursive: true, force: true });

          await sock.sendMessage(idChat, {
            text:
              `✅ *BOT ATUALIZADO!*\n\n` +
              `> 📦 ${copiados} arquivos atualizados\n` +
              `> 🔄 Reiniciando em 5s...`
          });

          setTimeout(() => process.exit(0), 5000);
        } catch (e) {
          console.log("Erro atualizar:", e.message);
          await sock.sendMessage(idChat, { text: `❌ Erro: ${e.message}` });
        }
      }
    }
  ]
};
