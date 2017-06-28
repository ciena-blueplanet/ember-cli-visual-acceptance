module.exports = {
  description: 'Add resemble to bower html2canvas to bower',

  normalizeEntityName: function () {
    // no-op
  },

  afterInstall: function (options) {
    // Perform extra work here.
    return this.insertIntoFile('.gitignore', '/visual-acceptance').then(function (params) {
      return this.insertIntoFile('.npmignore', '/visual-acceptance').then(function () {
        return this.addPackagesToProject([
          {name: 'body-parser', target: '^1.15.1'},
          {name: 'chalk', target: '^1.1.3'},
          {name: 'es6-promise', target: '^3.2.2'},
          {name: 'nightmare', target: '^2.10.0'},
          {name: 'nightmare-custom-event', target: '^0.2.0'},
          {name: 'resemblejs', target: '2.2.0'},
          {name: 'sync-request', target: '^3.0.1'}
        ])
      }.bind(this))
    }.bind(this))
  }
}
