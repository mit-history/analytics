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

var Aggregate = require('./query/aggregate')
var TimePeriod = require('./query/time_period')
var Axis = require('./query/axis')
var Order = require('./query/order')
var Filter = require('./query/filter')
var DimensionSelector = require('./query/dimension_selector')

var datapoint = require('./util/datapoint')


/** Query selector as a whole **/

function Query(initial_query, url) {
    var state = hg.state({
        selectedDimension: hg.value(null),

        // query data
        agg: Aggregate(initial_query.agg),
        rows: Axis(initial_query.rows),
        cols: Axis(initial_query.cols),
        order: Order(initial_query.order),
        filter: hg.varhash(initial_query.filter),
        // local data & server-loaded data
        filter_state: Filter(),
        domains_data: hg.varhash({}),
        domains_data_selection: hg.varhash({}),
        url: url,
        // actions
        channels: {
            resetSearch: Query.resetSearch,
            setSelectedDimension: Query.setSelectedDimension,
            setAggregate: Query.setAggregate,
            addDimension: Query.addDimension,
            removeDimension: Query.removeDimension,
            interchangeAxis: Query.interchangeAxis,

            clearFilter: Query.clearFilter,
            toggleDimensionOrder: Query.toggleDimensionOrder,
            togglePivot: Query.togglePivot
        }
    })

    loadDomains()

    state.rows(loadDomains)
    state.cols(loadDomains)

    return state

    function loadDomains() {
        var api = datapoint(url)

        var active_dims = [].concat(state.rows()).concat(state.cols())
        active_dims.forEach((dim) => {
            if (!state.domains_data()[dim]) {
                api.domain(dim, (vals) => {
                    vals.sort()
                    state.domains_data.put(dim, vals)
                })
            }
        })
    }

    // utility function to watch a hash of arrays
    function initialFilter(filter0) {
        var filter1 = Object.create({})
        for (var dim in hash) {
            filter1.put(dim, hg.array(filter0[dim]))
        }
        return hg.varhash(filter1)
    }
}


const ORDER_VALUES = ['nat', 'asc', 'desc']

Query.resetSearch = function (state) {
    state.agg.set('');
    state.rows.set([]);
    state.cols.set([]);
    state.filter.set({});
    state.selectedDimension.set('');
}

Query.setSelectedDimension = function (state, data) {

    console.log('select dim');
    console.log(data);

    // Get filter values for selected dimension
    var api = datapoint(state.url)
    var { axis, dim } = data

    // Get possible filter values for selected dimension
    api.domain(dim, (vals) => {
        vals.sort()
        state.domains_data_selection.put(dim, vals)

        if (dim == 'decade') {
            // Decade selected ? Then bypasse filter selection and just add the dimension
            // with all filters selected and the scope will be reduced to what was selected
            // in the time selector
            var dims = axisByName(state, axis)
            if (dims.indexOf(dim) === -1) {
                dims.push(dim)
            }
            state.domains_data.put(dim, state.domains_data_selection[dim])
            state.filter.put(dim, state.domains_data_selection[dim])
        }
    })

    // If user didn't select decade, than have him choose between possible filter values
    if (dim != 'decade') {
        // Set selected dimension
        state.selectedDimension.set(data)

        // Set previously selected filter values if applcable
        if (state.filter[dim]) {
            state.filter_selection.put(dim, state.filter[dim])
        }
    }
}

Query.setAggregate = function (query, new_agg) {
    query.agg.set(new_agg)
}

Query.clearFilter = function (query, dim) {
    query.filter.put(dim, [])
}

// return a *live* version of the observ_struct axis value
function axisByName(query, axis) {
    switch (axis) {
        case 'rows': return query.rows
        case 'cols': return query.cols
        default: throw "Unknown axis " + axis
    }
}

Query.addDimension = function (query, data) {
    var axis = data.axis;
    var dim = data.dim;
    var filters = data.filters;
    var dims = axisByName(query, axis)
    var j = dims.indexOf(dim)

    if (j === -1) {
        dims.push(dim)
    }

    // Add selected dimension and filter values into
    query.domains_data.put(dim, query.domains_data_selection[dim])
    query.filter.put(dim, filters)

    // Clear dimension and filter selection
    query.domains_data_selection.put(dim, null)
    query.selectedDimension.set('')
    query.filter_state.search.set('')
}

Query.removeDimension = function (query, data) {
    var { axis, dim } = data
    var dims = axisByName(query, axis)
    var j = dims.indexOf(dim)

    if (j > -1) {
        dims.splice(j, 1)
    }

    query.filter.delete(dim)
}

Query.interchangeAxis = function (state) {
    var lRows = state.rows();
    var lCols = state.cols();

    state.rows.set(lCols);
    state.cols.set(lRows);
}

Query.toggleDimensionOrder = function (query, dim) {
    var order = query.order.get(dim)
    var k = ORDER_VALUES.indexOf(order)
    var new_order = ORDER_VALUES[(k + 1) % ORDER_VALUES.length]
    query.order.put(dim, new_order)
}

Query.togglePivot = function (query) {
    var row_splice = query.rows.splice
    var col_splice = query.cols.splice

    var rows = query.rows()
    var cols = query.cols()

    console.log(JSON.stringify(rows) + ' <--> ' + JSON.stringify(cols))

    row_splice.apply(query.rows, [0, rows.length].concat(cols))
    col_splice.apply(query.cols, [0, cols.length].concat(rows))

    console.log(JSON.stringify(query.rows()) + ' <--> ' + JSON.stringify(query.cols()))
}

Query.render = function (app_state, modal_state, query_state, lang) {
    var api = datapoint(query_state.url)
    //  return h('div.query', [ String("Current query: " + JSON.stringify(state)) ])
    var all_dims = ([]).concat(query_state.rows).concat(query_state.cols)
    var download_url = api.url(all_dims, query_state.agg, query_state.filter)

    return (
        h('aside.slide-pannel-container' + (modal_state.queryPanelOpen ? '' : ''), [

            h('button.fa.fa-chevron-left.slide-pannel-button', {
                'ev-click': hg.send(modal_state.channels.setPanelOpen)
            }),

            h('div.query-show-handle' + (modal_state.queryPanelOpen ? '.hidden-container' : '.visible-container'),
                {
                    'id': 'query_panel_open',
                    'ev-click': hg.send(modal_state.channels.setPanelOpen),
                }, [
                    h('div', h('p', msgs[lang]['comparison_tool_open_handle'])),
                    h('button.fa.fa-chevron-right.slide-pannel-button', {
                        'ev-click': hg.send(modal_state.channels.setPanelOpen)
                    })
                ]
            ),

            h('section.query-container' + (modal_state.queryPanelOpen ? '.visible-container' : '.hidden-container'), { id: 'query_panel' }, [
                h('div.query-pane-content', [
                    h('header.query-pane-section.header', [
                        h('h1', msgs[lang]['comparison_tool_title']),
                        h('button', { 'ev-click': hg.send(query_state.channels.resetSearch) }, msgs[lang]['new_search_button']),
                    ]),

                    h('header.query-pane-section', [
                        h('h2', msgs[lang]['comparison_tool_scope_title']),
                        Aggregate.render(modal_state, query_state, lang),
                    ]),

                    h('header.query-pane-section', [
                        h('h2', msgs[lang]['comparison_tool_time_scope_title']),
                        TimePeriod.render(app_state, modal_state, query_state, lang),
                    ]),

                    h('header.query-pane-section' + (modal_state.xAxisDropdownOpen || (query_state.selectedDimension && query_state.selectedDimension.axis == 'rows') ? '.interacted' : ''), [
                        h('h2.axis-title', msgs[lang]['comparison_tool_x_title']),
                        Axis.render(modal_state, query_state, 'rows', lang),
                        DimensionSelector.render(modal_state, query_state, 'rows', lang),
                        h('div.arrow-indicator' + (query_state.selectedDimension && query_state.selectedDimension.axis == 'rows' ? '.visible-container' : '.hidden-container')),
                        h('button.interchange-axis-button', { 'ev-click': hg.send(query_state.channels.interchangeAxis) })
                    ]),

                    h('header.query-pane-section' + (modal_state.yAxisDropdownOpen || (query_state.selectedDimension && query_state.selectedDimension.axis == 'cols') ? '.interacted' : ''), [
                        h('h2.axis-title', msgs[lang]['comparison_tool_y_title']),
                        Axis.render(modal_state, query_state, 'cols', lang),
                        DimensionSelector.render(modal_state, query_state, 'cols', lang),
                        h('div.arrow-indicator' + (query_state.selectedDimension && query_state.selectedDimension.axis == 'cols' ? '.visible-container' : '.hidden-container'))
                    ]),
                ])
            ]),

            h('section.filter-container' + (modal_state.queryPanelOpen && query_state.selectedDimension ? '.visible-flex-container' : '.hidden-container'), [
                (query_state.selectedDimension ? Filter.render(modal_state, query_state, query_state.selectedDimension.dim, query_state.selectedDimension.axis, lang) : ''),
            ])
        ])
    )
}

export default Query