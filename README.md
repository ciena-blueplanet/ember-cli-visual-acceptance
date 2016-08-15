[ci-img]: https://travis-ci.org/ciena-blueplanet/ember-cli-visual-acceptance.svg?branch=master "Travis CI Build Status"
[ci-url]: https://travis-ci.org/ciena-frost/ember-cli-visual-acceptance
[cov-img]: https://img.shields.io/coveralls/ciena-frost/ember-cli-visual-acceptance.svg "Coveralls Code Coverage"
[cov-url]: https://coveralls.io/github/ciena-frost/ember-cli-visual-acceptance
[npm-img]: https://img.shields.io/npm/v/ember-cli-visual-acceptance.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/ember-cli-visual-acceptance
[observer-img]: https://emberobserver.com/badges/ember-cli-visual-acceptance.svg "Ember Observer Score"
[observer-url]: https://emberobserver.com/addons/ember-cli-visual-acceptance
[![Observer][observer-img]][observer-url] [![Travis][ci-img]][ci-url] [![NPM][npm-img]][npm-url]

# ember-cli-visual-acceptance

Create baseline images and test for CSS regression during standard Ember tests using html2Canvas and ResembleJS

## Installation

`ember install ember-cli-visual-acceptance`
### Configuration

#### Location of saved images

  You can specify the location where the saved images will be stored (do not store under **`tests`** directory).  Include the following in your `ember-cli-build.js`:


```javascript
visualAcceptanceOptions: {
  imageDirectory: '<folder name>'
}
```

### Browsers - html2canvas vs. PhantomJS render callback

#### PhantomJS - SlimerJS

[PhantomJS](http://phantomjs.org/) and [SlimerJS](https://slimerjs.org/) can both be used with this tool to capture images.

Personally I prefer SlimerJS. As PhantomJS's webkit version is behind the latest Safari's webkit. While SlimerJS uses the same version of Gecko as the latest Firefox.

##### Warning

With certain repositories I've had trouble with SlimerJS having segmentation faults on both Linux and Mac. I've yet to resolve this issue. So I have re-included html2Canvas work. 

#### Html2Canvas

Html2Canvas is used when a browser does not have the function `window.callPhantom` (Only PhantomJS and SlimerJS have this defined). Html2Canvas is still in beta and as result you will see some issues.
Html2Canvas relies on Canvas drawing support. I find Chrome has the best Canvas drawing support (miles ahead of their competitors), while Firefox has the second best Canvas drawing support. 

##### SVGs

Html2Canvas has difficulties rendering SVGs (more so in Firefox than in Chrome). As a result I have added a new **expermental** functionality that attempts to render the svgs better.
You can use this experimental feature by setting `experimentalSvgs` to `true` (Example: `capture('svg-experimental', null, null, null, true)`)

#### Target browser and OS version

You can specify the exact version of the browser as well as the OS the test will be run against.

    - install `ember-cli-visual-acceptance`
    - run `ember test -s` (this will launch a browser)
    - open the console and type `window.ui`


To target specific versions, you can edit `ember-cli-build.js` as follows:

```javascript
visualAcceptanceOptions: {
  targetBrowsers: [{
    browser: "Chrome",
    os: "Mac OS X",
    osversion: "10.11.2",
    version: "49.0.2623.112"
  }]
}
```

Also, rather then specifying exact version for the browser and the OS versions ,you can append `>=` as follows:

```javascript
visualAcceptanceOptions: {
  targetBrowsers: [{
    browser: "Chrome",
    os: "Mac OS X",
    osversion: ">=10.11.2",
    version: ">=49.0.2623.112"
  }]
}
```
You can also omit the `osversion` and `version` if not needed.

## API

```javascript
capture (imageName, options)
```


|           Name           | Type   | Default             | Description                           |
|--------------------------|--------|---------------------|---------------------------------------|
| imageName                | string | required            | Name of the image you wish to save    |
| options                   | object | {} | Object that holds all the options for the capture |
| options.width                    | number | null                | Define the width of the canvas in pixels. If null, renders with full width of the targetElement.   |
| options.height                   | number | null                | Define the height of the canvas in pixels. If null, renders with full height of the targetElement. |
| options.misMatchPercentageMargin                 | float  | 0.00                | The maximum percentage ResembleJs is allowed to misMatch. |
| options.targetElement            | HTMLElement | ember-testing-container       | DOM element to capture (Most likely want to set `height` and `width` to null, so we don't overwrite the element's height and width )|
| options.experimentalSvgs         | boolean  | false                | Set to true in order try experimental rendering of svgs using html2canvas.|
| options.assert                   | object  | undefined                | Only use to pass in **Qunit** `assert` object.|


## Usage

  * Configure the systems and browsers that will capture images in your `ember-cli-build.js` as described above in the **Configuration** section.
      * Different systems and browsers produce different images
      * To prevent false positives images are only captured against specific targets
      * The results of each target are stored in separate directories and are only compared against the same target

  * Create your tests (ex: tests/integration/components/frost-button-test.js)

  ```javascript
  it ('primary small button', function(done) {
    this.render(hbs`
      {{frost-button
        priority='primary'
        size='small'
        text='Text'
      }}`)
    capture('primary-small-button').then(function (data) {
      console.log(arguments)
      console.log(data)
      done()
    }).catch(function (err) {
      done(err)
      })
  })
  ```

  * When executing asynchronous tests with an explicit done() you must use a `.catch` to handle image assertion failures

  * Otherwise just return the promise
```javascript
return capture('placeholder',{ misMatchPercentageMargin: 0.00 })
```
  * Run `ember test -s`

### Baseline
  * The first capture will automatically become the baseline image.
  * To create a new baseline, run the following:

  `ember new-baseline`


### Failure example
From ember test:
```
Integration: FrostSelectComponent selects the hovered item when enter is pressed
    ✘ Image is above mismatch threshold.: expected false to be true
        AssertionError: Image is above mismatch threshold.: expected false to be true
```

Then a new `<nameOfImage>-fail.png` will show up in your `visual-acceptance` directory.
Visual differences are shown in pink.
More info about visual diffs can be found [here](https://github.com/Huddle/Resemble.js).
ember-cli-visual-acceptance only uses the `.scaleToSameSize()` option for ResembleJS

### Example Usage

#### Without done() callback
```javascript
it('supports placeholder', function () {
  const $input = this.$('.frost-select input')
  expect($input.attr('placeholder')).to.eql('Select something already')
  return capture('placeholder')
})
```

#### With done() callback
```javascript
it('selects the hovered item when enter is pressed', function (done) {
  keyUp(dropDown, 40)
  keyUp(dropDown, 13)

  Ember.run.later(() => {
    let dropDownInput = this.$('.frost-select input')
    let value = dropDownInput.val()
    expect(value).to.eql(props.data[0].label)
    capture('Boston', { width: 1920, height: 1080, misMatchPercentageMargin: 5.00}).then(function (data) {
      done()
    }).catch(function (err) {
      done(err)
    })
  })
})
```
## Working with Mirage
ember-cli-visual-acceptance makes api calls to it's own testem middleware. So in order for the tests to work you must have `this.passthrough()`, or list the paths explicitly in `this.passthrough('/image','/passed','/fail','/report','/istargetbrowser')` in your mirage `config.js`.

## Setting up Travis
The details to setup Travis can be found [here](https://ciena-blueplanet.github.io/developers.blog/2016/07/18/Using-ember-cli-visual-acceptance.html). Once complete [ember-cli-visual-acceptance](https://github.com/ember-cli-visual-acceptance) will be able to attach reports to your Pull Requests.
