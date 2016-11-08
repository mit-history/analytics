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

var Modal = require('../modal')

var schema = require('../../cfrp-schema')

var i18n = require('../util/i18n')

// see vdom bug below...
var unique_key = 0

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
			// vdom bug, must define radio attrs out of the return statement
			var attrs = {
				type: 'radio',
				id: 'axis_dimension',
				name: 'axis_dimension',
				key: unique_key++,
				'ev-click' : [ hg.send(query_state.channels.setSelectedDimension, { axis: axis, dim: dim }),
			                 hg.send(modal_state.channels[lAxisChannel]) ]
			}
			if( query_state.selectedDimension
				  && dim == query_state.selectedDimension.dim
				  && axis == query_state.selectedDimension.axis)
			{
				attrs.checked = true;
			}

			return [
	      h('input', attrs),
				h('label',

					{
						'ev-click' : [ hg.send(query_state.channels.setSelectedDimension, { axis: axis, dim: dim }),
			                     hg.send(modal_state.channels[lAxisChannel]) ]
			    },
					[
						h('span.radio', h('span.radio')),
						h('span',  i18n.htmlize(msgs, dim, lang)
					)
				])
    	];
		}

		var lis = dims.map( (dim) => {
			// TODO.  virtual-dom doesn't match changes in <input checked ... /> properly
			//        a parallel issue for Mithril: https://github.com/lhorie/mithril.js/issues/691
			//        one workaround is to cache-bust the entire list with a key:
      return (
        h('li',
					{ key: unique_key++ },
					buildDimNodeFunc(dim))
      )
    })

		if (lis.length > 1) {
			return h('ul.dropdown-list-content.dropdown-inline', lis)
		} else {
    	return buildDimNodeFunc(dims[0])
		}

		// return lResult;
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
          h('button.dropdown-list.dimension-selector' + (modal_state.axisDimensionDropdown == name ? '.selected' : ''), {
						'ev-click': hg.send(modal_state.channels.setAxisDimensionDropdown, name)
					}, [
						h('span.title', i18n.htmlize(msgs, name, lang)),
						h('span.fa.right' + (modal_state.axisDimensionDropdown == name ? '.fa-chevron-up' : '.fa-chevron-down'))
					]),
          h('ul.dropdown-list-content.dropdown-inline' + (modal_state.axisDimensionDropdown == name ? '.visible-container' : '.hidden-container'),
						dim_lis(groups[name]) )
        ])
      )
    })
  }

  return (
		h('div.axis-selector.' + axis, [
			h('button.dropdown-list', {
				'ev-click': hg.send(modal_state.channels[lAxisChannel])
			}, [
				h('span.fa.right' + (modal_state[lAxisDropdown] ? '.fa-chevron-up' : '.fa-chevron-down'))
			]),
			h('ul.dropdown-list-content.axis-content' + (modal_state[lAxisDropdown] ? '.visible-container' : '.hidden-container'), group_lis(schema.group()))
		])
  )
}

export default DimensionSelector
