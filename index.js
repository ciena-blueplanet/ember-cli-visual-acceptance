'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')

function saveImage (req, res) {
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(req.body.name, buff)
  res.send('')
}

function savePassedImage (req, res) {
  var imageDirectory = req.body.name.substring(0, req.body.name.lastIndexOf('\/') + 1)
  if (!fs.existsSync(imageDirectory)) {
    fs.mkdirSync(imageDirectory)
  }
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(req.body.name.replace('\.', '-passed.'), buff)
  res.send('')
}

function misMatchImage (req, res) {
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(req.body.name.replace('\.', '-failed.'), buff)
  res.send('')
}

function getImage (req, res) {
  var decodedURI = decodeURIComponent(req.query.name)
  if (fs.existsSync(decodedURI)) {
    var file = fs.readFileSync(decodedURI)
    res.type('json')
    res.send({
      image: file.toString('base64')
    })
  } else {
    res.send({
      error: 'File does not exist'
    })
  }
}

module.exports = {
  name: 'ember-cli-visual-acceptance',
  included: function (app) {
    this._super.included(app)
    if (process.env.EMBER_CLI_FASTBOOT !== 'true') {
      app.import(app.bowerDirectory + '/resemblejs/resemble.js', {type: 'test'})
      app.import('vendor/html2canvas.js', {type: 'test'})
    }
    app.import('vendor/dist/css/materialize.min.css', {type: 'test'})
    app.import('vendor/dist/js/materialize.min.js', {type: 'test'})
    app.import('vendor/visual-acceptance-report.css', {
      type: 'test'
    })
  },

  middleware: function (app, options) {
    app.use(bodyParser.urlencoded({
      extended: true
    }))
    app.use(bodyParser.json())
    app.get('/image', function (req, res) {
      getImage(req, res)
    })

    app.post('/image', function (req, res) {
      saveImage(req, res)
    })

    app.post('/passed', function (req, res) {
      savePassedImage(req, res)
    })
    app.post('/fail', function (req, res) {
      misMatchImage(req, res)
    })
  },
  testemMiddleware: function (app) {
    this.middleware(app, {
      root: this.project.root
    })
  },
  serverMiddleware: function (options) {
    this.app = options.app
    if (!this.validEnv()) {
      return
    }
    this.middleware(options.app, {
      root: this.project.root
    })
  }

}
