/*
* MDAT Calendar component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
*
*/


require('../css/app.css')

var hg = require('mercury')
var h = require('mercury').h

var RouterComponent = require('mercury-router')
var Router = RouterComponent

var Modal = require('./modal')
var Carousel = require('./carousel')
var Query = require('./query')
var Crosstab = require('./crosstab')
var Calendar = require('./calendar')
var Register = require('./register')

var datapoint = require('./util/datapoint')

var assign = require('object-assign')

var queue = require('queue-async')

const msgs = require("json!../i18n/app.json")

const DATE_NAME = 'day'
const VALUE_NAME = 'sum_receipts'

const dateIndexFormat = d3.time.format('%Y-%m-%d')

function App(url, initial_query) {
  var api = datapoint(url)
  var state = hg.state({

// component state
            route: Router(),
            modal: Modal(),
            carousel: Carousel(),
            register: Register(),

// global state
            query: Query(initial_query),

/*
//            query: hg.value(initial_query),
            query: hg.varhash({
              rows: hg.array(initial_query.rows),
              cols: hg.array(initial_query.cols),
              agg: hg.value(initial_query.agg),
              order: hg.struct(initial_query.order),
              filter: hg.varhash(initial_query.filter)
            }),
*/
            sel_dates: hg.value([]),
            focus_cell: hg.value({}),
            focus_day: hg.value(null),

// data loaded from server
            calendar_data: hg.value([]),
            calendar_extent: hg.value(null),
            cube_data: hg.array([]),
            theater_data: hg.value([]), // should be initialized once, at load

// global state transitions
            channels: {
              sel_dates: App.sel_dates,
              focus_cell: App.focus_cell,
              focus_day: App.focus_day,
              focus_theater: App.focus_theater,
              toggle_modal: App.toggle_modal
            }
          })
    state.query(loadCube)
    state.cube_data(alignFocus)
    state.focus_cell(loadCalendar)

    // this might be bad form... how to send a message to a component?
    state.focus_day( (date) => Register.setDate(state.register, url, date) )

    loadCube()
    loadTheaters()

  return state

  function loadCube() {
    state.cube_data.set([])
    var query = state.query()
    var axes = [].concat(query.rows).concat(query.cols)
    var day_window = state.sel_dates ? { day : state.sel_dates } : {}
    api.summarize(axes, query.agg, query.filters, day_window, function(err, data) {
      if (err) { throw err}
      state.cube_data.set(data)
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
    api.summarize([DATE_NAME], VALUE_NAME, state.focus_cell(), day_window, function(err, raw_data) {
      if (err) { throw err }
      var data = Object.create({})
      raw_data.forEach( (d) => {
        var day = d[DATE_NAME]
        data[day] = d[VALUE_NAME]
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
  console.log("Setting new date selection: " + startDate + ' - ' + endDate)
  state.sel_dates.set([startDate, endDate])
}

App.focus_cell = function(state, new_focus) {
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
           '/': function() {
             return render_i18n('fr')
           },
           '/:lang': function(params) {
             return render_i18n(lang(params))
           }
         })

  function lang(params) {
    switch (params['lang']) {
      case 'fr' : return 'fr'
      case 'en' : return 'en'
      default : return 'fr'
    }
  }

  function render_i18n(lang) {
    var i18n = msgs[lang]
    var panes = [ {start: 0, run: 1, title: i18n.dot1 },
                  {start: 0, run: 2, title: i18n.dot2 },
                  {start: 1, run: 2, title: i18n.dot3 }]
    return h('div', [
             h('div.lang', [ "Language is " + lang ]),
             h('div.modal', [ String("Current modal: " + state.modal.modal || "none") ]),
             Carousel.render(state.carousel, panes, [
               h('div.crosstab', [
                 hg.partial(Query.render, state.modal, state.query, lang),
                 hg.partial(Crosstab.render, state)
               ]),
               hg.partial(Calendar.render, state, lang),
               hg.partial(Register.render, state.register)
             ])
           ])
  }
}

export default App