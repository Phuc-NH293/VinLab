const frontendUrl = 'http://127.0.0.1:5173';
const apiUrl = 'http://127.0.0.1:8000/api';
const debuggingUrl = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9222';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function login(username) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'VinLab@123' }),
  });
  if (!response.ok) throw new Error(`Login ${username} failed: ${response.status}`);
  return response.json();
}

async function connectCdp() {
  const targets = await fetch(`${debuggingUrl}/json/list`).then(response => response.json());
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('Chrome page target not found');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  let sequence = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params);
  });

  return {
    send(method, params = {}) {
      const id = ++sequence;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(method, listener) {
      const current = listeners.get(method) || [];
      current.push(listener);
      listeners.set(method, current);
    },
    close() {
      socket.close();
    },
  };
}

async function main() {
  const cdp = await connectCdp();
  const errors = [];
  let currentCase = 'bootstrap';

  cdp.on('Runtime.exceptionThrown', params => {
    errors.push({
      case: currentCase,
      type: 'exception',
      text: params.exceptionDetails.exception?.description || params.exceptionDetails.text,
    });
  });
  cdp.on('Runtime.consoleAPICalled', params => {
    if (params.type !== 'error') return;
    errors.push({
      case: currentCase,
      type: 'console',
      text: params.args.map(item => item.value || item.description || '').join(' '),
    });
  });

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }

  async function openRole(username, path) {
    currentCase = `${username}:${path}`;
    const session = await login(username);
    await cdp.send('Page.navigate', { url: `${frontendUrl}${path}` });
    await sleep(700);
    await evaluate(`
      localStorage.setItem('vinlab-access-token', ${JSON.stringify(session.access_token)});
      localStorage.setItem('vinlab-user', ${JSON.stringify(JSON.stringify(session.user))});
      location.reload();
    `);
    await sleep(1800);
    return session.user;
  }

  async function assertScreen(label) {
    await sleep(900);
    const state = await evaluate(`({
      title: document.title,
      pageError: Boolean(document.querySelector('.page-error, .root-error')),
      body: document.body.innerText.slice(0, 500)
    })`);
    if (state.pageError) {
      errors.push({ case: currentCase, type: 'screen', text: `${label}: ${state.body}` });
    }
    console.log(`${state.pageError ? 'FAIL' : 'PASS'} ${label}`);
  }

  async function clickButton(text) {
    currentCase = `${currentCase.split(' -> ')[0]} -> ${text}`;
    const clicked = await evaluate(`
      (() => {
        const button = [...document.querySelectorAll('button')]
          .find(item => item.innerText.trim().includes(${JSON.stringify(text)}));
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    if (!clicked) {
      errors.push({ case: currentCase, type: 'navigation', text: `Button not found: ${text}` });
      return;
    }
    await assertScreen(text);
  }

  for (const [path, label] of [
    ['/teacher/dashboard', 'teacher dashboard'],
    ['/teacher/attendance/create', 'teacher sessions'],
    ['/teacher/classes', 'teacher students'],
  ]) {
    await openRole('gv001', path);
    await assertScreen(label);
  }

  await openRole('admin001', '/admin/dashboard');
  await assertScreen('admin dashboard');
  for (const tab of ['Phòng Lab', 'Lớp & môn', 'Thời khóa biểu', 'Học liệu', 'Face Vector DB', 'Cảnh báo', 'Báo cáo', 'Nhật ký']) {
    await clickButton(tab);
  }

  for (const [path, label] of [
    ['/student/home', 'student portal'],
    ['/student/check-in', 'student check-in'],
    ['/student/socratic', 'student socratic'],
  ]) {
    await openRole('sv001', path);
    await assertScreen(label);
  }

  cdp.close();

  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    setTimeout(() => process.exit(1), 50);
    return;
  }
  console.log('Runtime smoke test passed for teacher, admin, and student screens.');
  setTimeout(() => process.exit(0), 50);
}

main().catch(error => {
  console.error(error);
  setTimeout(() => process.exit(1), 50);
});
