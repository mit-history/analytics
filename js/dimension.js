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

var i18n = require('./i18n')

var Filter = require('./filter')


/** Dimension selector **/

function Dimension() {
  return hg.state({
    filter: Filter()
  })
}

function advance_order(order) {
  var all_values = ['asc', 'desc', 'nat']
  var k = all_values.indexOf(order)
  return all_values[ (k+1) % all_values.length ]
}

Dimension.render = function(state, axis, dim, lang) {

  // TODO.  find a better way to decompose this down the component hierarchy
  //        should axis break state object up before calling Dimension.render?

  var filter_state = state.query_component.axis.dimension.filter
  var filter_html = Filter.render(filter_state,
                                  state.channels,
                                  dim,
                                  state.domains_data[dim] || [],
                                  state.query,
                                  schema.format(lang, dim),
                                  lang)

  var modal_identifier = axis + '.' + dim
  var modal = (state.modal === modal_identifier)
              ? filter_html
              : null

  var filter = state.query.filter[dim] || []
  var filtered = filter && filter.length > 0

  var order = state.query.order[dim] || 'nat'

  // figure out a better solution to modify the query object... perhaps more detailed messages to the stateful API?
  var next_order_query = assign({}, state.query)
  next_order_query.order = assign({}, state.query.order)
  next_order_query.order[dim] = advance_order(order)

  var remove_dim_query = assign({}, state.query)
  remove_dim_query[axis] = state.query[axis].filter( (dim0) => dim0 !== dim)

  return (
    h('li.' + (filtered ? 'filtered' : 'unfiltered'), [
      h('span.order.' + order, {
        'ev-click' : hg.send(state.channels.set_query, next_order_query) }),
      h('span.name', {
        'ev-click': hg.send(state.channels.toggle_modal, modal_identifier) }, [
        i18n.htmlize(msgs, dim, lang)
      ]),
      h('span.close', {
        'ev-click': hg.send(state.channels.set_query, remove_dim_query) }),
      modal
    ])
  )
}

export default Dimension