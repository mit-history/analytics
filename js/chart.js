/*
* Crosstab charting component
*
* Copyright (c) 2016 MIT Hyperstudio
* Christopher York, 04/2016
*
*/

/*
 * TODO.
 * [ ] salle data field
 * [x] tilt labels
 * [x] colors for lines
 * [ ] scrolling (?)
 * [x] decades etc formatted
 * [x] grey legend background
 * [ ] clean up
 * [ ] think through ordinal/linear & nesting
 * [ ] bugs on unusual combinations of axes
 * [ ] "and 20 more"
 */

require('../css/chart.css')

const hg = require('mercury')
const svg = require('virtual-hyperscript/svg');

const d3 = require('d3')
const colorbrewer = require('colorbrewer')

const datapoint = require('./util/datapoint')
const schema = require('../cfrp-schema.js')


const width = 670
const height = 200
const margins = { top: 10, right: 80, bottom: 40, left: 50 }
const legend_margins = { top: 5, right: 0, bottom: 0, left: 5 }

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

  let fmt_x = schema.format(lang, query.rows[query.rows.length-1])
  let fmt_y = schema.format(lang, query.agg)

  let ordinal = ordinal_domain(data, f_x)

  let vectors = {}
  data.forEach( (d) => {
    var c = f_color(d)
    vectors[c] = vectors[c] || []
    vectors[c].push(d)
  })

  let num_vectors = d3.keys(vectors).length

  let color = d3.scale.ordinal()
    .range(['#2379b4', '#f7941e', '#2ba048', '#d62930',
            '#f8b6c0', '#006838', '#662d91', '#d7df23', '#ec008c', '#0c0c54',
            '#a8e0f9', '#da1c5c', '#726658', '#603913', '#231f20', '#2b3990',
            '#9fc59a', '#819cd1', '#92278f', '#00a79d', '#27aae1', '#f04b44'])
    .domain(d3.keys(vectors))

  let y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(data, f_y))

  let x, plot, ticks, bar_width
  if(ordinal) {
      x = d3.scale.ordinal()
        .rangeRoundBands([0,width], .1)
        .domain( d3.set(data.map(f_x)).values() )
      plot = bars();
      ticks = x.domain();
      bar_width = x.rangeBand() / num_vectors;
  } else {
    x = d3.scale.linear()
      .range([0,width])
      .domain(d3.extent(data, f_x))
    plot = d3.svg.line()
             .interpolate('monotone');
    ticks = x.ticks();
    bar_width = 0;
  }

  plot.x( (d) => x(f_x(d)) )
      .y( (d) => y(f_y(d)) )

  return svg('svg', { width: width + margins.left + margins.right, height: height + margins.top + margins.bottom }, [
    svg('g', {class: ordinal ? 'ordinal' : 'linear', transform: 'translate(' + margins.left + ',' + margins.top + ')'}, [

      // marks

      svg('g', {class: 'marks'},
        d3.entries(vectors).map( (d,i) =>
          svg('g', {class: 'line', transform: 'translate(' + (i * bar_width) + ')'},
            d.value.map( (dn) =>
              svg('circle', {cx:x(f_x(dn)), cy:y(f_y(dn)), r:2, fill: color(d.key)})
            ).concat([
              svg('path', {d: plot(d.value), stroke: color(d.key), fill: (ordinal ? color(d.key) : 'none')})
            ])
          )
      )),

      // axes

      svg('g', {class: 'x axis', transform: 'translate(0,' + height + ')'},
        ticks.map( (d) => svg('g', {class: 'tick', transform: 'translate(' + (x(d) + bar_width * num_vectors / 2) + ',0)'}, [
          svg('line', {y1:3, y2: 8}),
          svg('text', {y:8, dy:8, dx:8, transform: 'rotate(35)', 'text-anchor': 'start'}, fmt_x(d))
        ])).concat([
          svg('path', {d: 'M0 0 H' + (width + 10) + (ordinal ? '' : 'V1.5 L' + (width + 15) + ' 0 L' + (width + 10) + ' -1.5V0')})
        ])
      ),
      svg('g', {class: 'y axis'},
        y.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(0,' + y(d) + ')'}, [
          svg('line', {x1:-8, y1:0, x2:-3, y2: 0}),
          svg('text', {x:-10, dy:'.3em', 'text-anchor': 'end'}, fmt_y(d))
      ])).concat([
        svg('path', {d: 'M0 ' + height + ' V-10 H1.5 L0 -15 L-1.5 -10 H 0'})
      ])),

      // legend

      svg('g', {class: 'legend', transform: 'translate(' + [width+15, height-30] + ')'},
        [
          svg('rect', {class: 'background', x: 0, y: -(num_vectors*15 + 5 + legend_margins.top), width: margins.right-15, height: num_vectors*15 + legend_margins.top})
        ].concat(
          d3.keys(vectors).map( (d,i) => svg('g', {class: 'line', transform: 'translate(' + legend_margins.left + ',' + (-num_vectors*15 + i*15) + ')'}, [
            svg('text', {x:32, dy: '.3em'}, d),
            svg('path', {d: (ordinal ? 'M20 -5 h10 v10 h-10 z' : 'M0 0 H30'), stroke: color(d), fill: color(d)}),
            svg('circle', {cx:15, r:2, fill: color(d)})
          ]))
        )
      )
    ])
  ])

  function bars() {
    let x, y

    function f_rect(d,i) {
      return 'M' + x(d,i) + ' ' + y(d,i) + ' h' + bar_width + ' V' + height + ' h' + -bar_width + ' Z'
    }

    function result(data) {
      return data.map(f_rect).join(' ')
    }

    result.x = function(fn) {
      if(!arguments.length) return x
      x = fn
      return result
    }

    result.y = function(fn) {
      if(!arguments.length) return y
      y = fn
      return result
    }

    return result
  }
}

function ordinal_domain(data, f) {
  return typeof f(data[0]) !== 'number'
}

export default Chart