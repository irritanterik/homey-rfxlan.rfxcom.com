/* global Homey */
'use strict'

var Util = require('../../lib/util.js')
var items = {}
const securityTypes = {
  // 'cn': {name: 'Chacon/Avidsen/NEXA smoke sensor', icon: 'icon.svg'},
  'dm10': {name: 'X-10 Motion Sensor', icon: 'icon.svg'},
  'ds10,ds90': {name: 'X-10 Sensor', icon: 'icon.svg'},
  'ds10,ds90,sd90,mct302,mct550': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'ds90': {name: 'X-10 Sensor', icon: 'icon.svg'},
  'ds90,mct302,mct550': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'hp564': {name: 'Visonc Emergency Remote', icon: 'icon.svg'},
  'kr10': {name: 'Security Remote Control', icon: 'icon.svg'},
  'kr10,sd90,mct234': {name: 'X-10 Sensor', icon: 'icon.svg'},
  'mcw': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'ms10,mcw': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'ms10,ms20,ms90,mcw': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'ms20': {name: 'X-10 Sensor', icon: 'icon.svg'},
  'ms90,mcw': {name: 'Visonic Sensor', icon: 'icon.svg'},
  'sd18,c018': {name: 'X-10 Sensor', icon: 'icon.svg'},
  'sh624': {name: 'Security Remote Control', icon: 'icon.svg'},
  'sh624,mct234': {name: 'Security Remote Control', icon: 'icon.svg'}
}
const capabilityMap = {
  'low-battery': 'alarm_battery',
  'command': 'alarm_contact',
  'tamper': 'alarm_tamper',
  'alarm_battery': 'low-battery',
  'alarm_contact': 'command',
  'alarm_tamper': 'tamper'
}

var self = {
  init: function (devices, callback) {
    devices.forEach(device => {
      Homey.manager('drivers').getDriver(device.homeyDriverName).getName(device, (error, name) => {
        Util.debugLog('Initiate device', {name: name, data: device})
        if (error) return
        module.exports.getSettings(device, (error, settings) => {
          if (error) Util.debugLog('Error on loading device settings', {device: device, error: error})
          var heardDevice = Homey.app.heardList()[settings.sensorId]
          items[device.id] = {
            id: device.id,
            name: name,
            sensorType: device.type,
            sensorId: settings.sensorId,
            data: device,
            values: {
              'alarm_contact': heardDevice.values[capabilityMap.alarm_contact] !== 'normal' || false,
              'alarm_battery': heardDevice.values[capabilityMap.alarm_battery] === 'true' || false,
              'alarm_tamper': heardDevice.values[capabilityMap.alarm_tamper] === 'true' || false
            }
          }
          Homey.app.setPaired(items[device.id].sensorId, 'security')
        })
      })
    })
    setTimeout(callback, 2000)
  },
  renamed: function (device, name, callback) {
    Util.debugLog('rename item', [device, name])
    items[device.id].name = name
    callback()
  },
  deleted: function (device) {
    Util.debugLog('delete item', device)
    Homey.app.setPaired(items[device.id].sensorId, false)
    delete items[device.id]
  },
  pair: function (socket) {
    var list = Homey.app.heardList()
    var devices = []
    var uniqueId = new Date().getTime()
    Object.keys(list).forEach(item => {
      if (Object.keys(securityTypes).indexOf(list[item].type) !== -1 && !list[item].paired) {
        devices.push({
          name: securityTypes[list[item].type].name + ' ' + list[item].device,
          data: {id: uniqueId, homeyDriverName: 'security', type: list[item].type},
          icon: securityTypes[list[item].type].icon,
          capabilities: ['alarm_contact', 'alarm_tamper', 'alarm_battery'],
          settings: { sensorId: list[item].device }
        })
        uniqueId++
      }
    })
    socket.on('start', (data, callback) => {
      if (devices.length === 0) return callback('No security devices heard so far. Try again later...')
      callback(null)
    })
    socket.on('list_devices', (data, callback) => {
      callback(null, devices.sort((a, b) => (a.name > b.name ? 1 : -1)))
    })
    socket.on('add_device', (device, callback) => {
      Util.debugLog('pairing: item added', device)
      Homey.app.setPaired(device.settings.sensorId, 'security')
      var heardDevice = Homey.app.heardList()[device.settings.sensorId]
      items[device.data.id] = {
        id: device.data.id,
        name: device.name,
        sensorId: device.settings.sensorId,
        sensorType: device.data.type,
        data: device.data,
        values: {
          'alarm_contact': heardDevice.values[capabilityMap.alarm_contact] !== 'normal' || false,
          'alarm_battery': heardDevice.values[capabilityMap.alarm_battery] === 'true' || false,
          'alarm_tamper': heardDevice.values[capabilityMap.alarm_tamper] === 'true' || false
        }
      }
      callback(null)
    })
  },
  settings: function (device, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
    Util.debugLog('settings changed', {device: device, newSettingsObj: newSettingsObj, changedKeysArr: changedKeysArr})
    try {
      changedKeysArr.forEach(key => {
        if (key === 'sensorId') {
          var target = Homey.app.heardList()[newSettingsObj.sensorId]
          if (!target) return callback('no device with this id on heard list')
          if (Object.keys(securityTypes).indexOf(target.type) === -1) return callback('device with this id is not a security sensor')
          if (target.paired) return callback('device with this id allready paired')
          items[device.id].sensorId = newSettingsObj.sensorId
          Homey.app.setPaired(oldSettingsObj.sensorId, false)
          Homey.app.setPaired(newSettingsObj.sensorId, 'security')
        }
      })
      callback(null, true)
    } catch (error) {
      callback(error)
    }
  },
  checkMessage: function (device, values) {
    Util.debugLog('security check message!', device, values)
    var deviceId
    Object.keys(items).forEach(id => {
      if (items[id].sensorId === device && items[id].values) deviceId = id
    })
    if (!deviceId) return
    var contact = false
    var lowBattery = false
    var tamper = false
    Object.keys(values).forEach(key => {
      if (key === 'command') contact = values[key] !== 'normal'
      if (key === 'low-battery') lowBattery = values[key] === 'true'
      if (key === 'tamper') tamper = values[key] === 'true'
    })
    if (items[deviceId].values['alarm_contact'] !== contact) {
      items[deviceId].values['alarm_contact'] = contact
      module.exports.realtime(items[deviceId].data, 'alarm_contact', contact)
    }
    if (items[deviceId].values['alarm_battery'] !== lowBattery) {
      items[deviceId].values['alarm_battery'] = lowBattery
      module.exports.realtime(items[deviceId].data, 'alarm_battery', lowBattery)
    }
    if (items[deviceId].values['alarm_tamper'] !== tamper) {
      items[deviceId].values['alarm_tamper'] = tamper
      module.exports.realtime(items[deviceId].data, 'alarm_tamper', tamper)
    }
  },
  capabilities: {
    alarm_contact: {
      get: function (device, callback) {
        Util.debugLog('capabilities > alarm_contact > get', device)
        callback(null, items[device.id].values['alarm_contact'])
      }
    },
    alarm_battery: {
      get: function (device, callback) {
        Util.debugLog('capabilities > alarm_battery > get', device)
        callback(null, items[device.id].values['alarm_battery'])
      }
    },
    alarm_tamper: {
      get: (device, callback) => {
        Util.debugLog('capabilities > alarm_tamper > get', device)
        callback(null, items[device.id].values['alarm_tamper'])
      }
    }
  }
}

module.exports = self
