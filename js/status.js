/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../css/calendar.css')

const hg = require('mercury')
const h = require('mercury').h


function Status() {
  return null
}

Status.render = function(state, lang) {
  return (
    h('div.titlebar', [
      state.sel_dates.join(' - '),
      JSON.stringify(state.focus_cell)
    ])
  )
}

export default Status