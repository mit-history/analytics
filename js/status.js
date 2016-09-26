/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
* TODO : This component is not actively used (not called in app.js) and may be removed in future if not needed. Kept for possible reintegration (dtalbot)
* Used in calendar.js
*/


const schema = require('../cfrp-schema')

require('../css/status.css')

const query_msgs = require("json!../i18n/query.json")
const i18n = require('./util/i18n')

const hg = require('mercury')
const h = require('mercury').h

const svg = require('virtual-hyperscript/svg')

const d3 = require('d3')
const colorbrewer = require('colorbrewer')

const percent = d3.format('0%')

const cellrect = 8
const cellmargin = 2
const cellsize = cellrect + cellmargin

const legendwidth = 150
const legendheight = cellsize * 7

const margin = { top: 0, right: 0, bottom: 0, left: 50 }

function uniq(xs) {
  return xs.filter( (y, i, ys) => ys.indexOf(y) == i )
}

function update(graph, qscale, format, regular) {
  var width = legendwidth - margin.right - margin.left

  var colors = qscale.range()

  var qtile = graph.selectAll('.qtile')
    .data(colors)

  qtile.exit().remove()

  var g = qtile.enter().append('g')
    .attr('class', 'qtile')
    .attr('dominant-baseline', 'alphabetical')  // cross browser issues with 'hanging'

  g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', cellrect)
    .attr('height', cellrect)

  g.append('text')
    .attr('class', 'label')
    .attr('text-anchor', 'end')
    .attr('dx', -cellrect / 2.0)
    .attr('dy', cellrect)

  g.append('text')
    .attr('class', 'cumulative')
    .attr('x', cellsize * 1.5)
    .attr('dy', cellrect)

  qtile.attr('transform', (d, i) => 'translate(0,' + (colors.length - i - 1) * cellsize + ')')

  qtile.select('rect')
    .attr('fill', (d) => d)

  qtile.select('.label')
    .text( (d, i) => {
      var q = qscale.invertExtent(d)[0]
      var in_use = q && qscale(q) === d

      var prefix = (colors.length - i - 1) ? '' : '≥ '
      var value = in_use ? format(q) : ''

      return prefix + value
    })

  qtile.select('.cumulative')
    .text( (d, i) => percent(i / colors.length) )

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

  var locale = i18n[lang]
  var format = schema.format(lang, state.query.agg)
  var dateFormat = locale.timeFormat("%e %B %Y (%A)")

  return (
    h('div.titlebar', {
        'ev-click' : hg.send(state.status.channels.toggleRegular)
      }, [
      h('div.querystatus', (state.sel_dates.length == 2) ? [
        h('span.seldates', state.sel_dates.map(dateFormat).join(' - ') ),
        h('span.close', { 'ev-click' : hg.send(state.channels.sel_dates) })
      ] : []),
      new LegendWidget(scale, format, state.status.regular)
    ])
  )
}

export default Status