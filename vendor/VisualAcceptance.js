/*global XMLHttpRequest,$,html2canvas,chai, Image, XMLSerializer, btoa, resemble  */
/**
 * Does httpGet on url synchronously
 * @param {string} theUrl - url to do GET request on
 * @returns {string} GET Response Text
 */
function httpGet (theUrl) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open('GET', theUrl, false) // false for synchronous request
  xmlHttp.send(null)
  return xmlHttp.responseText
}
/*eslint-disable no-unused-vars */
/**
 * Experimental function to convert Svgs to a Canvas than run capture
 * @param {string} imageName - Name of the image you wish to save
 * @param {number} [width=null] - Define the width of the canvas in pixels. If null, renders with full width of the container(640px).
 * @param {number} [height=null] - Define the height of the canvas in pixels. If null, renders with full height of the window.(384px).
 * @param {float} [misMatchPercentageMargin=0.00] - The maximum percentage ResembleJs is allowed to misMatch.
 * @param {object} [assert=undefined] - Use only if using qunit
 * @returns {Promise} ResembleJs return value
 */
function experimentalSvgCapture (imageName, width, height, misMatchPercentageMargin, assert) {
  /* eslint-enable no-unused-vars */
  var items = Array.from(document.querySelectorAll('svg'))
  var promises = items.map(function (svg) {
    return new Promise(resolve => {
      var clientWidth = svg.clientWidth || svg.parentNode.clientWidth
      var clientHeight = svg.clientHeight || svg.parentNode.clientHeight
      svg.setAttribute('width', clientWidth)
      svg.setAttribute('height', clientWidth)
      var myCanvas = document.createElement('canvas')

      // Get drawing context for the Canvas
      var myCanvasContext = myCanvas.getContext('2d')
        // Load up our image.
      var source = new Image()
      var xml = new XMLSerializer().serializeToString(svg)
      var data = 'data:image/svg+xml;base64,' + btoa(xml)
      source.src = data
        // Render our SVG image to the canvas once it loads.
      /**
       * 
       */
      source.onload = function () {
        console.log('onload')
        myCanvas.width = clientWidth
        myCanvas.height = clientHeight
        myCanvasContext.drawImage(source, 0, 0, clientWidth, clientHeight)
        $(svg).replaceWith(myCanvas)
        resolve()
      }
    })
  })

  return Promise.all(promises).then(data => {
    return capture(imageName, width, height, misMatchPercentageMargin, assert)
  })
}

/**
 * Creates baseline imagesfor visual regression during standard Ember tests using html2Canvas and ResembleJS
 * @param {string} imageName - Name of the image you wish to save
 * @param {number} [width=null] - Define the width of the canvas in pixels. If null, renders with full width of the container(640px).
 * @param {number} [height=null] - Define the height of the canvas in pixels. If null, renders with full height of the window.(384px).
 * @param {float} [misMatchPercentageMargin=0.00] - The maximum percentage ResembleJs is allowed to misMatch.
 * @param {object} [assert=undefined] - Use only if using qunit
 * @returns {Promise} ResembleJs return value
 */
function capture (imageName, width, height, misMatchPercentageMargin, assert) {
  if (misMatchPercentageMargin == null) {
    misMatchPercentageMargin = 0.00
  }
  // check if browser matches target
  var browser = window.ui
  var istargetbrowser = JSON.parse(httpGet('/istargetbrowser?' + $.param(browser)))
  if (istargetbrowser === false) {
    return new Promise(function (resolve, reject) {
      resolve('Does not match target browser')
    })
  }
  // Normalize the container
  $(document.getElementById('ember-testing')).css('zoom', 'initial')
  $(document.getElementById('ember-testing')).css('width', '100%')
  $(document.getElementById('ember-testing')).css('height', '100%')
  $(document.getElementById('ember-testing-container')).css('overflow', 'visible')
  $(document.getElementById('ember-testing-container')).css('position', 'initial')

  // Set visual acceptance directory based off browser and container size
  var browserDirectory
  if (browser.osversion === undefined) {
    browserDirectory = browser.os + '/' + browser.browser + '/'
  } else {
    browserDirectory = browser.os + '/' + browser.osversion + '/' + browser.browser + '/'
  }

  if (height && width) {
    $(document.getElementById('ember-testing-container')).css('width', width + 'px')
    $(document.getElementById('ember-testing-container')).css('height', height + 'px')
    browserDirectory += width + 'x' + height + '/'
  } else {
    // default mocha window size
    browserDirectory += 640 + 'x' + 384 + '/'
  }

  return html2canvas(document.getElementById('ember-testing-container'), {
    timeout: 1000
  }).then(function (canvas) {
    // Get test dummy image
    var image = canvas.toDataURL('image/png')
    // Create Report Header
    if (!document.getElementById('visual-acceptance') && $('.tabs').length === 0) {
      var visualAcceptanceContainer
      visualAcceptanceContainer = document.createElement('div')
      visualAcceptanceContainer.setAttribute('id', 'visual-acceptance')
      visualAcceptanceContainer.innerHTML = '<div class="title"> Visual Acceptance tests: </div> <div class="visual-acceptance-container"> </div>'
      document.body.appendChild(visualAcceptanceContainer)
    }
    // Node element for report
    var node = document.createElement('div')
      // Get passed image
    var res = JSON.parse(httpGet('/image?name=' + encodeURIComponent(browserDirectory + imageName) + '-passed.png'))
    if (res.error === 'File does not exist') {
      // Save image as passed if no existing passed image
      $.ajax({
        type: 'POST',
        async: false,
        url: '/passed',
        data: {
          image: image,
          name: browserDirectory + imageName + '.png'
        }
      })
      // Remove normalize container styles
      $(document.getElementById('ember-testing')).removeAttr('style')
      $(document.getElementById('ember-testing-container')).removeAttr('style')
      node.innerHTML = '<div class="test pass"> <div class="list-name"> No passed image. Saving current as baseline: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="' + image + '" /> </div>'
      $.ajax({
        type: 'POST',
        async: false,
        url: '/report',
        data: {
          report: node.innerHTML
        }
      })
      return 'No passed image. Saving current test as base'
    } else {
      // Passed image exists so compare to current
      res.image = 'data:image/png;base64,' + res.image
      return new Promise(function (resolve, reject) {
        resemble(res.image).compareTo(image).scaleToSameSize().onComplete(function (data) {
          var result = false

          if (parseFloat(data.misMatchPercentage) <= misMatchPercentageMargin) {
            // Passed
            $.ajax({
              type: 'POST',
              async: false,
              url: '/passed',
              data: {
                image: image,
                name: browserDirectory + imageName + '.png'
              }
            })
            result = true
            node.innerHTML = '<div class="test pass"> <div class="list-name">  Passed: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="' + image + '" /> </div>'
          } else {
            // Fail
            $.ajax({
              type: 'POST',
              async: false,
              url: '/fail',
              data: {
                image: data.getImageDataUrl(),
                name: browserDirectory + imageName + '.png'
              }
            })
            node.innerHTML = '<div class="test fail"> <div class="list-name">  Failed: ' + imageName + ' </div> <div class="additional-info"> Addition Information: </div> <div class="images"> <div class="image"> <img class="diff" src="' + data.getImageDataUrl() + '" /> <div class="caption">  Diff   </div> </div> <div class="image">  <img class="input" src="' + image + '" /> <div class="caption"> Current  </div> </div> <div class="image"> <img class="passed" src="' + res.image + '" /> <div class="caption"> Baseline   </div> </div> </div> </div>'
          }
          // Remove normalize container styles
          $(document.getElementById('ember-testing')).removeAttr('style')
          $(document.getElementById('ember-testing-container')).removeAttr('style')
          // Append individual report to our report container
          document.getElementsByClassName('visual-acceptance-container')[0].appendChild(node)
          $.ajax({
            type: 'POST',
            async: false,
            url: '/report',
            data: {
              report: node.innerHTML
            }
          })
          // Assertion Error
          assert = assert === undefined ? chai.assert : assert
          assert.equal(result, true, 'Image mismatch percentage (' + data.misMatchPercentage + ') is above mismatch threshold(' + misMatchPercentageMargin + ').')

          data ? resolve(data) : reject(data)
        })
      })
    }
  })
}
