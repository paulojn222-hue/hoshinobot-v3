const COR = {
  reset: "\x1b[0m",
  branco: "\x1b[37m",
  vermelho: "\x1b[31m",
  verde: "\x1b[32m",
  amarelo: "\x1b[33m",
  azul: "\x1b[34m",
  magenta: "\x1b[35m",
  ciano: "\x1b[36m",
  brilhante: "\x1b[1m"
};

const TEMA = {
  titulo: "\x1b[32m",
  destaque: "\x1b[32m",
  sucesso: "\x1b[32m",
  erro: "\x1b[31m",
  aviso: "\x1b[33m",
  info: "\x1b[34m",
  opcao: "\x1b[33m",
  linha: "\x1b[32m"
};

module.exports = { COR, TEMA };
