module.exports = {
  'framework': 'mocha',
  'test_page': 'tests/index.html?hidepassed',
  'disable_watching': true,
  'launch_in_ci': [
    'promise'
  ],
  'launch_in_dev': [
    'promise'
  ],
  'launchers': {
    'slimerjs': {
      'command': 'slimerjs slimerjs-launcher.js <url>',
      'protocol': 'browser'
    },
    'promise': {
      'command': 'phantomjs --web-security=false --local-to-remote-url-access=true promise-launcher.js <url> ',
      'protocol': 'browser'
    }
  }
}
