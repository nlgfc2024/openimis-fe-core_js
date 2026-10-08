// Exercise actual thunks/reducers with redux-api-middleware 3.x and mocked HTTP.
// Babel is already a build dependency; node:test requires Node 18+.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const { createStore, applyMiddleware } = require('redux');
const { createMiddleware } = require('redux-api-middleware');
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '../src', file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }], '@babel/preset-react'],
  }).code;
  const localRequire = (name) => {
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(file), name + '.js')));
    if (name === 'react' || name.startsWith('@material-ui/')) return {};
    if (name === '@sentry/react') return { captureException() {} };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const actions = load('actions.js');
const api = load('helpers/api.js');
const reducer = load('reducer.js').default;
const { authMiddleware } = load('middlewares.js');
let requests, events, store, replies;
const okUser = { id: 1, username: 'test', rights: [] };
const csrf = { data: { getCsrfToken: { csrfToken: 'server-session-token' } } };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ok = (body) => reply(200, body);
const unauthorized = () => reply(401, { detail: 'Authentication credentials were not provided.' });
function setup(core = {}) {
  requests = []; events = []; replies = [];
  const http = async (url, options) => {
    requests.push({ url, ...options });
    assert.ok(replies.length, `Unexpected request ${url}`);
    return replies.shift()();
  };
  const thunk = ({ dispatch, getState }) => (next) => (action) => typeof action === 'function' ? action(dispatch, getState) : next(action);
  const record = () => (next) => (action) => { events.push(action); return next(action); };
  store = createStore((state = { core: { ...reducer(undefined, {}), ...core } }, action) => ({ core: reducer(state.core, action) }), applyMiddleware(thunk, createMiddleware({ fetch: http }), authMiddleware, record));
}
beforeEach(() => {
  const values = new Map();
  global.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  global.document = { cookie: '' };
  setup();
});
const dialogs = () => events.filter((a) => ['CORE_ALERT', 'CORE_CONFIRM'].includes(a.type));
const boot = () => store.dispatch(actions.initialize());

test('anonymous boot: one refresh, cleanup, no fatal error or expiry dialog', async () => {
  replies.push(unauthorized, unauthorized, () => ok({ data: {} }));
  await boot();
  assert.equal(requests.length, 3);
  assert.equal(store.getState().core.isInitialized, true);
  assert.equal(store.getState().core.user, null);
  assert.equal(store.getState().core.error, null);
  assert.equal(store.getState().core.authError, null);
  assert.equal(dialogs().length, 0);
  assert.equal(events.filter((a) => a.type === 'CORE_AUTH_LOGOUT').length, 1);
});
for (const credential of ['Django cookie without marker', 'JWT cookie']) {
  test(`${credential}: server-first boot and session CSRF setup`, async () => {
    replies.push(() => ok(okUser), () => ok(csrf));
    await boot();
    assert.equal(requests[0].method, 'GET');
    assert.match(requests[0].url, /\/core\/users\/current_user\/$/);
    assert.deepEqual(store.getState().core.user, okUser);
    assert.equal(requests.length, 2);
    assert.equal(localStorage.getItem('csrfToken'), 'server-session-token');
  });
}
test('expired JWT silently refreshes once and retries current_user', async () => {
  replies.push(unauthorized, () => ok({ data: { refreshToken: { refreshExpiresIn: 42 } } }), () => ok(okUser), () => ok(csrf));
  await boot();
  assert.deepEqual(store.getState().core.user, okUser);
  assert.equal(requests.filter((r) => r.body?.includes('mutation refreshAuthToken')).length, 1);
  assert.equal(dialogs().length, 0);
});
test('HTTP 200 refresh errors cannot masquerade as refresh success', async () => {
  replies.push(unauthorized, () => ok({ errors: [{ message: 'Invalid refresh token' }] }), () => ok({ data: {} }));
  await boot();
  assert.equal(requests.filter((r) => r.method === 'GET').length, 1);
  assert.equal(store.getState().core.user, null);
});
test('public routes do not probe or refresh', async () => {
  await store.dispatch(actions.initialize({ publicRoute: true }));
  assert.equal(requests.length, 0);
  assert.equal(store.getState().core.isInitialized, true);
});
for (const status of [200, 403]) {
  test(`permission denial HTTP ${status} preserves user and response`, async () => {
    setup({ user: okUser, isInitialized: true });
    replies.push(() => reply(status, { errors: [{ message: 'User not authorized for this operation' }] }));
    const result = await store.dispatch(actions.graphql('{ restricted }'));
    assert.ok(result.payload);
    assert.deepEqual(store.getState().core.user, okUser);
    assert.equal(events.filter((a) => a.type === 'CORE_CONFIRM').length, 0);
  });
}
test('current_user 403 preserves user, 401 clears user without fatal error', async () => {
  setup({ user: okUser, isInitialized: true });
  replies.push(() => reply(403, { detail: 'Forbidden' }), unauthorized);
  await store.dispatch(actions.loadUser());
  assert.deepEqual(store.getState().core.user, okUser);
  await store.dispatch(actions.loadUser());
  assert.equal(store.getState().core.user, null);
  assert.equal(store.getState().core.error, null);
});
test('concurrent 401 requests retain their errors and show one expiry confirmation', async () => {
  setup({ user: okUser, isInitialized: true });
  replies.push(unauthorized, unauthorized);
  const results = await Promise.all([store.dispatch(actions.graphql('{ a }')), store.dispatch(actions.graphql('{ b }'))]);
  assert.ok(results.every((a) => a.error && a.payload.status === 401));
  assert.equal(dialogs().length, 1);
  assert.equal(dialogs()[0].type, 'CORE_CONFIRM');
  assert.equal(events.filter((a) => a.type === 'CORE_AUTH_ERR').length, 0);
});
test('pre-initialization protected failures show no session UI', async () => {
  replies.push(unauthorized);
  await store.dispatch(actions.graphql('{ a }'));
  assert.equal(dialogs().length, 0);
});
test('precise CSRF detection excludes schema and permission errors', () => {
  for (const message of ['csrftoken', 'unauthorized', 'permission denied', 'Cannot query field getCsrfToken']) assert.equal(api.isSessionError(200, [{ message }]), false);
  assert.equal(api.isSessionError(200, [{ message: 'CSRF token missing or incorrect.' }]), true);
  assert.equal(api.actionRequiresAuthentication({ payload: { response: { status: 401 } } }), true);
});
test('live cookie overrides stale storage, with exact cookie name and rotation', () => {
  localStorage.setItem('csrfToken', 'stale');
  document.cookie = 'csrftoken_extra=wrong;csrftoken=fresh';
  assert.equal(api.getCsrfToken(), 'fresh');
  api.storeCsrfToken('masked-session');
  assert.equal(api.getCsrfToken(), 'masked-session');
  document.cookie = 'csrftoken=rotated';
  assert.equal(api.getCsrfToken(), 'rotated');
});
test('session-based CSRF storage and non-browser guards', () => {
  localStorage.setItem('csrfToken', 'session-only');
  assert.equal(api.getCsrfToken(), 'session-only');
  delete global.document; delete global.localStorage;
  assert.equal(api.getCsrfToken(), null);
});
test('periodic/no-arg login does not refresh a valid Django-only session', async () => {
  setup({ user: okUser, isInitialized: true });
  replies.push(() => ok(okUser), () => ok(csrf));
  const result = await store.dispatch(actions.login());
  assert.equal(result.loginStatus, 'CORE_USERS_CURRENT_USER_RESP');
  assert.equal(dialogs().length, 0);
  assert.equal(requests.some((r) => r.body?.includes('refreshToken')), false);
});
test('password-expiry response preserves the custom login workflow', async () => {
  replies.push(() => ok({ data: { tokenAuth: { passwordExpired: true, username: 'test', resetEmailSent: true } } }));
  const result = await store.dispatch(actions.login({ username: 'test', password: 'test-only' }));
  assert.equal(result.loginStatus, 'CORE_AUTH_PASSWORD_EXPIRED');
  assert.equal(result.resetEmailSent, true);
  assert.equal(requests.length, 1);
});
test('established session refresh does not rotate the masked CSRF token every timer tick', async () => {
  setup({ user: okUser, isInitialized: true });
  localStorage.setItem('csrfToken', 'existing');
  replies.push(() => ok(okUser));
  await store.dispatch(actions.login());
  assert.equal(requests.length, 1);
  assert.equal(localStorage.getItem('csrfToken'), 'existing');
});
test('valid refresh followed by another 401 logs out once without looping', async () => {
  replies.push(unauthorized, () => ok({ data: { refreshToken: { refreshExpiresIn: 42 } } }), unauthorized, unauthorized);
  await boot();
  assert.equal(requests.length, 4);
  assert.equal(events.filter((a) => a.type === 'CORE_AUTH_LOGOUT').length, 1);
  assert.equal(dialogs().length, 0);
});
test('recognized CSRF failure returns GraphQL payload and only one dialog', async () => {
  setup({ user: okUser, isInitialized: true });
  replies.push(() => ok({ errors: [{ message: 'CSRF token missing or incorrect.' }] }));
  const result = await store.dispatch(actions.graphql('{ a }'));
  assert.equal(result.payload.errors.length, 1);
  assert.equal(dialogs().length, 1);
  assert.equal(events.filter((a) => a.type === 'CORE_AUTH_LOGOUT').length, 0);
});
test('request metadata and failure action survive middleware intact', async () => {
  replies.push(unauthorized);
  const result = await store.dispatch(actions.graphql('{ a }', 'MODULE_REQUEST', { custom: 12 }));
  assert.equal(result.type, 'MODULE_REQUEST_ERR');
  assert.equal(result.error, true);
  assert.equal(result.meta.custom, 12);
});
test('successful custom credential login stores CSRF and preserves expiry warning', async () => {
  replies.push(() => ok({ data: { tokenAuth: { refreshExpiresIn: 42, passwordExpiryWarning: true, passwordExpiresInDays: 3 } } }), () => ok(csrf), () => ok(okUser));
  const result = await store.dispatch(actions.login({ username: 'test', password: 'test-only' }));
  assert.equal(result.loginStatus, 'CORE_USERS_CURRENT_USER_RESP');
  assert.equal(result.passwordExpiryWarning, true);
  assert.equal(result.passwordExpiresInDays, 3);
  assert.equal(localStorage.getItem('csrfToken'), 'server-session-token');
});
