/**
 * Babel configuration (transpilation and polyfilling)
 *
 * `BABEL_ENV` will define the `modules` definition system to use to transform
 * import and export statements: `cjs` or `es`. The output will be consumable
 * with `require` for `cjs`, and `import` or `<script type="module">` for `es`.
 * If undefined, it means that Webpack will handle the transformation itself to
 * using the `umd` system, and output a bundle to consume with `<script>`.
 *
 * When `BABEL_ENV` is `cjs` or undefined, Babel should either transpile to ES5
 * or for a set of arbitrary browsers targets.
 * When `BABEL_ENV` is `es`, Babel will (apparently, not documented) transpile
 * for a set of browsers targets supporting ES modules. By assigning the output
 * path to the `module` field in `package.json`, Webpack will use it to import
 * modules instead of the `main` field, assigned with the `cjs` output.
 *
 * Ideally, the source code should use ES modules and its output should not be
 * transpilled at all. It should be bundled by the application using its own set
 * of targets. But this can't be easily achieved for now, as it means that all
 * `node_modules` should be compiled.
 *
 * Related:
 * - https://babeljs.io/blog/2018/06/26/on-consuming-and-publishing-es2015+-packages
 * - https://philipwalton.com/articles/deploying-es2015-code-in-production-today/
 *
 * `NODE_ENV` defines the process context:
 * - `test`: it will "override" the `module` definition system in order to run
 * tests using Mocha or Jest
 * - `development` and `production` will set `target.browsers` using the value
 * assigned to the `browsers` field in `package.json`
 */
const { BABEL_ENV, NODE_ENV } = process.env
const modules = (BABEL_ENV === 'cjs' || NODE_ENV === 'test') ? 'cjs' : false
const targets = NODE_ENV === 'test' ? { node: true } : BABEL_ENV === 'es' ? { esmodules: true } : undefined
const { corejs, useBuiltIns } = BABEL_ENV === 'es' ? {} : { corejs: 3, useBuiltIns: 'usage' }

module.exports = {
    presets: [['@babel/preset-env', { corejs, modules, targets, useBuiltIns }]],
}
