module.exports = {
  'framework': 'mocha',
  'test_page': 'tests/index.html?hidepassed',
  'disable_watching': true,
  'launch_in_ci': [
    'slimerjs'
  ],
  'launch_in_dev': [
    'Firefox'
  ],
  'launchers': {
    'slimerjs': {
      'command': 'slimerjs slimerjs-launcher.js <url>',
      'protocol': 'browser'
    }
  }
}
