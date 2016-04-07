/*
* Crosstab charting component
*
* Copyright (c) 2016 MIT Hyperstudio
* Christopher York, 04/2016
*
*/

require('../css/chart.css')

const hg = require('mercury')
const svg = require('virtual-hyperscript/svg');

const d3 = require('d3')
const colorbrewer = require('colorbrewer')

const datapoint = require('./util/datapoint')


const width = 700
const height = 220
const margins = { top: 0, right: 50, bottom: 30, left: 50 }

function Chart() {
  return null
}

Chart.render = function(query, data, lang) {

  /* For now, queries map to graph as follows:
   * x axis is last dimension in rows
   * y axis is the aggregate value
   * color is the last dimension in cols
   * future: matrix of graphs; select one dimension for color
   *   c.f. wilkinson, grammar of graphics, ch 11.3.2 "Multi-Way Tables"
  */

  // TODO.  define semantics of empty query
  data = data || []

  let f_x = (d) => d && query.rows.length ? d[ query.rows[query.rows.length-1] ] : undefined
  let f_y = (d) => d && query.agg ? d[query.agg] : undefined
  let f_color = (d) => d && query.cols.length ? d[ query.cols[query.cols.length-1] ] : undefined

  // let lines = d3.set(data.map(f_color)).values()

  let vectors = {}
  data.forEach( (d) => {
    var c = f_color(d)
    vectors[c] = vectors[c] || []
    vectors[c].push(d)
  })

  let color = d3.scale.category10()
    .domain(d3.keys(vectors))

  let x = d3.scale.linear()
    .range([0,width])
    .domain(d3.extent(data, f_x))

  let y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(data, f_y))

  let line = d3.svg.line()
    .interpolate('basis')
    .x( (d) => x(f_x(d)) )
    .y( (d) => y(f_y(d)) )

  let fmt = d3.format()

  return svg('svg', { width: width + margins.left + margins.right, height: height + margins.top + margins.bottom },
    svg('g', {transform: 'translate(' + margins.left + ',' + margins.top + ')'}, [
      svg('g', {class: 'x axis', transform: 'translate(' + margins.left + ',' + height + ')'},
        x.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(' + x(d) + ',0)'}, [
          svg('line', {x1: 0, y1:0, x2: 0, y2: 5}),
          svg('text', {y:5, dy:'1em', 'text-anchor': 'middle'}, fmt(d))
        ])
      )),
      svg('g', {class: 'y axis'},
        y.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(0,' + y(d) + ')'}, [
          svg('line', {x1:-7, y1:0, x2:-2, y2: 0}),
          svg('text', {x:-10, dy:'.3em', 'text-anchor': 'end'}, fmt(d))
      ]))),
      svg('g', {class: 'marks'},
        d3.entries(vectors).map( (d) =>
          svg('g', {class: 'line'}, [
            svg('path', {d: line(d.value), stroke: color(d.key), fill: 'none'}),
            svg('text', {x: width, y: y(f_y(d.value[d.value.length-1])), dx: '.2em', dy: '.2em'}, d.key)
          ])
      ))
    ])
  )
}

export default Chart