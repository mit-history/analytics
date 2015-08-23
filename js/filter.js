/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/

require('../css/query.css')

const msgs = require('json!../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var schema = require('../cfrp-schema')

var assign = require('object-assign')

var i18n = require('./i18n')


function strMatch(s, p) {
  s = ("" + s).toLowerCase()
  p = ("" + p).toLowerCase()
  return s.indexOf(p) > -1;
}

function Filter() {
  return hg.state({
    search: hg.value(''),
    channels: {
      update_search: update_search,
      test_submit: test_submit
    }
  })
}

function test_submit(state, data) {
  console.log('got toggle: ' + JSON.stringify(data))
}

function update_search(state, data) {
  state.search.set(data.search)
}

Filter.render = function(state, channels, dim, values, query, formatter, lang) {
  var i18n = msgs[lang]
  var cbs = []

  var sel_values = query.filter[dim] || []

  values.forEach( (d, i) => {
    var formatted_d = formatter(d)
    var is_checked = sel_values.length == 0 || sel_values.indexOf(d) > -1

    if (strMatch(d, state.search)) {
      cbs.push(
        h('label', [
          h('input', { type: 'checkbox', name: d, value: d, checked: is_checked,
                       'ev-event': hg.send(channels.toggle_filter, { dimension: dim, value: d } ) }),
          formatted_d
        ])
      )
    }
  })

  var filter_all = assign({}, query)
  filter_all.filter = assign({}, query.filter)
  delete filter_all.filter[dim]

//  console.log("all: " + JSON.stringify(filter_all))

  return (
    h('form.filter', { 'ev-submit': hg.sendSubmit(state.channels.test_submit) }, [
      h('input', { 'ev-event': hg.sendChange(state.channels.update_search),
                   value: state.search,
                   type: 'text',
                   name: 'search' } ),
      h('div.values', cbs),
      h('div.actions', [
        h('input', { type: 'submit', value: i18n.ok }),
        h('button', { 'ev-click': hg.send(channels.set_query, filter_all) }, [ i18n.all ])
      ])
    ])
  )

}

export default Filter