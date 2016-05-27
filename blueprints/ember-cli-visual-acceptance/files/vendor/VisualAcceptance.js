/*global XMLHttpRequest,$,html2canvas,chai */
function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open('GET', theUrl, false) // false for synchronous request
  xmlHttp.send(null)
  return xmlHttp.responseText
}

function capture(imageName, height = null, width = null, misMatchPercentageMargin = 1.00, imageDirectory = 'visual-acceptance') {
  var browser = window.ui
  var istargetbrowser = JSON.parse(httpGet("/istargetbrowser?" + $.param(browser)))
  if (istargetbrowser === false) {
    return new Promise(function(resolve, reject) {
      resolve("Does not match target browser");
    })
  }
  $(document.getElementById('ember-testing')).css('zoom', 'initial')
  $(document.getElementById('ember-testing')).css('width', '100%')
  $(document.getElementById('ember-testing')).css('height', '100%')
  $(document.getElementById('ember-testing-container')).css('overflow', 'visible')
  $(document.getElementById('ember-testing-container')).css('position', 'initial')
  $(document.getElementById('ember-testing-container')).insertBefore(document.getElementById('mocha'))
  var browserDirectory = browser.os + '/' + browser.osversion + '/' + browser.browser + '/'
  if (height !== null && width !== null) {
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
  return html2canvas(document.getElementById('ember-testing-container'), {
    timeout: 1000
  }).then(function(canvas) {
    // Get test dummy image
    var image = canvas.toDataURL('image/png')
    if (!document.getElementById('visual-acceptance') && $('.tabs').length === 0) {
      var visualAcceptanceContainer
      visualAcceptanceContainer = document.createElement('div')
      visualAcceptanceContainer.setAttribute('id', 'visual-acceptance')
      visualAcceptanceContainer.innerHTML = '<h3> Visual Acceptance tests: </h3> <div id="visual-acceptance-container"> </div>'
      document.body.appendChild(visualAcceptanceContainer)
    }
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
      $(document.getElementById('ember-testing')).removeAttr('style')
      $(document.getElementById('ember-testing-container')).removeAttr('style')
      return 'No passed image. Saving current test as base'

    } else {
      // Passed image exists so compare to current
      res.image = 'data:image/png;base64,' + res.image
      return new Promise(function(resolve, reject) {
        resemble(res.image).compareTo(image).scaleToSameSize().ignoreAntialiasing().onComplete(function(data) {
          var result = false

          if (parseFloat(data.misMatchPercentage) <= misMatchPercentageMargin) {
            // Passed
            $.ajax({
              type: 'POST',
              async: false,
              url: '/passed',
              data: {
                image: image,
                name: `${browserDirectory}${imageName}.png`
              }
            })
            result = true
            node.innerHTML = `<li class="test pass"> <h2> Passed: ${imageName} </h2> <img src="${image}" /> </li>`
          } else {
            // Fail
            $.ajax({
              type: 'POST',
              async: false,
              url: '/fail',
              data: {
                image: data.getImageDataUrl(),
                name: `${browserDirectory}${imageName}.png`
              }
            })
            node.innerHTML = `<li class="test fail"> <h2> Failed: ${imageName} </h2> <img class="diff image" src="${data.getImageDataUrl()}" /> <img class="input image" src="${image}" /> <img class="passed image" src="${res.image}" /></li>`
          }
          $(document.getElementById('ember-testing')).removeAttr('style')
          $(document.getElementById('ember-testing-container')).removeAttr('style')
          document.getElementById('visual-acceptance-container').appendChild(node)
          chai.assert.isTrue(result, `Image mismatch percentage (${data.misMatchPercentage}) is above mismatch threshold(${misMatchPercentageMargin}).`)
          data ? resolve(data) : reject(data)
        })
      })
    }
  })
}