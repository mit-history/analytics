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
  return null;
}

DimensionSelector.setDimensionDropdownOpen = function (state, dimension) {
  state.queryPanelOpen.set(dimension);
}

DimensionSelector.render = function(modal_state, query_state, axis, lang) {

	var lAxisChannel = (axis == 'rows' ? 'setXAxisDropdownOpen': 'setYAxisDropdownOpen')
	var lAxisDropdown = (axis == 'rows' ? 'xAxisDropdownOpen': 'yAxisDropdownOpen')
	
  var stem_lis = (dims, stem) => {
    
		var buildDimNodeFunc = function(dim) {
			return [
	      h('input', {type: 'radio', name: 'axis_dimension', checked: 'false'}),
				h('label', [
					h('span.radio', h('span.radio')),
					h('span', { 'ev-click' : [ hg.send(query_state.channels.addDimension, { axis: axis, dim: dim }),
			                        			 hg.send(query_state.channels[lAxisChannel]) ]
			        },
							i18n.htmlize(msgs, dim, lang)
					)
				])
    	];
		}
		
		var lis = dims.map( (dim) => {
      return (
        h('li', buildDimNodeFunc(dim))
      )
    })
		
		if (lis.length > 1) {
			return [
				h('span', i18n.htmlize(msgs, stem, lang)),
				h('ul.dropdown-list-content.dropdown-inline', lis)
			];
		} else {
    	return buildDimNodeFunc(dims[0])
		}
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
      return h('li', stem_lis(bins[stem], stem))
    })
    return all_lis
  }

  var group_lis = (groups) => {
    var names = Object.keys(groups)
    return names.map( (name) => {
      return (
        h('li', [
          h('button.dropdown-list', {
						'ev-click': hg.send(query_state.channels.setAxisDimensionDropdown, name)
					}, [
						i18n.htmlize(msgs, name, lang),
						h('span.fa.right' + (query_state.axisDimensionDropdown == name ? '.fa-chevron-up' : '.fa-chevron-down'))
					]),
          h('ul.dropdown-list-content.dropdown-inline' + (query_state.axisDimensionDropdown == name ? '.visible-container' : '.hidden-container'), 
						dim_lis(groups[name]) )
        ])
      )
    })
  }

  return (
		h('div.axis-selector.' + axis, [
			h('button.dropdown-list', {
				'ev-click': hg.send(query_state.channels[lAxisChannel])
			}, [
				h('span.fa.right' + (query_state[lAxisDropdown] ? '.fa-chevron-up' : '.fa-chevron-down'))
			]),
			h('ul.dropdown-list-content.axis-content' + (query_state[lAxisDropdown] ? '.visible-container' : '.hidden-container'), group_lis(schema.group()))
		])
  )
}

export default DimensionSelector