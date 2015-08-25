/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../../css/query.css')

const msgs = require('json!../../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var assign = require('object-assign')

var Order = require('./order')
var Filter = require('./filter')
var DimensionSelector = require('./dimension_selector')

var Modal = require('../modal')
var i18n = require('../util/i18n')

var schema = require('../../cfrp-schema')

/** Axis selector **/

function Axis(initial_dims) {
  return hg.array(initial_dims)
}

Axis.render = function(modal_state, query_state, axis, lang) {
  var dims = query_state[axis] || []

  var sel_lis = dims.map( (dim) => {
    var sel_values = query_state.filter[dim] || []
    var classes = sel_values.length > 0 ? 'filtered' : 'unfiltered';
    return h('li.dimension.' + classes, [
      Order.render(query_state, dim),
      h('span.name', [ Filter.render(modal_state, query_state, dim, lang) ]),
      h('span.close', {
        'ev-click': hg.send(query_state.channels.removeDimension, {axis: axis, dim: dim}) })
    ])
  })

  // TODO.  might need button.add
  return (
    h('div.selector', [
      h('div.axis.' + axis, [
        h('ul.grouping', sel_lis),
          DimensionSelector.render(modal_state, query_state, axis, lang)
        ]),
      h('div.title', msgs[lang][axis])
    ])
  )
}

export default Axis