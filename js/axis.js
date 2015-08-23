/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../css/query.css')

const msgs = require('json!../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var assign = require('object-assign')

var Dimension = require('./dimension')
var DimensionSelector = require('./dimension_selector')

var schema = require('../cfrp-schema')

/** Axis selector **/

function Axis() {
  return hg.state({
    dimension: Dimension()
  })
}

Axis.render = function(state, axis, lang) {

  var i18n = msgs[lang]

  var modal = state.modal
  var query = state.query
  var channels = state.channels

  var sel_lis = query[axis].map( (dim) => {
    return Dimension.render(state, axis, dim, lang)  //modal, dim, query.order[dim], query.filter[dim], state.channels, lang)
  } )

  var modal = modal === axis
              ? DimensionSelector.render(lang)
              : null

  return (
    h('div.selector', [
      h('div.axis ' + axis, [
        h('ul.grouping', sel_lis),
        h('div.dropdown', { 'ev-click': hg.send(channels.toggle_modal, axis) }, [
          h('button.add'),
          modal
        ])
      ]),
      h('div.title', i18n[axis])
    ])
  )
}

export default Axis