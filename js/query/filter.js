/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
* David Talbot, Laval University, 04/2016
*
*/

require('../../css/query.css')

const msgs = require('json!../../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var schema = require('../../cfrp-schema')

var assign = require('object-assign')

var i18n = require('../util/i18n')

var Modal = require('../modal')


function strMatch(s, p) {
  s = ("" + s).toLowerCase()
  p = ("" + p).toLowerCase()
  return s.indexOf(p) > -1;
}

function Filter() {

//  console.log("FILTER: " + JSON.stringify(initial_query))

  return hg.state({
    search: hg.value(''),
    channels: {
      updateSearch: updateSearch
    }
  })
}

function updateSearch(state, data) {
  state.search.set(data.search)
}

// see vdom bug below...
var unique_key = 0

//Filter.render = function(state, channels, dim, values, query, formatter, lang) {
Filter.render = function(modal_state, query_state, dim, axis, lang) {
  var msgs_i18n = msgs[lang]
  var formatter = schema.format(lang, dim)

  var cbs = []

  var values = query_state.domains_data_selection[dim] || []
  var sel_values = modal_state.filter_selection[dim] || []

  values.forEach( (d, i) => {
    if (d !== "") {
      if (strMatch(d, query_state.filter_state.search)) {
        var attrs = { type: 'checkbox',
  										id: d,
                      name: d,
                      'ev-event': hg.sendChange(modal_state.channels.toggleFilterValue, { dim: dim, value: d } ) }

        if(sel_values.indexOf(d) > -1 || modal_state.selectAll[dim]) {
          attrs.checked = true;
        }

        cbs.push(
          // TODO.  virtual-dom doesn't match changes in <input checked ... /> properly
          //        a parallel issue for Mithril: https://github.com/lhorie/mithril.js/issues/691
          //        one workaround is to cache-bust the entire list with a key:
          h('li.custom-checkbox',
            {
              key: unique_key++,
  						'ev-click': hg.send(modal_state.channels.toggleFilterValue, { dim: dim, value: d } )
  					},
            [
              h('input', attrs),
              h('label' + (attrs.checked ? '.selected-filter': ''), [
                h('span.custom-input', h('span.custom-input')),
                h('span', formatter(d))
              ])
            ]
          )
        )
      }
    }
  })

  var lSelectAllButtonTitle = modal_state.selectAll[dim] ? msgs_i18n.filter_button_clear_all : msgs_i18n.filter_button_all;

  return [
	  h('div', h('button.secondary', { 'ev-click': hg.send(modal_state.channels.toggleAllFilterValues, dim) }, [ lSelectAllButtonTitle ])),
	  h('div', h('h4', [ msgs_i18n[dim] ])),
	  h('div', h('input', { 'ev-event': hg.sendChange(query_state.filter_state.channels.updateSearch),
	               value: query_state.filter_state.search,
	               type: 'text',
	               name: 'search',
		 						 placeholder: msgs_i18n.find} )),
	  h('ul.filter-list', cbs),
	  h('div', h('button.secondary',
            { 'ev-click': [
              hg.send(query_state.channels.addDimension, { axis: axis, dim: dim, filters: modal_state.filter_selection[dim] }),
            ] }, [ msgs_i18n.ok ])),
	]

}

export default Filter