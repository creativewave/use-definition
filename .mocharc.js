
process.env.NODE_ENV = 'test' // @babel/preset-env will use it to read .babelrc.

module.exports = {
    require: ['@babel/register', 'mocha-clean'],
}
