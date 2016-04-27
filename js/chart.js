/*
* Crosstab charting component
*
* Copyright (c) 2016 MIT Hyperstudio
* Christopher York, 04/2016
*
*/

/*
 * TODO.
 * [ ] salle data field  SERVER SIDE
 * [x] tilt labels
 * [x] colors for lines
 * [ ] scrolling (? - NOT TO DO)
 * [x] decades etc formatted
 * [x] grey legend background
 * [ ] clean up
 * [ ] think through ordinal/linear & nesting
 * [ ] bugs on unusual combinations of axes
 * [ ] "and 20 more"
 * [ ] x axis scale is wrong when # of ticks high (in decades)
 * [x] cartesian fisheye with labels?
 * [ ] rendering loop too slow
 * [ ] adjust legend of line graph to cursor NOT TO DO
 * [ ] fisheye jerks when scrubbing left
 * [ ] legend entries should have ellipsis when cut
 * [ ] calculate distortion from distance between axis points?
 * [ ] barchart: groups are moving independently from axis labels
 * [ ] barchart: don't show groups that are too small to see?
 */

require('../css/chart.css')

const hg = require('mercury')
const svg = require('mercury/svg')

/* TODO.  switch completely to d3 v4 - better support for non-DOM situations */
const d3 = require('d3')
const d3_mouse = require('d3-selection').mouse

const datapoint = require('./util/datapoint')
const schema = require('../cfrp-schema')

const margins = { top: 10, right: 120, bottom: 50, left: 50 }
const legend_margins = { top: 5, right: 0, bottom: 0, left: 5 }  /* TODO.  remove */

const max_legend = 10
const max_group = 10

const min_spacing = 20

const vector_palette = ['#2379b4', '#f7941e', '#2ba048', '#d62930',
                        '#f8b6c0', '#006838', '#662d91', '#d7df23', '#ec008c', '#0c0c54',
                        '#a8e0f9', '#da1c5c', '#726658', '#603913', '#231f20', '#2b3990',
                        '#9fc59a', '#819cd1', '#92278f', '#00a79d', '#27aae1', '#f04b44']


/* mercury support for mouse tracking */
let delegator = hg.Delegator()
delegator.listenTo('mousemove')
delegator.listenTo('mouseout')

let MousePoint = hg.BaseEvent( function(ev, broadcast) {
  var point = d3_mouse(ev.target, ev)
  broadcast(Object.assign({point: point}, this.data))
})


/* component state */
function Chart() {
  return hg.state({
    focus: hg.value(null),
    channels: {
      focus: (state, data) => { state.focus.set(data && data.point ? data.point[0] : null) }
    }
  })
}

/* state, query: required; data, size, lang: optional */
Chart.render = function(state, query, data, size, lang) {

  /* For now, queries map to graph as follows:
   * x axis is last dimension in rows
   * y axis is the aggregate value
   * color is the last dimension in cols
   *
   * future: matrix of graphs; select one dimension for color
   *   c.f. wilkinson, grammar of graphics, ch 11.3.2 "Multi-Way Tables"
   */

  let origdata = data

  data = data ? (data["1x1"] || []) : []
  size = size || [800, 250]

  let width = size[0] - margins.left - margins.right
  let height = size[1] - margins.top - margins.bottom

  let f_x = (d) => d && query.rows.length ? d[ query.rows[query.rows.length-1] ] : 'tous'
  let f_y = (d) => d[query.agg]
  let f_color = (d) => d && query.cols.length ? d[ query.cols[query.cols.length-1] ] : 'tous'

  let fmt_x = schema.format(lang, query.rows[query.rows.length-1], 10)
  let fmt_y = schema.format(lang, query.agg)
  let fmt_color = schema.format(lang, query.cols[query.cols.length-1], 10)

  let ordinal = ordinal_domain(data, f_x)

  /* interlude to find top 10 by color and group */

  let sums
  sums = (origdata ? (origdata["0x1"] || []) : []).slice()
  sums.sort((a,b) => d3.descending(f_y(a), f_y(b)))
  let sel_vectors = sums.slice(0, max_legend).map(f_color)

  sums = (origdata ? (origdata["1x0"] || []) : []).slice()
  sums.sort((a,b) => d3.descending(f_y(a), f_y(b)))
  console.log(sums)

  let sel_groups = sums.slice(0, max_group).map(f_x)

  console.log('vectors: ' + JSON.stringify(sel_vectors))
  console.log('groups: ' + JSON.stringify(sel_groups))

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

  // let sel_vectors = d3.keys(vectors)
  let num_vectors = sel_vectors.length

  let y = d3.scale.linear()
    .range([height, 0])
    .domain([0, d3.max(data, f_y)])

  let x, plot, ticks, bar_width, distortion
  if(ordinal) {
    x = d3.scale.ordinal()
      .rangeRoundBands([0,width], .1)
      .domain( sel_groups )
    plot = bars()
    ticks = x.domain()
    bar_width = x.rangeBand() / num_vectors
    distortion = bar_width > min_spacing ? 0 : (min_spacing / bar_width)
  } else {
    x = d3.scale.linear()
      .range([0,width])
      .domain(d3.extent(data, f_x))
    plot = d3.svg.line()
             .interpolate('monotone')
    ticks = x.ticks()
    bar_width = 0

    let tick_spacing = x(ticks[1]) - x(ticks[0])  /* better, give a min_barwidth */
    distortion = tick_spacing > min_spacing ? 0 : (min_spacing / tick_spacing)
  }

  plot.x( (d) => distort(x(f_x(d)), state.focus, [0,width], distortion) )
      .y( (d) => y(f_y(d)) )

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
  legend_labels = legend_labels

  let color = d3.scale.ordinal()
    .range(vector_palette)
    .domain(legend_labels)

  let num_legend_labels = Math.min(max_legend+1, legend_labels.length) /* +1 for extra labels line */

  let opacity = d3.scale.linear()
    .range(distortion ? [0, 1] : [1, 1])
    .domain([width/2, 0])
    .clamp(true)

  return svg('svg', { class: 'chart',
                      width: width + margins.left + margins.right,
                      height: height + margins.top + margins.bottom,
                      'ev-mousemove': distortion ? MousePoint(state.channels.focus) : null,
                      'ev-mouseout' : distortion ? hg.send(state.channels.focus) : null
                    }, [
    svg('g', {class: ordinal ? 'ordinal' : 'linear', transform: 'translate(' + margins.left + ',' + margins.top + ')'}, [

      // marks

      svg('g', {class: 'marks'},
        d3.entries(vectors).map( (d,i) =>
          svg('g', {class: 'line', transform: 'translate(' + (i * bar_width) + ')'},
            d.value.map( (dn) =>
              svg('circle', {cx:distort(x(f_x(dn)), state.focus, [0,width], distortion), cy:y(f_y(dn)), r:2, fill: color(d.key)})
            ).concat([
              svg('path', {d: plot(d.value), stroke: color(d.key), fill: (ordinal ? color(d.key) : 'none')}),
              svg('title', d.key)
            ])
          )
      )),

      // axes

      svg('g', {class: 'x axis', transform: 'translate(0,' + height + ')'},
        ticks.map( (d) => svg('g', { class: 'tick',
                                     transform: 'translate(' + (distort(x(d), state.focus, [0,width], distortion) + bar_width * num_vectors / 2) + ',0)',
                                     opacity: opacity(Math.abs(x(d) - state.focus)) }, [
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

      svg('g', {class: 'legend', transform: 'translate(' + [width+15, height-30] + ')'}, [
          legend_labels.length ? svg('rect', { class: 'background',
                                               x: 0, y: -(max_legend*15 + 5 + legend_margins.top),
                                               width: margins.right-15, height: (num_legend_labels)*15 + legend_margins.top}) : null,
          legend_labels.length > max_legend ? svg('text', {x:margins.right-15, dy: '.3em', 'text-anchor': 'end'},
                                                  '[+ ' + (legend_labels.length - max_legend) + ' ]') : null
        ].concat(
          legend_labels.slice(0,max_legend).map( (d,i) => svg('g', {class: 'line', transform: 'translate(' + legend_margins.left + ',' + (-(max_legend*15) + i*15) + ')'}, [
            svg('text', {x:32, dy: '.3em'}, fmt_color(d)),
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
      let xd = x(d, i)
      return 'M' + distort(xd, state.focus, [0,width], distortion) + ' ' + y(d,i) + ' h' + bar_width + ' V' + height + ' h' + -bar_width + ' Z'
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


/* Fisheye scale calculation */

function distort(x, a, range, d) {
  let min = range[0]
  let max = range[1]
  let left = x < a
  let m = left ? a - min : max - a
  if (m == 0) m = max - min
  return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a
}

export default Chart
