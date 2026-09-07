const app = document.getElementById('app');
const toast = document.getElementById('toast');
const SUSPEITOS = ['Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda'];
const ARMAS = ['Castiçal', 'Faca', 'Corda', 'Revólver', 'Troféu', 'Veneno'];
const COMODOS = ['Biblioteca', 'Cozinha', 'Sala de Estar', 'Escritório', 'Quarto', 'Sala de Jantar'];
const VITIMAS = ['Alberto', 'Beatriz', 'Cláudia', 'Roberto'];
const QUESTIONS = ['Onde você estava no horário do crime?', 'Você passou pela área investigada?', 'Explique sua movimentação durante a noite.'];
const accentColors = ['#8ee5e4', '#e4b878', '#c78c9e', '#9fbf92', '#a7a1e2', '#d69b70'];

let state = null;
let view = 'map';
let selectedRoom = null;
let selectedSuspect = null;
let selectedWeapon = ARMAS[0];
let lastOutcome = null;
let toastTimer = null;
const soundtrack = { audio: null, playing: false };

function getSoundtrack() {
  if (!soundtrack.audio) {
    soundtrack.audio = new Audio('/static/assets/undercover-spy-agent.mp3');
    soundtrack.audio.loop = true;
    soundtrack.audio.volume = .45;
    soundtrack.audio.preload = 'auto';
  }
  return soundtrack.audio;
}
function startSoundtrack() {
  const audio = getSoundtrack();
  audio.play().then(() => {
    soundtrack.playing = true;
    render();
  }).catch(() => {
    soundtrack.playing = false;
    showToast('Som indisponível', 'Não foi possível iniciar a trilha', 'Confirme se o arquivo de música foi publicado.', 'danger');
    render();
  });
}
function stopSoundtrack() {
  if (!soundtrack.audio || !soundtrack.playing) return;
  soundtrack.audio.pause();
  soundtrack.playing = false;
}
function toggleSoundtrack() {
  if (soundtrack.playing) stopSoundtrack(); else startSoundtrack();
  render();
}

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Não foi possível completar a ação.');
  if (payload.state) state = payload.state;
  if (payload.outcome) lastOutcome = payload.outcome;
  return payload;
}
function slug(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function assetPath(kind, value) {
  const name = slug(value);
  if (kind === 'rooms') return `/static/assets/generated/room-${name}.png`;
  if (kind === 'suspects') return `/static/assets/generated/suspect-${name}.png`;
  if (kind === 'weapons') return `/static/assets/generated/weapons/${name}.png`;
  return `/static/assets/generated/${name}.png`;
}
function assetFallbackPath(kind, value) {
  return `/static/assets/generated/${kind}/${slug(value)}.png`;
}
function assetImg(kind, value, alt, className) {
  const primary = assetPath(kind, value);
  const fallback = assetFallbackPath(kind, value);
  return `<img class="${className}" src="${primary}" onerror="this.onerror=null;this.src='${fallback}'" alt="${esc(alt)}">`;
}
function assetBackgroundStyle(kind, value) {
  return `background-image:url('${assetPath(kind, value)}'),url('${assetFallbackPath(kind, value)}')`;
}
function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function actionDone(action) { return state?.acoesExecutadas?.includes(action); }
function evidenceForRoom(room) { return state.evidencias.filter((e) => e.alvoTipo === 'comodo' && e.alvo === room); }
function suspectIndex(name) { return SUSPEITOS.indexOf(name); }
function showToast(kicker, title, body, type = '') {
  toast.className = `toast show ${type}`;
  toast.innerHTML = `<div class="toast-kicker">${esc(kicker)}</div><strong>${esc(title)}</strong><p>${esc(body)}</p>`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 6500);
}
function nav(label, target, active = view === target) { return `<button class="${active ? 'active' : ''}" data-nav="${target}">${label}</button>`; }
function shell(content) {
  const actionLabel = state?.recomendacao ? formatAction(state.recomendacao) : 'Nenhuma ação restante';
  return `<div class="game-shell"><header class="topbar"><div class="brand-compact"><i></i><span>NOCTURNE // CASE 01</span></div><nav class="nav">${nav('Mansão', 'map')}${nav('Arquivo', 'dossier')}${nav('Investigados', 'suspects')}${nav('Armas', 'armory')}${nav('Solução', 'solution')}</nav><div class="status-readout"><button class="sound-toggle ${soundtrack.playing ? 'playing' : ''}" id="sound-toggle" aria-pressed="${soundtrack.playing}">${soundtrack.playing ? '♪ Som ligado' : '♪ Som desligado'}</button><span class="status-dot"></span><span>TURNO <b>${String(state.turno).padStart(2, '0')}</b></span><span>PRÓXIMO <b>${esc(actionLabel)}</b></span></div></header><div class="main">${content}</div></div>`;
}
function startScreen() {
  app.innerHTML = `<section class="start-screen"><div class="start-backdrop"></div><div class="start-cinematic-panels" aria-label="Referência visual cinematográfica"><div class="cinematic-panel detective"></div><div class="cinematic-panel mansion"></div></div><div class="start-content"><div class="brand-mark">NOCTURNE // INVESTIGATION ARCHIVE</div><h1>O silêncio<br><span>também deixa vestígios</span></h1><p class="intro">Uma morte aconteceu dentro de uma mansão. A verdade permanece protegida no arquivo do Game Master. Entre na cena, siga os sinais e deixe que cada decisão reduza a incerteza.</p><div class="start-meta"><span>CLASSIFICAÇÃO<strong>CASO OCULTO</strong></span><span>PROTOCOLO<strong>INVESTIGAÇÃO AUTÔNOMA</strong></span><span>ESTADO<strong>SEM SOLUÇÃO</strong></span></div><button class="btn primary" id="start-game">Iniciar investigação</button></div></section>`;
  document.getElementById('start-game').onclick = () => { startSoundtrack(); view = 'map'; render(); };
}
function formatAction(action) {
  if (!action) return '—';
  const [prefix, target] = action.split(':');
  const labels = { investigar: 'inspecionar ambiente', camera: 'rever CFTV', acesso: 'verificar acesso', testemunha: 'ouvir testemunha', interrogar: `interrogar ${target}`, pericia: `perícia: ${target}`, identificar: 'identificar vítima' };
  return labels[prefix] || action;
}
function signalLines() {
  return Object.entries(state.hypotheses).map(([key, info]) => `<div class="signal-line"><span>${esc(key)}</span><div class="bar"><i style="width:${Math.round(info.confianca * 100)}%"></i></div><b>${Math.round(info.confianca * 100)}%</b></div>`).join('');
}
function renderMap() {
  return `<div class="section-heading"><div><div class="eyebrow">Fase 01 // terreno</div><h2>A mansão ainda está falando.</h2></div><p>Escolha um ambiente e entre na cena. O arquivo registra somente aquilo que o investigador realmente encontrou.</p></div><div class="map-layout"><div class="floorplan"><div class="plan-caption">PLANTA OBSERVÁVEL // ACESSO AUTORIZADO</div><div class="plan-cross"></div>${COMODOS.map((room, i) => { const done = actionDone(`investigar:${room}`); const clue = evidenceForRoom(room).length; return `<button class="room-node ${done ? 'investigated' : ''} ${clue ? 'has-clue' : ''}" data-room="${esc(room)}">${assetImg('rooms', room, `${room} ilustrado`, 'room-thumb')}<span class="room-number">0${i + 1} / ${done ? 'VISTO' : 'NÃO VISTO'}</span><strong>${esc(room)}</strong><small>${clue ? `${clue} sinal no arquivo` : 'inspeção disponível'}</small></button>`; }).join('')}</div><aside class="map-aside"><div class="aside-note">A casa não é uma lista de destinos. É um <em>campo de suspeitas</em>. Comece por onde sua intuição mandar.</div><div class="intel-frame"><div class="eyebrow">Leitura do investigador</div><h3>O próximo movimento parece ser</h3><div class="intel-line"><span>ação</span><b>${esc(formatAction(state.recomendacao))}</b></div><div class="intel-line"><span>evidências</span><b>${state.evidencias.length}</b></div><div class="intel-line"><span>incerteza</span><b>${state.entropiaTotal.toFixed(2)} bits</b></div><div class="signal"><div class="eyebrow">Sinais de hipótese</div>${signalLines()}</div></div><button class="btn gold" id="assistant-action">Pedir orientação à IA</button><button class="btn" id="new-case">Abrir um novo caso</button></aside></div>`;
}
function renderRoom() {
  const room = selectedRoom || COMODOS[0];
  const roomEvidence = evidenceForRoom(room);
  const action = `investigar:${room}`;
  return `<div class="room-header"><div><button class="btn ghost back" data-nav="map">← voltar à planta</button><div class="eyebrow">Ambiente  //  ${esc(room)}</div><h2>${esc(room)}</h2></div><div class="small muted">${actionDone(action) ? 'AMBIENTE JÁ REGISTRADO' : 'INSPEÇÃO PENDENTE'}</div></div><div class="room-stage room-${slug(room)}"><div class="room-backdrop" style="${assetBackgroundStyle('rooms', room)}" aria-hidden="true"></div>${assetImg('rooms', room, `${room} ilustrado`, 'room-art')}<div class="room-reference-photo" aria-hidden="true"></div><span class="scene-label">VISÃO DE CAMPO // REGISTRO ${String(COMODOS.indexOf(room) + 1).padStart(2, '0')}</span><span class="scene-index">LIVE / OBSERVAÇÃO</span><div class="room-glow"></div><div class="scan-line"></div><div class="investigation-pod"><div class="eyebrow">Ponto investigável</div><p>${actionDone(action) ? 'O ambiente já foi traduzido em uma observação. O arquivo guarda o que foi encontrado.' : 'A leitura visual não entrega a resposta. Autorize a inspeção para transformar este ambiente em evidência.'}</p><button class="btn ${actionDone(action) ? '' : 'primary'}" id="inspect-room" ${actionDone(action) ? 'disabled' : ''}>${actionDone(action) ? 'Inspeção arquivada' : 'Investigar ambiente'}</button></div><div class="room-evidence-list">${roomEvidence.length ? `<div class="eyebrow">Vestígios arquivados</div>${roomEvidence.map((e) => `<span class="evidence-chip">${esc(e.titulo)}</span>`).join('')}` : ''}</div></div>`;
}
function renderDossier() {
  const nodes = state.grafo.nodes || [];
  const width = 1000, height = 680;
  const positions = {};
  const evidence = nodes.filter((n) => n.tipo === 'evidencia');
  const others = nodes.filter((n) => n.tipo !== 'evidencia');
  evidence.forEach((n, i) => { positions[n.id] = { x: 50 + (i % 3) * 25, y: 28 + Math.floor(i / 3) * 26 }; });
  others.forEach((n, i) => { positions[n.id] = { x: 14 + (i % 2) * 72, y: 16 + (Math.floor(i / 2) * 19) % 72 }; });
  const lines = (state.grafo.edges || []).map((edge) => { const a = positions[edge.source], b = positions[edge.target]; return a && b ? `<line class="mural-line" x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%"></line>` : ''; }).join('');
  const cards = nodes.map((node) => { const p = positions[node.id]; const label = node.tipo === 'evidencia' || node.tipo === 'interrogatorio' ? node.titulo : node.nome; return p ? `<div class="mural-node ${esc(node.tipo)}" style="left:${p.x}%;top:${p.y}%"><span>${esc(node.tipo)}</span>${esc(label)}</div>` : ''; }).join('');
  return `<div class="section-heading"><div><div class="eyebrow">Fase 03 // arquivo</div><h2>As linhas começam a se tocar.</h2></div><p>O mural nasce das observações e dos interrogatórios do investigador. Nenhuma conexão é adicionada fora da lógica existente.</p></div><div class="dossier-layout"><div class="mural">${nodes.length ? `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${lines}</svg>${cards}` : `<div class="empty"><div><strong>O mural está em branco.</strong>Encontre uma observação ou abra um interrogatório para criar o primeiro vínculo.</div></div>`}</div><aside class="intel-frame"><div class="eyebrow">Arquivo de evidências</div><h3>${state.evidencias.length} registros preservados</h3><div class="evidence-stream">${state.evidencias.length ? state.evidencias.map((e) => `<article class="evidence-entry"><div class="eyebrow">${esc(e.categoria)} // ${Math.round(e.confiabilidade * 100)}%</div><h4>${esc(e.titulo)}</h4><p>${esc(e.descricao)}</p><div class="meta">${esc(e.fonte)}${e.alvo ? ` · ${esc(e.alvo)}` : ''}</div></article>`).join('') : `<div class="empty" style="min-height:190px">Nenhuma observação foi arquivada.</div>`}</div></aside></div>`;
}
function portrait(name, index, large = false) { return `<div class="portrait" style="--accent:${accentColors[index % accentColors.length]};--ref-pos:${index % 2}">${assetImg('suspects', name, `Retrato ilustrado de ${name}`, 'portrait-art')}<div class="portrait-reference-photo" aria-hidden="true"></div><span class="portrait-tag">BIOMETRIC FILE // 0${index + 1}</span><span class="portrait-scan"></span></div>`; }
function renderSuspects() {
  return `<div class="section-heading"><div><div class="eyebrow">Fase 02 // pessoas</div><h2>Ninguém depõe sem deixar um eco.</h2></div><p>Os investigados são os seis nomes existentes no caso. Escolha um arquivo e faça uma única pergunta: o interrogatório é uma ação do investigador.</p></div><div class="character-gallery">${SUSPEITOS.map((name, i) => { const done = state.interrogatorios.some((r) => r.suspeito === name); return `<article class="character-frame"><div class="portrait-wrap">${portrait(name, i)}</div><div class="character-copy"><h3>${esc(name)}</h3><p>${done ? 'interrogatório registrado' : 'arquivo de suspeito // disponível'}</p><button class="btn ${done ? '' : 'primary'}" data-suspect="${esc(name)}" ${done ? 'disabled' : ''}>${done ? 'Ouvido pelo investigador' : 'Abrir interrogatório'}</button></div></article>`; }).join('')}</div>`;
}
function renderInterrogation() {
  const name = selectedSuspect || SUSPEITOS[0];
  const index = suspectIndex(name);
  const previous = state.interrogatorios.filter((r) => r.suspeito === name);
  return `<div class="room-header"><div><button class="btn ghost back" data-nav="suspects">← voltar aos investigados</button><div class="eyebrow">Arquivo de suspeito // interrogatório</div><h2>${esc(name)}</h2></div><div class="small muted">${previous.length ? 'REGISTRO COMPLETO' : 'UMA OPORTUNIDADE'}</div></div><div class="interrogate-layout"><div class="interrogate-portrait">${portrait(name, index, true)}<div class="character-copy"><h3>${esc(name)}</h3><p>suspeito // investigação ativa</p></div></div><div class="dialogue"><div class="eyebrow">Investigador // selecione uma pergunta</div><div class="quote">“A verdade costuma aparecer no intervalo entre duas versões.”</div><div class="question-list">${QUESTIONS.map((q) => `<button data-question="${esc(q)}" ${previous.length ? 'disabled' : ''}>${esc(q)}</button>`).join('')}</div><div class="custom-question"><input id="question-input" placeholder="Ou escreva sua própria pergunta" ${previous.length ? 'disabled' : ''}/><button class="btn" id="custom-question" ${previous.length ? 'disabled' : ''}>Perguntar</button></div><div class="answer-log">${previous.length ? previous.map((r) => `<div class="answer"><div class="answer-q">${esc(r.pergunta)}</div><p class="${r.contradicao ? 'contradiction' : ''}">${esc(r.resposta)}</p>${r.contradicao ? `<p class="contradiction small">⚠ Possível contradição: ${esc(r.detalhe)}</p>` : ''}</div>`).join('') : '<div class="small muted" style="padding-top:18px">O arquivo ainda não contém uma declaração deste investigado.</div>'}</div></div></div>`;
}
function renderArmory() {
  const analyzed = actionDone('pericia:arma');
  const weaponEvidence = state.evidencias.find((e) => e.alvoTipo === 'arma');
  return `<div class="section-heading"><div><div class="eyebrow">Fase 02 // objeto</div><h2>O instrumento também depõe.</h2></div><p>A perícia de arma existente no caso não escolhe uma nova regra: ela apenas traduz o padrão de vestígios em uma assinatura compatível.</p></div><div class="armory-layout"><div class="weapon-stage">${assetImg('weapons', selectedWeapon, `${selectedWeapon} ilustrado`, 'weapon-art')}<div class="weapon-label">${esc(selectedWeapon)}<small>${analyzed ? 'assinatura forense arquivada' : 'objeto em catálogo // hipótese'}</small></div></div><aside><div class="eyebrow">Catálogo de instrumentos</div><div class="weapon-catalogue">${ARMAS.map((weapon, i) => `<button class="weapon-item ${selectedWeapon === weapon ? 'selected' : ''}" data-weapon="${esc(weapon)}">${assetImg('weapons', weapon, '', 'weapon-thumb')}<span>${esc(weapon)}</span><small>0${i + 1}</small></button>`).join('')}</div><div class="weapon-analysis"><div class="eyebrow">Ação observável</div><h3>${analyzed ? 'Resultado preservado' : 'Analisar assinatura'}</h3><p class="small muted">${analyzed ? esc(weaponEvidence?.descricao || 'A observação do laboratório foi arquivada.') : 'Uma única perícia conecta o instrumento real a uma evidência, sem revelar mais do que o mundo observável permite.'}</p><button class="btn ${analyzed ? '' : 'primary'}" id="analyze-weapon" ${analyzed ? 'disabled' : ''}>${analyzed ? 'Perícia arquivada' : 'Executar perícia de arma'}</button></div></aside></div>`;
}
function renderSolution() {
  if (state.solutionRevealed && lastOutcome) return renderReveal();
  const opts = (items) => items.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  return `<div class="solution"><div class="section-heading"><div><div class="eyebrow">Fase final // acusação</div><h2>Apresente sua teoria.</h2></div><p>O caso compara a acusação com os quatro eixos que a lógica original avalia. O Game Master só abre o arquivo depois da sua escolha.</p></div><p class="solution-intro">Não é preciso ter certeza absoluta. É preciso decidir quais sinais você acredita que contam.</p><div class="solution-form"><div class="choice"><label>Vítima</label><select id="solve-vitima">${opts(VITIMAS)}</select></div><div class="choice"><label>Assassino</label><select id="solve-assassino">${opts(SUSPEITOS)}</select></div><div class="choice"><label>Arma</label><select id="solve-arma">${opts(ARMAS)}</select></div><div class="choice"><label>Cômodo</label><select id="solve-comodo">${opts(COMODOS)}</select></div><button class="btn gold" id="submit-solution">Apresentar solução ao Game Master</button></div></div>`;
}
function renderReveal() {
  const o = lastOutcome; const labels = { vitima: 'Vítima', assassino: 'Assassino', arma: 'Arma', comodo: 'Cômodo' };
  const keys = Object.keys(labels);
  const cards = (source, className, note) => keys.map((key) => `<article class="solution-card ${className} ${className === 'player-card' ? (o.results[key] ? 'correct' : 'incorrect') : ''}"><span>${labels[key]}</span><strong>${esc(source[key])}</strong><small>${note(key)}</small></article>`).join('');
  return `<div class="solution"><div class="eyebrow">Game Master // arquivo aberto</div><div class="reveal"><h3>${o.hits === 4 ? 'Caso solucionado.' : o.hits >= 2 ? 'A verdade apareceu pela metade.' : 'Investigação inconclusiva.'}</h3><p class="intro" style="margin:18px 0 25px 0">A solução protegida agora pode ser comparada com o caminho que você construiu.</p><div class="reveal-comparison"><section class="solution-column"><div class="eyebrow">Sua teoria</div><h4>O que você concluiu</h4><div class="solution-cards">${cards(o.accusation, 'player-card', (key) => o.results[key] ? 'Escolha confirmada ✓' : 'Pista interpretada incorretamente ✕')}</div></section><section class="solution-column truth-column"><div class="eyebrow">Arquivo do Game Master</div><h4>A verdade do mistério</h4><div class="solution-cards">${cards(o.truth, 'truth-card', () => 'Registro confidencial revelado')}</div></section></div><div class="metric-strip"><span>Acertos<b>${o.hits} / ${o.total}</b></span><span>Accuracy<b>${(o.metrics.accuracy * 100).toFixed(1)}%</b></span><span>Brier score<b>${o.metrics.brierMedio.toFixed(4)}</b></span><span>Log loss<b>${o.metrics.logLossMedio.toFixed(4)}</b></span><span>Turnos<b>${state.turno}</b></span></div><div style="margin-top:25px"><div class="eyebrow">Revelação final</div><p class="small" style="color:#d1c6ae;line-height:1.7">O crime aconteceu às ${esc(o.truth.horarioCrime)}, no(a) ${esc(o.truth.comodo)}. O motivo registrado pelo Game Master é ${esc(o.truth.motivo)}.</p></div></div><button class="btn" id="reset-after-solution" style="margin-top:18px">Iniciar novo caso</button></div>`;
}
function render() {
  if (!state) return startScreen();
  let content = view === 'map' ? renderMap() : view === 'room' ? renderRoom() : view === 'dossier' ? renderDossier() : view === 'suspects' ? renderSuspects() : view === 'interrogate' ? renderInterrogation() : view === 'armory' ? renderArmory() : renderSolution();
  app.innerHTML = shell(content);
  bindEvents();
}
function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((el) => el.onclick = () => { view = el.dataset.nav; render(); });
  document.querySelectorAll('.room-node').forEach((el) => el.onclick = () => { selectedRoom = el.dataset.room; view = 'room'; render(); });
  document.querySelectorAll('[data-suspect]').forEach((el) => el.onclick = () => { selectedSuspect = el.dataset.suspect; view = 'interrogate'; render(); });
  document.querySelectorAll('[data-question]').forEach((el) => el.onclick = () => askQuestion(el.dataset.question));
  document.querySelectorAll('[data-weapon]').forEach((el) => el.onclick = () => { selectedWeapon = el.dataset.weapon; render(); });
  document.getElementById('sound-toggle')?.addEventListener('click', toggleSoundtrack);
  document.getElementById('inspect-room')?.addEventListener('click', () => doAction(`investigar:${selectedRoom}`));
  document.getElementById('assistant-action')?.addEventListener('click', assistantAction);
  document.getElementById('new-case')?.addEventListener('click', resetCase);
  document.getElementById('analyze-weapon')?.addEventListener('click', () => doAction('pericia:arma'));
  document.getElementById('custom-question')?.addEventListener('click', () => askQuestion(document.getElementById('question-input').value || QUESTIONS[0]));
  document.getElementById('submit-solution')?.addEventListener('click', submitSolution);
  document.getElementById('reset-after-solution')?.addEventListener('click', resetCase);
}
async function doAction(action) {
  try { const payload = await api('/api/action', { method: 'POST', body: JSON.stringify({ action }) }); lastOutcome = null; showToast('Nova evidência', payload.event.titulo, payload.event.descricao); render(); } catch (error) { showToast('Arquivo', 'Ação indisponível', error.message, 'danger'); }
}
async function askQuestion(question) {
  if (!selectedSuspect) return;
  try { const payload = await api('/api/interrogate', { method: 'POST', body: JSON.stringify({ suspeito: selectedSuspect, pergunta: question }) }); lastOutcome = null; showToast(payload.event.contradicao ? 'Contradição detectada' : 'Declaração arquivada', selectedSuspect, payload.event.resposta, payload.event.contradicao ? 'danger' : ''); render(); } catch (error) { showToast('Interrogatório', 'Não foi possível perguntar', error.message, 'danger'); }
}
async function assistantAction() {
  try { const payload = await api('/api/assistant', { method: 'POST' }); lastOutcome = null; if (payload.event) showToast('Investigador autônomo', formatAction(payload.action), payload.event.descricao || payload.event.resposta || 'Ação executada pelo protocolo de investigação.', payload.event.contradicao ? 'danger' : ''); render(); } catch (error) { showToast('IA', 'Nenhuma ação executada', error.message, 'danger'); }
}
async function resetCase() {
  try { const payload = await api('/api/reset', { method: 'POST' }); lastOutcome = null; selectedRoom = null; selectedSuspect = null; selectedWeapon = ARMAS[0]; view = 'map'; showToast('Game Master', 'Novo caso criado', 'A solução está protegida.'); render(); } catch (error) { showToast('Arquivo', 'Não foi possível reiniciar', error.message, 'danger'); }
}
async function submitSolution() {
  const body = { vitima: document.getElementById('solve-vitima').value, assassino: document.getElementById('solve-assassino').value, arma: document.getElementById('solve-arma').value, comodo: document.getElementById('solve-comodo').value };
  try { const payload = await api('/api/solve', { method: 'POST', body: JSON.stringify(body) }); showToast('Game Master', payload.outcome.hits === 4 ? 'Caso solucionado' : 'A acusação foi registrada', `${payload.outcome.hits} de ${payload.outcome.total} eixos corretos.`); view = 'solution'; render(); } catch (error) { showToast('Acusação', 'Não foi possível registrar', error.message, 'danger'); }
}

api('/api/state').then(() => startScreen()).catch(() => { app.innerHTML = '<div class="empty" style="min-height:100vh"><div><strong>Arquivo indisponível.</strong>Inicie o servidor local para abrir a investigação.</div></div>'; });
