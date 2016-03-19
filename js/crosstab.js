/*
* Main CFRP application component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/


require('../css/crosstab.css')

var hg = require('mercury')
var h = require('mercury').h

var svg = require('virtual-hyperscript/svg')

var assign = require('object-assign')

var schema = require('../cfrp-schema')

var cellSize = { width: 80, height: 15 },
    cellPadding = { top: 3, right: 3, bottom: 3, left: 3 },
    margins = { top: 175, right: 20, bottom: 20, left: 75 },
    margin_min = { top: 20, left: 75 },
    margin_max = { top: 450, left: 450 },
    parentOffset = 25;

function update(query, cube_data, focus_cell, lang) {
  var rows = [], cols = [], cells = [];

  for(var j=0; j<=query.rows.length; j++) { rows = rows.concat(cube_data[j + "x0"]); }
  for(var i=0; i<=query.cols.length; i++) { cols = cols.concat(cube_data["0x" + i]); }
  for(var k in cube_data) { cells = cells.concat(cube_data[k]); }

  cols.sort(cmp_cells.bind(null, query.cols));
  rows.sort(cmp_cells.bind(null, query.rows));

  var col_labels = cols.map(project.bind(null, query.cols)),
      row_labels = rows.map(project.bind(null, query.rows));

  // TODO.  d3 scales mis-match empty and null; remove the former
  col_labels = col_labels.filter( (c) => c[0] !== "" );
  row_labels = row_labels.filter( (r) => r[0] !== "" );

  var x = d3.scale.ordinal()
           .domain(col_labels)
           .rangeRoundBands([0, cellSize.width * cols.length]),
      y = d3.scale.ordinal()
           .domain(row_labels)
           .rangeRoundBands([0, cellSize.height * rows.length]),
      op_scale = d3.scale.linear()
           .domain([0,query.rows.length+query.cols.length+1])
           .range(["lightpink","white"]);

  var x_axis = d3.svg.axis()
    .scale(x)
    .orient("top")
    .tickFormat( (k) => format_last(query.cols, k) );

  var y_axis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat( (k) => format_last(query.rows, k) );

  return function(elem) {
    var header_top = elem.select(".header.top svg")
    header_top
      .attr("width", x.rangeExtent()[1])

    header_top.select(".items").call(x_axis)
       .call(x_axis)
      .selectAll("text")
        .style("text-anchor", "start")
        .attr("x", (k) => parentOffset * stopper(k) )
        .attr("transform", "rotate(-35)")

    var header_left = elem.select(".header.left svg")
    header_left.attr("height", y.rangeExtent()[1])

    header_left.select(".header.left svg .items")
       .call(y_axis)
      .selectAll("text")
        .style("text-anchor", "end")

    // cells of table

    var weightedSize = { height: y.rangeBand(), // Math.max(cellSize.height, Math.ceil(y.range()[1] || 0.0)),
                         width: x.rangeBand() }; // Math.max(cellSize.width, Math.ceil(x.range()[1] || 0.0)) };

    var dims = [].concat(query.rows).concat(query.cols);

    console.log("DIMS ARE NOW " + JSON.stringify(dims) + " [ " + cells.length + " cells ]")

    var content_div = elem.select(".content")
    content_div.on('scroll', scrolled)

    var content = content_div.select("svg")

    content.attr('width', x.rangeExtent()[1])
           .attr('height', y.rangeExtent()[1])

    var cell = content.select(".aggregates")
                 .selectAll(".cell")
                 .data(cells, (d) => project(dims, d) )

    cell.exit().remove()

    var cell_enter = cell.enter().append("g")
      .classed("cell", true)
    cell_enter.append("path")
    cell_enter.append("text")
      .attr("text-anchor", "end")

    cell.classed("focused", (d) => {
      return (JSON.stringify(project(dims, d)) === JSON.stringify(project(dims, focus_cell)))
    })

    cell.select("path")
      .attr("d", (d) => "M" + x(project(query.cols, d)) + "," + y(project(query.rows, d)) +
                        "h" + cellSize.width + "v" + cellSize.height +
                        "h" + (-cellSize.width) + "Z")
      .attr("fill", (d) => op_scale(d3.keys(d).length) )

    cell.select("text")
      .attr("x", function(d) { return x(project(query.cols, d)); })
      .attr("y", function(d) { return y(project(query.rows, d)); })
      .attr("dx", cellSize.width - cellPadding.right)
      .attr("dy", cellSize.height - cellPadding.top)
      .text(function(d) {
        var format = schema.format(lang, query.agg)
        var val = d[query.agg]
        return format(val)
      })

    function scrolled() {
      var master = elem.select(".content")[0][0]

      var slaveTop = elem.select(".header.top")[0][0]
      slaveTop.scrollLeft = master.scrollLeft

      var slaveLeft = elem.select(".header.left")[0][0]
      slaveLeft.scrollTop = master.scrollTop
    }
  }

  // compare two cells in the hypercube, based on the given dimensions
  //   in the order prescribed by the query object
  function cmp_cells(dims, a, b) {
    var a_val = a[query.agg], b_val = b[query.agg],
        a = project(dims, a), b = project(dims, b);

    for(var i=0; i<dims.length; i++) {
      var dim = dims[i],
          order = query.order[ dim ],
          k = (a[i] === null) ? 1 : (b[i] === null) ? -1 : cmp(order, a[i], b[i]);
      if(k !== 0) return k;
    }
    return 0;

    function empty(a, i) {
      return i > a.length || a[i] === undefined || a[i] === null;
    }

    function cmp(order, a_lab, b_lab) {
      switch(order) {
        case 'asc':  return d3.ascending(a_val, b_val);
        case 'desc': return d3.descending(a_val, b_val);
        default:     return d3.ascending(a_lab, b_lab);
      }
    }
  }

  // construct an array of the given properties form an object (or null if property does not exist)
  function project(dims, d) {
    if (!d) { console.log("WARNING:  undefined data cell"); return []; }
    return dims.map( (dim) => (dim in d) ? d[dim] : null );
  }

  function parentage(dims) {
    var k = [];
    for(var i=dims.length; i>=0; i--) {
      k.push(dims.slice(0,i));
    }
    return k;
  }

  function stopper(vals) {
    var i = vals.length-1;
    while(i > 0 && !vals[i]) { i--; }
    return i;
  }

  function format_last(dims, vals) {
    var i = stopper(vals);
    var fmt = schema.format(lang, dims[i]);
    return fmt ? fmt(vals[i]) : vals[i];
  }
}


function GraphWidget(query, cube_data, focus_cell, lang) {
  this.query = query
  this.cube_data = cube_data
  this.focus_cell = focus_cell
  this.lang = lang
}

GraphWidget.prototype.type = 'Widget'

GraphWidget.prototype.init = function() {
  var marginLeft = 150
  var marginTop = 150

  // TODO.  figure out a cleaner way to get size of query component into layout
  var paddingTop = 135
  var paddingLeft = 30

  var elem = document.createElement('div')

  var graph = d3.select(elem)
    .classed('pivot', true)

  var header_top = graph.append('div')
    .classed({header: true, top: true})
    .style({ height: marginTop + 'px', width: 'calc(100% - ' + (marginLeft + paddingLeft) +'px)', 'padding-left': marginLeft + 'px' })

  header_top.append('svg')
    .append('g')
    .classed('items', true)
    .attr('transform', "translate(0," + marginTop + ")")

  var header_left = graph.append('div')
    .classed({header: true, left: true})
    .style({ width: marginLeft + 'px', height: 'calc(100% - ' + (marginTop + paddingTop) + 'px)' })

  header_left.append('svg')
    .append('g')
    .classed('items', true)
    .attr('transform', "translate(" + marginLeft + ",0)")

  var content = graph.append('div')
    .classed('content', true)
    .style({ height: 'calc(100% - ' + (marginTop + paddingTop) + 'px)', width: 'calc(100% - ' + (marginLeft + paddingLeft) +'px)' })

  var cells_svg = content.append('svg')
    .classed('cells', true)
    .append('svg')

  cells_svg.append('g')
    .classed('shading', true)

  cells_svg.append('g')
    .classed('aggregates', true)

  return elem
}

GraphWidget.prototype.update = function(prev, elem) {
  this.query = this.query || prev.query
  this.cube_data = this.cube_data || prev.cube_data
  this.focus_cell = this.focus_cell || prev.focus_cell
  this.lang = this.lang || prev.lang

  d3.select(elem)
    .call(update(this.query, this.cube_data, this.focus_cell, this.lang))
}

function Crosstab() {
  return null
}

Crosstab.render = function(state) {

  var sendFocus = hg.BaseEvent(function(ev, broadcast) {

    // ... not if clear if this is a hack or not
    //     c.f. https://github.com/Raynos/mercury/issues/36
    var data = ev.target.__data__

    var cell = Object.create({})
    for(var k in data) {
      if(k !== state.query.agg) { cell[k] = data[k] }
    }

    broadcast(assign(this.data, { focus: cell }))
  })

  return (
    h('div.crosstab-container.small-9.columns', {
      'ev-click' : sendFocus(state.channels.focus_cell),
    }, [
      new GraphWidget(state.query, state.cube_data, state.focus_cell, 'fr')
    ])
  )

/*
  function renderCell(d) {
    var agg = state.query.agg
    var focus_target = assign({}, d)
    delete focus_target[agg]

    return h('span.agg', {
             'ev-click': hg.send(state.channels.focus_cell, focus_target)
           }, [ String(d3.round(d[agg])) + ":" + JSON.stringify(d) + ", " ])
  }
*/
}

export default Crosstab