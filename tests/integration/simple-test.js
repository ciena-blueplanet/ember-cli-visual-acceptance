/*global capture */
import {
  expect
} from 'chai'
import {
  describeComponent,
  it
} from 'ember-mocha'
import hbs from 'htmlbars-inline-precompile'

describeComponent(
  'frost-button',
  'Integration: FrostButtonComponent', {
    integration: true
  },
  function () {
    it('renders', function (done) {
      this.render(hbs `<div id="test">Hello world</div>`)
      expect(this.$()).to.have.length(1)
      console.log('Commence')
      capture('Simple', null, null, 0.00, 'visual-acceptance').then(function (data) {
        console.log(data)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
  }
)
