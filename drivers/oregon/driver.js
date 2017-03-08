/* global Homey */
'use strict'

var Util = require('../../lib/util.js')
var items = {}
const oregonTypes = {
  'temp1': {name: 'THR128/138 THC138', icon: 'thermometer.svg'},
  'temp2': {name: 'THC238/268 THN122N/132N THWR288A THRN122N AW129/131', icon: 'thermometer.svg'},
  'temp3': {name: 'THWR800', icon: 'thermometer.svg'},
  'temp4': {name: 'RTHN318', icon: 'thermometer.svg'},
  'th1': {name: 'THGN122N/123N THGR122NX/228N/238/268', icon: 'thermometer.svg'},
  'th2': {name: 'THGR810', icon: 'thermometer.svg'},
  'th3': {name: 'RTGR328N', icon: 'thermometer.svg'},
  'th4': {name: 'THGR328N', icon: 'thermometer.svg'},
  'th5': {name: 'WTGR800', icon: 'thermometer.svg'},
  'th6': {name: 'THGR918 THGRN228NX THGN500', icon: 'thermometer.svg'},
  'thb1': {name: 'BTHR918', icon: 'thermometer.svg'},
  'thb2': {name: 'BTHR918N/968', icon: 'thermometer.svg'},
  'rain1': {name: 'RGR126/682/918', icon: 'rain.svg'},
  'rain2': {name: 'PCR800', icon: 'rain.svg'},
  'wind1': {name: 'WTGR800', icon: 'gust.svg'},
  'wind2': {name: 'WGR800', icon: 'gust.svg'},
  'wind3': {name: 'Huger-STR918 Oregon-WGR918', icon: 'gust.svg'},
  'uv1': {name: 'UVN128 UV138', icon: 'uv.svg'},
  'uv2': {name: 'UVN800', icon: 'uv.svg'},
  'weight1': {name: 'BWR102', icon: 'thermometer.svg'},
  'weight2': {name: 'GR101', icon: 'thermometer.svg'},
  'elec1': {name: 'cent-a-meter Electrisave OWL CM113', icon: 'thermometer.svg'},
  'elec2': {name: 'OWL CM119', icon: 'thermometer.svg'}
}
const capabilityMap = {
  'temp': 'measure_temperature',
  'humidity': 'measure_humidity',
  'battery': 'measure_battery',
  'measure_temperature': 'temp',
  'measure_humidity': 'humidity',
  'measure_battery': 'battery'
}

function extractCapabilitiesFromValues (values) {
  var capabilities = []
  Object.keys(values).forEach(key => {
    if (Object.keys(capabilityMap).indexOf(key) !== -1) {
      capabilities.push(capabilityMap[key])
      if (capabilityMap[key] === 'measure_battery') capabilities.push('alarm_battery')
    }
  })
  return capabilities
}

var self = {
  init: function (devices, callback) {
    devices.forEach(device => {
      Homey.manager('drivers').getDriver(device.homeyDriverName).getName(device, (error, name) => {
        Util.debugLog('Initiate device', {name: name, data: device})
        if (error) return
        module.exports.getSettings(device, (error, settings) => {
          if (error) Util.debugLog('Error on loading device settings', {device: device, error: error})
          items[device.id] = {
            id: device.id,
            name: name,
            sensorType: device.type,
            sensorId: settings.sensorId,
            data: device,
            values: {}
          }
          Homey.app.setPaired(device.type + ' ' + items[device.id].sensorId, 'oregon')
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
    Homey.app.setPaired(device.type + ' ' + items[device.id].sensorId, false)
    delete items[device.id]
  },
  pair: function (socket) {
    var list = Homey.app.heardList()
    var devices = []
    var uniqueId = new Date().getTime()
    Object.keys(list).forEach(item => {
      if (Object.keys(oregonTypes).indexOf(list[item].type) !== -1 && !list[item].paired) {
        devices.push({
          name: oregonTypes[list[item].type].name + ' ' + list[item].device.split(' ')[1],
          data: {id: uniqueId, homeyDriverName: 'oregon', type: list[item].type},
          icon: oregonTypes[list[item].type].icon,
          capabilities: extractCapabilitiesFromValues(list[item].values),
          settings: { sensorId: list[item].device.split(' ')[1] }
        })
        uniqueId++
      }
    })
    socket.on('start', (data, callback) => {
      if (devices.length === 0) return callback('No oregon devices heard so far. Try again later...')
      callback(null)
    })
    socket.on('list_devices', (data, callback) => {
      callback(null, devices.sort((a, b) => (a.name > b.name ? 1 : -1)))
    })
    socket.on('add_device', (device, callback) => {
      Util.debugLog('pairing: item added', device)
      Homey.app.setPaired(device.data.type + ' ' + device.settings.sensorId, 'oregon')
      items[device.data.id] = {
        id: device.data.id,
        name: device.name,
        sensorId: device.settings.sensorId,
        sensorType: device.data.type,
        data: device.data,
        values: {}
      }
      callback(null)
    })
  },
  settings: function (device, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
    Util.debugLog('settings changed', {device: device, newSettingsObj: newSettingsObj, changedKeysArr: changedKeysArr})
    try {
      changedKeysArr.forEach(key => {
        if (key === 'sensorId') {
          var target = Homey.app.heardList()[device.type + ' ' + newSettingsObj.sensorId]
          if (!target) return callback('no device with this id on heard list')
          if (target.paired) return callback('device with this id allready paired')
          items[device.id].sensorId = newSettingsObj.sensorId
          Homey.app.setPaired(device.type + ' ' + oldSettingsObj.sensorId, false)
          Homey.app.setPaired(device.type + ' ' + newSettingsObj.sensorId, 'oregon')
        }
      })
      callback(null, true)
    } catch (error) {
      callback(error)
    }
  },
  checkMessage: function (device, values) {
    var deviceId
    Object.keys(items).forEach(id => {
      if (items[id].sensorType + ' ' + items[id].sensorId === device && items[id].values) deviceId = id
    })
    if (!deviceId) return
    Object.keys(values).forEach(key => {
      var value = values[key] * 1
      if (items[deviceId].values && value !== items[deviceId].values[capabilityMap[key]]) {
        items[deviceId].values[capabilityMap[key]] = value
        module.exports.realtime(items[deviceId].data, capabilityMap[key], value)
        if (capabilityMap[key] === 'measure_battery') {
          module.exports.realtime(items[deviceId].data, 'alarm_battery', value < 11)
        }
      }
    })
  },
  capabilities: {
    measure_temperature: {
      get: function (device, callback) {
        getCapability(device, 'measure_temperature', callback)
      }
    },
    measure_humidity: {
      get: function (device, callback) {
        getCapability(device, 'measure_humidity', callback)
      }
    },
    measure_battery: {
      get: (device, callback) => {
        getCapability(device, 'measure_battery', callback)
      }
    },
    alarm_battery: {
      get: function (device, callback) {
        getCapability(device, 'measure_battery', function (error, value) {
          callback(error, value < 11)
        })
      }
    }
  }
}

function getCapability (device, capability, callback) {
  Util.debugLog('capabilities > ' + capability + ' > get', device)
  var heardDevice = Homey.app.heardList()[items[device.id].sensorType + ' ' + items[device.id].sensorId]
  if (!heardDevice || !heardDevice.values) return callback('not initiated')
  var value = heardDevice.values[capabilityMap[capability]] * 1
  items[device.id].values[capability] = value
  callback(null, value)
}

module.exports = self
