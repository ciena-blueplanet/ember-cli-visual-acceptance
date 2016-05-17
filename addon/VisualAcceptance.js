function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest()
    xmlHttp.open('GET', theUrl, false) // false for synchronous request
    xmlHttp.send(null)
    return xmlHttp.responseText
}

export default function(imageName, height=null, width=null, misMatchPercentageMargin = 0.00, callback) {
        html2canvas(document.getElementById('ember-testing-container'), {height: height, width: width}).then(function(canvas) {
            // Get test dummy image
            var image = canvas.toDataURL('image/png')
            $.ajax({
                    type: 'POST',
                    async: false,
                    url: '/image',
                    data: {
                        image: image,
                        name: imageName + '.png'
                    }
                })
                // Get passed image
            var res = JSON.parse(httpGet('/image?name=' + imageName + '-passed.png'))
            if (res.error === 'File does not exist') {
                // Save image as passed if no existing passed image
                $.ajax({
                    type: 'POST',
                    async: false,
                    url: '/passed',
                    data: {
                        image: image,
                        name: imageName + '.png'
                    }
                })
                if (typeof callback === "function") {
                    callback()
                }else {
                  return 'No passed image. Saving current test as base'
                }
                
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
                                name: imageName + '.png'
                            }
                        })
                        result = true
                    } else {
                        // Fail
                        $.ajax({
                            type: 'POST',
                            async: false,
                            url: '/fail',
                            data: {
                                image: data.getImageDataUrl(),
                                name: imageName + '.png'
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
                    
                    if (typeof callback === "function") {
                        if (!result){
                            callback("Image is above the mismatch percentage margin")
                        }else{
                            callback()
                        }
                    }else{
                        return data
                    }
                    
                })
            }
    })
}