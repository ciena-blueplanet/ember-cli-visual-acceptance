'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var RSVP = require('rsvp')
var request = require('sync-request')

function runCommand (command, args, ignoreStdError) {
  return new RSVP.Promise(function (resolve, reject) {
    var child = spawn(command, args)
    child.stdout.on('data', function (data) {
      console.log(data.toString())
    })
    child.stderr.on('data', function (data) {
      if (ignoreStdError || data.toString().indexOf('fs: re-evaluating native module sources is not supported.') > -1) {
        // Use ignoreStdError only to get around this issue https://github.com/ciena-blueplanet/ember-cli-visual-acceptance/issues/25
        console.log(data.toString())
      } else {
        reject(data.toString())
      }
    })

    child.on('exit', function (code) {
      resolve()
    })
  })
}

function base64Encode (file) {
  // read binary data
  var bitmap = fs.readFileSync(file)
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64')
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

function appendToReport (req, res, options) {
  try {
    if (process.env.REPORT_PATH) {
      var report = fs.readFileSync(process.env.REPORT_PATH)
      report = report.toString().replace(/(<\/div>\s<\/body>\s<\/HTML>)/i, req.body.report + '$1')
      fs.writeFileSync(process.env.REPORT_PATH, report)
    }
  } catch (e) {
    console.log(e)
  }
  res.send()
}

function isTargetBrowser (req, res, targetBrowsers) {
  if (targetBrowsers.length > 0) {
    var result = false
    for (var i = 0; i < targetBrowsers.length; i++) {
      if (req.query.browser === targetBrowsers[i].browser && compareVersions(req.query.version, targetBrowsers[i].version) && req.query.os === targetBrowsers[i].os && compareVersions(req.query.osversion, targetBrowsers[i].osversion)) {
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

function buildReport (params) {
  return runCommand('phantomjs', ['vendor/html-to-image.js', 'visual-acceptance-report/report.html']).then(function (params) {
    console.log('Sending to github')
    var image = base64Encode('images/output.png').replace('data:image\/\w+;base64,', '')
    function uploadToImgur (image) {
      var imgurClientID = 'e39f00905b80937'
      var imgurApiOptions = {
        'headers': {
          'Content-Type': 'application/json',
          'Authorization': 'Client-ID ' + imgurClientID
        },
        'json': {
          'type': 'base64',
          'image': image.replace('data:image\/\w+;base64,', '')
        }

      }
      var response = request('POST', 'https://api.imgur.com/3/image', imgurApiOptions)
      return JSON.parse(response.getBody())
    }

    var imgurResponse = uploadToImgur(image)
    var githubApiPostOptions = {
      'headers': {
        'user-agent': 'visual-acceptance',
        'Authorization': 'token ' + process.env.VISUAL_ACCEPTANCE_TOKEN
      },
      'json': {
        'body': '![PR ember-cli-visual-acceptance Report](' + imgurResponse.data.link + ')'
      }
    }

    var githubApiGetOptions = {
      'headers': {
        'user-agent': 'visual-acceptance',
        'Authorization': 'token ' + process.env.VISUAL_ACCEPTANCE_TOKEN
      }
    }
    var url = 'https://api.github.com/repos/' + repoSlug + '/issues/' + prNumber + '/comments'
    var response = request('GET', url, githubApiGetOptions)
    var bodyJSON = JSON.parse(response.getBody().toString())
    for (var i = 0; i < bodyJSON.length; i++) {
      if (bodyJSON[i].body.indexOf('![PR ember-cli-visual-acceptance Report]') > -1) {
        url = bodyJSON[i].url
        break
      }
    }
    response = request('POST', url, githubApiPostOptions)
  })
}

module.exports = {
  name: 'ember-cli-visual-acceptance',
  included: function (app) {
    this._super.included(app)
    if (app) {
      app.import(app.bowerDirectory + '/resemblejs/resemble.js', {
        type: 'test'
      })
      app.import(path.join('vendor', 'bluebird', 'js', 'browser', 'bluebird.min.js'), {
        type: 'test'
      })
      app.import(path.join('vendor', 'jquery.min.js'), {
        type: 'test'
      })
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
  imageDirectory: 'visual-acceptance',
  targetBrowsers: [],
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
      'build-report': {
        name: 'build-report',
        aliases: ['br'],
        description: 'Create report',
        works: 'insideProject',
        availableOptions: [{
          name: 'report-directory',
          type: String,
          default: 'visual-acceptance-report',
          description: 'Create Report off visual acceptance tests'
        }],
        run: function (options, rawArgs) {
          var root = this.project.root

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

          deleteFolderRecursive(path.join(root, options.reportDirectory))
          mkdirpSync(options.reportDirectory)
          var reportPath = options.reportDirectory + '/' + 'report.html'
          fs.writeFileSync(reportPath, `<HTML>
<HEAD>
<TITLE>Visual Acceptance report </TITLE>
</HEAD>
<BODY>
<style>
  .visual-acceptance.title  {
    padding-top: 30px;
    font-size: 29px;
    color: #404041;
    padding-left: 30px;
  }
  .visual-acceptance-container {
    padding-left: 30px;
  }
  .visual-acceptance-container > .test {
    padding-left: 20px;
  }
  .visual-acceptance-container > .test > .list-name {
    font-size: 18px;
    color: #33424F;
    padding-top: 20px;
  }

  .visual-acceptance-container > .test > .list-subtitle {
    float: left;
  }
  .visual-acceptance-container > .test > .additional-info {
    font-size: 14px;
    color: #929497;
    padding-bottom: 20px;
  }

  .images .image{
      display:inline-block;
      text-decoration:none;
  }
  img {
    width: 160px;
    height: 160px;
    padding-right: 10px;
  }
</style>
  <div class="visual-acceptance title"> Visual Acceptance tests: </div>
  <div class="visual-acceptance-container"> 
</div>
</BODY>
</HTML>`)

          process.env.PR_API = options.prApiUrl
          process.env.REPORT_PATH = reportPath
          return runCommand('ember', ['test'])
        }
      },
      'new-baseline': {
        name: 'new-baseline',
        aliases: ['nb'],
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
          return runCommand('ember', ['test'])
        }
      },
      'travis-visual-acceptance': {
        name: 'travis-visual-acceptance',
        aliases: ['tva'],
        description: 'Run visual-acceptance based off Travis message',
        works: 'insideProject',
        availableOptions: [{
          name: 'image-directory',
          type: String,
          default: 'visual-acceptance',
          description: 'The ember-cli-visual-acceptance directory where images are save'
        }, {
          name: 'branch',
          type: String,
          default: 'master',
          description: 'branch to push to'
        }],
        run: function (options, rawArgs) {
          let requestOptions = {
            'headers': {
              'user-agent': 'ciena-frost',
              'Authorization': 'token ' + process.env.RO_GH_TOKEN
            }
          }

          if (!process.env.RO_GH_TOKEN || !process.env.TRAVIS_REPO_SLUG) {
            console.log('No github token found or Travis found. Just running ember test')
            return runCommand('ember', ['test'])
          }
          var repoSlug = process.env.TRAVIS_REPO_SLUG

          var prNumber = process.env.TRAVIS_PULL_REQUEST
          var url = 'https://api.github.com/repos/' + repoSlug + '/pulls/' + prNumber
          var res = request('GET', url, requestOptions)
          var travisMessage = res.body
          if (/\#new\-baseline\#/.exec(travisMessage)) {
            console.log('Creating new baseline')
            return runCommand('ember', ['new-baseline', '--image-directory=' + options.imageDirectory]).then(function (params) {
              if (prNumber === false) {
                console.log('Git add')
                return runCommand('git', ['add', options.imageDirectory + '/*']).then(function (params) {
                  console.log('Git commit')
                  return runCommand('git', ['commit', '-m', '"Adding new baseline images [ci skip]"']).then(function (params) {
                    console.log('Git push')
                    return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
                  })
                })
              }
            })
          } else if (prNumber !== false && prNumber !== 'false' && process.env.VISUAL_ACCEPTANCE_TOKEN) {
            return runCommand('ember', ['br']).then(buildReport, buildReport)
          } else if ((prNumber === false || prNumber === 'false')) {
            return runCommand('ember', ['test']).then(function (params) {
              console.log('Git add')
              return runCommand('git', ['add', options.imageDirectory + '/*']).then(function (params) {
                console.log('Git commit')
                return runCommand('git', ['commit', '-m', '"Adding new baseline images [ci skip]"']).then(function (params) {
                  console.log('Git push')
                  return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
                })
              })
            })
          }
        }
      }
    }
  }
}
