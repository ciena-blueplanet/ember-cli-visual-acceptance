module.exports = {
  'framework': 'mocha',
  'test_page': 'tests/index.html?hidepassed',
  'disable_watching': true,
  'launch_in_ci': [
    'Firefox',
    'NightmareJsVisualAcceptance',
    'PhantomJsVisualAcceptance',
    'SlimerJsVisualAcceptance',
    'Chromium'
  ],
  'launch_in_dev': [
    'NightmareJsVisualAcceptance'
  ],

  'launchers': {
    'PhantomJsVisualAcceptance': {
      'command': 'phantomjs vendor/phantomjs-launcher.js <url>',
      'protocol': 'browser'
    },
    'SlimerJsVisualAcceptance': {
      'command': 'slimerjs --debug=true --error-log-file=error.log vendor/phantomjs-launcher.js <url>',
      'protocol': 'browser'
    },
    'NightmareJsVisualAcceptance': {
      'command': 'DEBUG=nightmare* node vendor/nightmarejs-launcher.js <url>',
      'protocol': 'browser'
    }
  }
}
