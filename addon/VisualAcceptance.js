function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open('GET', theUrl, false) // false for synchronous request
  xmlHttp.send(null)
  return xmlHttp.responseText
}
import {
  assert,
  expect
} from 'chai'
export default function(imageName, height = null, width = null, misMatchPercentageMargin = 0.00, imageDirectory = 'visual-acceptance') {
  $(document.getElementById('ember-testing')).css('zoom', 'normal')
  $('#mocha-stats').css('top', '50px')
  var el = $(`
      <ul class="tabs">
        <li class="tab col s3"><a href="#mocha" class="active" >Mocha.js</a></li>
        ${blanket ? `<li class="tab col s3"><a href="#blanket-main">Blanket.js</a></li>` : ``}
        <li class="tab col s3"><a href="#visual-acceptance">VisualAcceptance.js</a></li>
      </ul>
  `)
  $(document.body).prepend(el)
  $(el).tabs()
  return html2canvas(document.getElementById('ember-testing-container'), {
    height: height,
    width: width
  }).then(function(canvas) {
    // Get test dummy image
    var imageDirectoryTrailingSlash = imageDirectory.replace(/\/$/, "") + '/'
    var image = canvas.toDataURL('image/png')
    var visualAcceptanceContainer
    if (!document.getElementById("visual-acceptance")) {
      visualAcceptanceContainer = document.createElement("div")
      visualAcceptanceContainer.setAttribute("id", "visual-acceptance");
      visualAcceptanceContainer.innerHTML = `<h3> Visual Acceptance tests: </h3> <ul id="visual-acceptance-report"> </ul>`
      document.body.appendChild(visualAcceptanceContainer)
    } else {
      visualAcceptanceContainer = document.getElementById("visual-acceptance")
    }
    var node = document.createElement("div")
      // Get passed image
    var res = JSON.parse(httpGet('/image?name=' + encodeURIComponent(imageDirectoryTrailingSlash) + imageName + '-passed.png'))
    if (res.error === 'File does not exist') {
      // Save image as passed if no existing passed image
      $.ajax({
        type: 'POST',
        async: false,
        url: '/passed',
        data: {
          image: image,
          name: imageDirectoryTrailingSlash + imageName + '.png'
        }
      })

      return 'No passed image. Saving current test as base'

    } else {
      // Passed image exists so compare to current
      res.image = "data:image/png;base64," + res.image
      return new Promise(function(resolve, reject) {
        resemble(image).compareTo(res.image).scaleToSameSize().onComplete(function(data) {
          var result = false

          if (parseFloat(data.misMatchPercentage) <= misMatchPercentageMargin) {
            // Passed
            $.ajax({
              type: 'POST',
              async: false,
              url: '/passed',
              data: {
                image: image,
                name: `${imageDirectoryTrailingSlash}${imageName}.png`
              }
            })
            result = true
            node.innerHTML = '<div> Passed </div>'
          } else {
            // Fail
            $.ajax({
              type: 'POST',
              async: false,
              url: '/fail',
              data: {
                image: data.getImageDataUrl(),
                name: `${imageDirectoryTrailingSlash}${imageName}.png`
              }
            })
            node.innerHTML = `<li class="test fail"> <h2> Failed: ${imageName} </h2> <img src="${data.getImageDataUrl()}" /> </li>`
          }
          $(document.getElementById('ember-testing')).removeAttr('style')
          $('#blanket-main').css('display', 'none')
          $('#visual-acceptance').css('display', 'none')
          document.getElementById('visual-acceptance-report').appendChild(node)
          assert.isTrue(result, "Image is above mis match threshold.")
          data ? resolve(data) : reject(data)
        })
      })
    }
  });
}
