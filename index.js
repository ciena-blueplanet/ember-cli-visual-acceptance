'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var RSVP = require('rsvp')

function runCommand (/* child_process.exec args */) {
  return new RSVP.Promise(function (resolve, reject) {
    var child = spawn('ember', ['test'])
    child.stdout.on('data', function (data) {
      console.log(data.toString())
    })
    child.stderr.on('data', function (data) {
      reject(data.toString())
    })

    child.on('exit', function (code) {
      resolve()
    })
  })
}

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
      app.import(app.bowerDirectory + '/resemblejs/resemble.js', {
        type: 'test'
      })
      app.import('vendor/bluebird/js/browser/bluebird.min.js', {
        type: 'test'
      })
      app.import('vendor/jquery.min.js', {
        type: 'test'
      })
      app.import('vendor/html2canvas.js', {
        type: 'test'
      })
      app.import('vendor/VisualAcceptance.js', {
        type: 'test'
      })
    }
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
      limit: '50mb', extended: true, parameterLimit: 50000
    }))
    app.use(bodyParser.json({limit: '50mb'}))

    app.get('/image', function (req, res) {
      getImage(req, res, options)
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
  },

  includedCommands: function () {
    return {
      'new-baseline': {
        name: 'new-baseline',
        aliases: ['new-baseline'],
        description: 'Create new baseline',
        works: 'insideProject',
        availableOptions: [{
          name: 'image-directory',
          type: String,
          default: 'visual-acceptance',
          description: 'The ember-cli-visual-acceptance directory where images are save'
        }],
        run: function (options, rawArgs) {
          var root = this.project.root
          var execOptions = { cwd: root }
          function deleteFolderRecursive (path) {
            if (fs.existsSync(path)) {
              fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + '/' + file
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                  deleteFolderRecursive(curPath)
                } else { // delete file
                  fs.unlinkSync(curPath)
                }
              })
              fs.rmdirSync(path)
            }
          }

          deleteFolderRecursive(path.join(root, options.imageDirectory))
          return runCommand('ember test', execOptions)
        }
      }
    }
  }
}
