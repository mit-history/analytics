/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../css/status.css')

const schema = require('../cfrp-schema')

const hg = require('mercury')
const h = require('mercury').h

const svg = require('virtual-hyperscript/svg')

const d3 = require('d3')
const colorbrewer = require('colorbrewer')

const format = d3.time.format('%Y-%m-%d')

const cellsize = 8

const legendwidth = 550
const legendheight = 50

const margin = { top: 20, right: 50, bottom: 0, left: 25 }

function uniq(xs) {
  return xs.filter( (y, i, ys) => ys.indexOf(y) == i )
}

function update(graph, qscale, format, regular) {
  var width = legendwidth - margin.right - margin.left

  var [ low, high ] = [ 0, 0 ]
  var qtiles = []
  var data = qscale.domain()

  if(data.length > 0) {
    [ low, high ] = d3.extent(qscale.domain())
    qtiles = [ low ].concat( qscale.quantiles() ).concat([ high ])
    qtiles = uniq(qtiles)
  }

  var x = d3.scale.linear()
    .range([0, width])
    .domain([low, high])

  var x_regular = d3.scale.linear()
    .range([0, width])
    .domain([0, qtiles.length])

  var axis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat( (d) => format(d) )

  var axis_regular = d3.svg.axis()
    .scale(x_regular)
    .orient("top")
    .tickFormat( (d, i) => qtiles[i] ? ("≥ " + format( qtiles[i] )) : "" )

  axis_regular = regular ? axis_regular.ticks(qtiles.length)
                         : axis_regular.tickValues(qtiles)

  graph.select(".axis.linear")
    .call(axis)

  graph.select(".axis.quantile")
    .call(axis_regular)

  graph.select(".axis")
    .selectAll("text")
    .style("text-anchor", "start")

  var rect = graph.select('.bars')
      .selectAll('rect')
    .data(qtiles)

  rect.exit().remove()

  rect.enter().append('rect')
    .attr('height', cellsize)

  rect.attr('x', (d, i) => regular ? x_regular(i) : x(d) )
      .attr('width', (d, i) => width - (regular ? x_regular(i) : x(d)) )
      .attr('fill', qscale)
}

function LegendWidget(scale, format, regular) {
  this.scale = scale
  this.format = format
  this.regular = regular
}

LegendWidget.prototype.type = 'Widget'

LegendWidget.prototype.init = function() {

  var elem = document.createElement('div')

  var graph = d3.select(elem)
      .classed('legend', true)
    .append('svg')
     .attr('width', legendwidth)
     .attr('height', legendheight)
    .append('g')
     .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  graph.append('g')
    .classed('bars', true)

  graph.append('g')
    .classed({ axis: true, quantile: true })
    .attr('transform', 'translate(0,' + cellsize + ')')

  graph.append('g')
    .classed({ axis: true, linear: true })
    .attr('transform', 'translate(0,' + cellsize + ')')

  update(graph, this.scale, this.format, this.regular)

  return elem
}

LegendWidget.prototype.update = function(prev, elem) {
  this.scale = this.scale || prev.scale
  this.format = this.format || prev.format

  var svg = d3.select(elem)
    .select('svg g')

  update(svg, this.scale, this.format, this.regular)
}



function Status() {
  return hg.state({
    regular: hg.value(true),
    channels: {
      toggleRegular: Status.toggleRegular
    }
  })
}

Status.toggleRegular = function(state) {
  state.regular.set(!state.regular())
}

Status.render = function(state, lang, scale) {

  var format = schema.format(lang, state.query.agg)

  return (
    h('div.titlebar', {
        'ev-click' : hg.send(state.status.channels.toggleRegular)
      }, [
      /*
      h('div.querystatus', [
        state.sel_dates.map(format).join(' <--> '),
        JSON.stringify(state.focus_cell)
      ]),
      */
      new LegendWidget(scale, format, state.status.regular)
    ])
  )
}

export default Status