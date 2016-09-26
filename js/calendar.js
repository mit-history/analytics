/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
* TODO : This component is not actively used (not called in app.js) and may be removed in future if not needed. Kept for possible reintegration (dtalbot)
*/

require('../css/calendar.css')

const hg = require('mercury')
const h = require('mercury').h

const d3 = require('d3')
const colorbrewer = require('colorbrewer')
const d3_time = require('d3-time')  // until d3 core updated to use d3-time 0.0.5
const queue = require('queue-async')

import { easter, easterForYear, easterCeiling } from './util/date-utils'
const i18n = require('./util/i18n')

const datapoint = require('./util/datapoint')

const assign = require('object-assign')

const Status = require('./status')

const cellSize = 8
const timeFormat = d3.time.format
const numberFormat = d3.format

const day = d3.time.format('%w')

// number of sundays since the prior March 1
const weeksOffset = (e, y) => d3_time.sunday.count(d3_time.sunday(new Date(e.getFullYear(), 3, 1)), y)
const invertWeekOffset = (y, c) => d3_time.sunday.offset(d3_time.sunday(new Date(y.getFullYear(), 3, 1)), c)

const margins = { top: 30, right: 5, bottom: 10, left: 25 }

const dateIndexFormat = d3.time.format('%Y-%m-%d')


var y_global = null

var sameDate = function(d0, d1) {
  return d0 && d1 && (d1 - d0 === 0)
}

var yearRange = function(i0, i1) {
  var yearFormat = d3.format("04d")
  var [ s0, s1 ] = [ yearFormat(i0), yearFormat(i1) ]
  var i = 3
  while (i >= 0 && s0[i] !== s1[i]) {
    i--
  }

  return s0 + "-" + s1.slice(i+1)
}

var greyscale = function(c) {
  // TODO.  genuine conversion to greyscale from a color
  return 'lightgrey'
}


function GraphWidget(calendar_data, theater_data, calendar_extent, sel_dates, focus_day, mode, scale, lang) {
  this.calendar_data = calendar_data
  this.theater_data = theater_data
  this.calendar_extent = calendar_extent
  this.sel_dates = sel_dates
  this.focus_day = focus_day
  this.mode = mode
  this.scale = scale
  this.lang = lang
}

GraphWidget.prototype.type = 'Widget'

GraphWidget.prototype.init = function() {
  var elem = document.createElement('div')

  var graph = d3.select(elem)
      .classed('graph', true)
  var canvas = graph.append('canvas')
      .attr('width', 550)
  var svg = graph.append('svg')
    .attr('width', 550)
  var foreground = svg.append('g')
      .classed('foreground', true)
      .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
  var periods = foreground.append('g')
      .classed('periods', true)
      .attr('transform', 'translate(' + (59 * cellSize) + ',0)')
  var x_axis = foreground.append('g')
      .classed('x axis', true)
  var y_axis = foreground.append('g')
      .classed('y axis', true)

  this.listen(elem)

  return elem
}

GraphWidget.prototype.select = function() {
  var date = pointToDate(d3.event, this.calendar_extent)
  this.props.handlePreview(date)
}

function pointToDate(e, extent) {
  var canvas = d3.select(".calendar canvas")[0][0]
  var rect = canvas.getBoundingClientRect()
  var x = e.clientX - rect.left
  var y = e.clientY - rect.top

  if (y < margins.top) { return null }

  var date_min = dateIndexFormat.parse(extent[0])
  var season_min = easter(date_min)

  var seasonOffset = Math.floor( (y - margins.top) / (cellSize * 9) )
  var weekOffset = Math.floor( (x - margins.left) / cellSize )
  var weekdayOffset = Math.floor( (y - margins.top) / cellSize % 9 )

  if(weekdayOffset > 6) { return null }

  var season = easterForYear( season_min.getFullYear() + seasonOffset)
  var week = invertWeekOffset(season, weekOffset)
  var date = d3_time.day.offset(week, weekdayOffset)

  return date
}

GraphWidget.prototype.listen = function(elem) {
  // TODO.  not clear why this is needed...  check virtual-dom update cycle
  if(this.calendar_extent && this.calendar_extent[0] && this.calendar_extent[1]) {
    var boundhover = hover.bind(this)
    var svg = d3.select(elem)
      .select('svg')
    svg.on("mousemove", boundhover)
     .on("mouseleave", boundhover)
  }

  function hover() {
    var svg = d3.select(elem)
      .select('svg')

    var locale = i18n[this.lang]
    var tooltipFormat = locale.timeFormat("%a %e %b %Y")

    var season = (date) => easter(date)
    var date = pointToDate(d3.event, this.calendar_extent)

    var tooltip = svg.select(".foreground").selectAll(".tooltip")
      .data((date && y_global) ? [ date ] : [])
    tooltip.exit().remove()
    tooltip.enter().append("text")
      .classed("tooltip", true)
      .attr("text-align", "left")

    tooltip.attr("x", (date) => weeksOffset(season(date), d3.time.month(date)) * cellSize)
      .attr("y", (date) => y_global(season(date)) + 8.2 * cellSize)
      .text(tooltipFormat)
  }
}

GraphWidget.prototype.update = function(prev, elem) {
  this.calendar_data = this.calendar_data || prev.calendar_data
  this.calendar_extent = this.calendar_extent || prev.calendar_extent

  this.listen(elem)

  var graph = d3.select(elem)
  var canvas = graph.select("canvas")[0][0]
  var locale = i18n[this.lang]
  var xAxisFormat = (d) => locale.timeFormat('%b')(d).toLowerCase()

  var data = this.calendar_data
  var keys = d3.keys(data)

  if(keys.length === 0) { return }

  var [ lo, hi ] = this.calendar_extent.map(dateIndexFormat.parse)
  var data_extent = [ easter(lo), easterCeiling(hi) ]
  var height = (data_extent[1].getFullYear() - data_extent[0].getFullYear()) * cellSize * 9

  canvas.height = margins.top + margins.bottom + height
  var svg = d3.select(elem)
    .select("svg")
      .attr("height", canvas.height)
//    canvas.width = margins.left + margins.right + width

  var y = d3.scale.linear()
    .domain(data_extent)
    .range([0, height])

  // TODO.  bad, very bad -- replace with a more sustainable solution
  y_global = y

  var ctx = canvas.getContext('2d')
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.translate(0.5,0.5);

  var seasons = d3.range(data_extent[0].getFullYear(), data_extent[1].getFullYear()).map(easterForYear)

  seasons.forEach( (season) => {
    ctx.save()
    ctx.translate(margins.left, margins.top + Math.round( y(season) ))

    var x = (date) => weeksOffset(season, date) * cellSize

    var nextSeason = easterForYear(season.getFullYear()+1)
    var days = d3.time.days( season, nextSeason )

    if (this.mode === 'focus') {
      var scale = this.scale
      days.forEach( (d) => {
        var rx = Math.round( x(d) )
        var ry = Math.round( +day(d) * cellSize )

        ctx.strokeStyle = '#ccc'
        ctx.strokeRect(rx, ry, cellSize, cellSize)

        var se = this.sel_dates
        var sel = (se.length == 0) || (se[0] < d && d < se[1])

        var s = dateIndexFormat(d)
        var d = this.calendar_data[s]

        ctx.fillStyle = "white"
        if(d) {
          var c = scale(d)
          ctx.fillStyle = sel ? c : greyscale(c)
        }
        ctx.fillRect(rx, ry, cellSize, cellSize)
      })

      var months = d3.time.months( new Date(season.getFullYear(), 3, 1), new Date(nextSeason.getFullYear(), 4, 1) )

      months.forEach( (t0) => {
        ctx.strokeStyle = 'black'

        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = +day(t0), w0 = +weeksOffset(season, t0),
            d1 = +day(t1), w1 = +weeksOffset(season, t1)

        var path = new Path2D()
        path.moveTo( (w0 + 1) * cellSize, d0 * cellSize )
        path.lineTo( w0 * cellSize, d0 * cellSize )
        path.lineTo( w0 * cellSize, 7 * cellSize )
        path.lineTo( w1 * cellSize, 7 * cellSize )
        path.lineTo( w1 * cellSize, (d1 + 1) * cellSize )
        path.lineTo( (w1 + 1) * cellSize, (d1 + 1) * cellSize )
        path.lineTo( (w1 + 1) * cellSize, 0 )
        path.lineTo( (w0 + 1) * cellSize, 0 )
        path.lineTo( (w0 + 1) * cellSize, d0 * cellSize )

        ctx.stroke(path);
      })

    } else if (this.state.mode === 'context') {
//      console.log("drawing context")
    } else {

      throw "Unkown mode " + mode;
    }

    ctx.restore()
  })

  ctx.restore()

  // svg layer

  var svg = d3.select(elem)
    .select('svg .foreground')
      .attr("transform", "translate(" + margins.left + "," + margins.top + ")")

  // focused date

  var circle = svg.selectAll("circle.focus")
    .data(this.focus_day ? [this.focus_day] : [])

  circle.exit().remove()
  circle.enter()
    .append('circle')
    .classed('focus', true)
    .attr("r", 5)
    .attr("stroke", "red")
    .attr("stroke-width", 1.5)
    .attr("fill", "none")

  circle
    .attr("cx", (d) => weeksOffset(easter(d), d) * cellSize + 4)
    .attr("cy", (d) => y(easter(d)) + +day(d) * cellSize + 4)

  // theater periods

  var theater_extents = (name) => {
    var theater = this.theater_data[name]
    var start_season = easter(theater.start_date)
    var end_season = easterCeiling(theater.end_date)

    return { top : Math.round( y(start_season) ),
             bottom : Math.round( y(end_season) - cellSize * 2 ) }
  }

  var period = svg.select('.periods')
    .selectAll('.period')
      .data(d3.keys(this.theater_data))

  var period_g = period.enter().append("g")
      .classed("period", true)
    .attr('transform', (name) => 'translate(0,' + theater_extents(name).top + ')')
    .on('click', (d) => alert('selected ' + d))

  period_g
    .append('path')
      .attr('d', period_path)
      .attr('stroke', 'black')
      .attr('fill', 'transparent')

  period_g
    .append("text")
      .attr("dy", "-1.5em")
      .attr("dx", "1em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start")
      .text( (name) => name )

  function period_path(name) {
    var { top, bottom } = theater_extents(name)
    var height = bottom - top
    return 'M0,0h' + cellSize * 2 + 'h' + -cellSize +
           'V' + (height - cellSize) +
           'L0,' + height
  }

  // x axis

  var months_extent = d3.time.months( new Date(seasons[0].getFullYear(), 3, 1),
                                      new Date(seasons[0].getFullYear()+1, 4, 1) )

  var month = svg.select('.axis.x')
    .selectAll('.month')
      .data(months_extent)

  month.enter()
    .append('text')
      .classed('month', true)
      .attr('x', (d) => +weeksOffset(seasons[0], d) * cellSize + cellSize * 2, -9)
      .attr('dy', '-1em')
      .text(xAxisFormat)

  // y axis

  var all_years = d3.range(data_extent[0].getFullYear(), data_extent[1].getFullYear())

  var year = svg.select('.axis.x')
    .selectAll('.year')
      .data(all_years, (x) => x)

  year.exit().remove()
  year.enter()
    .append('g')
      .classed('year', true)
    .append('text')
      .attr('dy', '-1em')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
    .text( (year) => yearRange(year, year+1))

  year
    .attr('transform', (year) => 'translate(0,' + Math.round( y(easterForYear(year)) + (cellSize * 7) / 2.0) + ')')
}

function Calendar() {
  return hg.state({
    status: Status()
  })
}

var dragging = false

Calendar.render = function(state, lang) {

  var dragDateExtent = hg.BaseEvent(function (ev, broadcast) {
    // @see https://github.com/Raynos/mercury/blob/master/examples/geometry/lib/drag-handler.js
    var del = hg.Delegator()

    var startSelection = pointToDate(ev, state.calendar_extent)

    function onmove(ev2) {
      ev2.preventDefault()
      dragging = true

      var endSelection = pointToDate(ev2, state.calendar_extent)

      if(endSelection) {
        var dates = [ startSelection, endSelection ].sort( d3.ascending )
        var msg = { startDate: dates[0], endDate: dates[1] }

        broadcast(msg)
      }
    }

    function onup(ev2) {
      // TODO.  find a better solution
      setTimeout( () => { dragging = false }, 250)

      del.unlistenTo('mousemove')
      del.removeGlobalEventListener('mousemove', onmove)
      del.removeGlobalEventListener('mouseup', onup)
    }

    ev.preventDefault()

    if(startSelection) {
      del.listenTo('mousemove')
      del.addGlobalEventListener('mousemove', onmove)
      del.addGlobalEventListener('mouseup', onup)
    }
  })

  var sendDay = hg.BaseEvent(function(ev, broadcast) {
    var date = pointToDate(ev, state.calendar_extent)

    if(date && !dragging) {
      broadcast(assign(this.data, { date: date }))
    }
  })

  var scale = d3.scale.quantile()
    .domain( d3.values(state.calendar_data) )
    .range( colorbrewer.YlGnBu[9].slice(0,7) )

  return (
      h('div.calendar', {
        'ev-mousedown' : dragDateExtent(state.channels.sel_dates),
        'ev-click' : sendDay(state.channels.focus_day)
      }, [
        Status.render(state, lang, scale, state.status),
        new GraphWidget(state.calendar_data, state.theater_data, state.calendar_extent, state.sel_dates, state.focus_day, 'focus', scale, lang)
      ])
  )
}

export default Calendar