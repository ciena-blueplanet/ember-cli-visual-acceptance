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
      this.render(hbs `{{input type="text" value='Simplest worbs' disabled=entryNotAllowed size="50"}}`)
      expect(this.$()).to.have.length(1)
      capture('Simple', null, null, 0.00, 'visual-acceptance').then(function (data) {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
  }
)
