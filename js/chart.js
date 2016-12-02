/*
* MDAT Charting Component
*
* Copyright (c) 2016 MIT Hyperstudio
* Christopher York, 04/2016
*
*/

/*
 * TODO.
 * [x] salle data field  SERVER SIDE
 * [x] tilt labels
 * [x] colors for lines
 * [x] decades etc formatted
 * [x] grey legend background
 * [ ] clean up
 * [ ] think through ordinal/linear & nesting
 * [ ] bugs on unusual combinations of axes
 * [x] x axis scale is wrong when # of ticks high (in decades)
 * [ ] cartesian fisheye with labels?                           NOT TO DO
 * [ ] rendering loop too slow
 * [ ] fisheye jerks when scrubbing left                        NOT TO DO
 * [x] legend entries should have ellipsis when cut             ALTERNATE
 * [ ] barchart: groups are moving independently from axis labels
 * [ ] barchart: don't show groups that are too small to see?
 * [ ] "and 20 more"
 * [ ] scrolling                                                NOT TO DO
 * [ ] calculate distortion from distance between axis points?  DIST CANCELLED
 * [x] adjust legend of line graph to cursor
 */

require('../css/chart.css')

const msgs = require("json!../i18n/query.json")

var i18n = require('./util/i18n')

const hg = require('mercury')
const svg = require('mercury/svg')

/* TODO.  switch completely to d3 v4 - better support for non-DOM situations */
const d3 = require('d3')

const datapoint = require('./util/datapoint')
const schema = require('../cfrp-schema')

const margins = { top: 10, right: 130, bottom: 100, left: 80 }
const legend_margins = { top: 5, right: 0, bottom: 0, left: 5 }  /* TODO.  remove */

const max_legend = 10
const max_group = 10

const min_spacing = 20

const vector_palette = ['#2379b4', '#f7941e', '#2ba048', '#d62930',
                        '#f8b6c0', '#006838', '#662d91', '#d7df23', '#ec008c', '#0c0c54',
                        '#a8e0f9', '#da1c5c', '#726658', '#603913', '#231f20', '#2b3990',
                        '#9fc59a', '#819cd1', '#92278f', '#00a79d', '#27aae1', '#f04b44']


/* component state */
function Chart() {
  return hg.state({
    focus: hg.value(null),
    channels: {
      focus: (state, key) => {
//        console.log('clicked ' + JSON.stringify(key) + '; state is ' + JSON.stringify(state.focus()))
        state.focus.set(state.focus() === key ? null : key)
      }
    }
  })
}

/* state, query: required; data, size, lang: optional */
Chart.render = function(state, query, data, size, legend, lang) {
  /* For now, queries map to graph as follows:
   * x axis is last dimension in rows
   * y axis is the aggregate value
   * color is the last dimension in cols
   *
   * future: matrix of graphs; select one dimension for color
   *   c.f. wilkinson, grammar of graphics, ch 11.3.2 "Multi-Way Tables"
   *
   * to handle visual complexity, chart shows only first 10 values in each dimension
   *
   * in combination with query.order, this gives
   * - desc: top 10 values
   * - asc: bottom 10 values
   *
   * in combination with query.filter, any particular series can be charted
   */

  let origdata = data

  data = data ? (data["1x1"] || []) : []
  size = size || [800, 250]

  let width = size[0] - margins.left - margins.right
  let height = size[1] - margins.top - margins.bottom

  let f_x = (d) => d && query.rows.length ? d[ query.rows[query.rows.length-1] ] : 'tous'
  let f_y = (d) => d[query.agg]
  let f_color = (d) => d && query.cols.length ? d[ query.cols[0] ] : 'tous'

  let fmt_x = schema.format(lang, query.rows[query.rows.length-1], 10)
  let fmt_x_long = schema.format(lang, query.rows[query.rows.length-1])
  let fmt_y = schema.format(lang, query.agg)
  let fmt_color = schema.format(lang, query.cols[0], 10)
  let fmt_color_long = schema.format(lang, query.cols[0])

  let ordinal = ordinal_domain(data, (v) => fmt_x(f_x(v)))

  /* interlude to find top 10 by color and group */

  let sums
  sums = (origdata ? (origdata["0x1"] || []) : []).slice()
  sums.sort((a,b) => d3.descending(f_y(a), f_y(b)))
  let sel_vectors = sums.slice(0, max_legend).map(f_color)

  sums = (origdata ? (origdata["1x1"] || []) : []).slice()
  sums = sums.filter( (d) => {
    var c = f_color(d)
    var b = sel_vectors.indexOf(c) > -1
//    console.log(c + " : " + b)
    return true
  })
  sums = sums.sort((a,b) => d3.descending(f_y(a), f_y(b)))
//  console.log(sums)

  let sel_groups = sums.slice(0, max_group).map(f_x)

//  console.log('vectors: ' + JSON.stringify(sel_vectors))
//  console.log('groups: ' + JSON.stringify(sel_groups))

  /* rearrange data */

  let vectors = {}
  data.forEach( (d) => {
    var c = f_color(d)
    var x = f_x(d)

    if((!ordinal && sel_vectors.indexOf(c) !== -1) ||
        (ordinal && sel_groups.indexOf(x) !== -1 && sel_vectors.indexOf(c) !== -1)) {
      vectors[c] = vectors[c] || []
      vectors[c].push(d)
    }
  })

  /* end of interlude */

  let num_vectors = sel_vectors.length

  let y = d3.scale.linear()
    .range([height, 0])
    .domain([0, d3.max(data, f_y)])

  let x, plot, ticks, bar_width
  if(ordinal) {
    x = d3.scale.ordinal()
      .rangeRoundBands([0,width], .1)
      .domain( sel_groups )
    plot = bars()
    ticks = x.domain()
    bar_width = x.rangeBand() / num_vectors
  } else {
    x = d3.scale.linear()
      .range([0,width])
      .domain(d3.extent(data, f_x))
    plot = d3.svg.line()
             .interpolate('monotone')
    ticks = x.ticks()
    bar_width = 0
  }

  plot.x( (d) => x(f_x(d)) )
      .y( (d) => y(f_y(d)) )

  let fmt = (v) => '' + v
  let subscript = (attrs, axis) => {
    if(!(axis && axis[0])) return null
    return i18n.format_stem_sub(msgs, axis[0], lang, (stem, sub) => {
      return svg('text', attrs || {}, [ stem.toUpperCase(), sub ? svg('tspan', {dy: '1em'}, sub) : null ])
    })
  }
  let tspan_title = (v1, v2) => {
    return [ svg('tspan', {}, v1), (v1 !== v2) ? svg('title', {}, v2) : null ]
  }

  let legend_labels = []
  if(!ordinal) {
    let maxima = Object.create({})
    sel_vectors.forEach( (key) => {
      maxima[key] = d3.max(vectors[key], (d) => d[query.agg])
    })
    maxima = d3.entries(maxima)
    maxima.sort( (a,b) => d3.descending(a.value, b.value))
    legend_labels = maxima.map( (d) => d.key )
  } else {
    legend_labels = d3.keys(vectors)
  }

//  console.log('legend_labels: ' + JSON.stringify(legend_labels.slice(0,max_legend)))

  let color = d3.scale.ordinal()
    .range(vector_palette)
    .domain(legend_labels)

  let num_legend_labels = Math.min(max_legend+1, legend_labels.length) /* +1 for extra labels line */

  return svg('svg', { class: 'chart',
                      width: width + margins.left + margins.right,
                      height: height + margins.top + margins.bottom
                    }, [
    svg('g', { class: ordinal ? 'ordinal' : 'linear',
               transform: 'translate(' + margins.left + ',' + margins.top + ')',
               'font-family': 'Roboto Regular, Helvetica, Arial, sans-serif',
               'font-size': '10px'
             }, [

      // marks

      svg('g', {class: 'marks'},
        d3.entries(vectors).map( (d,i) =>
          svg('g', {class: 'line l' + i, transform: 'translate(' + (i * bar_width) + ')',
                    opacity: (state.focus === null || state.focus === d.key) ? 1 : 0.2},
            d.value.map( (dn) =>
              !ordinal ? svg('circle', {cx: x(f_x(dn)), cy:y(f_y(dn)), r:2, fill: color(d.key)}) : null
            ).concat([
              svg('path', {d: plot(d.value), stroke: color(d.key), fill: (ordinal ? color(d.key) : 'none')}),
              svg('title', d.key)
            ])
          )
      )),

      // axes

      svg('g', {class: 'x axis', transform: 'translate(0,' + height + ')'},
        ticks.map( (d) => svg('g', { class: 'tick',
                                     transform: 'translate(' + x(d) + ')'
                                   }, [
          svg('line', {y1:3, y2: 8, stroke: 'gray'}),
          svg('text', {y:8, dy:8, dx:8, transform: 'rotate(35)', 'text-anchor': 'start'}, tspan_title(fmt_x(d), fmt_x_long(d)) )
        ])).concat([
          svg('path', {stroke: 'gray',
                       d: 'M0 0 H' + (width + 10) + (ordinal ? '' : 'V1.5 L' + (width + 15) + ' 0 L' + (width + 10) + ' -1.5V0')})
        ])
      ),
      svg('g', {class: 'y axis'},
        y.ticks().map( (d) => svg('g', {class: 'tick', transform: 'translate(0,' + y(d) + ')'}, [
          svg('line', {x1:-8, y1:0, x2:-3, y2: 0, stroke: 'gray'}),
          svg('text', {x:-10, dy:'.3em', 'text-anchor': 'end'}, fmt_y(d))
      ])).concat([
        svg('path', {stroke: 'gray', d: 'M0 ' + height + ' V-10 H1.5 L0 -15 L-1.5 -10 H 0'})
      ])),

      // legend + axis labels
      (legend ?
      svg('g', {class: 'legend', transform: 'translate(' + [width + 5, 15] + ')'}, [
          legend_labels.length ? svg('rect', { class: 'background',
                                               x: 0, y: (legend_margins.top),
                                               width: margins.right-15, height: (num_legend_labels)*15 + legend_margins.top,
                                               stroke: 'none',
                                               fill: 'black',
                                               opacity: 0.05 }) : null,
          legend_labels.length > max_legend ? svg('text', {x:margins.right-15, dy: '.3em', 'text-anchor': 'end'},
                                                  '[+ ' + (legend_labels.length - max_legend) + ' ]') : null
        ].concat(
          legend_labels.slice(0,max_legend).map( (d,i) => svg('g',
              {class: 'line', transform: 'translate(' + legend_margins.left + ',' + (15 + i*15) + ')',
               'ev-click': hg.send(state.channels.focus, d),
               opacity: (state.focus === null || state.focus === d) ? 1 : 0.1 }, [
            svg('text', {x:32, dy: '.3em'}, tspan_title(fmt_color(d), fmt_color_long(d))),
            svg('path', {d: (ordinal ? 'M20 -5 h10 v10 h-10 z' : 'M0 0 H30'), stroke: color(d), fill: color(d)}),
            !ordinal ? svg('circle', {cx:15, r:2, fill: color(d)}) : null
          ]))
        )
      ) : null),
      svg('g', {class: 'axis-labels', 'font-size': '12px'}, [
        (legend ? subscript({class: 'cols', transform: 'translate(' + [width + 5, 0] + ')', dy:'0.3em'}, query.cols) : null),
        subscript({class: 'rows', transform: 'translate(' + [width+25, height] + ')', dy: '0.3em'}, query.rows),
        svg('text', {class: 'agg', transform: 'translate(' + -margins.left + ')rotate(-90)', dy: '1em', 'text-anchor': 'end' },
            msgs[lang][query.agg].toUpperCase())
      ])
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
