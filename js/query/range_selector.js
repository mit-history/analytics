/*
 * MDAT Query manipulation component
 *
 * Copyright (c) 2015 MIT Hyperstudio
 * David Talbot, 07/2016
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
var range = require('./range');

/** Time period selector **/

function RangeSelector(query_state) {

    return hg.state({})
}

RangeSelector.render = function(app_state, modal_state, query_state, lang) {
    return (
        h('div.selector.date-period-selector', [
            range.listFilters(app_state, lang),
            h('button.dropdown-list', {
                'ev-click': hg.send(app_state.channels.open_month_period_filter)
            }, [
                h('span.title', msgs[lang].month),
                h('span.fa.right' + (app_state.month_filter_opened ? '.fa-chevron-up' : '.fa-chevron-down'))
            ]),
            h('ul.dropdown-list-content.axis-content' + (app_state.month_filter_opened ? '.visible-container' : '.hidden-container'),
                range.listPeriodFiltersOptions(app_state, query_state, "month", app_state.available_months, lang)),
            h('button.selector.dropdown-list', {
                'ev-click': hg.send(app_state.channels.open_day_period_filter)
            }, [
                h('span.title', msgs[lang].weekday),
                h('span.fa.right' + (app_state.day_filter_opened ? '.fa-chevron-up' : '.fa-chevron-down'))
            ]),
            h('ul.dropdown-list-content.axis-content' + (app_state.day_filter_opened ? '.visible-container' : '.hidden-container'),
                range.listPeriodFiltersOptions(app_state, query_state, "weekday", app_state.available_weekdays, lang)),
            h('button.selector.dropdown-list', {
                'ev-click': hg.send(app_state.channels.open_theater_period_filter)
            }, [
                h('span.title', msgs[lang].theater),
                h('span.fa.right' + (app_state.theater_filter_opened ? '.fa-chevron-up' : '.fa-chevron-down'))
            ]),
            h('ul.dropdown-list-content.axis-content' + (app_state.theater_filter_opened ? '.visible-container' : '.hidden-container'),
                range.listPeriodFiltersOptions(app_state, query_state, "theater_period", app_state.available_theater_periods, lang))            
        ])
    )
}

export default RangeSelector
