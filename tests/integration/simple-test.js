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
      this.render(hbs `<div id='test'>Test</div>`)
      expect(this.$()).to.have.length(1)
      capture('Simple').then(function (data) {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
    it('renders something else', function (done) {
      this.render(hbs `<div id='test'>Test Else</div>`)
      expect(this.$()).to.have.length(1)
      capture('Error').then(function (data) {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
    it('renders svg', function (done) {
      this.render(hbs `<svg id="mySVG"xmlns="http://www.w3.org/2000/svg" viewBox="-350 -250 700 500">
      <style type="text/css" media="screen">
        svg { background:#fff; }
        .face { stroke:#000; stroke-width:20px; stroke-linecap:round }
      </style>
      <circle r="200" class="face" fill="red"/>
      <path fill="none" class="face" transform="translate(-396,-230)" d="M487,282c-15,36-51,62-92,62 c-41,0-77-25-92-61"/>
      <circle cx="-60" cy="-50" r="20" fill="#000"/>
      <circle cx="60" cy="-50" r="20" fill="#000"/>
    </svg>`)
      capture('svg').then(function (data) {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })

    it('renders svg experimental', function (done) {
      this.render(hbs `<svg id="mySVG"xmlns="http://www.w3.org/2000/svg" viewBox="-350 -250 700 500">
      <style type="text/css" media="screen">
        svg { background:#fff; }
        .face { stroke:#000; stroke-width:20px; stroke-linecap:round }
      </style>
      <circle r="200" class="face" fill="red"/>
      <path fill="none" class="face" transform="translate(-396,-230)" d="M487,282c-15,36-51,62-92,62 c-41,0-77-25-92-61"/>
      <circle cx="-60" cy="-50" r="20" fill="#000"/>
      <circle cx="60" cy="-50" r="20" fill="#000"/>
    </svg>`)
      capture('svg-experimental', null, null, null, true).then(function (data) {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
  }
)
