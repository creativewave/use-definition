/**
 * Babel configuration (transpilation and polyfilling)
 *
 * This is a set of conventions to configure Babel via `process.env` variables.
 *
 * `BABEL_ENV` should define the `modules` definition system that Babel should
 * eventually transform ES modules `import` and `export` statements to: `cjs` or
 * `es`. The latter shouldn't be conflated with `esmodules` for `targets` (more
 * below). When not defined, a bundler should do this by itself using `umd`.
 *
 * `NODE_ENV` should define the processing context. When its's `undefined`, it
 * means that it's a package that will be used by an application (more below).
 * When it's `test`, Babel should use `cjs` and transpile for the current Node
 * version. Other values might be `development` or `production`, optionally
 * prefixed with `server/` or `client/`. When prefixed with `client/`, it should
 * transpile for the corresponding `browsers` targets defined in `package.json`.
 *
 * When `targets` is `esmodules`, Babel transpiles for a set of browsers that
 * supports ES modules. Ideally, a package should use ES modules but shouldn't
 * be transpilled. The bundler would resolve its import statements by using its
 * output path defined in the `module` field in `package.json` (instead of the
 * `main` field corresponding to the `cjs` version), bundling it using the set
 * of targets defined by the application. But this can't be easily achieved yet,
 * because it means that all `node_modules` would need to be compiled or that
 * the author should include/exclude modules to transpile or not.
 *
 * Related:
 * - https://webpack.js.org/guides/author-libraries/#final-steps
 * - https://babeljs.io/blog/2018/06/26/on-consuming-and-publishing-es2015+-packages
 * - https://philipwalton.com/articles/deploying-es2015-code-in-production-today/
 */
const { BABEL_ENV, NODE_ENV } = process.env
const modules = (BABEL_ENV === 'cjs' || NODE_ENV === 'test') ? 'cjs' : false
const targets = NODE_ENV === 'test' ? { node: true } : BABEL_ENV === 'es' ? { esmodules: true } : undefined
const { corejs, useBuiltIns } = BABEL_ENV === 'es' ? {} : { corejs: 3, useBuiltIns: 'usage' }

module.exports = {
    presets: [['@babel/preset-env', { corejs, modules, targets, useBuiltIns }]],
}
