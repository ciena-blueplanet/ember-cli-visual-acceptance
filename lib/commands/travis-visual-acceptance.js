var request = require('sync-request')
var fs = require('fs')
var runCommand = require('../utils').runCommand

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

module.expoers = {
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
    if (/#new\-baseline#/.exec(travisMessage)) {
      console.log('Creating new baseline')
      return runCommand('ember', ['new-baseline', '--image-directory=' +
      options.imageDirectory, '--build-report=true']).then(function (params) {
        if (prNumber === false) {
          console.log('Git add')
          return runCommand('git', ['add', '-f', '-A', options.imageDirectory], true).then(function (params) {
            console.log('Git commit')
            return runCommand('git', ['commit', '-m',
            '"Adding new baseline images [ci skip]"'], true).then(function (params) {
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
    } else if (prNumber === false || prNumber === 'false') {
      return runCommand('ember', ['new-baseline', '--image-directory=' +
      options.imageDirectory]).then(function (params) {
        console.log('Git add')
        return runCommand('git', ['add', '-f', '-A', options.imageDirectory], true).then(function (params) {
          console.log('Git commit')
          return runCommand('git', ['commit', '-m',
          '"Adding new baseline images [ci skip]"'], true).then(function (params) {
            console.log('Git push')
            return runCommand('git', ['push', 'origin', 'HEAD:' + options.branch], true)
          })
        })
      })
    }
  }
}
