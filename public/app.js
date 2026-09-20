const $ = (sel) => document.querySelector(sel);

const els = {
  prompt: $('#prompt'),
  chips: $('#chips'),
  sizeSeg: $('#sizeSeg'),
  generate: $('#generate'),
  genLabel: $('.gen-label'),
  hint: $('#hint'),
  stateIdle: $('#stateIdle'),
  stateLoading: $('#stateLoading'),
  stateResult: $('#stateResult'),
  stateError: $('#stateError'),
  status: $('#status'),
  resultImg: $('#resultImg'),
  download: $('#download'),
  copy: $('#copy'),
  again: $('#again'),
  retry: $('#retry'),
  errMsg: $('#errMsg'),
  history: $('#history'),
  historyGrid: $('#historyGrid'),
};

const EXAMPLES = [
  '一只在键盘上打字的橘猫，插画风格，柔和光影',
  '极简几何图形海报，莫兰迪色系，高级感',
  '一杯热气腾腾的咖啡，俯拍，商业摄影，浅景深',
  '未来主义城市天际线，赛博朋克，霓虹色调',
  '手绘水彩花卉图案，白色背景，清新淡雅',
  '3D 立体字母图标，玻璃质感，柔和渐变',
];

const STATUS = [
  '正在解析提示词…',
  '正在构思画面构图…',
  '正在渲染细节…',
  '正在润色光影…',
  '即将完成…',
];

let currentSize = '1024x1024';
let currentPrompt = '';
let lastSrc = '';
let loading = false;
let statusTimer = null;
const history = []; // { prompt, size, src }

/* ---------- 初始化 ---------- */
function initChips() {
  els.chips.innerHTML = '';
  EXAMPLES.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = p;
    b.addEventListener('click', () => {
      els.prompt.value = p;
      els.hint.textContent = '';
      els.prompt.focus();
    });
    els.chips.appendChild(b);
  });
}

function initSize() {
  els.sizeSeg.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.sizeSeg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      currentSize = btn.dataset.size;
    });
  });
}

/* ---------- 状态切换 ---------- */
function show(state) {
  els.stateIdle.hidden = true;
  els.stateLoading.hidden = true;
  els.stateResult.hidden = true;
  els.stateError.hidden = true;
  if (state === 'idle') els.stateIdle.hidden = false;
  else if (state === 'loading') els.stateLoading.hidden = false;
  else if (state === 'result') els.stateResult.hidden = false;
  else if (state === 'error') els.stateError.hidden = false;
}

/* ---------- 等待动效：状态文案轮播 ---------- */
function startStatusCycle() {
  let i = 0;
  els.status.textContent = STATUS[0];
  statusTimer = setInterval(() => {
    i = (i + 1) % STATUS.length;
    els.status.textContent = STATUS[i];
  }, 3200);
}
function stopStatusCycle() {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

function setLoading(on) {
  loading = on;
  els.generate.disabled = on;
  els.prompt.disabled = on;
  els.generate.classList.toggle('loading', on);
  els.genLabel.textContent = on ? '生成中…' : '生成图片';
}

/* ---------- 生成 ---------- */
async function generate() {
  const prompt = els.prompt.value.trim();
  if (!prompt) {
    els.hint.textContent = '请先输入提示词';
    els.prompt.focus();
    return;
  }
  if (loading) return;

  currentPrompt = prompt;
  els.hint.textContent = '';
  show('loading');
  setLoading(true);
  startStatusCycle();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: currentSize }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.image) {
      throw new Error(data.error || `生成失败（${res.status}）`);
    }

    lastSrc = data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
    els.resultImg.src = lastSrc;
    show('result');
    addHistory({ prompt, size: currentSize, src: lastSrc });
  } catch (e) {
    els.errMsg.textContent = e.message || '未知错误';
    show('error');
  } finally {
    stopStatusCycle();
    setLoading(false);
  }
}

/* ---------- 下载 / 复制 ---------- */
function downloadImage() {
  if (!lastSrc) return;
  const b64 = lastSrc.split(',')[1] || lastSrc;
  const binary = atob(b64); // 先把 base64 解码成二进制字符串
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `material-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyPrompt() {
  if (!currentPrompt) return;
  try {
    await navigator.clipboard.writeText(currentPrompt);
    els.copy.textContent = '已复制';
    setTimeout(() => { els.copy.textContent = '复制提示词'; }, 1500);
  } catch {
    els.copy.textContent = '复制失败';
    setTimeout(() => { els.copy.textContent = '复制提示词'; }, 1500);
  }
}

/* ---------- 历史记录（仅会话内） ---------- */
function addHistory(item) {
  history.unshift(item);
  renderHistory();
}
function renderHistory() {
  els.history.hidden = history.length === 0;
  els.historyGrid.innerHTML = '';
  history.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'hist-card';
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.prompt;
    img.loading = 'lazy';
    card.title = item.prompt;
    card.appendChild(img);
    card.addEventListener('click', () => {
      lastSrc = item.src;
      currentPrompt = item.prompt;
      els.resultImg.src = item.src;
      show('result');
    });
    els.historyGrid.appendChild(card);
  });
}

/* ---------- 事件绑定 ---------- */
els.generate.addEventListener('click', generate);
els.download.addEventListener('click', downloadImage);
els.copy.addEventListener('click', copyPrompt);
els.again.addEventListener('click', generate);
els.retry.addEventListener('click', generate);
els.prompt.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});

initChips();
initSize();
