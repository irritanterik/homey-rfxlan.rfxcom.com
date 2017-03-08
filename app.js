/* global Homey */
'use strict'

var util = require('./lib/util.js')
var Xpl = require('xpl-api')
// var flowActions = require('./lib/flow/actions.js')
// var flowConditions = require('./lib/flow/conditions.js')
var xpl
var heardList = {}

function setPaired (device, paired) {
  heardList[device].paired = paired
  Homey.manager('settings').set('heardList', heardList)
}

function updateHeardList (message, valueOverwrite) {
  if (!heardList[message.device]) {
    heardList[message.device] = message
    heardList[message.device].paired = false
  }
  heardList[message.device].lastUpdate = new Date()
  heardList[message.device].count = (heardList[message.device].count || 0) + 1
  if (valueOverwrite) {
    heardList[message.device].values = message.values
  } else {
    Object.keys(message.values).forEach(valueKey => {
      heardList[message.device].values[valueKey] = message.values[valueKey]
    })
  }
  Homey.manager('settings').set('heardList', heardList)
  if (heardList[message.device].paired) {
    Homey.manager('drivers').getDriver(heardList[message.device].paired).checkMessage(message.device, message.values)
  }
}

function startXpl () {
  xpl = new Xpl({
    source: 'homey',
    broadcastAddress: '255.255.255.255',
    xplLog: false,
    hubSupport: true // TODO create setting
  })

  xpl.on('message', function (message) {
    // util.debugLog(message.body, message.body.device)
    var heard = {}
    switch (message.bodyName) {
      case 'sensor.basic':
        heard = {
          device: message.body.device,
          type: message.body.device.split(' ')[0].toLowerCase(),
          values: {}
        }
        heard.values[message.body.type] = message.body.current
        updateHeardList(heard, false)
        break
      case 'x10.security':
        heard = {
          device: message.body.device,
          type: message.body.type.toLowerCase(),
          values: message.body
        }
        delete heard.values['device']
        delete heard.values['type']
        updateHeardList(heard, true)
        break
      case 'hbeat.basic':
        updateHeardList({
          device: message.header.source,
          type: 'xpl-device',
          values: message.body
        }, false)
        break
      default:
        util.debugLog('xpl', 'received unsupported message', message.bodyName, message.body)
    }
  })
  xpl.on('close', function () {
    util.debugLog('xpl', 'received close event')
  })
  xpl.bind(error => {
    if (error) return util.errorLog('xpl', error)
    util.debugLog('xpl', 'XPL server started')
  })
}

module.exports = {
  init: function () {
    util.debugLog('debug', 'App started')
    heardList = Homey.manager('settings').get('heardList') || {}
    Object.keys(heardList).forEach(id => heardList[id].paired = false)
    startXpl()
    // flowConditions.init()
    // flowActions.init()
  },
  xpl: function () {
    return xpl
  },
  heardList: function () {
    return heardList
  },
  setPaired: setPaired
}
