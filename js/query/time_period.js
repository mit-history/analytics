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

var schema = require('../../cfrp-schema')

var i18n = require('../util/i18n')

/** Time period selector **/

function TimePeriod() {
  return hg.state({})
}

TimePeriod.render = function(app_state, modal_state, query_state, lang) {
	var msgs_i18n = msgs[lang];

  return (
		h('div.row.time-period-selector', [
			msgs_i18n.from,
			h('input', {
				'type': 'number',
				'name': 'startDate',
				'maxlength': '4',
				'value': String(app_state.start_date),
        'ev-event': hg.sendChange(app_state.channels.set_start_date)
			}),
			msgs_i18n.to,
			h('input', {
				'type': 'number',
				'name': 'endDate',
				'maxlength': '4',
				'value': String(app_state.end_date),
        'ev-event': hg.sendChange(app_state.channels.set_end_date)
			}),
			h('button.secondary', {
				'ev-click': hg.send(app_state.channels.sel_dates, {
					startDate: app_state.start_date ? app_state.start_date.toString() + '-01-01': '-',
					endDate: app_state.end_date ? app_state.end_date.toString() + '-01-01': '-',
				})
			}, msgs_i18n.ok)
		])
  )
}

export default TimePeriod