/*global capture */
/*eslint-disable no-console */
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
      this.timeout(5000)
      this.render(hbs `<div id='test'>Foo</div>`)
      expect(this.$()).to.have.length(1)
      capture('Simple', done)
    })
    it('renders something else', function (done) {
      this.timeout(5000)
      this.render(hbs `<div id='test'>Foo Bar</div>`)
      expect(this.$()).to.have.length(1)
      capture('Error', done)
    })

    it('new test for issue 90', function (done) {
      this.timeout(5000)
      this.render(hbs `<div id='test'>Reproduce?</div>`)
      expect(this.$()).to.have.length(1)
      capture('Reproduce').then(function () {
        console.log(arguments)
        done()
      }).catch(function (err) {
        done(err)
      })
    })
    it('renders svg', function (done) {
      this.timeout(5000)
      /* eslint-disable max-len */
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
      /* eslint-enable max-len */
      capture('svg', done)
    })

    it('renders svg experimental', function (done) {
      this.timeout(5000)
      /* eslint-disable max-len */
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
      /* eslint-enable max-len */
      capture('svg-experimental', done, {experimentalSvgs: true})
    })

    it('captures target', function (done) {
      this.timeout(5000)
      /* eslint-disable max-len */
      this.render(hbs `<div class="outer">
          <div class="innerdivs left">
              Left Div
          </div>
          <div class="innerdivs right">
              Center Div
          </div>
          <div class="innerdivs center">
              Right Div
          </div>
      </div>`)
      /* eslint-enable max-len */
      capture('capture right', done, {targetElement: document.getElementsByClassName('innerdivs')[2]})
    })

    it('fixed div', function (done) {
      this.timeout(5000)
      this.render(hbs `<div class="fixed">Wherever you go, I will find you!</div>`)
      capture('fixed', done)
    })

    it('more fixed', function (done) {
      this.timeout(10000)
      this.render(hbs `<div id="left">Side menu</div>
        <div id="right">Top Menu
            <br />Top Menu
            <br />Top Menu
        </div>`)

      capture('fixed-more', done, {width: 1920, height: 1080})
    })
  }
)
