'use strict'

var Promise = require('bluebird')
var system = require('system')
var page = require('webpage').create()
// page.Promise = Promise
// window.Promise = Promise
var url = system.args[1]
page.viewportSize = {
  width: 1024,
  height: 768
}
this.Promise = Promise
page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js')
// page.onResourceRequested = function (request) {
//   console.log('Request ' + JSON.stringify(request, undefined, 4))
// }
// page.onResourceReceived = function (response) {
//   console.log('Receive ' + JSON.stringify(response, undefined, 4))
// }
page.onError = function (msg, trace) {
  console.log(msg)
  trace.forEach(function (item) {
    console.log('  ', item.file, ':', item.line)
  })
}
page.open(url)
