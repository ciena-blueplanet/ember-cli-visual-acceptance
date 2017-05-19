'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var request = require('sync-request')
var mkdirpSync = require('./lib/utils').mkdirpSync

function uploadToImgur (image, reportPath) {
  var imgurClientID = 'e39f00905b80937'
  var imgurApiOptions = {
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Client-ID ' + imgurClientID
    },
    'json': {
      'type': 'base64',
      'image': image.replace(/data:image\/\w+;base64,/i, '')
    }

  }
  var response = request('POST', 'https://api.imgur.com/3/image', imgurApiOptions)
  var reportID = JSON.parse(response.getBody())
  return reportID.data.link
}

function uploadToExpress (url, image, name) {
  var apiOptions = {
    'headers': {
      'Content-Type': 'application/json'
    },
    'json': {
      'name': name,
      'data': image.replace(/^data:image\/\w+;base64,/, '')
    }
  }
  var response = request('POST', url + 'api/upload/image', apiOptions)
  response.link = url + name
  return response
}

function compareVersions (installed, required) {
  if (required === undefined) {
    return true
  } else if (required.substring(0, 2) === '>=') {
    var a = installed.split('.')
    var b = required.split('.')

    for (var i = 0; i < a.length; ++i) {
      a[i] = Number(a[i])
    }
    for (var j = 0; i < b.length; ++j) {
      b[j] = Number(b[j])
    }
    if (a.length !== b.length) return false
    for (var k = 0; k < a.length; ++k) {
      if (a[k] < b[k]) return false
    }
    return true
  } else {
    return installed === required
  }
}

function appendToReport (req, res, options) {
  if (process.env.REPORT_JSON_PATH) {
    var markdownReport = JSON.parse(fs.readFileSync(process.env.REPORT_JSON_PATH))
    var imgurLinks = []
    for (var i = 0; i < req.body.images.length; i++) {
      if (process.env.TEAMCITY_API_URL && process.env.TEAMCITY_API_URL.length > 0) {
        imgurLinks.push(uploadToExpress(process.env.TEAMCITY_API_URL, req.body.images[i], req.body.name + '-' + i +
         '.png').link)
      } else {
        imgurLinks.push(uploadToImgur(req.body.images[i]))
      }
    }
    if (req.body.type === 'New') {
      markdownReport.new += '\n#### ' + req.body.browser + ': ' + req.body.name
      if (process.env.TEAMCITY_API_URL && process.env.TEAMCITY_API_URL.length) {
        markdownReport.new += '\n ![](' + imgurLinks[0] + ')\n'
      } else {
        markdownReport.new += '\n <img src="' + imgurLinks[0] + '" height="160">\n'
      }
    } else if (req.body.type === 'Changed') {
      markdownReport.changed += '\n### ' + req.body.browser + ': ' + req.body.name + '\n'
      if (process.env.TEAMCITY_API_URL && process.env.TEAMCITY_API_URL.length) {
        markdownReport.changed += '\nDiff:\n![Diff](' + imgurLinks[0] + ')'
        markdownReport.changed += '\nCurrent:\n![Current](' + imgurLinks[1] + ')'
        markdownReport.changed += '\nBaseline:\n![Baseline](' + imgurLinks[2] + ')'
      } else {
        markdownReport.changed += '<table>'
        markdownReport.changed += '<tr> <td>' + '<img src="' + imgurLinks[0] +
       '" height="160">' + '</td> <td>' + '<img src="' + imgurLinks[1] +
        '" height="160">' + '</td> <td>' + '<img src="' + imgurLinks[2] +
         '" height="160">' + '</td> </tr>'
        markdownReport.changed += '<tr> <td>Diff</td> <td>Current</td> <td>Baseline</td> </tr>'
        markdownReport.changed += '</table>'
      }
    }
    fs.writeFileSync(path.normalize(process.env.REPORT_JSON_PATH), JSON.stringify(markdownReport))
  }
  res.send()
}

function isTargetBrowser (req, res, targetBrowsers) {
  if (targetBrowsers.length > 0) {
    var result = false
    for (var i = 0; i < targetBrowsers.length; i++) {
      if (req.query.browser === targetBrowsers[i].browser &&
       compareVersions(req.query.version, targetBrowsers[i].version) && req.query.os === targetBrowsers[i].os &&
       compareVersions(req.query.osversion, targetBrowsers[i].osversion)) {
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
  fs.writeFileSync(path.join(options.imageDirectory, '/', req.body.name), buff)
  res.send('')
}

function savePassedImage (req, res, options) {
  var imageDirectory = path.join(options.imageDirectory, '/',
   req.body.name.substring(0, req.body.name.lastIndexOf('\/') + 1))
  if (!fs.existsSync(imageDirectory)) {
    mkdirpSync(imageDirectory)
  }
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(path.join(options.imageDirectory, '/', req.body.name.replace(/\.([^\.]*)$/, '-passed.$1')), buff)
  res.send('')
}
function shouldAssert (req, res, options) {
  if (process.env.NO_ASSERT) {
    res.send(false)
  } else {
    res.send(true)
  }
}
function misMatchImage (req, res, options) {
  req.body.image = req.body.image.replace(/^data:image\/\w+;base64,/, '')
  var buff = new Buffer(req.body.image, 'base64')
  fs.writeFileSync(path.join(options.imageDirectory, '/', req.body.name.replace(/\.([^\.]*)$/, '-failed.$1')), buff)
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

  imageDirectory: 'visual-acceptance',

  targetBrowsers: [],

  options: {
    nodeAssets: {
      resemblejs: {
        import: [{
          path: 'resemble.js',
          type: 'test'
        }]
      },
      'es6-promise': {
        srcDir: 'dist',
        import: [{
          path: 'es6-promise.js',
          sourceMap: 'es6-promise.map',
          type: 'test'
        }]
      }
    }
  },

  included: function (app) {
    this._super.included.apply(this, arguments)

    this.app = app

    if (app) {
      app.import(path.join('vendor', 'html2canvas.js'), {
        type: 'test'
      })
      app.import(path.join('vendor', 'VisualAcceptance.js'), {
        type: 'test'
      })
      app.import(path.join('vendor', 'visual-acceptance-report.css'), {
        type: 'test'
      })
      app.import(path.join('vendor', 'detect.js'), {
        type: 'test'
      })
    }

    if (app.options.visualAcceptanceOptions) {
      this.imageDirectory = app.options.visualAcceptanceOptions.imageDirectory || 'visual-acceptance'
      this.targetBrowsers = app.options.visualAcceptanceOptions.targetBrowsers || []
    }
  },

  middleware: function (app, options) {
    app.use(bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      parameterLimit: 50000
    }))
    app.use(bodyParser.json({
      limit: '50mb'
    }))

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
    app.post('/report', function (req, res) {
      appendToReport(req, res, options)
    })
    app.get('/istargetbrowser', function (req, res) {
      isTargetBrowser(req, res, options.targetBrowsers)
    })

    app.get('/visual-acceptance', function (req, res) {
      res.sendfile('visual-acceptance-report/report.html')
    })

    app.get('/should-assert', function (req, res) {
      shouldAssert(req, res)
    })
    app.get(/[0-9]*\/tests\/assets\//, function (req, res, next) {
      // forward assets to proper url from testing container
      req.url = req.url.replace(/[0-9]*\/tests\/assets\//, 'assets/')
      next()
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
    return require('./lib/commands')
  }
}
