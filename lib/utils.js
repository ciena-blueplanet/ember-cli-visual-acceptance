'use strict'

var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var RSVP = require('rsvp')
var chalk = require('chalk')
var lookupCommand = require('ember-cli/lib/cli/lookup-command')

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
};

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

function runExecutable (command, args, ignoreStdError) {
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
      if (code === 0 || ignoreStdError) {
        resolve()
      } else {
        reject()
      }
    })
  })
}

function runCommand (env, command, args) {
  var Command = lookupCommand(env.commands, command, args, {
    project: env.project,
    ui: env.ui
  })

  var cmd = new Command({
    ui: env.ui,
    analytics: env.analytics,
    commands: env.commands,
    tasks: env.tasks,
    project: env.project,
    settings: env.settings,
    testing: env.testing,
    cli: env.cli
  })

  cmd.beforeRun(args)
  return cmd.validateAndRun(args)
}

module.exports = {
  deleteFolderRecursive: deleteFolderRecursive,
  mkdirSync: mkdirSync,
  mkdirpSync: mkdirpSync,
  runCommand: runCommand,
  runExecutable: runExecutable
}
