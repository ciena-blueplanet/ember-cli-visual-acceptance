# Ember-cli-visual-acceptance

This README outlines the details of collaborating on this Ember addon.

## Usage
  * Import the library
    * `import visualAcceptance from 'ember-cli-visual-acceptance/VisualAcceptance'`
  * Using the library you must have a `.catch` to  properly catch the assertion error when the image fails the test 
```
visualAcceptance('Boston', null, null, 0.00).catch(function (err) {
  done(err)
})
```
### Parameters
|           Name           | Type   | Default             | Description                                                                                                                                                                         |
|:------------------------:|--------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| imageName                | string | required            | Name of the image you wish to save                                                                                                                                                  |
| height                   | number | null                | Define the height of the canvas in pixels. If null, renders with full height of the window.                                                                                         |
| width                    | number | null                | Define the width of the canvas in pixels. If null, renders with full width of the window.                                                                                           |
| misMatchPercentageMargin | float  | 0.00                | The maximum percentage ResembleJs is allowed to misMatch.                                                                                                                           |
| imageDirectory           | string | 'visual-acceptance' | The location where the `-passed.png` and `-failed.png` images will be saved. *(Note: Cannot be within the `tests` folder as this will restart the test every time an image is save) |
### Example Usage
```
it('selects the hovered item when enter is pressed', function (done) {
  keyUp(dropDown, 40)
  keyUp(dropDown, 13)

  Ember.run.later(() => {
    let dropDownInput = this.$('.frost-select input')
    let value = dropDownInput.val()
    expect(value).to.eql(props.data[0].label)
    visualAcceptance('Boston', null, null, 0.00).catch(function (err) {
      done(err)
    })
  })
})
```
