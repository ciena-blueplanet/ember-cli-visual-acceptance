/*global  Testem, win, arguments*/
'use strict'
const util = require('util')
var Nightmare = require('nightmare')
require('nightmare-custom-event')(Nightmare)

Nightmare.action('sendImage',
  function (ns, options, parent, win, renderer, done) {
    parent.respondTo('sendImage', function (image, done) {
      win.webContents.send('return-image-event', {
        image: image
      }).catch(function (error) {
        // console.log('error-send-image.log', error + ' from action \n')
      })
      done()
    })
    done()
  },
  function (image, done) {
    // console.log('image-sent.log', 'I must be called right?\n' + image + '\n' + done)
    this.child.call('sendImage', image, done)
  })

var nightmare = Nightmare(
//   {
//   openDevTools: {
//     mode: 'detach'
//   },
//   show: true
// }
)
var url = process.argv[2]
nightmare
  .viewport(1920, 1080)
  .wait(2000)
  .on('capture-event', function (data) {
    try {
      nightmare.screenshot(undefined, data.rect).then(function (result) {
        var image = result.toString('base64')
        nightmare.sendImage(image).then(function (result) {
          // console.log('image-sent.log', 'sent image')
        }).catch(function (error) {
          console.log('error-call-send-image.log', error + 'calling action \n')
        })
      }).catch(function (error) {
        console.error('Search failed:', error)
        console.log('error-night-screen.log', error)
      })
    } catch (error) {
      console.log('error-capture.log', error)
    }
  })
  .bind('capture-event')
  .goto(url)  
  .evaluate(function () {
    Testem.afterTests(
      // Asynchronously
      function (config, data, callback) {
        callback(null)
        // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
      }
    )
  })
  .then(function (result) {
    console.log(result)
  })
  .catch(function (error) {
    console.error('Search failed:', error)
    console.log('error.log', util.inspect(error, {
      showHidden: false,
      depth: null
    }))
  })
