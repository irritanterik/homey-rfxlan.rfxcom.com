/* global Homey */

module.exports = [{
  description: 'List all signals on heard list',
  method: 'GET',
  path: '/heardList',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    callback(null, Homey.app.heardList())
  }
}, {
  description: 'List all signals of one device on heard list',
  method: 'GET',
  path: '/heardList/device/:id',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    callback(null, Homey.app.heardList()[args.params.id])
  }
}, {
  description: 'List all signals of a specific type on heard list',
  method: 'GET',
  path: '/heardList/type/:type',
  requires_authorization: true,
  role: 'owner',
  fn: function (callback, args) {
    var list = Homey.app.heardList()
    var devices = []
    Object.keys(list).forEach(item => {
      if (list[item].type.toLowerCase() === args.params.type.toLowerCase()) {
        devices.push(list[item])
      }
    })
    callback(null, devices)
  }
}]
