/* global Homey */

module.exports = [{
  description: 'List all signals on heard list',
  method: 'GET',
  path: '/heardList',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    callback(null, Homey.manager('settings').get('heardList') || {})
  }
}, {
  description: 'List all signals of one device on heard list',
  method: 'GET',
  path: '/heardList/device/:id',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    var list = Homey.manager('settings').get('heardList') || {}
    callback(null, list[args.params.id])
  }
}, {
  description: 'List all signals of a specific type on heard list',
  method: 'GET',
  path: '/heardList/type/:type',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    var list = Homey.manager('settings').get('heardList') || {}
    var devices = []
    Object.keys(list).forEach(item => {
      if (list[item].type.toLowerCase() === args.params.type.toLowerCase()) {
        devices.push(list[item])
      }
    })
    callback(null, devices)
  }
}, {
  description: 'List all paired signals',
  method: 'GET',
  path: '/heardList/paired',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    var list = Homey.manager('settings').get('heardList') || {}
    var devices = []
    Object.keys(list).forEach(item => {
      if (list[item].paired) {
        devices.push(list[item])
      }
    })
    callback(null, devices)
  }
}, {
  description: 'List all paired signals for a specific driver',
  method: 'GET',
  path: '/heardList/paired/:driver',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    var list = Homey.manager('settings').get('heardList') || {}
    var devices = []
    Object.keys(list).forEach(item => {
      if (list[item].paired === args.params.driver.toLowerCase()) {
        devices.push(list[item])
      }
    })
    callback(null, devices)
  }
}]
