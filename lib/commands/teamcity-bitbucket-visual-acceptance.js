var fs = require('fs')
var request = require('sync-request')

var runCommand = require('../utils').runCommand
var runExecutable = require('../utils').runExecutable

function buildTeamcityBitbucketReport (params, options, prNumber) {
  // eslint-disable-next-line complexity
  return new Promise(function (resolve, reject) {
    console.log('Sending to bitbucket')
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
        'Authorization': 'Basic ' + new Buffer(options.user + ':' + options.password, 'ascii').toString('base64')
      },
      'json': {
        'text': markdownBody
      }
    }

    var url = 'http://' + options.domain + '/rest/api/1.0/projects/' + options.project + '/repos/' +
     options.repo + '/pull-requests/' + prNumber + '/comments'
    var response = request('PUT', url, githubApiPostOptions)
    resolve(response)
  })
}

module.exports = {
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
    if (
      options.user.length === 0 || options.password.length === 0 || options.domain.length === 0 ||
      options.project.length === 0 || options.repo.length === 0 || options.apiUrl.length === 0
    ) {
      console.log('Need to supply a user, password, domain, project, repo, and api-url .' +
        ' Sorry the bitbucket api sucks. \n Just running ember test')
      return runCommand(this, 'test')
    }

    if (process.env.TEAMCITY_PULL_REQUEST === null) {
      console.log('No Teamcity found. Just running ember test')
      return runCommand(this, 'test')
    }

    process.env.NO_ASSERT = true
    process.env.TEAMCITY_API_URL = options.apiUrl
    var prNumber = process.env.TEAMCITY_PULL_REQUEST
    if (prNumber !== false && prNumber !== 'false') {
      return runCommand(this, 'br').then(function (params) {
        return buildTeamcityBitbucketReport(params, options, prNumber)
      }, function (params) {
        return buildTeamcityBitbucketReport(params, options, prNumber).then(function (params) {
          throw new Error('Exit 1')
        })
      })
    } else if (prNumber === false || prNumber === 'false') {
      return runCommand(this, 'new-baseline', ['--image-directory=' + options.imageDirectory])
      .then(function (params) {
        return runExecutable('git', ['add', '-f', '-A', options.imageDirectory], true)
        .then(function (params) {
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
