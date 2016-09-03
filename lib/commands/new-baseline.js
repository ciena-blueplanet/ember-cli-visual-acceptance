'use strict'

var path = require('path')
var utils = require('../utils')
var runCommand = utils.runCommand
var deleteFolderRecursive = utils.deleteFolderRecursive

module.exports = {
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

    deleteFolderRecursive(path.join(root, options.imageDirectory))
    if (options.buildReport) {
      return runCommand('ember', ['br'])
    } else {
      return runCommand('ember', ['test'])
    }
  }
}
