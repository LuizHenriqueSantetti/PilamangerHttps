// Operational helper: secrets are accepted only through hidden stdin.
process.stdin.setRawMode?.(true);
process.stdin.resume();
console.log('Ready for recovery JSON on hidden stdin.');
const raw = await new Promise(resolve => {
  let input = '';
  const receive = chunk => { input += chunk.toString(); if (input.includes('\u0003')) process.exit(130);
    if (/[\r\n]/.test(input)) { process.stdin.off('data', receive); resolve(input.trim()); } };
  process.stdin.on('data', receive);
});
process.stdin.setRawMode?.(false); process.stdin.pause();
const config = JSON.parse(raw);
const origin = 'https://pilamanager-nova-experiencia.luizsantetti.chatgpt.site';
const headers = { 'Content-Type': 'application/json', Origin: origin, 'OAI-Sites-Authorization': `Bearer ${config.serviceToken}` };
const recover = () => fetch(origin + '/api/auth/recovery', { method: 'POST', headers, body: JSON.stringify({ token: config.token, newPassword: config.password }) });
if (config.mode === 'disabled') {
  const response = await recover();
  if (response.status !== 404) throw Error(`Recovery not disabled: HTTP ${response.status}`);
  console.log(JSON.stringify({ recoveryDisabled: true }));
} else {
  const recovery = await recover();
  if (recovery.status !== 200) throw Error(`Recovery failed: HTTP ${recovery.status}`);
  const replay = await recover();
  if (replay.status !== 404) throw Error(`Recovery reuse not rejected: HTTP ${replay.status}`);
  const login = await fetch(origin + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: config.email, password: config.password }) });
  if (login.status !== 200) throw Error(`Login verification failed: HTTP ${login.status}`);
  const body = await login.json();
  if (body.user?.email !== config.email || body.user?.mustChangePassword) throw Error('Unexpected account state');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw Error('Session cookie missing');
  const access = await fetch(origin + '/api/storage', { headers: { ...headers, Cookie: cookie } });
  if (access.status !== 200) throw Error(`Protected access failed: HTTP ${access.status}`);
  await access.body?.cancel();
  const logout = await fetch(origin + '/api/auth/logout', { method: 'POST', headers: { ...headers, Cookie: cookie }, body: '{}' });
  if (!logout.ok) throw Error('Verification session logout failed');
  console.log(JSON.stringify({ recovered: true, loginVerified: true, protectedAccessVerified: true, recoveryReuseRejected: true }));
}
