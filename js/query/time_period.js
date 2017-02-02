/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* David Talbot, 05/2016
*
*/

require('../../css/query.css')

const msgs = require('json!../../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var assign = require('object-assign')

var Modal = require('../modal')

var datapoint = require('../util/datapoint')

var schema = require('../../cfrp-schema')

var i18n = require('../util/i18n')

/** Time period selector **/

function TimePeriod(query_state) {

  return hg.state({
  })
}

TimePeriod.render = function(app_state, modal_state, query_state, lang) {
  var msgs_i18n = msgs[lang];

  var buildSelectOptionsFct = function(selected_decade) {
    var lAvailableDecades = app_state.available_decades;
    var lResult = [];
    for (var i in lAvailableDecades) {
      var lCurrentDecade = lAvailableDecades[i];
      var lSelected = false;
      if (selected_decade == lCurrentDecade) {
        lSelected = true;
      }
      lResult.push(h('option', { value: lCurrentDecade, selected: lSelected }, lCurrentDecade));
    }
    return lResult;
  };

  var createDateSelector = function(name, channel, options) {
    let selector;
    if(app_state.pane_display === 1) {
      selector = h('select', {
				'name': name,
        'ev-event': hg.sendChange(channel)
			}, buildSelectOptionsFct(options))
    } else {
      selector = h('input', {
        type: 'number',
        min: '1680',
        max: '1790',
        step: 1,
        value: options,
        name: name,
        'ev-blur': hg.sendValue(channel)
      })
    }
    return selector;
  }

  return (
		h('div.row.time-period-selector', [
			h('span', msgs_i18n.from),
      createDateSelector('startDate', app_state.channels.set_start_date, app_state.start_date),
			h('span', msgs_i18n.to),
      createDateSelector('endDate', app_state.channels.set_end_date, app_state.end_date),
			h('button.secondary', {
				'ev-click': [
          hg.send(app_state.channels.sel_dates, {
  					startDate: app_state.start_date ? app_state.start_date.toString() + '-04-01': '-',
  					endDate: app_state.end_date ? app_state.end_date.toString() + '-03-31': '-',
  				}),
          hg.send(query_state.channels.addFilterRange, {
            dim: "decade",
            values: app_state.available_decades,
            range: {
              from: app_state.start_date,
              to: app_state.end_date
            }
          })
        ]
			}, msgs_i18n.ok)
		])
  )
}

export default TimePeriod
