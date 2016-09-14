'use strict'

var path = require('path')
var utils = require('../utils')
var deleteFolderRecursive = utils.deleteFolderRecursive
var runCommand = utils.runCommand

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
    return runCommand(this, options.buildReport ? 'br' : 'test', rawArgs)
  }
}
