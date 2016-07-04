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
  page.open(url)
  page.onCallback = function(data) {
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