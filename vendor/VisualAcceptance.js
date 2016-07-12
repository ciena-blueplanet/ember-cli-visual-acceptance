/*global XMLHttpRequest,$,,chai,resemble, html2canvas, Image, XMLSerializer,btoa */
/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "capture" }]*/
function httpGet (theUrl) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open('GET', theUrl, false) // false for synchronous request
  xmlHttp.send(null)
  return xmlHttp.responseText
}

function experimentalSvgCapture () {
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
        debugger
        myCanvas.width = clientWidth
        myCanvas.height = clientHeight
        myCanvas.className = svg.className
        myCanvas.id = svg.id
        myCanvasContext.drawImage(source, 0, 0, clientWidth, clientHeight)
        $(svg).replaceWith(myCanvas)
        resolve()
      }
    })
  })

  return Promise.all(promises)
}

function capture (imageName, width, height, misMatchPercentageMargin, experimentalSvgs, assert) {
  if (misMatchPercentageMargin == null) {
    misMatchPercentageMargin = 0.00
  }

  var browser = window.ui
  var istargetbrowser = JSON.parse(httpGet('/istargetbrowser?' + $.param(browser)))
  if (istargetbrowser === false) {
    return new Promise(function (resolve) {
      resolve('Does not match target browser')
    })
  }

  $(document.getElementById('ember-testing')).css('zoom', 'initial')
  $(document.getElementById('ember-testing')).css('width', '100%')
  $(document.getElementById('ember-testing')).css('height', '100%')
  $(document.getElementById('ember-testing-container')).css('overflow', 'visible')
  $(document.getElementById('ember-testing-container')).css('position', 'initial')
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
  // resemble.outputSettings({
  //   largeImageThreshold: 0
  // })
  if (experimentalSvgs === true) {
    return experimentalSvgCapture().then(function () {
      return useCapture(imageName, width, height, misMatchPercentageMargin, assert, browserDirectory)
    })
  } else {
    return useCapture(imageName, width, height, misMatchPercentageMargin, assert, browserDirectory)
  }
}

function useCapture (imageName, width, height, misMatchPercentageMargin, assert, browserDirectory) {
  if (window.callPhantom !== undefined) {
    return capturePhantom(imageName, width, height, misMatchPercentageMargin, assert, browserDirectory)
  } else {
    return captureHtml2Canvas(imageName, width, height, misMatchPercentageMargin, assert, browserDirectory)
  }
}

function capturePhantom (imageName, width, height, misMatchPercentageMargin, assert, browserDirectory) {
  return new Promise(function (resolve, reject) {
    if (window.callPhantom === undefined) {
      resolve('Not on PhantomJS')
    }
    // Get test dummy image
    var image = window.callPhantom({
      id: 'ember-testing-container'
    })
    image = 'data:image/png;base64,' + image
      // console.log(image)
    return utilizeImage(imageName, width, height, misMatchPercentageMargin, assert, image, browserDirectory, resolve, reject)
  })
}

function captureHtml2Canvas (imageName, width, height, misMatchPercentageMargin, assert, browserDirectory) {
  return html2canvas(document.getElementById('ember-testing-container'), {
    timeout: 1000
  }).then(function (canvas) {
    // Get test dummy image
    var image = canvas.toDataURL('image/png')
    return new Promise(function (resolve, reject) {
      return utilizeImage(imageName, width, height, misMatchPercentageMargin, assert, image, browserDirectory, resolve, reject)
    })
  })
}

function utilizeImage (imageName, width, height, misMatchPercentageMargin, assert, image, browserDirectory, resolve, reject) {
  if (!document.getElementById('visual-acceptance') && $('.tabs').length === 0) {
    var visualAcceptanceContainer
    visualAcceptanceContainer = document.createElement('div')
    visualAcceptanceContainer.setAttribute('id', 'visual-acceptance')
    visualAcceptanceContainer.innerHTML = '<div class="title"> Visual Acceptance tests: </div> <div class="visual-acceptance-container"> </div>'
    document.body.appendChild(visualAcceptanceContainer)
  }
  var node = document.createElement('div')
  var images = []
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
    $(document.getElementById('ember-testing')).removeAttr('style')
    $(document.getElementById('ember-testing-container')).removeAttr('style')
    node.innerHTML = '<div class="test pass"> <div class="list-name"> No new image. Saving current as baseline: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="' + image + '" /> </div>'
    images.push(image)
    $.ajax({
      type: 'POST',
      async: false,
      url: '/report',
      data: {
        type: 'New',
        images: images,
        name: imageName
      }
    })
    resolve('No passed image. Saving current test as base')
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
          node.innerHTML = '<div class="test pass"> <div class="list-name">  New: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="' + image + '" /> </div>'
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
          node.innerHTML = '<div class="test fail"> <div class="list-name">  Changed: ' + imageName + ' </div> <div class="additional-info"> Addition Information: </div> <div class="images"> <div class="image"> <img class="diff" src="' + data.getImageDataUrl() + '" /> <div class="caption">  Diff   </div> </div> <div class="image">  <img class="input" src="' + image + '" /> <div class="caption"> Current  </div> </div> <div class="image"> <img class="passed" src="' + res.image + '" /> <div class="caption"> Baseline   </div> </div> </div> </div>'

          images.push(data.getImageDataUrl())
          images.push(image)
          images.push(res.image)
          $.ajax({
            type: 'POST',
            async: false,
            url: '/report',
            data: {
              type: 'Changed',
              images: images,
              name: imageName
            }
          })
        }
        $(document.getElementById('ember-testing')).removeAttr('style')
        $(document.getElementById('ember-testing-container')).removeAttr('style')
        document.getElementsByClassName('visual-acceptance-container')[0].appendChild(node)
        assert = assert === undefined ? chai.assert : assert
        assert.equal(result, true, 'Image mismatch percentage (' + data.misMatchPercentage + ') is above mismatch threshold(' + misMatchPercentageMargin + ').')
        data ? resolve(data) : reject(data)
      })
    }).then(function (data) {
      data ? resolve(data) : reject(data)
    })
  }
}
