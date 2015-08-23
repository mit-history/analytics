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

var schema = require('../cfrp-schema')


/** Aggregate selector **/

function Aggregate() {
  return null
}

Aggregate.render = function(state, lang) {

  var i18n = msgs[lang]

  var lis = schema.aggregate().map( (new_agg) => {
    var new_query = assign({}, state.query, { agg: new_agg })

    return (
      h('li', { 'ev-click': hg.send(state.channels.set_query, new_query) },
        [ i18n[new_agg] || new_agg ])
    )
  })

  var modal = (state.modal === 'aggregate')
              ? h('ul.panel', lis)
              : null

  return (
    h('div.selector', [
      h('div.aggregate', [
        h('div.dropdown', { 'ev-click': hg.send(state.channels.toggle_modal, 'aggregate') }, [
          h('button', [ i18n[state.query.agg] || state.query.agg ]),
          modal ])]),
      h('div.title', [ i18n.cells ])])
    )
}

export default Aggregate