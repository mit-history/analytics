/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../css/query.css')

var hg = require('mercury')
var h = require('mercury').h

const msgs = require("json!../i18n/query.json")

var Aggregate = require('./query/aggregate')
var Axis = require('./query/axis')
var Order = require('./query/order')
var Filter = require('./query/filter')

var datapoint = require('./util/datapoint')


/** Query selector as a whole **/

function Query(initial_query, url) {
  var state = hg.state({
    agg: Aggregate(initial_query.agg),
    rows: Axis(initial_query.rows),
    cols: Axis(initial_query.cols),
    order: Order(initial_query.order),
    filter: hg.varhash(initial_query.filter),
// local data & server-loaded data
    filter_state: Filter(),
    domains_data: hg.varhash({}),
    url: url,
// actions
    channels: {
      setAggregate: Query.setAggregate,
      addDimension: Query.addDimension,
      removeDimension: Query.removeDimension,
      clearFilter: Query.clearFilter,
      toggleFilterValue: Query.toggleFilterValue,
      toggleDimensionOrder: Query.toggleDimensionOrder,
      togglePivot: Query.togglePivot
    }
  })

  loadDomains()

  state.rows(loadDomains)
  state.cols(loadDomains)

  return state

  function loadDomains() {
    var api = datapoint(url)

    var active_dims = [].concat(state.rows()).concat(state.cols())
    active_dims.forEach( (dim) => {
      if(!state.domains_data()[dim]) {
        api.domain(dim, (vals) => {
          vals.sort()
          state.domains_data.put(dim, vals)
        })
      }
    })
  }

  // utility function to watch a hash of arrays
  function initialFilter(filter0) {
    var filter1 = Object.create({})
    for(var dim in hash) {
      filter1.put(dim, hg.array(filter0[dim]))
    }
    return hg.varhash(filter1)
  }
}


const ORDER_VALUES = ['nat', 'asc', 'desc']

Query.setAggregate = function(query, new_agg) {
  query.agg.set(new_agg)
}

Query.clearFilter = function(query, dim) {
  query.filter.put(dim, [])
 }

Query.toggleFilterValue = function(query, data) {
  var { dim, value } = data
  var sv = query.filter()[dim] || []

  var start_count = sv.length

  var j = sv.indexOf(value)

  if (j > -1) { sv.splice(j, 1) }
  else { sv.push(value) }
  sv.sort()

  console.log('toggled ' + dim + '.' + value + ' (' + sv.length + ')')

  if (sv.length < 5) { console.log(JSON.stringify(sv)) }

  query.filter.put(dim, sv)
}

// return a *live* version of the observ_struct axis value
function axisByName(query, axis) {
  switch(axis) {
    case 'rows': return query.rows
    case 'cols': return query.cols
    default: throw "Unknown axis " + axis
  }
}

Query.addDimension = function(query, data) {
  var { axis, dim } = data
  var dims = axisByName(query, axis)
  var j = dims.indexOf(dim)

  if (j === -1) {
    dims.push(dim)
  }
 }

Query.removeDimension = function(query, data) {
  var { axis, dim } = data
  var dims = axisByName(query, axis)
  var j = dims.indexOf(dim)

  if (j>-1) {
    dims.splice(j, 1)
  }

  query.filter.delete(dim)
}

Query.toggleDimensionOrder = function(query, dim) {
  var order = query.order.get(dim)
  var k = ORDER_VALUES.indexOf(order)
  var new_order = ORDER_VALUES[ (k+1) % ORDER_VALUES.length ]
  query.order.put(dim, new_order)
}

Query.togglePivot = function(query) {
  var row_splice = query.rows.splice
  var col_splice = query.cols.splice

  var rows = query.rows()
  var cols = query.cols()

  console.log(JSON.stringify(rows) + ' <--> ' + JSON.stringify(cols))

  row_splice.apply(query.rows, [0, rows.length].concat(cols))
  col_splice.apply(query.cols, [0, cols.length].concat(rows))

  console.log(JSON.stringify(query.rows()) + ' <--> ' + JSON.stringify(query.cols()))
}

Query.render = function(modal_state, query_state, lang) {
  var api = datapoint(query_state.url)
//  return h('div.query', [ String("Current query: " + JSON.stringify(state)) ])
  var all_dims = ([]).concat(query_state.rows).concat(query_state.cols)
  var download_url = api.url(all_dims, query_state.agg, query_state.filter)

  return (
    h('div.query', {id: 'query_panel'}, [
      Axis.render(modal_state, query_state, 'rows', lang),
      h('div.togglePivot', { 'ev-click': hg.send(query_state.channels.togglePivot, query_state) }),
      Axis.render(modal_state, query_state, 'cols', lang),
      Aggregate.render(modal_state, query_state, lang),
      h('div.selector', [
        h('div.download', h('a', { href: download_url })),
        h('div.title', 'Data')
      ])
    ]))
}

export default Query