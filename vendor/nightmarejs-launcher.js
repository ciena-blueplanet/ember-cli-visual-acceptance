/*global  Testem, win, arguments*/
'use strict'
const util = require('util')
var Nightmare = require('nightmare')
require('nightmare-custom-event')(Nightmare)

Nightmare.action('sendImage',
  function (ns, options, parent, win, renderer, done) {
    parent.respondTo('sendImage', function (image, done) {
      win.webContents.send('return-image-event', {image: image}).catch(function (error) {
        fs.appendFileSync('error-send-image.log', error + ' from action \n')
      })
      done()
    })
    done()
  },
  function (image, done) {
    fs.appendFileSync('image-sent.log', 'I must be called right?\n' + image + '\n' + done)
    this.child.call('sendImage', image, done)
  })

var nightmare = Nightmare({
  show: true
})
var fs = require('fs')
var url = process.argv[2]
nightmare
  .goto(url)
  .on('capture-event', function (data) {
    // __nightmare.ipc.send('sample-event', 'sample', 3, {
    //   sample: 'sample'
    // });
    console.log('got response')
    fs.writeFileSync('feedback.txt', 'i got it\n' + JSON.stringify(data))
    try {
      nightmare.screenshot(undefined, data.rect).then(function (result) {
        fs.writeFileSync('image.png', result.toString('base64'))
        var image = result.toString('base64')
        nightmare.sendImage(image).then(function (result) {
          fs.appendFileSync('image-sent.log', 'sent image')
        }).catch(function (error) {
          fs.appendFileSync('error-call-send-image.log', error + 'calling action \n')
        })
        nightmare.cookies.set('image', image)
      }).catch(function (error) {
        console.error('Search failed:', error)
        fs.appendFileSync('error-night-screen.log', error)
      })
    } catch (error) {
      fs.appendFileSync('error-capture.log', error)
    }
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
    fs.appendFileSync('error.log', util.inspect(error, {
      showHidden: false,
      depth: null
    }))
  })
