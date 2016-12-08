const schema = require('../cfrp-schema')
const d3 = require('d3')
const msgs = require("json!../i18n/query.json")
const hg = require('mercury')
const h = require('mercury').h
const svg = require('mercury/svg')
const max_group = 10
const max_legend = 20
const rendering = require('./util/rendering')

function Legend() {
  return hg.state({
    focus: hg.value(null),
    channels: {
      focus: (state, key) => {
        console.log(key);
        state.focus.set(state.focus() == key ? null : key)
      }
    }
  });
}

function ordinal_domain(data, f) {
  return typeof f(data[0]) !== 'number'
}

Legend.render = function(state, app, query, data, lang) {
  let origdata = data
  data = data ? (data["1x1"] || []) : []
  let f_x = (d) => d && query.rows.length ? d[ query.rows[query.rows.length-1] ] : 'tous'
  let f_y = (d) => d[query.agg]
  let f_color = (d) => d && query.cols.length ? d[ query.cols[0] ] : 'tous'
  let fmt_x = schema.format(lang, query.rows[query.rows.length-1], 10)
  let fmt_color = schema.format(lang, query.cols[0], 10)
  let fmt_color_long = schema.format(lang, query.cols[0])
  let ordinal = ordinal_domain(data, (v) => fmt_x(f_x(v)))

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
  let sel_groups = sums.slice(0, max_group).map(f_x)

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



  let legend_labels = d3.keys(vectors)
  let color = rendering.colors(legend_labels);

  return (h('div.legend', [
      h('h6', msgs[lang][query.cols]), h('div.legend-labels',
        [].concat(legend_labels.map((d, i) => h('p' + (state.focus == d ? '.highlight' : ''), {
          'ev-click': [hg.send(app.channels.focus_col, {dimension: query.cols[0], value: d})],
          title: fmt_color(d)
          }, [
          svg('svg', {width: 40, height: 15}, [
            svg('path', {d: (ordinal ? 'M20 5 h10 v5 h-10 z' : 'M0 8 H30'), stroke: color(d), fill: color(d)}),
            !ordinal ? svg('circle', {cx:15, cy: 8, r: (state.focus == d ? 4 : 2), fill: color(d)}) : null
          ]),
          h('span', {}, fmt_color(d))]))))]));
}

export default Legend;
