/* global Homey */
var util = require('../util.js')

exports.init = function () {
  Homey.manager('flow').on('condition.logCondition', onLogCondition)
}

function onLogCondition (callback, args) {
  util.flowLog(args.text)
  callback(null, true)
}
