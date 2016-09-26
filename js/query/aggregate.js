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

/** Aggregate selector **/

function Aggregate(initial_agg) {
  return hg.value(initial_agg)
}

Aggregate.render = function(modal_state, query_state, lang) {
  var cur_agg = query_state.agg
  var aggregates = schema.aggregate()

  var lis = aggregates.map( (new_agg) => {
		// TODO.  virtual-dom doesn't match changes in <input checked ... /> properly
		//        a parallel issue for Mithril: https://github.com/lhorie/mithril.js/issues/691
		//        one workaround is to cache-bust the entire list with a key:
		var attrs = { type: 'radio',
									id: 'aggregate',
									name: 'aggregate' }
		if(cur_agg == new_agg) {
			attrs.checked = true;
		}

    return (
      h('li', {
        key: unique_key++,
				'ev-click': [
					hg.send(query_state.channels.setAggregate, new_agg),
					hg.send(modal_state.channels.setAggregateDropdownOpen)]
        },

				[
          h('input', attrs),
					h('label', [
						h('span.radio', h('span.radio')),
						i18n.htmlize(msgs, new_agg, lang)
					])
        ])
    )
  })

  return (
		h('div.aggregate-selector', [
			h('button.dropdown-list', {
				'ev-click': hg.send(modal_state.channels.setAggregateDropdownOpen)
			}, [
				h('span.title', i18n.htmlize(msgs, cur_agg, lang)),
				h('span.fa.right' + (modal_state.aggregateDropdownOpen ? '.fa-chevron-up' : '.fa-chevron-down'))
			]),
			h('ul.dropdown-list-content' + (modal_state.aggregateDropdownOpen ? '.visible-container' : '.hidden-container'), lis)
		])
  )
}

export default Aggregate