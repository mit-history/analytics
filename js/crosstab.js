/*
* Main CFRP application component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/

var hg = require('mercury')
var h = require('mercury').h

var assign = require('object-assign')

function Crosstab() {
  return null
}

Crosstab.render = function(state) {
  return h('div.cell', [
           "Current focused cell: " + JSON.stringify(state.focus_cell),
           h('div.crosstab', state.cube_data.map(renderCell))
         ])
  function renderCell(d) {
    var focus_target = assign({}, d)
    delete focus_target['sum_receipts']
    return h('span.agg', {
             'ev-click': hg.send(state.channels.focus_cell, focus_target)
           }, [ String(Math.round(d.sum_receipts)) + ", " ])
  }
}

export default Crosstab