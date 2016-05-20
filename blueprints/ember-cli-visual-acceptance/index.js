module.exports = {
  description: 'Add resemble to bower html2canvas to bower',

  // locals: function(options) {
  //   // Return custom template variables here.
  //   return {
  //     foo: options.entity.options.foo
  //   };
  // }
  included: function(app) {
     this._super.included(app);
     app.import('vendor/html2canvas.js')
     app.import(app.bowerDirectory + '/resemblejs/resemble.js')
  },
  normalizeEntityName: function() {
    // no-op
  },
  afterInstall: function(options) {
    // Perform extra work here.
    return this.addBowerPackageToProject('resemblejs');
  }
};
