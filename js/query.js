/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/


require('../css/query.css')

var hg = require('mercury')
var h = require('mercury').h

const msgs = require("json!../i18n/query.json")

function strMatch(s, p) {
  s = ("" + s).toLowerCase()
  p = ("" + p).toLowerCase()
  return s.indexOf(p) > -1;
}

// post-process for html/css formatting
//   currently, only handles subscripted numbers
function htmlize(s, lang) {
  if (!msgs[lang]) { throw "Unknown language (" + lang + ")" }

  var m = /(.*?)(_\d+)?$/.exec(s)
  var stem = m[1]
  stem = msgs[lang][stem] || stem
  s = stem + (m[2] || "")
  return {__html: s.replace(/_(\d+)$/, (match, p1) => "<sub>&nbsp;" + p1 + "</sub>" ) };
}

/** Axis selector **/

function Axis() {
  return null
}

Axis.render = function(state) {
  return ""
}

/** Aggregate selector **/

function Aggregate() {
  return null
}

Aggregate.render = function(state, name) {
  return name
}

/** Query selector as a whole **/

function Query() {
  return null
}

Query.render = function(state) {
//  return h('div.query', [ String("Current query: " + JSON.stringify(state)) ])

  return (
    h('div.query', {id: 'query_panel'}, [
      Axis.render(state.query, 'rows'),
      Axis.render(state.query, 'cols'),
      Aggregate.render(state.query)
    ]))
/*
      <Axis className="rows" axis="rows" title={i18n.rows}
            sel_dims={query.rows} onChange={this.props.onAxisChange}
            domains={this.state.domains}
            filter={query.filter} toggleFilterValue={this.props.toggleFilterValue}
                                  handleFilterNone={this.props.handleFilterNone}
            order={query.order} handleToggleOrder={this.props.handleToggleOrder}
            lang={this.props.lang} />
      <Axis className="cols" axis="cols" title={i18n.cols}
            sel_dims={query.cols} onChange={this.props.onAxisChange}
            domains={this.state.domains}
            filter={query.filter} toggleFilterValue={this.props.toggleFilterValue}
                                  handleFilterNone={this.props.handleFilterNone}
            order={query.order} handleToggleOrder={this.props.handleToggleOrder}
            lang={this.props.lang} />
      <Aggregate title={i18n.cells}
                 agg={query.agg}
                 aggs={schema.aggregate()}
                 onChange={this.props.onAggregateChanged}
                 lang={this.props.lang} />
*/
}

export default Query