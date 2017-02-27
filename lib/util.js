/* global Homey */
exports.debugLog = function (event) {
  var details = ''
  Object.keys(arguments).splice(1).forEach(key => {
    if (details !== '') details += ' '
    if (typeof (arguments[key]) === 'object') {
      details += JSON.stringify(arguments[key])
    } else {
      details += arguments[key]
    }
  })
  Homey.manager('api').realtime(event, details)
  Homey.log(this.epochToTimeFormatter(), event, details)
}

exports.errorLog = function (message) {
  var data = ''
  Object.keys(arguments).splice(1).forEach(key => {
    if (data !== '') data += ' '
    if (typeof (arguments[key]) === 'object') {
      data += JSON.stringify(arguments[key])
    } else {
      data += arguments[key]
    }
  })

  var logLine = {}
  if (message) logLine.message = message
  if (data !== '') logLine.data = data
  Homey.manager('api').realtime('error', logLine)
  Homey.error(this.epochToTimeFormatter(), 'error', message, data)
}

exports.epochToTimeFormatter = function (epoch) {
  return (new Date(epoch || new Date().getTime())).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1')
}
