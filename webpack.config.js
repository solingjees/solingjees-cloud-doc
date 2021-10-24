const path = require('path')

module.exports = {
  target: 'electron-main',
  entry: './main.js',
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'main.js'
  },
  module:{
     noParse: /uploadCloud/
  },

  node: {
    __dirname: false
  }
}