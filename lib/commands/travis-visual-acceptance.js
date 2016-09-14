var request = require('sync-request')
var fs = require('fs')
var runCommand = require('../utils').runCommand
var runExecutable = require('../utils').runExecutable

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

module.exports = {
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
  }, {
    name: 'push-var',
    type: String,
    default: 'true',
    description: 'Option that compares to pushOn to determine if it\'s okay to push'
  },
  {
    name: 'push-on',
    type: String,
    default: 'true',
    description: 'Option that compares to pushVar to determine if it\'s okay to push'
  }],
  run: function (options, rawArgs) {
    if (!process.env.RO_GH_TOKEN || !process.env.TRAVIS_REPO_SLUG || !process.env.VISUAL_ACCEPTANCE_TOKEN) {
      // eslint-disable-next-line max-len
      console.log('No github token found (RO_GH_TOKEN), Travis found, or visual acceptance token (VISUAL_ACCEPTANCE_TOKEN) found. Just running ember test')
      return runCommand(this, 'test')
    }
    process.env.NO_ASSERT = true

    var prNumber = process.env.TRAVIS_PULL_REQUEST
    if (prNumber !== false && prNumber !== 'false' && process.env.VISUAL_ACCEPTANCE_TOKEN) {
      return runCommand(this, 'br').then(buildReport, function (params) {
        return buildReport(params).then(function (params) {
          throw new Error('Exit 1')
        })
      })
    } else if (prNumber === false || prNumber === 'false') {
      return runCommand(this, 'new-baseline', [
        '--image-directory=' + options.imageDirectory
      ]).then(function (params) {
        return runExecutable('git', ['add', '-f', '-A', options.imageDirectory], true).then(function (params) {
          return runExecutable('git', ['commit', '-m', 'Adding new baseline images [ci skip]'], true)
          .then(function (params) {
            if (options.pushVar === options.pushOn) {
              return runExecutable('git', ['push', 'origin', 'HEAD:' + options.branch])
            }
          })
        })
      })
    }
  }
}
