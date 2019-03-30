
// BABEL_ENV: module definition system (esm, cjs, or false ie. handled by webpack)
// NODE_ENV: test or bundle development/production client/server app
const { BABEL_ENV, NODE_ENV } = process.env
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'cjs' : false
const targets = NODE_ENV === 'test' ? { node: true } : BABEL_ENV === 'test' ? { esmodules: true } : undefined

module.exports = {
    presets: [['@babel/preset-env', { corejs: 3, modules, targets, useBuiltIns: 'usage' }]],
}
