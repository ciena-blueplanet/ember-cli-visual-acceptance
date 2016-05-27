'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')

function mkdirSync (path) {
  try {
    fs.mkdirSync(path)
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }
}

function mkdirpSync (dirpath) {
  let parts = dirpath.split(path.sep)
  for (let i = 1; i <= parts.length; i++) {
    mkdirSync(path.join.apply(null, parts.slice(0, i)))
  }
}

function isTargetBrowser (req, res, targetBrowsers) {
  if (targetBrowsers.length > 0) {
    var result = false
    for (var i = 0; i < targetBrowsers.length; i++) {
      if (req.query.browser === targetBrowsers[i].browser && req.query.version === targetBrowsers[i].version && req.query.os === targetBrowsers[i].os && req.query.osversion === targetBrowsers[i].osversion && (req.query.mobile === targetBrowsers[i].mobile || (req.query.mobile === '' && targetBrowsers[i].mobile === undefined)) && (req.query.bit === targetBrowsers[i].bit || (req.query.bit === '' && targetBrowsers[i].bit === undefined))) {
        result = true
        break
      }
    }
    res.send(result)
  } else {
    res.send(true)
  }
}

function saveImage (req, res, options) {
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(options.imageDirectory + '/' + req.body.name, buff)
  res.send('')
}

function savePassedImage (req, res, options) {
  var imageDirectory = options.imageDirectory + '/' + req.body.name.substring(0, req.body.name.lastIndexOf('\/') + 1)
  if (!fs.existsSync(imageDirectory)) {
    mkdirpSync(imageDirectory)
  }
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(options.imageDirectory + '/' + req.body.name.replace(/\.([^\.]*)$/, '-passed.$1'), buff)
  res.send('')
}

function misMatchImage (req, res, options) {
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(options.imageDirectory + '/' + req.body.name.replace(/\.([^\.]*)$/, '-failed.$1'), buff)
  res.send('')
}

function getImage (req, res, options) {
  var decodedURI = options.imageDirectory + '/' + decodeURIComponent(req.query.name)
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
      app.import(app.bowerDirectory + '/detectjs/src/detect.js', {type: 'test'})
      app.import('vendor/html2canvas.js', {type: 'test'})
      app.import('vendor/VisualAcceptance.js', {type: 'test'})
    }
    app.import('vendor/dist/css/materialize.min.css', {type: 'test'})
    app.import('vendor/dist/js/materialize.min.js', {type: 'test'})
    app.import('vendor/visual-acceptance-report.css', {
      type: 'test'
    })
    if (app.options.visualAcceptanceOptions) {
      this.imageDirectory = app.options.visualAcceptanceOptions.imageDirectory || 'visual-acceptance'
      this.targetBrowsers = app.options.visualAcceptanceOptions.targetBrowsers || []
    }
  },
  imageDirectory: 'visual-acceptance',
  targetBrowsers: [],
  middleware: function (app, options) {
    app.use(bodyParser.urlencoded({
      extended: true
    }))
    app.use(bodyParser.json())
    app.get('/image', function (req, res) {
      getImage(req, res, options)
    })

    app.get('/istargetbrowser', function (req, res) {
      isTargetBrowser(req, res, options.targetBrowsers)
    })

    app.post('/image', function (req, res) {
      saveImage(req, res, options)
    })

    app.post('/passed', function (req, res) {
      savePassedImage(req, res, options)
    })
    app.post('/fail', function (req, res) {
      misMatchImage(req, res, options)
    })
  },
  testemMiddleware: function (app) {
    this.middleware(app, {
      root: this.project.root,
      imageDirectory: this.imageDirectory,
      targetBrowsers: this.targetBrowsers
    })
  },
  serverMiddleware: function (options) {
    this.app = options.app
    if (this.validEnv && !this.validEnv()) {
      return
    }
    this.middleware(options.app, {
      root: this.project.root,
      imageDirectory: this.imageDirectory.replace(/\/$/, ''),
      targetBrowsers: this.targetBrowsers
    })
  }

}
