/*
* MDAT Data Analytics Tool
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
* David Talbot, Laval University, 04/2016
*
*/


require('../css/app.css')
require('../css/chart.css')

var hg = require('mercury')
var h = require('mercury').h

var RouterComponent = require('mercury-router')
var Router = RouterComponent

var Modal = require('./modal')
var Carousel = require('./carousel')
var Query = require('./query')
var Crosstab = require('./crosstab')
var Chart = require('./chart')
var Calendar = require('./calendar')
var Register = require('./register')
var Status = require('./status')
var Download = require('./download')
var Legend = require('./legend')

var datapoint = require('./util/datapoint')

var assign = require('object-assign')
var schema = require('../cfrp-schema');

var queue = require('queue-async')

const msgs = require("json!../i18n/app.json")

const DATE_NAME = 'day'

const dateIndexFormat = d3.time.format('%Y-%m-%d')

const filterDims = ["decade", "month", "weekday", "theater_period"];

// cribbed from underscore: http://underscorejs.org/docs/underscore.html#section-69
function debounce(func, wait, immediate) {
  var timeout, args, context, timestamp, result;

  var now = Date.now || function() {
    return new Date().getTime();
  }

  var later = function() {
    var last = now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      }
    }
  };

  return function() {
    context = this;
    args = arguments;
    timestamp = now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };
}

function App(url, initial_query) {
  var api = datapoint(url)
  var state = hg.state({

// component state
            route: Router(),
            modal: Modal(initial_query),
            carousel: Carousel(1),
            register: Register(),
            status: Status(),
            chart: Chart(),
            legend: Legend(),
            tableView: hg.value('half-table'),
            download: Download(url),

// global state
            query: Query(initial_query, url),
            start_date: hg.value(0),
            end_date: hg.value(0),
            sel_dates: hg.value([]),
            chart_sizes: hg.value([800, 350]),
            period_filters: hg.varhash({}),
            month_filter_opened: hg.value(false),
            day_filter_opened: hg.value(false),
            theater_filter_opened: hg.value(false),
            focus_cell: hg.value({}),
            focus_day: hg.value(null),
            available_decades: hg.value(),
            available_months: hg.value(),
            available_weekdays: hg.value(),
            available_theater_periods: hg.value([]),

            loading: hg.value(false),
            pane_display: hg.value(1),
            show_registry: hg.value(false),

// data loaded from server
            calendar_data: hg.value([]),
            calendar_extent: hg.value(null),
            cube_data: hg.value({}),
            theater_data: hg.value([]), // should be initialized once, at load

// reference data
            url: url,

// global state transitions
            channels: {
              set_start_date: App.set_start_date,
              set_end_date: App.set_end_date,
              sel_dates: App.sel_dates,
              add_period_filter: App.add_period_filter,
              remove_period_filter: App.remove_period_filter,
              open_month_period_filter: App.open_month_period_filter,
              open_day_period_filter: App.open_day_period_filter,
              open_theater_period_filter: App.open_theater_period_filter,
              reset_dates: App.reset_dates,
              focus_col: App.focus_col,
              focus_row: App.focus_row,
              focus_cell: App.focus_cell,
              focus_day: App.focus_day,
              focus_theater: App.focus_theater,
              toggle_modal: App.toggle_modal,
              set_pane: App.set_pane,
              open_calendar: App.open_calendar,
              switchTableView: App.switchTableView,
              refresh_pane: App.refresh_pane
            }
          })

    var debouncingLoadCube = debounce(loadCube, 500)
    var debouncingLoadCalendar = debounce(loadCalendar, 500);

    state.query(function() {
      state.cube_data.set(hg.varhash({}))
      debouncingLoadCube()
      debouncingLoadCalendar();
    })

    state.sel_dates(function() {
      state.cube_data.set(hg.varhash({}))
      debouncingLoadCube()
      debouncingLoadCalendar();
    })

    state.cube_data(alignFocus);
    state.query.agg(loadCalendar);

    // this might be bad form... how to send a message to a component?
    state.focus_day( (date) => Register.setDate(state.register, url, date) )

    loadCube()
    loadTheaters()

    // Loading filters to be used in query panel
    filterDims.forEach((dim) => api.domain(dim, (vals) => {
      schema.sort(vals);
      state['available_' + dim + 's'].set(vals);
    }));

    // Setting default decade scope
    if (initial_query.decade_scope) {
      // UI date selection
      state.start_date.set(parseInt(initial_query.decade_scope.start))
      state.end_date.set(parseInt(initial_query.decade_scope.end))
      // App query date selection
      var startDate = new Date(initial_query.decade_scope.start + '-04-01');
      var endDate = new Date(initial_query.decade_scope.end + '-03-31');
      state.sel_dates.set([startDate, endDate])
    }

  return state

  function loadCube() {
    if(state.pane_display() === 1) {
      var query = state.query()
      var first_row = query.rows.slice(0, 1)
      var first_col = query.cols.slice(0, 1)
      var day_window = state.sel_dates ? { day : state.sel_dates() } : {}

      state.loading.set(true);

      // load the 4 fundamental combinations of cube dimensions;
      // remainder are accessible via drill-down in the UI
      queue().defer(api.summarize, [], query.agg, query.filter, day_window)
             .defer(api.summarize, first_row, query.agg, query.filter, day_window)
             .defer(api.summarize, first_col, query.agg, query.filter, day_window)
             .defer(api.summarize, [].concat(first_row).concat(first_col), query.agg, query.filter, day_window)
             .await( (err, d1, d2, d3, d4) => {
                if(err) { throw err }
                state.cube_data.set({
                  '0x0': d1,
                  '1x0': d2,
                  '0x1': d3,
                  '1x1': d4
                })
                state.loading.set(false);
            })
    }
  }

  function alignFocus() {
    var cube_data = state.cube_data()
    var focus_cell = state.focus_cell()
  }

  function loadCalendar() {
    if(state.pane_display() === 2) {
      App.loadCalendar(state);
    }
  }

  function loadTheaters() {
    queue().defer(api.summarize, [ 'theater_period' ], 'min(date)', {}, {})
           .defer(api.summarize, [ 'theater_period' ], 'max(date)', {}, {})
    .await( (err, theater_mins, theater_maxes) => {
      if(err) throw err
      var data = Object.create({})
        theater_mins.forEach( (d) => {
          var key = d['theater_period']
          var val = d['min(date)']
          data[key] = { start_date: dateIndexFormat.parse(val) }
        })

        theater_maxes.forEach( (d) => {
          var key = d['theater_period']
          var val = d['max(date)']
          data[key].end_date = dateIndexFormat.parse(val)
        })

        state.theater_data.set(data)
      })
  }
}


App.loadCalendar = function(state) {
  var api = datapoint(state.url);
  // presumes access to state... seems bad
  state.calendar_data.set([])

  var day_window = state.sel_dates ? { day : state.sel_dates() } : {}
  api.summarize([DATE_NAME], state.query.agg(), state.query.filter(), day_window, function(err, raw_data) {
    if (err) { throw err }
    var data = Object.create({})
    raw_data.forEach( (d) => {
      var day = d[DATE_NAME]
      data[day] = d[state.query.agg()]
    })
    state.calendar_data.set(data)
    // NB this works because the date format sorts alphanumerically
    var min_max = d3.extent(d3.keys(data))
    state.calendar_extent.set(min_max)
  })
}
// focus changes

App.refresh_pane = function(state, data) {
  if(state.pane_display === 2) {
    App.loadCalendar(state);
  }
}

App.sel_dates = function(state, data) {
  var { startDate, endDate } = data
  if(startDate && endDate && startDate != '-' && endDate != '-') {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    state.sel_dates.set([startDate, endDate])
  } else {
    state.sel_dates.set([])
  }
  App.refresh_pane(state);
}

App.open_calendar = function(state, data) {
  App.loadCalendar(state);
  state.pane_display.set(2);
}

App.set_start_date = function(state, data) {
  state.start_date.set(parseInt(data.startDate, 10) || 0)
}

App.set_end_date = function(state, data) {
  state.end_date.set(parseInt(data.endDate, 10) || 0)
}

App.add_period_filter = function(state, data) {
  var filters = state.period_filters.get(data.dim);
  if(!filters) {
    filters = [];
    state.period_filters.put(data.dim, filters);
  }
  if(filters.indexOf(data.value) === -1) {
    filters.push(data.value);
  } else {
    filters.splice(filters.indexOf(data.value), 1);
  }
  App.close_period_filters(state);
}

App.remove_period_filter = function(state, data) {
  var filters = state.period_filters.get(data.dim);
  filters.splice(filters.indexOf(data.value), 1);
  state.period_filters.put(data.dim, filters);
  App.close_period_filters(state);
}

App.close_period_filters = function(state) {
  state.month_filter_opened.set(false);
  state.day_filter_opened.set(false);
  state.theater_filter_opened.set(false);
}

App.open_month_period_filter = function(state) {
  state.month_filter_opened.set(!state.month_filter_opened());
  state.day_filter_opened.set(false);
  state.theater_filter_opened.set(false);
}

App.open_day_period_filter = function(state) {
  state.month_filter_opened.set(false);
  state.day_filter_opened.set(!state.day_filter_opened());
  state.theater_filter_opened.set(false);
}

App.open_theater_period_filter = function(state) {
  state.month_filter_opened.set(false);
  state.day_filter_opened.set(false);
  state.theater_filter_opened.set(!state.theater_filter_opened());
}

App.reset_dates = function(state) {
  state.start_date.set(1680);
  state.end_date.set(1790);
  state.period_filters.set({});
  state.pane_display.set(1);
}

App.focus_col = function(state, data) {
  let focus = state.focus_cell;
  focus[data.dimension] = data.value;
  state.focus_cell.set(focus);
  state.legend.focus.set(data.value);
  state.chart.focus.set(data.value);
}

App.focus_row = function(state, data) {
  let focus = state.focus_cell;
  focus[data.dimension] = data.value;
  focus.agg = data.agg;
  state.focus_cell.set(focus);
  state.chart.point.set(data.value);
}

App.focus_cell = function(state, data) {
  let new_focus = data.focus
  let first_col = state.query.cols.slice(0, 1);
  let first_row = state.query.rows.slice(0, 1)
  state.focus_cell.set(new_focus);
  state.legend.focus.set(new_focus[first_col]);
  state.chart.focus.set(new_focus[first_col]);
  state.chart.point.set(new_focus[first_row]);
  Carousel.setSlide(state.carousel, 1)
}

App.focus_day = function(state, data) {
  var new_day = data.date
  console.log("Setting focus day: " + new_day)
  state.focus_day.set(new_day)
  Carousel.setSlide(state.carousel, 2)
  state.show_registry.set(true)
}

App.focus_theater = function(state, new_theater) {
  console.log("Filtering to a theater: " + new_theater)
  var filter = state.query.filter
  var new_filter = assign(filter, { theater_period: new_theater })
  state.query.filter.set(new_filter)
  Carousel.setSlide(state.carousel, 1)
}

App.toggle_modal = function(state, modal) {
  var prev = state.modal()
  var next = (modal !== prev) ? modal : null

  state.modal.set(next)
}

App.set_pane = function(state, data) {
  state.pane_display.set(data)
}

App.switchTableView = function(state, tableViewState) {
  state.tableView.set(tableViewState);
}

// rendering

App.render = function(state) {
  return RouterComponent.render(state, {
           '/:lang/app': function(params) {
             return render_i18n(lang(params))
           },
           '/*': render_i18n.bind(null, 'fr')
         })

  function lang(params) {
    switch (params['lang']) {
      case 'fr' : return 'fr'
      case 'en' : return 'en'
      default : return 'fr'
    }
  }

  function chart_size() {
    var sizes = [800, 350];
    if(!state.modal.queryPanelOpen) {
      sizes[0] = 1200;
    }
    if(state.tableView == 'full-chart') {
      sizes[1] = 500;
    }
    return sizes;
  }

  function render_i18n(lang) {
    return h('div.row.main-container', [
			Query.render(state, state.modal, state.query, lang),
			h('section.columns.data-display-container', [
				// h('div.pane_selector', h('nav', [
        //   h('button' + (state.pane_display == 1 ? '.selected' : ''), { 'ev-click': hg.send(state.channels.set_pane, 1) }, msgs[lang]['pane_selector_button_1']),
        //   h('button' + (state.pane_display == 2 ? '.selected' : ''), { 'ev-click': hg.send(state.channels.set_pane, 2) }, msgs[lang]['pane_selector_button_2']),
        // ])),
				h('div.data-container-pane' + (state.pane_display == 1 ? '.show' : '.hide'), [
          h('aside.crosstab-view-splitter-container', [
            h('div.crosstab-view-splitter', [
              h('button.full-table' + (state.tableView == 'full-table' ? '.selected' : ''),
                { 'ev-click': hg.send(state.channels.switchTableView, 'full-table') }),
              h('button.half-tablechart' + (state.tableView == 'half-table' ? '.selected' : ''),
                { 'ev-click': hg.send(state.channels.switchTableView, 'half-table') }),
              h('button.full-chart' + (state.tableView == 'full-chart' ? '.selected' : ''),
                { 'ev-click': hg.send(state.channels.switchTableView, 'full-chart') })
            ])
          ]),
          Download.render(state, lang),
          h('section.crosstab-container.' + state.tableView, [
                        h('div.loading-indicator' + (state.loading ? '.show' : '.hide'), h('div.loading-icon')),
            Crosstab.render(state, lang)
          ]),
				  h('section.chart-containter.' + state.tableView, [
            h('div.loading-indicator' + (state.loading ? '.show' : '.hide'), h('div.loading-icon')),
            Chart.render(state.chart, state, state.query, state.cube_data, chart_size(), false, lang),
            Legend.render(state.legend, state, state.query, state.cube_data, lang)
          ]),
        ]),
        h('div.data-container-pane' + (state.pane_display == 2 ? '.show' : '.hide'), [
            Calendar.render(state, chart_size(), lang)
        ]),
			])

    ])
  }
}

export default App
