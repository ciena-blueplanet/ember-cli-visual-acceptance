/*global  Testem, phantom*/
'use strict'
var system = require('system')
var page = require('webpage').create()
var url = system.args[1]
page.viewportSize = {
  width: 1024,
  height: 768
}

setTimeout(function () {
  page.open(url, function (status) {
    page.evaluate(function (s) {
      Testem.afterTests(
      // Asynchronously
      function (config, data, callback) {
        callback(null)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
        setTimeout(function (params) {
          window.callPhantom({
            command: 'exit',
            reason: 'transport close'
          })
        }, 2000)
      })
    })
  })

  page.onConsoleMessage = function (msg) {
    console.log('console: ' + msg)
  }
  page.onCallback = function (data) {
    if (data && data.command && (data.command === 'exit')) {
      if (data.reason) console.log('web page requested exit: ' + data.reason)
      phantom.exit(0)
    }
    console.log('CALLBACK: ' + JSON.stringify(data))
      // Prints 'CALLBACK: { "hello": "world" }'
    var bb = page.evaluate(function (id) {
      return document.getElementById(id).getBoundingClientRect()
    }, data.id)
    console.log(bb)
    page.clipRect = {
      top: bb.top,
      left: bb.left,
      width: bb.width,
      height: bb.height
    }
    return page.renderBase64('PNG')
  }

  page.onError = function (msg, trace) {
    console.log(msg)
    trace.forEach(function (item) {
      console.log('  ', item.file, ':', item.line)
    })
  }
}, 1000)
