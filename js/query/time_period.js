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

  return (
		h('div.row.time-period-selector', [
			msgs_i18n.from,
			h('select', {
				'name': 'startDate',
        'ev-event': hg.sendChange(app_state.channels.set_start_date)
			}, buildSelectOptionsFct(app_state.start_date)),
			msgs_i18n.to,
			h('select', {
				'name': 'endDate',
        'ev-event': hg.sendChange(app_state.channels.set_end_date)
			}, buildSelectOptionsFct(app_state.end_date)),
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
