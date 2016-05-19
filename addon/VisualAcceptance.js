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
    return html2canvas(document.getElementById('ember-testing-container'), {
        height: height,
        width: width
    }).then(function(canvas) {
        // Get test dummy image
        var imageDirectoryTrailingSlash = imageDirectory.replace(/\/$/, "") + '/'
        var image = canvas.toDataURL('image/png')

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
            var diff = resemble(image).compareTo(res.image).scaleToSameSize().onComplete(function(data) {
                var result = false
                if (parseFloat(data.misMatchPercentage) <= misMatchPercentageMargin) {
                    // Passed
                    $.ajax({
                        type: 'POST',
                        async: false,
                        url: '/passed',
                        data: {
                            image: image,
                            name: imageDirectoryTrailingSlash + imageName + '.png'
                        }
                    })
                    result = true
                    return "No base Image. Saving Current"
                } else {
                    // Fail
                    $.ajax({
                        type: 'POST',
                        async: false,
                        url: '/fail',
                        data: {
                            image: data.getImageDataUrl(),
                            name: imageDirectoryTrailingSlash + imageName + '.png'
                        }
                    })
                }
                /* Resemblejs Output
                {
                  misMatchPercentage : 100, // %
                  isSameDimensions: true, // or false
                  dimensionDifference: { width: 0, height: -1 }, // defined if dimensions are not the same
                  getImageDataUrl: function(){}
                }
                */
                assert.isTrue(result, "Image is above mismatch threshold.")

                return data
            })
        }
    });
}