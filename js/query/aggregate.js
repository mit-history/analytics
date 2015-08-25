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

/** Aggregate selector **/

function Aggregate(initial_agg) {
  return hg.value(initial_agg)
}

Aggregate.render = function(modal_state, query_state, lang) {
  var i18n = msgs[lang]

  var cur_agg = query_state.agg
  var aggregates = schema.aggregate()

  var lis = aggregates.map( (new_agg) => {
    return (
      h('li', {
          'ev-click': [ hg.send(query_state.channels.setAggregate, new_agg),
                        hg.send(modal_state.channels.setModal, null) ]
        }, [
          i18n[new_agg] || new_agg
        ])
    )
  })

  return (
    h('div.selector', [
      h('div.aggregate', [
        Modal.render(modal_state, 'aggregate', i18n[cur_agg] || cur_agg, [
          h('ul.panel', lis)
        ])
      ]),
      h('div.title', [ i18n.cells ])
    ])
  )
}

export default Aggregate