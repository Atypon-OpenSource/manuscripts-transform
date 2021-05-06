module.exports = {
  env: {
    test: {
      plugins: ['transform-es2015-modules-commonjs'],
    },
  },
  plugins: [
    '@babel/proposal-class-properties',
    '@babel/proposal-nullish-coalescing-operator',
    '@babel/proposal-object-rest-spread',
    '@babel/proposal-optional-chaining',
  ],
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
}
