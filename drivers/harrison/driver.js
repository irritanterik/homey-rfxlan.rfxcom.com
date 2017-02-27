/* global Homey */
'use strict'

var Util = require('../../lib/util.js')
var items = {}

var self = {
  init: function (devices, callback) {
    devices.forEach(device => {
      Homey.manager('drivers').getDriver(device.homeyDriverName).getName(device, (error, name) => {
        Util.debugLog('Initiate device', {name: name, data: device})
        if (error) return
        items[device.id] = {
          id: device.id,
          name: name
        }
      })
    })
    callback()
  },
  renamed: function (device, name, callback) {
    Util.debugLog('rename item', [device, name])
    items[device.id].name = name
    callback()
  },
  deleted: function (device) {
    Util.debugLog('delete item', device)
    delete items[device.id]
  },
  pair: function (socket) {
    Util.debugLog('pairing', 'harrison started')
    socket.on('configure_harrison', (data, callback) => {
      callback(null, data)
    })
    socket.on('add_device', (device, callback) => {
      Util.debugLog('pairing', 'harrison added', device)
      items[device.data.id] = {
        itemId: device.data.id,
        name: device.name
      }
      callback(null)
    })
  },
  settings: function (device, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
    Util.debugLog('settings changed', {device: device, newSettingsObj: newSettingsObj, changedKeysArr: changedKeysArr})
    callback(null)
  },
  capabilities: {
    windowcoverings_state: {
      set: function (device, value, callback) {
        Util.debugLog('capabilities > windowcoverings_state > set', device, value)
        module.exports.getSettings(device, (error, settings) => {
          if (error) return Util.errorLog('getting harrison device settings went wrong', error)
          var command = (value === 'down') ? (settings.inverted === '0') ? 'off' : 'on' : (settings.inverted === '0') ? 'on' : 'off'
          if (value === 'idle') command = 'dim'
          Homey.app.xpl().sendXplCmnd({
            device: settings.housecode,
            command: command,
            protocol: 'x10'
          }, 'x10.basic', function (error, result) {
            if (error) return callback(error)
            callback(null, value)
          })
        })
      }
    }
  }
}

module.exports = self
