module.exports = {
  description: 'Add resemble to bower html2canvas to bower',

  normalizeEntityName: function () {
    // no-op
  },

  afterInstall: function (options) {
    // Perform extra work here.
    return this.insertIntoFile('.gitignore', '/visual-acceptance').then(function (params) {
      return this.insertIntoFile('.npmignore', '/visual-acceptance')
    }.bind(this))
  }
}
