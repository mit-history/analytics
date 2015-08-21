/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/



require('../css/calendar.css')

var hg = require('mercury')
var h = require('mercury').h

var d3_time_format = require('d3-time-format')

const format = d3_time_format.format("%Y-%m-%d")

function Calendar() {
  return null
}

Calendar.render = function(state) {
  return h('div.calendar', [
            h('div.sel_dates', [
              "Selected dates: " + state.sel_dates.map(format).join(' to '),
              h('button', {
                'ev-click': hg.send(state.channels.sel_dates, random_dates(format.parse('1692-03-22'), format.parse('1782-02-11'), 2))
                }, [ "foobar!" ])
             ]),
            h('div.graph', state.calendar_data.map(square)),
            h('div.periods', state.theater_data.map(period)),
            h('div.day', [ "Current focused day: " + state.focus_day ])
         ])
  function square(x) {
    return h('span.date', {
               'ev-click': hg.send(state.channels.focus_day, x.day)
             }, [ String(x.day + " : " + x.sum_receipts) + ", " ])
  }
  function period(x) {
    return h('div.period', {
      'ev-click': hg.send(state.channels.focus_theater, x.theater_period)
    }, [ String(x.theater_period) + " : " + x['min(date)'] ] )
  }
}

function random_dates(start, end, count) {
  var dates = []
  for(var i=0; i<count; i++) {
    dates[i] = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }
  dates.sort()
  return dates
}

export default Calendar