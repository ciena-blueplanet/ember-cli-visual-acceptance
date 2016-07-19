'use strict'
/* eslint-disable no-useless-escape*/
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var RSVP = require('rsvp')
var request = require('sync-request')
var chalk = require('chalk')

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

function runCommand (command, args, ignoreStdError) {
  return new RSVP.Promise(function (resolve, reject) {
    var child = spawn(command, args, {
      env: process.env
    })
    child.stdout.on('data', function (data) {
      console.log(data.toString())
    })
    child.stderr.on('data', function (data) {
      console.error(chalk.bold.red(data.toString()))
    })

    child.on('exit', function (code) {
      console.log('Exit with code ' + code)
      if (code === 0) {
        resolve()
      } else {
        reject()
      }
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
  if (process.env.REPORT_JSON_PATH) {
    var markdownReport = JSON.parse(fs.readFileSync(process.env.REPORT_JSON_PATH))
    var imgurLinks = []
    for (var i = 0; i < req.body.images.length; i++) {
      imgurLinks.push(uploadToImgur(req.body.images[i]))
    }
    if (req.body.type === 'New') {
      markdownReport.new += '\n#### ' + req.body.browser + ': ' + req.body.name +
       '\n <img src="' + imgurLinks[0] + '" height="160">\n'
    } else if (req.body.type === 'Changed') {
      markdownReport.changed += '\n### ' + req.body.browser + ': ' + req.body.name + '\n <table>'
      markdownReport.changed += '<tr> <td>' + '<img src="' + imgurLinks[0] +
       '" height="160">' + '</td> <td>' + '<img src="' + imgurLinks[1] +
        '" height="160">' + '</td> <td>' + '<img src="' + imgurLinks[2] +
         '" height="160">' + '</td> </tr>'
      markdownReport.changed += '<tr> <td>Diff</td> <td>Current</td> <td>Baseline</td> </tr>'
      markdownReport.changed += '</table>'
    }
    fs.writeFileSync(process.env.REPORT_JSON_PATH, JSON.stringify(markdownReport))
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
  return new Promise(function (resolve, reject) {
    console.log('Sending to github')
    var markdownReport = JSON.parse(fs.readFileSync('visual-acceptance-report/report.json'))
    var markdownBody = '# Visual Acceptance tests:\n'
    if (markdownReport.new !== '## New\n') {
      markdownBody += markdownReport.new + '\n'
    }
    if (markdownReport.changed !== '## Changed\n') {
      markdownBody += markdownReport.changed
    }
    if (markdownReport.changed === '## Changed\n' && markdownReport.new === '## New\n') {
      markdownBody += '### No changes\n'
    }
    try {
      if (process.env.REPORT_MARKDOWN_PATH) {
        fs.writeFileSync(process.env.REPORT_MARKDOWN_PATH, markdownBody)
      }
    } catch (e) {
      console.log(e)
    }
    var githubApiPostOptions = {
      'headers': {
        'user-agent': 'visual-acceptance',
        'Authorization': 'token ' + process.env.VISUAL_ACCEPTANCE_TOKEN
      },
      'json': {
        'body': markdownBody
      }
    }

    var githubApiGetOptions = {
      'headers': {
        'user-agent': 'visual-acceptance',
        'Authorization': 'token ' + process.env.VISUAL_ACCEPTANCE_TOKEN
      }
    }
    var url = 'https://api.github.com/repos/' + process.env.TRAVIS_REPO_SLUG + '/issues/' +
     process.env.TRAVIS_PULL_REQUEST + '/comments'
    var response = request('GET', url, githubApiGetOptions)
    var bodyJSON = JSON.parse(response.getBody().toString())
    for (var i = 0; i < bodyJSON.length; i++) {
      if (bodyJSON[i].body.indexOf('# Visual Acceptance tests:') > -1) {
        url = bodyJSON[i].url
        break
      }
    }
    response = request('POST', url, githubApiPostOptions)
    resolve(response)
  })
}

function buildTeamcityBitbucketReport (params, options, prNumber) {
  return runCommand('phantomjs', ['vendor/html-to-image.js',
   'visual-acceptance-report/report.html']).then(function (params) {
     console.log('Sending to github')
     var image = base64Encode('images/output.png').replace('data:image\/\w+;base64,', '')

     function uploadToExpress (url, image, name) {
       var apiOptions = {
         'headers': {
           'Content-Type': 'application/json'
         },
         'json': {
           'name': name,
           'data': image.replace('data:image\/\w+;base64,', '')
         }

       }
       var response = request('POST', url + 'api/upload/image', apiOptions)
       return response.getBody()
     }
     var filename = options.project + '-' + options.repo + '-' + prNumber + '.png'
     uploadToExpress(options.apiUrl, image, filename)
     var githubApiPostOptions = {
       'headers': {
         'user-agent': 'visual-acceptance',
         'Authorization': 'Basic ' + new Buffer(options.user + ':' + options.password, 'ascii').toString('base64')
       },
       'json': {
         'text': '![PR ember-cli-visual-acceptance Report](' + options.apiUrl + filename + ')'
       }
     }
     var githubApiGetOptions = {
       'headers': {
         'user-agent': 'visual-acceptance',
         'Authorization': 'Basic ' + new Buffer(options.user + ':' + options.password, 'ascii').toString('base64')
       }
     }
     var url = 'http://' + options.domain + '/rest/api/1.0/projects/' + options.project + '/repos/' + options.repo + '/pull-requests/' + prNumber + '/comments'
     var urlGet = 'http://' + options.domain + '/rest/api/1.0/projects/' + options.project + '/repos/' + options.repo + '/pull-requests/' + prNumber + '/activities'
     var response = request('GET', urlGet, githubApiGetOptions)
     var bodyJSON = JSON.parse(response.getBody().toString())
     var existingComment = false
     for (var i = 0; i < bodyJSON.values.length; i++) {
       if (bodyJSON.values[i].action === 'COMMENTED' &&
        bodyJSON.values[i].comment.text.indexOf('![PR ember-cli-visual-acceptance Report]') > -1) {
         existingComment = true
         break
       }
     }
     if (existingComment) {
       response = {
         error: 'Comment already exists. Just updating image'
       }
       console.log('Comment already exists. Just updating image')
     } else {
       response = request('POST', url, githubApiPostOptions)
     }
     return response
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
      app.import(app.bowerDirectory + '/es6-promise/es6-promise.js', {
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
          var markdownPath = options.reportDirectory + '/' + 'report.md'
          var jsonPath = options.reportDirectory + '/' + 'report.json'
          var markdownReport = {
            new: '## New\n',
            changed: '## Changed\n'
          }
          fs.writeFileSync(jsonPath, JSON.stringify(markdownReport))
          process.env.PR_API = options.prApiUrl
          process.env.REPORT_PATH = reportPath
          process.env.REPORT_MARKDOWN_PATH = markdownPath
          process.env.REPORT_JSON_PATH = jsonPath
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
        }, {
          name: 'build-report',
          type: Boolean,
          default: false,
          description: 'Wheter or not to build a report'
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
          if (options.buildReport) {
            return runCommand('ember', ['br'])
          } else {
            return runCommand('ember', ['test'])
          }
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
            return runCommand('ember', ['new-baseline', '--image-directory=' +
             options.imageDirectory, '--build-report=true']).then(function (params) {
               if (prNumber === false) {
                 console.log('Git add')
                 return runCommand('git', ['add', '-f', '-A', options.imageDirectory]).then(function (params) {
                   console.log('Git commit')
                   return runCommand('git', ['commit', '-m',
                    '"Adding new baseline images [ci skip]"']).then(function (params) {
                      console.log('Git push')
                      return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
                    })
                 })
               } else {
                 return buildReport(params)
               }
             }, function (params) {
               return buildReport(params).then(function (params) {
                 throw new Error('Exit 1')
               })
             })
          } else if (prNumber !== false && prNumber !== 'false' && process.env.VISUAL_ACCEPTANCE_TOKEN) {
            return runCommand('ember', ['br']).then(buildReport, function (params) {
              return buildReport(params).then(function (params) {
                throw new Error('Exit 1')
              })
            })
          } else if (prNumber !== false && prNumber !== 'false' && process.env.VISUAL_ACCEPTANCE_TOKEN) {
            return runCommand('ember', ['br']).then(buildReport, function (params) {
              return buildReport(params).then(function (params) {
                throw new Error('Exit 1')
              })
            })
          } else if (prNumber === false || prNumber === 'false') {
            return runCommand('ember', ['new-baseline', '--image-directory=' +
             options.imageDirectory]).then(function (params) {
               console.log('Git add')
               return runCommand('git', ['add', '-f', '-A', options.imageDirectory]).then(function (params) {
                 console.log('Git commit')
                 return runCommand('git', ['commit', '-m',
                  '"Adding new baseline images [ci skip]"']).then(function (params) {
                    console.log('Git push')
                    return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
                  })
               })
             })
          }
        }
      },
      'teamcity-bitbucket-visual-acceptance': {
        name: 'teamcity-bitbucket-visual-acceptance',
        aliases: ['tbva'],
        description: 'Run visual-acceptance based off Bitbucket message',
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
        }, {
          name: 'user',
          type: String,
          default: '',
          description: 'Bitbucket username'
        }, {
          name: 'password',
          type: String,
          default: '',
          description: 'Bitbucket user\'s password'
        }, {
          name: 'domain',
          type: String,
          default: '',
          description: 'Domain of Bitbucket server ex("bitbucket.host.com")'
        }, {
          name: 'project',
          type: String,
          default: '',
          description: 'Name of project where the repository is held'
        }, {
          name: 'repo',
          type: String,
          default: '',
          description: 'Name of the repository'
        }, {
          name: 'api-url',
          type: String,
          default: '',
          description: 'Url of api server to save and host images. https://gitlab.com/EWhite613/express-reports'
        }],
        run: function (options, rawArgs) {
          if (options.user.length === 0 || options.password.length === 0 || options.domain.length === 0 ||
           options.project.length === 0 || options.repo.length === 0 || options.apiUrl.length === 0) {
            console.log('Need to supply a user, password, domain, project, repo, and express-url .' +
             ' Sorry the bitbucket api sucks. \n Just running ember test')
            return runCommand('ember', ['test'])
          }

          if (process.env.TEAMCITY_PULL_REQUEST === null) {
            console.log('No Teamcity found. Just running ember test')
            return runCommand('ember', ['test'])
          }
          var prNumber = process.env.TEAMCITY_PULL_REQUEST
          var baseUrl = 'http://' + options.domain + '/rest/api/1.0/projects/' + options.project + '/repos/' + options.repo + '/pull-requests/' + prNumber
          var res = request('GET', baseUrl)
          var PrDescription = JSON.parse(res.body).description
          if (PrDescription && /\#new\-baseline\#/.exec(PrDescription)) {
            console.log('Creating new baseline')
            return runCommand('ember', ['new-baseline', '--image-directory=' +
             options.imageDirectory]).then(function (params) {
               if (prNumber === false) {
                 console.log('Git add')
                 return runCommand('git', ['add', '-f', '-A', options.imageDirectory]).then(function (params) {
                   console.log('Git commit')
                   return runCommand('git', ['commit', '-m',
                    '"Adding new baseline images [ci skip]"']).then(function (params) {
                      console.log('Git push')
                      return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
                    })
                 })
               }
             })
          } else if (prNumber !== false) {
            return runCommand('ember', ['br']).then(function (params) {
              return buildTeamcityBitbucketReport(params, options, prNumber)
            }, function (params) {
              return buildTeamcityBitbucketReport(params, options, prNumber).then(function (params) {
                throw new Error('Exit 1')
              })
            })
          } else if (prNumber === false) {
            return runCommand('ember', ['new-baseline', '--image-directory=' +
             options.imageDirectory]).then(function (params) {
               console.log('Git add')
               return runCommand('git', ['add', '-f', '-A', options.imageDirectory]).then(function (params) {
                 console.log('Git commit')
                 return runCommand('git', ['commit', '-m',
                  '"Adding new baseline images [ci skip]"']).then(function (params) {
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
