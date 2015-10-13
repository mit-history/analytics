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

// based on https://github.com/d3/d3-scale/blob/master/src/threshold.js
// N.B. unlike d3's threshold scale, this one doesn't require the outer bounds in the domain
function threshold_linear(domain, range) {

  function scale(x) {
    if(x <= x) {
      var block = (range[1] - range[0]) / domain.length
      var i = d3.bisect(domain, x)

      var offset = (domain[i] - x) /  (domain[i] - domain[i-1])
      i = i + (offset || 0.0)

      return block * i
    }
  }

  scale.domain = function(x) {
    if (!arguments.length) return domain.slice()
    domain = x.slice()
    return scale
  }

  scale.range = function(x) {
    if (!arguments.length) return range.slice()
    range = x.slice()
    return scale
  }

  scale.copy = function() {
    return threshold_linear(domain, range)
  }

  return scale
}

function update(graph, qscale, format, regular) {
  var width = legendwidth - margin.right - margin.left

  var data = qscale.domain()
  var [ low, high ] = data.length > 0 ? d3.extent(data) : [ 0, 0 ]
  var qtiles = qscale.quantiles()
  var qticks = uniq( qtiles.concat([high]) )

  var percent = d3.format('0%')

  var x_linear = d3.scale.linear()
    .domain([low, high])
    .range([0, width])

  var x_regular = threshold_linear()
    .domain(qticks)
    .range([0, width])

  var x = regular ? x_regular : x_linear

  var axis_linear = d3.svg.axis()
    .scale(x)
    .orient('top')
    .tickValues(regular ? qtiles : x_linear.ticks())
    .tickFormat(format)

  var axis_qtile = d3.svg.axis()
    .scale(x)
    .orient('bottom')
    .tickValues(qticks)
    .tickFormat( (d) => '≤ ' + percent( d3.bisect(qticks, d) / (qtiles.length+1) ) )

  graph.select('.axis.linear')
    .call(axis_linear)

  graph.select('.axis.qtile')
    .call(axis_qtile)
     .selectAll("text")
     .style("text-anchor", "end")

  var qtile = graph.select('.qtiles')
      .selectAll('.qtile')
    .data(qscale.range())

  qtile.exit().remove()

  qtile.enter().append('path')
    .attr('class', 'qtile')
    .attr('height', cellsize)

  qtile.attr('d', (d) => {
    d = qscale.invertExtent(d)
    d[0] = d[0] || low
    d[1] = d[1] || high
    return 'M' + x(d[0]) + ',0H' + x(d[1]) + 'V' + cellsize + 'H' + x(d[0]) + 'Z'
  })

  qtile.attr('fill', (d) => d)






/*
  var data = qscale.domain()

  var [ low, high ] = [ 0, 0 ]
  var qtiles = []

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
*/
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
    .classed('qtiles', true)

  graph.append('g')
    .classed({ axis: true, qtile: true })

  graph.append('g')
    .classed({ axis: true, linear: true })

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