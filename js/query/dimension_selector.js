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

var Modal = require('../modal')

var schema = require('../../cfrp-schema')

var i18n = require('../util/i18n')


function DimensionSelector() {
  return null
}

DimensionSelector.render = function(modal_state, query_state, axis, lang) {

  var stem_lis = (dims) => {
    var lis = dims.map( (dim) => {
      return (
        h('li.dimension',
          { 'ev-click' : [ hg.send(query_state.channels.addDimension, { axis: axis, dim: dim }),
                           hg.send(modal_state.channels.setModal, null) ]
          }, [
            i18n.htmlize(msgs, dim, lang)
          ])
      )
    })
    return lis
  }

  var dim_lis = (dims) => {
    var bins = Object.create({})
    dims.forEach( (dim) => {
      var match = /^([^_]+)/.exec(dim),
          stem = match ? match[1] : dim
      bins[stem] = bins[stem] || []
      bins[stem].push(dim)
    })

    var stems = Object.keys(bins)
    var all_lis = stems.map( (stem) => {
      return h('ul.subscripts', stem_lis(bins[stem]))
    })
    return all_lis
  }

  var group_lis = (groups) => {
    var names = Object.keys(groups)
    return names.map( (name) => {
      return (
        h('li.group.' + name, [
          h('div.dimensionGroupLabel', i18n.htmlize(msgs, name, lang)),
          h('ul.dimensionGroup.' + name, dim_lis(groups[name]) )
        ])
      )
    })
  }
	
	var lAxisChannel = (axis == 'rows' ? 'setXAxisDropdownOpen': 'setYAxisDropdownOpen')
	var lAxisDropdown = (axis == 'rows' ? 'xAxisDropdownOpen': 'yAxisDropdownOpen')

  return (
		h('div.axis-selector.' + axis, [
			h('button.dropdown-list', {
				'ev-click': hg.send(query_state.channels[lAxisChannel])
			}, [
				h('span.fa.right' + (query_state[lAxisDropdown] ? '.fa-chevron-up' : '.fa-chevron-down'))
			]),
			h('ul.dropdown-list-content' + (query_state[lAxisDropdown] ? '.visible-container' : '.hidden-container'), group_lis(schema.group()))
		])
  )
}

export default DimensionSelector