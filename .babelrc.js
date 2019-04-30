
// BABEL_ENV: module definition system (cjs, es, or handled by webpack if undefined)
// NODE_ENV: execution context (test or - bundle - development/production - client or server app)
const { BABEL_ENV, NODE_ENV } = process.env
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'cjs' : false
const targets = NODE_ENV === 'test' ? { node: true } : BABEL_ENV === 'es' ? { esmodules: true } : undefined
const { corejs, useBuiltIns } = NODE_ENV === 'test' ? { corejs: 3, useBuiltIns: 'usage' } : {}

module.exports = {
    presets: [['@babel/preset-env', { corejs, modules, targets, useBuiltIns }]],
}
