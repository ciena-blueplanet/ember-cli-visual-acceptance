/*global  Testem*/
'use strict'
var Nightmare = require('nightmare')
var Electroe = require('electron')
require('nightmare-custom-event')(Nightmare)
console.log('Creating action')


var nightmare = Nightmare({
  show: true
})
var fs = require('fs')
var url = process.argv[2]
nightmare
  .goto(url)
  .on('dom-ready', () => {
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('ping', 'whoooooooh!')
    })
  })
  .on('capture-event', function () {
// __nightmare.ipc.send('sample-event', 'sample', 3, {
//   sample: 'sample'
// });
    var eventResults = arguments;
    console.log('got response')
    fs.writeFileSync('feedback.txt', 'i got it\n' + eventResults);
  })
  .bind('capture-event')
  .evaluate(function () {
    Testem.afterTests(
      // Asynchronously
      function (config, data, callback) {
        callback(null)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
      }
    )
  })
  .wait(2000)
  .then(function (result) {
    console.log(result)
  })
  .catch(function (error) {
    console.error('Search failed:', error)
  })
