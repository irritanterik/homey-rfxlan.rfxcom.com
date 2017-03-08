/* global $, Homey */

function showPanel (panel) {
  $('.panel').hide()
  $('.panel-button').removeClass('active')
  $('#panel-button-' + panel).addClass('active')
  $('#panel-' + panel).show()
}

function onHomeyReady () {
  showPanel(1)
  Homey.ready()
}
