'use strict'
var system = require('system')
var page = require('webpage').create()
var url = system.args[1]
page.viewportSize = {
  width: 1024,
  height: 768
}

page.open(url).then(function (params) {
  window.ui = { browser: 'Slimerjs', version: '31.0', mobile: undefined, os: 'Mac OS X', osversion: '10.11', bit: undefined }
})
page.onError = function (msg, trace) {
  console.log(msg)
  trace.forEach(function (item) {
    console.log('  ', item.file, ':', item.line)
  })
}