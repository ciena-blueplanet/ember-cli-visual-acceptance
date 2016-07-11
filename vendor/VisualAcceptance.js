/*global XMLHttpRequest,$,,chai,resemble */
function httpGet (theUrl) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open('GET', theUrl, false) // false for synchronous request
  xmlHttp.send(null)
  return xmlHttp.responseText
}

function capture (imageName, width, height, misMatchPercentageMargin, assert) {
  if (misMatchPercentageMargin == null) { misMatchPercentageMargin = 0.00 }

  var browser = window.ui
  var istargetbrowser = JSON.parse(httpGet('/istargetbrowser?' + $.param(browser)))
  if (istargetbrowser === false) {
    return new Promise(function (resolve, reject) {
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

  return new Promise(function (resolve, reject) {
    if (window.callPhantom === undefined){
      resolve('Not on PhantomJS')
    }
    // Get test dummy image
    var image = window.callPhantom({
      id: 'ember-testing-container'
    })
    image = 'data:image/png;base64,' + image
    // console.log(image)
    if (!document.getElementById('visual-acceptance') && $('.tabs').length === 0) {
      var visualAcceptanceContainer
      visualAcceptanceContainer = document.createElement('div')
      visualAcceptanceContainer.setAttribute('id', 'visual-acceptance')
      visualAcceptanceContainer.innerHTML = '<div class="title"> Visual Acceptance tests: </div> <div class="visual-acceptance-container"> </div>'
      document.body.appendChild(visualAcceptanceContainer)
    }
    var node = document.createElement('div')
    var markdown = ''
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
      node.innerHTML = '<div class="test pass"> <div class="list-name"> No new image. Saving current as baseline: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="'+ image + '" /> </div>'
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
            node.innerHTML = '<div class="test pass"> <div class="list-name">  New: ' + imageName + '</div> <div class="additional-info"> Addition Information: </div> <img src="'+ image + '" /> </div>'
            markdown = '## New: \n#### Addition Information: \n <img>\n'         
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
            node.innerHTML = '<div class="test fail"> <div class="list-name">  Changed: '+ imageName+' </div> <div class="additional-info"> Addition Information: </div> <div class="images"> <div class="image"> <img class="diff" src="'+data.getImageDataUrl()+'" /> <div class="caption">  Diff   </div> </div> <div class="image">  <img class="input" src="'+image+'" /> <div class="caption"> Current  </div> </div> <div class="image"> <img class="passed" src="'+res.image+'" /> <div class="caption"> Baseline   </div> </div> </div> </div>'
  
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
  })
}
