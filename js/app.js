/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
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

var datapoint = require('./util/datapoint')

var assign = require('object-assign')

var queue = require('queue-async')

const msgs = require("json!../i18n/app.json")

const DATE_NAME = 'day'

const dateIndexFormat = d3.time.format('%Y-%m-%d')

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
            modal: Modal(),
            carousel: Carousel(1),
            register: Register(),
            status: Status(),

// global state
            query: Query(initial_query, url),
            sel_dates: hg.value([]),
            focus_cell: hg.value({}),
            focus_day: hg.value(null),
            
            loading: hg.value(false),

// data loaded from server
            calendar_data: hg.value([]),
            calendar_extent: hg.value(null),
            cube_data: hg.value({}),
            theater_data: hg.value([]), // should be initialized once, at load

// reference data
            url: url,

// global state transitions
            channels: {
              sel_dates: App.sel_dates,
              focus_cell: App.focus_cell,
              focus_day: App.focus_day,
              focus_theater: App.focus_theater,
              toggle_modal: App.toggle_modal
            }
          })

    var debouncingLoadCube = debounce(loadCube, 500)

    state.query(function() {
      state.cube_data.set(hg.varhash({}))
      debouncingLoadCube()
    })

    state.sel_dates(function() {
      state.cube_data.set(hg.varhash({}))
      debouncingLoadCube()
    })

    state.cube_data(alignFocus)
    state.focus_cell(loadCalendar)

    // this might be bad form... how to send a message to a component?
    state.focus_day( (date) => Register.setDate(state.register, url, date) )

    loadCube()
    loadTheaters()
    loadCalendar()

  return state

  function loadCube() {
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

  function alignFocus() {
    var cube_data = state.cube_data()
    var focus_cell = state.focus_cell()
    console.log("need to make sure focus cell is still in cube data")
  }

  function loadCalendar() {
    // presumes access to state... seems bad
    state.calendar_data.set([])

    var day_window = state.sel_dates ? { day : state.sel_dates } : {}

    api.summarize([DATE_NAME], state.query.agg(), state.focus_cell(), day_window, function(err, raw_data) {
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

// focus changes

App.sel_dates = function(state, data) {
  var { startDate, endDate } = data

  if(startDate && endDate) {
    console.log("Setting new date selection: " + startDate + ' - ' + endDate)
    state.sel_dates.set([startDate, endDate])
  } else {
    console.log("Clearing date selection")
    state.sel_dates.set([])
  }
}

App.focus_cell = function(state, data) {
  var new_focus = data.focus
  console.log("Setting new focus: " + JSON.stringify(new_focus))
  state.focus_cell.set(new_focus)
  Carousel.setSlide(state.carousel, 1)
}

App.focus_day = function(state, data) {
  var new_day = data.date
  console.log("Setting focus day: " + new_day)
  state.focus_day.set(new_day)
  Carousel.setSlide(state.carousel, 2)
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

  function render_i18n(lang) {
    return h('div.row.main-container', [
			Query.render(state.modal, state.query, lang),
			h('section.columns.data-display-container', [
        h('div.loading-indicator' + (state.loading ? '.show' : '.hide'), h('img.loading-icon', { 'src': '/image/ajax-loader.gif' })),
				h('section.crosstab-container', Crosstab.render(state, lang)),
				h('section.chart-containter', Chart.render(state.query, state.cube_data["1x1"], state.lang)),
			])

    ])
  }
}

export default App