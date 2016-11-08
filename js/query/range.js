/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* David Talbot, 07/2016
*
*/

var hg = require('mercury')
var h = require('mercury').h
var schema = require('../../cfrp-schema')

var i18n = require('../util/i18n')
const msgs = require('json!../../i18n/query.json')

function listPeriodFiltersOptions(app_state, query_state, dimension, values, lang) {
  var options = [];
  var format = schema.format(lang, dimension);
  for (var i in values) {
    var current_value = values[i];
    var selected = isFilterSelected(app_state.period_filters[dimension], current_value);
    options.push(h('li.custom-checkbox', {
        'ev-click': [
          hg.send(app_state.channels.add_period_filter, { dim: dimension, value: current_value }),
          hg.send(query_state.channels.addFilter, { dim: dimension, value: current_value })
        ],
        value: current_value
      }, [
      h('input', {type: 'checkbox'}),
      h('label' + (selected ? '.selected-filter': ''), [
        h('span.custom-input'),
        h('span', format(current_value))
      ])]));
  }
  return options;
};

function isFilterSelected(dimension_filters, value) {
  var selected = false;
  if(dimension_filters) {
      selected = dimension_filters.indexOf(value) != -1;
  }
  return selected;
}

function listFilters(app_state, lang) {
  var sel_lis = Object.keys(app_state.period_filters).map( (dim) => {
    var format = schema.format(lang, dim);
    var sel_values = app_state.period_filters[dim] || [];
    return sel_values.map((value) => {
      return h('li', [
        //Order.render(query_state, dim),
        h('span.selected-dimension-bullet', [
          h('label', [format(value)]),
          h('span.fa.fa-close', {'ev-click': [
                  hg.send(app_state.channels.remove_period_filter, {dim: dim, value: value}),
                /*hg.send(modal_state.channels.resetSelectedFilterValue, {dim: dim})*/
            ]})
        ]),
      ])
    })
  })

  return h('ul.selected-period-filters', sel_lis)
}

export {listPeriodFiltersOptions, listFilters};
