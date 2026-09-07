const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

// The notebook's domains are the single source of truth for the playable data.
const SUSPEITOS = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda'];
const ARMAS = ['Castiçal', 'Faca', 'Corda', 'Revólver', 'Troféu', 'Veneno'];
const COMODOS = ['Biblioteca', 'Cozinha', 'Sala de Estar', 'Escritório', 'Quarto', 'Sala de Jantar'];
const VITIMAS = ['Alberto', 'Beatriz', 'Cláudia', 'Roberto'];
const HORARIOS = ['21:00', '21:10', '21:20', '21:30', '21:40', '21:50'];

const pick = (items) => items[Math.floor(Math.random() * items.length)];
function sample(items, count) {
  const copy = [...items];
  const out = [];
  while (out.length < count && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}
function minutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
function horaStr(total) {
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function gerarCasoOculto() {
  const vitima = pick(VITIMAS);
  const assassino = pick(SUSPEITOS);
  const arma = pick(ARMAS);
  const comodo = pick(COMODOS);
  const horarioCrime = pick(HORARIOS);
  const motivos = {
    Ana: 'conflito financeiro',
    Bruno: 'segredo profissional',
    Carlos: 'disputa por herança',
    Daniela: 'vingança pessoal',
    Eduardo: 'chantagem',
    Fernanda: 'conflito familiar',
  };
  const rotaAssassino = [...sample(COMODOS.filter((x) => x !== comodo), 2), comodo];
  const acessoAssassino = sample(COMODOS, 3);
  if (!acessoAssassino.includes(comodo)) acessoAssassino[acessoAssassino.length - 1] = comodo;
  const alibis = {};
  const credibilidade = {};
  for (const suspect of SUSPEITOS) {
    const local = pick(COMODOS.filter((x) => x !== comodo));
    alibis[suspect] = `Afirma ter permanecido no(a) ${local}.`;
    credibilidade[suspect] = Number((suspect === assassino ? 0.42 + Math.random() * 0.30 : 0.72 + Math.random() * 0.24).toFixed(2));
  }
  return { vitima, assassino, arma, comodo, horarioCrime, motivo: motivos[assassino], rotaAssassino, acessoAssassino, alibis, credibilidade };
}

class MundoObservavel {
  constructor(caso) {
    this._caso = caso;
    this._catalogo = new Map();
    this._criarCatalogo();
  }
  _add(obs) { this._catalogo.set(obs.id, obs); }
  _criarCatalogo() {
    const c = this._caso;
    this._add({ id: 'cena_01', categoria: 'cena', titulo: 'Vestígios na cena', descricao: `Há sinais de confronto no(a) ${c.comodo}. A análise indica que o evento principal ocorreu nesse ambiente.`, fonte: 'Perícia da cena', confiabilidade: 0.94, alvoTipo: 'comodo', alvo: c.comodo });
    this._add({ id: 'tempo_01', categoria: 'temporal', titulo: 'Janela temporal', descricao: `Os registros indicam uma janela provável entre ${horaStr(minutos(c.horarioCrime) - 10)} e ${horaStr(minutos(c.horarioCrime) + 10)}.`, fonte: 'Relógio da vítima', confiabilidade: 0.91, timestamp: c.horarioCrime });
    this._add({ id: 'arma_01', categoria: 'pericia', titulo: 'Assinatura do instrumento', descricao: 'O padrão dos vestígios é compatível com um instrumento específico, mas a análise não é 100% conclusiva.', fonte: 'Laboratório forense', confiabilidade: 0.87, alvoTipo: 'arma', alvo: c.arma });
    COMODOS.forEach((room, i) => {
      const isCrimeRoom = room === c.comodo;
      this._add({ id: `local_${i}`, categoria: 'local', titulo: `Inspeção — ${room}`, descricao: isCrimeRoom ? 'Foram encontrados vestígios relevantes, marcas de confronto e alteração na disposição dos objetos.' : 'A inspeção não encontrou sinais fortes de que este ambiente seja o ponto principal.', fonte: 'Perícia de campo', confiabilidade: isCrimeRoom ? 0.92 : 0.84, alvoTipo: 'comodo', alvo: room });
    });
    SUSPEITOS.forEach((suspect, i) => {
      const isKiller = suspect === c.assassino;
      let cameraDescription;
      let cameraConfidence;
      if (isKiller) {
        cameraDescription = `A câmera registra ${suspect} circulando próximo à área investigada durante parte da janela temporal.`;
        cameraConfidence = 0.88;
      } else if (Math.random() < 0.35) {
        cameraDescription = `A câmera registra ${suspect} circulando próximo à área investigada em algum momento.`;
        cameraConfidence = 0.76;
      } else {
        cameraDescription = `A câmera não registra ${suspect} na área investigada durante a maior parte da janela.`;
        cameraConfidence = 0.83;
      }
      this._add({ id: `camera_${i}`, categoria: 'camera', titulo: `Câmera — ${suspect}`, descricao: cameraDescription, fonte: 'Sistema de CFTV', confiabilidade: cameraConfidence, alvoTipo: 'suspeito', alvo: suspect, timestamp: c.horarioCrime });
      let accessDescription;
      let accessConfidence;
      if (isKiller) {
        accessDescription = `Há registro de acesso associado a ${suspect} próximo da área investigada.`;
        accessConfidence = 0.86;
      } else if (Math.random() < 0.30) {
        accessDescription = `Há um registro de acesso associado a ${suspect}, mas fora do núcleo da janela.`;
        accessConfidence = 0.72;
      } else {
        accessDescription = `Não há registro de acesso de ${suspect} à área investigada na janela analisada.`;
        accessConfidence = 0.82;
      }
      this._add({ id: `acesso_${i}`, categoria: 'acesso', titulo: `Acesso — ${suspect}`, descricao: accessDescription, fonte: 'Controle eletrônico de portas', confiabilidade: accessConfidence, alvoTipo: 'suspeito', alvo: suspect, timestamp: c.horarioCrime });
      this._add({ id: `testemunha_${i}`, categoria: 'testemunha', titulo: `Testemunha — ${suspect}`, descricao: isKiller ? `Uma testemunha relata ter visto ${suspect} em uma região próxima da cena.` : `Uma testemunha relata ter visto ${suspect} em outro setor da residência.`, fonte: 'Testemunha', confiabilidade: 0.64, alvoTipo: 'suspeito', alvo: suspect });
    });
    this._add({ id: 'vitima_01', categoria: 'identificacao', titulo: 'Identificação da vítima', descricao: `A perícia confirmou a identidade da vítima como ${c.vitima}.`, fonte: 'Instituto de identificação', confiabilidade: 0.99, alvoTipo: 'vitima', alvo: c.vitima });
  }
  listarAcoes() {
    return [...COMODOS.map((x) => `investigar:${x}`), ...SUSPEITOS.flatMap((x) => [`camera:${x}`, `acesso:${x}`, `testemunha:${x}`]), 'pericia:arma', 'pericia:cena', 'pericia:tempo', 'identificar:vítima'];
  }
  observar(acao) {
    const [prefix, target] = String(acao).split(':', 2);
    let id;
    if (prefix === 'investigar') id = `local_${COMODOS.indexOf(target)}`;
    else if (['camera', 'acesso', 'testemunha'].includes(prefix)) id = `${prefix}_${SUSPEITOS.indexOf(target)}`;
    else if (prefix === 'pericia') id = { arma: 'arma_01', cena: 'cena_01', tempo: 'tempo_01' }[target];
    else if (prefix === 'identificar') id = 'vitima_01';
    else throw new Error('Ação inválida.');
    const obs = this._catalogo.get(id);
    if (!obs) throw new Error('Ação inválida.');
    return { ...obs };
  }
}

class MotorBayesiano {
  constructor(candidatos) {
    this.candidatos = [...candidatos];
    this.posterior = Object.fromEntries(this.candidatos.map((c) => [c, 1 / this.candidatos.length]));
    this.historico = [{ ...this.posterior }];
  }
  entropia(dist) {
    return Object.values(dist).filter((p) => p > 0).reduce((sum, p) => sum - p * Math.log2(p), 0);
  }
  atualizar(likelihoods) {
    let posterior = Object.fromEntries(this.candidatos.map((c) => [c, this.posterior[c] * Math.max(likelihoods[c] ?? 1, 1e-9)]));
    const total = Object.values(posterior).reduce((a, b) => a + b, 0);
    if (total <= 0) posterior = Object.fromEntries(this.candidatos.map((c) => [c, 1 / this.candidatos.length]));
    else posterior = Object.fromEntries(Object.entries(posterior).map(([c, p]) => [c, p / total]));
    this.posterior = posterior;
    this.historico.push({ ...posterior });
  }
  melhor() { return this.candidatos.reduce((best, c) => this.posterior[c] > this.posterior[best] ? c : best, this.candidatos[0]); }
  confianca() { return this.posterior[this.melhor()]; }
}

class InferenciaInvestigador {
  constructor() {
    this.motores = { assassino: new MotorBayesiano(SUSPEITOS), arma: new MotorBayesiano(ARMAS), comodo: new MotorBayesiano(COMODOS), vitima: new MotorBayesiano(VITIMAS) };
  }
  entropiaTotal() { return Object.values(this.motores).reduce((sum, m) => sum + m.entropia(m.posterior), 0); }
  aplicarEvidencia(obs) { this._assassino(obs); this._arma(obs); this._comodo(obs); this._vitima(obs); }
  _assassino(obs) {
    const likelihoods = Object.fromEntries(SUSPEITOS.map((s) => [s, 1]));
    const r = obs.confiabilidade;
    if (obs.alvoTipo === 'suspeito') {
      likelihoods[obs.alvo] = 1 + 2.8 * r;
      if (obs.categoria === 'acesso' && obs.descricao.includes('Não há registro')) likelihoods[obs.alvo] = Math.max(0.25, 1 - 0.75 * r);
      if (obs.categoria === 'camera' && obs.descricao.toLowerCase().includes('não registra')) likelihoods[obs.alvo] = Math.max(0.30, 1 - 0.65 * r);
    }
    this.motores.assassino.atualizar(likelihoods);
  }
  _arma(obs) {
    const likelihoods = Object.fromEntries(ARMAS.map((a) => [a, 1]));
    if (obs.alvoTipo === 'arma') likelihoods[obs.alvo] = 1 + 7 * obs.confiabilidade;
    this.motores.arma.atualizar(likelihoods);
  }
  _comodo(obs) {
    const likelihoods = Object.fromEntries(COMODOS.map((c) => [c, 1]));
    if (obs.alvoTipo === 'comodo') likelihoods[obs.alvo] = 1 + (obs.categoria === 'cena' ? 7 : 5) * obs.confiabilidade;
    this.motores.comodo.atualizar(likelihoods);
  }
  _vitima(obs) {
    const likelihoods = Object.fromEntries(VITIMAS.map((v) => [v, 1]));
    if (obs.alvoTipo === 'vitima') likelihoods[obs.alvo] = 1 + 20 * obs.confiabilidade;
    this.motores.vitima.atualizar(likelihoods);
  }
}

class SistemaInterrogatorio {
  constructor(caso) { this._caso = caso; this.contador = 0; }
  perguntar(suspeito, pergunta) {
    const c = this._caso;
    this.contador += 1;
    let resposta;
    if (String(pergunta).toLowerCase().includes('onde') || String(pergunta).toLowerCase().includes('estava')) resposta = c.alibis[suspeito];
    else if (suspeito === c.assassino) resposta = pick(['Não lembro exatamente. Foi uma noite confusa.', 'Eu estava ocupado e não prestei atenção no horário.', 'Não acho que essa informação seja relevante.', 'Já expliquei onde estava.']);
    else resposta = pick([c.alibis[suspeito], 'Minha movimentação pode ser conferida nos registros.', 'Não tenho motivo para esconder onde estive.']);
    let contradicao;
    let detalhe = '';
    if (suspeito === c.assassino) {
      contradicao = Math.random() < 0.72;
      if (contradicao) detalhe = 'A declaração apresenta incompatibilidade com pelo menos um registro temporal independente.';
    } else {
      contradicao = Math.random() < 0.12;
      if (contradicao) detalhe = 'Foi encontrada uma pequena inconsistência de horário, que pode ser erro de memória.';
    }
    const confiabilidade = Math.min(0.98, c.credibilidade[suspeito] + (contradicao ? 0.10 : 0));
    return { id: `int_${this.contador}`, suspeito, pergunta, resposta, confiabilidade, contradicao, detalhe, timestamp: c.horarioCrime };
  }
}

class AgenteInvestigador {
  constructor(mundo) {
    this.mundo = mundo;
    this.inferencia = new InferenciaInvestigador();
    this.evidencias = [];
    this.interrogatorios = [];
    this.acoesExecutadas = [];
    this.historicoAcao = [];
    this.grafo = { nodes: [], edges: [] };
    this.turno = 0;
    this.pontos = 100;
  }
  hasNode(id) { return this.grafo.nodes.some((n) => n.id === id); }
  addNode(node) { if (!this.hasNode(node.id)) this.grafo.nodes.push(node); }
  addEdge(source, target) { if (!this.grafo.edges.some((e) => e.source === source && e.target === target)) this.grafo.edges.push({ source, target }); }
  registrarEvidencia(obs) {
    if (this.evidencias.some((e) => e.id === obs.id)) return false;
    this.evidencias.push(obs);
    this.inferencia.aplicarEvidencia(obs);
    this.addNode({ id: `E:${obs.id}`, tipo: 'evidencia', titulo: obs.titulo });
    if (obs.alvo) {
      this.addNode({ id: `${obs.alvoTipo}:${obs.alvo}`, tipo: obs.alvoTipo, nome: obs.alvo });
      this.addEdge(`E:${obs.id}`, `${obs.alvoTipo}:${obs.alvo}`);
    }
    return true;
  }
  executarAcao(acao) {
    if (this.acoesExecutadas.includes(acao)) return null;
    const antes = this.inferencia.entropiaTotal();
    const obs = this.mundo.observar(acao);
    if (!this.registrarEvidencia(obs)) return null;
    const depois = this.inferencia.entropiaTotal();
    this.turno += 1;
    this.acoesExecutadas.push(acao);
    this.historicoAcao.push({ turno: this.turno, acao, entropiaAntes: antes, entropiaDepois: depois, ganhoInformacao: antes - depois });
    this.pontos -= 2;
    return obs;
  }
  interrogar(sistema, suspeito, pergunta) {
    const chave = `interrogar:${suspeito}`;
    if (this.acoesExecutadas.includes(chave)) return null;
    const antes = this.inferencia.entropiaTotal();
    const resultado = sistema.perguntar(suspeito, pergunta);
    this.interrogatorios.push(resultado);
    const likelihoods = Object.fromEntries(SUSPEITOS.map((s) => [s, 1]));
    likelihoods[suspeito] = resultado.contradicao ? 1 + 3.8 * resultado.confiabilidade : Math.max(0.35, 1 - 0.55 * resultado.confiabilidade);
    this.inferencia.motores.assassino.atualizar(likelihoods);
    this.addNode({ id: `I:${resultado.id}`, tipo: 'interrogatorio', titulo: `Interrogatório de ${suspeito}` });
    this.addNode({ id: `suspeito:${suspeito}`, tipo: 'suspeito', nome: suspeito });
    this.addEdge(`I:${resultado.id}`, `suspeito:${suspeito}`);
    const depois = this.inferencia.entropiaTotal();
    this.turno += 1;
    this.acoesExecutadas.push(chave);
    this.historicoAcao.push({ turno: this.turno, acao: chave, entropiaAntes: antes, entropiaDepois: depois, ganhoInformacao: antes - depois });
    this.pontos -= 3;
    return resultado;
  }
  candidatosDisponiveis() {
    return [...this.mundo.listarAcoes().filter((a) => !this.acoesExecutadas.includes(a)), ...SUSPEITOS.map((s) => `interrogar:${s}`).filter((a) => !this.acoesExecutadas.includes(a))];
  }
  escolherProximaAcao() {
    const candidatos = this.candidatosDisponiveis();
    if (!candidatos.length) return null;
    const ent = Object.fromEntries(Object.entries(this.inferencia.motores).map(([nome, motor]) => [nome, motor.entropia(motor.posterior)]));
    let best = null;
    for (const acao of candidatos) {
      let score = 0;
      if (/^(camera|acesso|testemunha|interrogar):/.test(acao)) score += ent.assassino * 1.25;
      else if (acao.startsWith('investigar:')) score += ent.comodo * 1.20;
      else if (acao === 'pericia:arma') score += ent.arma * 1.50;
      else if (acao === 'pericia:cena') score += ent.comodo * 1.10;
      else if (acao === 'pericia:tempo') score += ent.assassino * 0.60;
      else if (acao === 'identificar:vítima') score += ent.vitima * 1.50;
      score += Math.random() * 0.08;
      if (!best || score > best.score) best = { score, acao };
    }
    return best.acao;
  }
  melhoresHipoteses() { return Object.fromEntries(Object.entries(this.inferencia.motores).map(([key, motor]) => [key, { melhor: motor.melhor(), confianca: motor.confianca(), posterior: motor.posterior }])); }
}

function brierScore(probabilidades, verdade) { return Object.entries(probabilidades).reduce((sum, [candidate, p]) => sum + (p - (candidate === verdade ? 1 : 0)) ** 2, 0); }
function logLoss(probabilidades, verdade) { return -Math.log(Math.max(probabilidades[verdade] ?? 1e-12, 1e-12)); }
function avaliar(agent, caso) {
  const truth = { vitima: caso.vitima, assassino: caso.assassino, arma: caso.arma, comodo: caso.comodo };
  const rows = Object.entries(truth).map(([variable, real]) => {
    const motor = agent.inferencia.motores[variable];
    const prediction = motor.melhor();
    return { variavel: variable, verdade: real, predicao: prediction, acertou: prediction === real, confiancaPredicao: motor.posterior[prediction], brier: brierScore(motor.posterior, real), logLoss: logLoss(motor.posterior, real), entropiaFinal: motor.entropia(motor.posterior) };
  });
  return { linhas: rows, accuracy: rows.filter((r) => r.acertou).length / rows.length, brierMedio: rows.reduce((s, r) => s + r.brier, 0) / rows.length, logLossMedio: rows.reduce((s, r) => s + r.logLoss, 0) / rows.length };
}

function novoCaso() {
  const casoOculto = gerarCasoOculto();
  const mundo = new MundoObservavel(casoOculto);
  const agente = new AgenteInvestigador(mundo);
  const interrogatorio = new SistemaInterrogatorio(casoOculto);
  return { casoOculto, mundo, agente, interrogatorio, solutionRevealed: false };
}
const sessoes = new Map();

function publicState(game) {
  const { agente, casoOculto, solutionRevealed } = game;
  const hypotheses = agente.melhoresHipoteses();
  const recommendation = agente.escolherProximaAcao();
  return {
    turno: agente.turno,
    pontos: agente.pontos,
    entropiaTotal: agente.inferencia.entropiaTotal(),
    hypotheses,
    evidencias: agente.evidencias,
    interrogatorios: agente.interrogatorios,
    acoesExecutadas: agente.acoesExecutadas,
    historicoAcao: agente.historicoAcao,
    grafo: agente.grafo,
    recomendacao: recommendation,
    acoesDisponiveis: agente.candidatosDisponiveis(),
    solutionRevealed,
    solution: solutionRevealed ? { vitima: casoOculto.vitima, assassino: casoOculto.assassino, arma: casoOculto.arma, comodo: casoOculto.comodo, horarioCrime: casoOculto.horarioCrime, motivo: casoOculto.motivo, rotaAssassino: casoOculto.rotaAssassino, acessoAssassino: casoOculto.acessoAssassino } : null,
  };
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 100000) reject(new Error('Payload muito grande.')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('JSON inválido.')); } });
    req.on('error', reject);
  });
}

function gameForRequest(req, res) {
  const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
  const existingId = cookies.find((part) => part.startsWith('nocturne_session='))?.split('=')[1];
  let sessionId = existingId && sessoes.has(existingId) ? existingId : crypto.randomUUID();
  if (!sessoes.has(sessionId)) sessoes.set(sessionId, novoCaso());
  if (sessionId !== existingId) res.setHeader('Set-Cookie', `nocturne_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
  return sessoes.get(sessionId);
}

function executeAssistant(game) {
  const { agente, interrogatorio } = game;
  const acao = agente.escolherProximaAcao();
  if (!acao) return { acao: null, evento: null };
  if (acao.startsWith('interrogar:')) {
    const suspect = acao.split(':')[1];
    const pergunta = pick(['Onde você estava no horário do crime?', 'Você passou pela área investigada?', 'Explique sua movimentação durante a noite.']);
    return { acao, evento: agente.interrogar(interrogatorio, suspect, pergunta) };
  }
  return { acao, evento: agente.executarAcao(acao) };
}

async function api(req, res, url) {
  const game = gameForRequest(req, res);
  const { agente, casoOculto } = game;
  try {
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, { state: publicState(game) });
    if (req.method === 'POST' && url.pathname === '/api/reset') {
      const replacement = novoCaso();
      const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
      const sessionId = cookies.find((part) => part.startsWith('nocturne_session='))?.split('=')[1];
      if (sessionId) sessoes.set(sessionId, replacement);
      return json(res, 200, { state: publicState(replacement), message: 'Novo caso criado.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      const body = await parseBody(req);
      const obs = agente.executarAcao(body.action);
      if (!obs) return json(res, 409, { error: 'Essa ação já foi executada.', state: publicState(game) });
      return json(res, 200, { eventType: 'evidence', event: obs, state: publicState(game) });
    }
    if (req.method === 'POST' && url.pathname === '/api/interrogate') {
      const body = await parseBody(req);
      if (!SUSPEITOS.includes(body.suspeito)) return json(res, 400, { error: 'Suspeito inválido.' });
      const result = agente.interrogar(game.interrogatorio, body.suspeito, String(body.pergunta || 'Onde você estava no horário do crime?').slice(0, 500));
      if (!result) return json(res, 409, { error: 'Este suspeito já foi interrogado.', state: publicState(game) });
      return json(res, 200, { eventType: result.contradicao ? 'contradiction' : 'interrogation', event: result, state: publicState(game) });
    }
    if (req.method === 'POST' && url.pathname === '/api/assistant') {
      const result = executeAssistant(game);
      return json(res, 200, { eventType: result.event?.contradicao ? 'contradiction' : 'assistant', event: result.event, action: result.acao, state: publicState(game) });
    }
    if (req.method === 'POST' && url.pathname === '/api/solve') {
      const body = await parseBody(req);
      const accusation = { vitima: body.vitima, assassino: body.assassino, arma: body.arma, comodo: body.comodo };
      const truth = { vitima: casoOculto.vitima, assassino: casoOculto.assassino, arma: casoOculto.arma, comodo: casoOculto.comodo };
      const results = Object.fromEntries(Object.keys(truth).map((key) => [key, accusation[key] === truth[key]]));
      const hits = Object.values(results).filter(Boolean).length;
      game.solutionRevealed = true;
      const revelation = { ...truth, horarioCrime: casoOculto.horarioCrime, motivo: casoOculto.motivo };
      return json(res, 200, { outcome: { accusation, truth: revelation, results, hits, total: 4, metrics: avaliar(agente, casoOculto) }, state: publicState(game) });
    }
    return json(res, 404, { error: 'Rota não encontrada.' });
  } catch (error) {
    return json(res, 400, { error: error.message || 'Erro inesperado.', state: publicState(game) });
  }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, service: 'nocturne-investigation' }));
  }
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  const requested = url.pathname === '/' ? '/static/index.html' : url.pathname;
  const filePath = path.normalize(path.join(ROOT, requested));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});
if (require.main === module) {
  server.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`NOCTURNE online at http://localhost:${PORT}`));
}

module.exports = { api };
