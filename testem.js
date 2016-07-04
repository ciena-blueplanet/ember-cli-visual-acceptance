module.exports = {
  'framework': 'mocha',
  'test_page': 'tests/index.html?hidepassed',
  'disable_watching': true,
  'launch_in_ci': [
    'PhantomJsVisualAcceptance'
  ],
  'launch_in_dev': [
    'PhantomJsVisualAcceptance'
  ],
  'launchers': {
    'slimerjs': {
      'command': 'slimerjs slimerjs-launcher.js <url>',
      'protocol': 'browser'
    },
    'PhantomJsVisualAcceptance': {
      'command': 'phantomjs vendor/phantomjs-launcher.js <url>',
      'protocol': 'browser'
    }
  }
}
