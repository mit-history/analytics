/*
* MDAT Calendar Component
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

const timeFormat = d3.time.format
const numberFormat = d3.format

const day = d3.time.format('%w')
const month = d3.time.format('%m');

const msgs = require("json!../i18n/app.json")

// number of sundays since the prior March 1
const weeksOffset = (e, y) => d3_time.sunday.count(d3_time.sunday(new Date(e.getFullYear(), 3, 1)), y)
const invertWeekOffset = (y, c) => d3_time.sunday.offset(d3_time.sunday(new Date(y.getFullYear(), 3, 1)), c)

const dateIndexFormat = d3.time.format('%Y-%m-%d')

const month_n = (month, season) => ((month.getMonth() - 3) + ((month.getFullYear() - season.getFullYear()) * 12 ));
const month_y = (month, date, cellSize) => (d3_time.sunday.count(d3_time.sunday(new Date(month.getFullYear(), month.getMonth(), 1)), date)) * cellSize;
const month_x = (month, season, cellSize) => {
    let mn = month_n(month, season);
    return (mn ? (mn * 5) + (mn * 7 * cellSize) : mn);
}

var y_global = null

var sameDate = function(d0, d1) {
  return d0 && d1 && (d1 - d0 === 0)
}

var yearRange = function(i0, i1) {
  var yearFormat = d3.format("04d")
  var [ s0, s1 ] = [ yearFormat(i0), yearFormat(i1) ]

  return s0 + "-" + s1;
}

function GraphWidget(calendar_data, theater_data, calendar_extent, sel_dates, focus_day, mode, scale, sizes , lang) {
  this.calendar_data = calendar_data
  this.theater_data = theater_data
  this.calendar_extent = calendar_extent
  this.sel_dates = sel_dates
  this.focus_day = focus_day
  this.mode = mode
  this.scale = scale
  this.lang = lang
  this.sizes = sizes;
}

GraphWidget.prototype.width = function() {
  return this.sizes[0];
}

GraphWidget.prototype.cellSize = function() {
  return (this.width() - (60)) / 91;
}

GraphWidget.prototype.margins = function() {
  let values = { top: 30, right: 25, bottom: 10, left: 20 }
  values.left = this.width() > 800 ? 70 : values.left;
  return values;
}

GraphWidget.prototype.type = 'Widget'

GraphWidget.prototype.init = function() {
  var margins = this.margins();
  var elem = document.createElement('div')
  var graph = d3.select(elem)
      .classed('graph', true)
  var canvas = graph.append('canvas')
      .attr('width', this.width())
  var svg = graph.append('svg')
    .attr('width', this.width())
  var foreground = svg.append('g')
      .classed('foreground', true)
      .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
  foreground.append('rect')
      .attr("fill", "#E7E8EA")
      .attr("x", "-10")
      .attr("y", "-3em")
      .attr("width", this.width() + 10)
      .attr("height", "2.5em");
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

function pointToDate(e, extent, graph) {
  var canvas = d3.select(".calendar canvas")[0][0]
  var rect = canvas.getBoundingClientRect()
  var x = e.clientX - rect.left
  var y = e.clientY - rect.top;
  var margins = graph.margins();
  var cellSize = graph.cellSize();

  if (y < margins.top) { return null }

  var date_min = dateIndexFormat.parse(extent[0])
  var season_min = easter(date_min)

  var seasonOffset = Math.floor( (y - margins.top) / (cellSize * 9) )
  var season = easterForYear( season_min.getFullYear() + seasonOffset)
  var nextSeason = easterForYear(season.getFullYear()+1)

  var rx = (x - margins.left + 10);
  var month = Math.floor(rx / ((cellSize * 7) + 5));

  rx = rx - (month * cellSize * 7) - (month * 5);

  //var day = Math.floor((rx - (month * cellSize * 7)) / cellSize);
  var first = new Date(season.getFullYear(), month + 3, 1);
  var last = d3.time.month.offset(first, 1);

  var se = graph.sel_dates
  var sel = (se.length == 0) || (se[0] < first && first < se[1])

  if(!sel || !y_global) {
    return null;
  }

  var d = Math.floor(rx / cellSize);
  var season_y = margins.top + y_global(season);
  var ry = Math.floor((y - season_y) / cellSize);
  if(ry > 5) {
    return null;
  }

  var date = d3.time.week.offset(first, ry);
  date = d3.time.day.offset(date, d - +day(first));

  if(date < first || date >= last) {
    return null;
  }

  var nextSeason = easterForYear(season.getFullYear()+1)
  if(date >= nextSeason || date < season) {
    return null;
  }

  return date;
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
    var cellSize = this.cellSize();
    var margins = this.margins();

    var locale = i18n[this.lang]
    var tooltipFormat = locale.timeFormat("%a %e %b %Y")

    var season = (date) => easter(date)
    var date = pointToDate(d3.event, this.calendar_extent, this)
    var data;
    if(date) {
      var s = dateIndexFormat(date)
      data = this.calendar_data[s];
    }

    var rx = 0;
    var ry = 0;
    if(date) {
      rx = month_x(date, season(date), cellSize) - cellSize;
      ry = y_global(season(date)) + 7.2 * cellSize
    }

    var tooltip = svg.select(".foreground").selectAll(".tooltip")
      .data((date && y_global) ? [ date ] : [])
    tooltip.exit().remove()
    tooltip.enter().append("text")
      .classed("tooltip", true)
      .attr("text-align", "left")
      .attr("x", rx)
      .attr("y", ry);

    var dataTooltip = svg.select(".foreground").selectAll(".data-tooltip")
        .data((data) ? [ data ] : [])
      dataTooltip.exit().remove()
      dataTooltip.enter().append("text")
        .classed("data-tooltip", true)
        .attr("text-align", "left")
        .attr("x", rx)
        .attr("y", ry + cellSize)

    tooltip.text(tooltipFormat)
    dataTooltip.text(data + " " + msgs[this.lang]["currency"]);
  }
}

GraphWidget.prototype.update = function(prev, elem) {
  this.calendar_data = this.calendar_data || prev.calendar_data
  this.calendar_extent = this.calendar_extent || prev.calendar_extent

  this.listen(elem)

  var cellSize = this.cellSize();
  var margins = this.margins();
  var graph = d3.select(elem)
  var canvas = graph.select("canvas")[0][0]
  var locale = i18n[this.lang]
  var xAxisFormat = (d) => locale.timeFormat('%B')(d)

  var data = this.calendar_data
  var keys = d3.keys(data)

  if(keys.length === 0) { return }

  var [ lo, hi ] = this.calendar_extent.map(dateIndexFormat.parse)
  var data_extent = [ easter(lo), easterCeiling(hi) ]
  var height = (data_extent[1].getFullYear() - data_extent[0].getFullYear()) * cellSize * 9
  var width = this.width();

  canvas.height = margins.top + margins.bottom + height
  canvas.width = margins.left + margins.right + width;
  var svg = d3.select(elem)
    .select("svg")
      .attr("height", canvas.height).attr("width", canvas.width)

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
    ctx.translate(margins.left - 10, margins.top + Math.round( y(season) ))

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(width, -3);
    ctx.stroke();

    var x = (date) => weeksOffset(season, date) * cellSize

    var nextSeason = easterForYear(season.getFullYear()+1)
    var days = d3.time.days( season, nextSeason )

    if (this.mode === 'focus') {
      var months = d3.time.months( new Date(season.getFullYear(), 3, 1), new Date(nextSeason.getFullYear(), 4, 1) )
      var scale = this.scale

      months.forEach( (month) => {
        var se = this.sel_dates
        var sel = (se.length == 0) || (se[0] < month && month < se[1])
        if(sel) {
          var days = d3.time.days(month, new Date(month.getFullYear(), month.getMonth() + 1, 1));
          days.forEach((d => {
            if(season <= d && d < nextSeason) {
              var rx = month_x(month, season, cellSize) + (day(d) * cellSize);
              var ry = month_y(month, d, cellSize);
              ctx.strokeStyle = '#ccc'
              ctx.strokeRect(rx, ry, cellSize, cellSize)
              var s = dateIndexFormat(d)
              var d = this.calendar_data[s]

              ctx.fillStyle = "transparent";
              if(d) {
                ctx.fillStyle = scale(d)
              }
              ctx.fillRect(rx, ry, cellSize, cellSize)
            }
          }));
        }
      });

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
    .attr("cx", (d) => month_x(d, easter(d), cellSize) + (day(d) * cellSize) - 6)
    .attr("cy", (d) => y(easter(d)) + month_y(new Date(d.getFullYear(), d.getMonth(), 1), d, cellSize) + 4)

  // x axis

  var months_extent = d3.time.months( new Date(seasons[0].getFullYear(), 3, 1),
                                      new Date(seasons[0].getFullYear()+1, 4, 1) )

  var month = svg.select('.axis.x')
    .selectAll('.month')
      .data(months_extent)

  month.enter()
    .append('text')
      .classed('month', true)
      .attr('dy', '-1em')
      .attr('text-anchor', 'middle')
      .text(xAxisFormat)

  month.attr('x', (d) => (month_x(d, seasons[0], cellSize) - (margins.left + 10)) + (6 * cellSize));
  // y axis

  var all_years = d3.range(data_extent[0].getFullYear(), data_extent[1].getFullYear())

  var year = svg.select('.axis.y')
    .selectAll('.year')
      .data(all_years, (x) => x)

  year.exit().remove()
  year.enter()
    .append('g')
      .classed('year', true)
    .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
    .text( (year) => yearRange(year, year+1))
  year.selectAll('text').attr('dy', (width))
  year
    .attr('transform', (year) => 'translate(0,' + Math.round( y(easterForYear(year)) + (cellSize * 5) / 2.0) + ')')
}

function Calendar() {
  return hg.state({
    status: Status()
  })
}

var dragging = false

Calendar.render = function(state, sizes, lang) {
  var scale = d3.scale.quantile()
    .domain( d3.values(state.calendar_data) )
    .range( colorbrewer.YlGnBu[9].slice(0,7) )

  var graphWidget = new GraphWidget(state.calendar_data,
    state.theater_data, state.calendar_extent, state.sel_dates,
    state.focus_day, 'focus', scale, sizes, lang);

  var dragDateExtent = hg.BaseEvent(function (ev, broadcast) {
    // @see https://github.com/Raynos/mercury/blob/master/examples/geometry/lib/drag-handler.js
    var del = hg.Delegator()

    var startSelection = pointToDate(ev, state.calendar_extent, graphWidget)

    function onmove(ev2) {
      ev2.preventDefault()
      dragging = true

      var endSelection = pointToDate(ev2, state.calendar_extent, graphWidget)

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
    var date = pointToDate(ev, state.calendar_extent, graphWidget)

    if(date && !dragging) {
      broadcast(assign(this.data, { date: date }))
    }
  })

  return (
      h('div.calendar', {
        'ev-mousedown' : dragDateExtent(state.channels.sel_dates),
        'ev-click' : sendDay(state.channels.focus_day)
      }, [
        Status.render(state, lang, scale, state.status),
        graphWidget
      ])
  )
}

export default Calendar
