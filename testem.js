module.exports = {
  'framework': 'mocha',
  'test_page': 'tests/index.html?hidepassed',
  'on_exit': 'echo Dude we are closed',
  'disable_watching': true,
  'launch_in_ci': [
    'SlimerJsVisualAcceptance'
  ],
  'launch_in_dev': [
    'Firefox'
  ],

  'launchers': {
    'PhantomJsVisualAcceptance': {
      'command': 'phantomjs vendor/phantomjs-launcher.js <url>',
      'protocol': 'browser'
    },
    'SlimerJsVisualAcceptance': {
      'command': 'slimerjs -jsconsole vendor/phantomjs-launcher.js <url>',
      'protocol': 'browser'
    }
  }
}
