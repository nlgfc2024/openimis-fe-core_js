const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');
const React = require('react');

function render(props = {}) {
  const effects = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/components/inputs/Autocomplete.js'), 'utf8');
  const { code } = babel.transformSync(source, {
    babelrc: false, configFile: false,
    presets: [require.resolve('@babel/preset-react')],
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const identity = (component) => component;
  const dependencies = {
    react: { ...React, useState: () => [true, () => {}], useEffect: (effect) => effects.push(effect) },
    '@material-ui/core/styles': { withTheme: identity, withStyles: () => identity },
    '@material-ui/lab': { Autocomplete: 'Autocomplete' }, '@material-ui/core': { TextField: 'TextField' },
    '../../helpers/hooks': { useDebounceCb: (callback) => callback },
    '../../helpers/i18n': { useTranslations: () => ({ formatMessage: (key) => key }) },
    '../../helpers/modules': { useModulesManager: () => ({ getConf: (_, __, fallback) => fallback }) },
  };
  const output = { exports: {} };
  new Function('module', 'exports', 'require', code)(output, output.exports, (name) => {
    if (!(name in dependencies)) throw new Error(name);
    return dependencies[name];
  });
  return { control: output.exports.default({ classes: {}, options: [], ...props }), effects };
}

test('opening and searching without onInputChange is safe', () => {
  const { control, effects } = render();
  assert.doesNotThrow(() => control.props.onOpen());
  effects.forEach((effect) => assert.doesNotThrow(effect));
  assert.doesNotThrow(() => control.props.onInputChange(null, 'search'));
});

test('provided input callback still receives search text', () => {
  const inputs = [];
  const { control } = render({ onInputChange: (value) => inputs.push(value) });
  control.props.onInputChange(null, 'search');
  assert.deepEqual(inputs, ['search']);
});
