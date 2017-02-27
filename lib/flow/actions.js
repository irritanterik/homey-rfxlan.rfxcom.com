/* global Homey */
var util = require('../util.js')

exports.init = function () {
  Homey.manager('flow').on('condition.logAction', onLogAction)
}

function onLogAction (callback, args) {
  util.flowLog(args.text)
}
