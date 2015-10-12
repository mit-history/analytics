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

const cellfill = 8
const cellmargin = 2
const cellsize = cellfill + cellmargin

const legendwidth = 500
const legendheight = 50

const margin = { top: 20, right: 5, bottom: 0, left: 25 }


function update(graph, qscale, format) {
  var [ low, high ] = d3.extent(qscale.domain())
  var qtiles = qscale.quantiles()
  var data = [ low ].concat(qtiles).concat( [ high ] )
  data = d3.pairs(data)

  var x = d3.scale.linear()
    .domain([ low, high ])
    .range([0, legendwidth - margin.right - margin.left])

  var axis = d3.svg.axis()
    .scale(x)
    .orient("top")
    .tickFormat(format)

  graph.select(".axis")
    .call(axis)

  var path = graph.selectAll('path')
    .data(data)

  path.exit().remove()

  path.enter().append('path')
    .append('title')

  path.attr('d', ( ( [x1,x2] ) => x1 && x2 ? "M" + x(x1) + ",0H" + x(x2) + "V" + cellfill + "H" + x(x1) + "Z" : "" ) )
     .attr('fill', ( [x1, x2] ) => qscale( (x1 + x2) / 2.0) )
     .attr('stroke', 'none')
    .select('title')
     .text( ( [x1, x2] ) => format(x1) + ' - ' + format(x2) )
}

function LegendWidget(scale, format) {
  this.scale = scale
  this.format = format
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
    .classed('axis', true)

  update(graph, this.scale, this.format)

  return elem
}

LegendWidget.prototype.update = function(prev, elem) {
  this.scale = this.scale || prev.scale
  this.format = this.format || prev.format

  var svg = d3.select(elem)
    .select('svg g')

  update(svg, this.scale, this.format)
}



function Status() {
  return null
}

Status.render = function(state, lang, scale) {

  var format = schema.format(lang, state.query.agg)

  return (
    h('div.titlebar', [
      /*
      h('div.querystatus', [
        state.sel_dates.map(format).join(' <--> '),
        JSON.stringify(state.focus_cell)
      ]),
      */
      new LegendWidget(scale, format)
    ])
  )
}

export default Status