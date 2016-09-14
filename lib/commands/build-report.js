var fs = require('fs')
var path = require('path')

var utils = require('../utils')
var deleteFolderRecursive = utils.deleteFolderRecursive
var mkdirpSync = utils.mkdirpSync
var runCommand = utils.runCommand

module.exports = {
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

    return runCommand(this, 'test', rawArgs)
  }
}
