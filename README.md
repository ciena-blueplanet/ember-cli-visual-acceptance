 # Ember-cli-visual-acceptance

[ci-img]: https://img.shields.io/travis/ciena-frost/ember-cli-visual-acceptance.svg "Travis CI Build Status"
[ci-url]: https://travis-ci.org/ciena-frost/ember-cli-visual-acceptance
[cov-img]: https://img.shields.io/coveralls/ciena-frost/ember-cli-visual-acceptance.svg "Coveralls Code Coverage"
[cov-url]: https://coveralls.io/github/ciena-frost/ember-cli-visual-acceptance
[npm-img]: https://img.shields.io/npm/v/ember-cli-visual-acceptance.svg "NPM Version"
[npm-url]: https://www.npmjs.com/package/ember-cli-visual-acceptance

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

### Browsers to test against

[PhantomJS](http://phantomjs.org/) and [SlimerJS](https://slimerjs.org/) can both be used with this tool to capture images.

Personally I prefer SlimerJS. As PhantomJS's webkit version is behind the latest Safari's webkit. While SlimerJS uses the same version of Gecko as the latest Firefox.

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
capture(imageName, height, width, misMatch, imageDirectory)
```


|           Name           | Type   | Default             | Description                           |
|--------------------------|--------|---------------------|---------------------------------------|
| imageName                | string | required            | Name of the image you wish to save    |
| height                   | number | null                | Define the height of the canvas in pixels. If null, renders with full height of the window. |
| width                    | number | null                | Define the width of the canvas in pixels. If null, renders with full width of the window.   |
| misMatch                 | float  | 1.00                | The maximum percentage ResembleJs is allowed to misMatch. |
| assert                 | object  | undefined                | Only use to pass in **Qunit** `assert` object.|


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
return capture('placeholder', null, null, 0.00)
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
  return visualAcceptance('placeholder')
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
    capture('Boston', 1920, 1080, 5.00).then(function (data) {
      done()
    }).catch(function (err) {
      done(err)
    })
  })
})
```

## Setting up Travis
The details to setup Travis can be found [here](https://ewhite613.github.io/frost-blog/using-visual-acceptance/). Once complete [ember-cli-visual-acceptance](https://github.com/ember-cli-visual-acceptance) will be able to attach reports to your Pull Requests.
