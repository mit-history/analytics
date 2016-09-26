/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
* David Talbot, Laval University, 04/2016
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
	var lIndex = 0;

  var sel_lis = dims.map( (dim) => {
    var sel_values = query_state.filter[dim] || []
		lIndex++;
		var lLabelPrefix = ((axis == 'rows') ? 'x' : 'y') + lIndex + '. '
    return h('li', [
      //Order.render(query_state, dim),
      h('span.selected-dimension-bullet' + (query_state.selectedDimension && query_state.selectedDimension.axis == axis && query_state.selectedDimension.dim == dim ? '.selected': '') + (lIndex == 1 ? '.first-axis': ''), [
				h('label', {'ev-click': hg.send(query_state.channels.setSelectedDimension, {axis: axis, dim: dim}) }, [lLabelPrefix, i18n.htmlize(msgs, dim, lang)]),
      	h('span.fa.fa-close', {'ev-click': hg.send(query_state.channels.removeDimension, {axis: axis, dim: dim}) })
			]),
    ])
  })

  return h('ul.axis-selected-dimensions', sel_lis)
}

export default Axis