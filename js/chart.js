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
const margins = { top: 20, right: 80, bottom: 30, left: 50 }

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

  let f_x = (d) => d && query.rows.length ? d[ query.rows[query.rows.length-1] ] : null
  let f_y = (d) => d && query.agg ? d[query.agg] : null
  let f_color = (d) => d && query.cols.length ? d[ query.cols[query.cols.length-1] ] : null

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

  let plot = d3.svg.line()
    .interpolate('monotone')
    .x( (d) => x(f_x(d)) )
    .y( (d) => y(f_y(d)) )

  let fmt = d3.format()

  return svg('svg', { width: width + margins.left + margins.right, height: height + margins.top + margins.bottom }, [
    svg('g', {transform: 'translate(' + margins.left + ',' + margins.top + ')'}, [

      // axes

      svg('g', {class: 'x axis', transform: 'translate(0,' + height + ')'},
        x.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(' + x(d) + ',0)'}, [
          svg('line', {x1: 0, y1:3, x2: 0, y2: 8}),
          svg('text', {y:8, dy:'1em', 'text-anchor': 'middle'}, fmt(d))
        ])).concat([
          svg('path', {d: 'M0 0 H' + (width + 10) + 'V1.5 L' + (width + 15) + ' 0 L' + (width + 10) + ' -1.5V0'})
        ])
      ),
      svg('g', {class: 'y axis'},
        y.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(0,' + y(d) + ')'}, [
          svg('line', {x1:-8, y1:0, x2:-3, y2: 0}),
          svg('text', {x:-10, dy:'.3em', 'text-anchor': 'end'}, fmt(d))
      ])).concat([
        svg('path', {d: 'M0 ' + height + ' V-10 H1.5 L0 -15 L-1.5 -10 H 0'})
      ])),

      // marks

      svg('g', {class: 'marks'},
        d3.entries(vectors).map( (d) =>
          svg('g', {class: 'line'},
            d.value.map( (dn) =>
              svg('circle', {cx:x(f_x(dn)), cy:y(f_y(dn)), r:2, fill: color(d.key)})
            ).concat([
              svg('path', {d: plot(d.value), stroke: color(d.key)})
            ])
          )
      )),

      // legend

      svg('g', {class: 'legend', transform: 'translate(' + [width+15, height-30] + ')'},
        d3.keys(vectors).map( (d,i) => svg('g', {class: 'line', transform: 'translate(0,' + -(i*15) + ')'}, [
          svg('text', {x:32, dy: '.3em'}, d),
          svg('path', {d:'M 0 0 H30', stroke: color(d)}),
          svg('circle', {cx:15, r:2, fill: color(d)})
        ])
      ))
    ])
  ])
}

export default Chart