module.exports = {
  description: 'Add resemble to bower html2canvas to bower',

  // locals: function(options) {
  //   // Return custom template variables here.
  //   return {
  //     foo: options.entity.options.foo
  //   };
  // }
  included: function (app) {
    this._super.included(app)
    app.import('vendor/VisualAcceptance.js', {type: 'test'})
    app.import('vendor/html2canvas.js', {type: 'test'})
    app.import(app.bowerDirectory + '/resemblejs/resemble.js', {type: 'test'})
    app.import(app.bowerDirectory + '/detectjs/src/detect.js', {type: 'test'})
  },
  normalizeEntityName: function () {
    // no-op
  },
  afterInstall: function (options) {
    // Perform extra work here.
    var that = this
    return this.addBowerPackageToProject('detectjs').then(function (params) {
      return that.addBowerPackageToProject('resemblejs')
    })
  }
}
