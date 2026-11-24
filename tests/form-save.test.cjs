const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/components/generics/Form.js'), 'utf8');
const method = source.slice(source.indexOf('  save = (data) => {'), source.indexOf('\n  render()'));
const SaveHarness = new Function(`return class { ${method} }`)();

for (const asynchronous of [false, true]) {
  test(`Form invokes ${asynchronous ? 'async' : 'sync'} save after committing saving state`, () => {
    const form = new SaveHarness();
    const calls = [];
    const data = { status: 'IN_PROGRESS' };
    let callback;
    form.props = { save: (value) => {
      assert.equal(value, data);
      calls.push('save');
      return asynchronous ? Promise.resolve() : undefined;
    } };
    form.setState = (state, afterCommit) => {
      assert.deepEqual(state, { saving: true });
      assert.equal(typeof afterCommit, 'function');
      calls.push('state');
      callback = afterCommit;
    };
    form.save(data);
    assert.deepEqual(calls, ['state']);
    assert.equal(callback(), undefined);
    assert.deepEqual(calls, ['state', 'save']);
  });
}
