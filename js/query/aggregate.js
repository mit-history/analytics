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

/** Aggregate selector **/

function Aggregate(initial_agg) {
  return hg.value(initial_agg)
}

Aggregate.render = function(modal_state, query_state, lang) {
  var cur_agg = query_state.agg
  var aggregates = schema.aggregate()

  var lis = aggregates.map( (new_agg) => {
    return (
      h('li', {
				'ev-click': [
					hg.send(query_state.channels.setAggregate, new_agg),
					hg.send(query_state.channels.setAggregateDropdownOpen)]
        },
				
				[
          h('input', {type: 'radio', name: 'aggregate', 'checked': (cur_agg == new_agg ? 'true': 'false')}),
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
				'ev-click': hg.send(query_state.channels.setAggregateDropdownOpen)
			}, [
				h('span.title', i18n.htmlize(msgs, cur_agg, lang)),
				h('span.fa.right' + (query_state.aggregateDropdownOpen ? '.fa-chevron-up' : '.fa-chevron-down'))
			]),
			h('ul.dropdown-list-content' + (query_state.aggregateDropdownOpen ? '.visible-container' : '.hidden-container'), lis)
		])
  )
}

export default Aggregate