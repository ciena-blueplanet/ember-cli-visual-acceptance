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
  }, {
    name: 'delete-all',
    type: Boolean,
    default: false,
    description: 'Delete entire visual-acceptance folder, rather than just current OS'
  }],
  run: function (options, rawArgs) {
    var root = this.project.root
    var imageDirectory = options.imageDirectory
    if (!options.deleteAll) {
      var platform = process.platform
      if (/^linux/.test(platform)) {
        imageDirectory = path.join(imageDirectory, 'Linux')
      } else if (/^darwin/.test(platform)) {
        imageDirectory = path.join(imageDirectory, 'Mac OS X')
      } else if (/^win32/.test(platform)) {
        imageDirectory = path.join(imageDirectory, 'Windows')
      }
    }
    deleteFolderRecursive(path.join(root, imageDirectory))
    return runCommand(this, options.buildReport ? 'br' : 'test', rawArgs)
  }
}
