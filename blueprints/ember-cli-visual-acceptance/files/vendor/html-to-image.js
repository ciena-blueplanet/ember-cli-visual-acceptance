/*global phantom */
var page = require('webpage').create()
var loadInProgress = false
var fs = require('fs')
var htmlFiles = []
var system = require('system')
var args = system.args
console.log(fs.workingDirectory + fs.separator + args[1])
htmlFiles.push(fs.workingDirectory + fs.separator + args[1])

// output pages as PNG
var pageindex = 0
page.viewportSize = {
  width: 600,
  height: 800
}
setInterval(function () {
  if (!loadInProgress && pageindex < htmlFiles.length) {
    console.log('image ' + (pageindex + 1))
    page.open(htmlFiles[pageindex])
  }
  if (pageindex === htmlFiles.length) {
    console.log('image render complete!')
    phantom.exit()
  }
}, 250)

page.onLoadStarted = function () {
  loadInProgress = true
  console.log('page load started')
}

page.onLoadFinished = function () {
  loadInProgress = false
  page.render('images/output.png')
  console.log('page load finished')
  pageindex++
}
