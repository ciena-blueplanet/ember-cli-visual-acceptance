'use strict'
var system = require('system')
var fs = require('fs')
var page = require('webpage').create()
var url = system.args[1]
page.viewportSize = {
  width: 1024,
  height: 768
}

setTimeout(function() {
  page.open(url, function (status) {
    page.evaluate(function(s) {
       Testem.afterTests(
      //Asynchronously
      function(config, data, callback) {
        setTimeout( function (params) {
          var status = window.callPhantom({
            command: 'exit',
            reason:  'User Request.'
          })
        }, 1000)
    })
    })
  })

  page.onCallback = function(data) {
    if (data && data.command && (data.command === 'exit')) {
      if (data.reason) console.log('web page requested exit: '+data.reason);
        phantom.exit(0);
    }
    console.log('CALLBACK: ' + JSON.stringify(data))
      // Prints 'CALLBACK: { "hello": "world" }'
    var bb = page.evaluate(function() {
      return document.getElementById('ember-testing-container').getBoundingClientRect()
    })
    console.log(bb)
    page.clipRect = {
      top: bb.top,
      left: bb.left,
      width: bb.width,
      height: bb.height
    }
    return page.renderBase64('PNG')
  }

  page.onError = function(msg, trace) {
    console.log(msg)
    trace.forEach(function(item) {
      console.log('  ', item.file, ':', item.line)
    })
  }
}, 1000);
