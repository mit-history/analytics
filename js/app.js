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

var Carousel = require('./carousel')
var Query = require('./query')
var Crosstab = require('./crosstab')
var Calendar = require('./calendar')
var Register = require('./register')

var datapoint = require('./datapoint')

var assign = require('object-assign')

const msgs = require("json!../i18n/app.json")

const DATE_NAME = 'day'
const VALUE_NAME = 'sum_receipts'

function App(url, initial_query) {
  var api = datapoint(url)
  var state = hg.state({

// component state
            route: Router(),
            modal: hg.value(null),
            carousel: Carousel(),
            query_component: Query(),
            register: Register(),

// global state
//            query: hg.value(initial_query),
            query: hg.varhash({
              rows: hg.array(initial_query.rows),
              cols: hg.array(initial_query.cols),
              agg: hg.value(initial_query.agg),
              order: hg.struct(initial_query.order),
              filter: hg.varhash(initial_query.filter)
            }),
            sel_dates: hg.value([]),
            focus_cell: hg.value({}),
            focus_day: hg.value(null),

// data loaded from server
            calendar_data: hg.array([]),
            cube_data: hg.array([]),
            domains_data: hg.varhash({}),
            theater_data: hg.array([]), // should be initialized once, at load

// global state transitions
            channels: {
              set_query: App.set_query,
              toggle_filter: App.toggle_filter,
              sel_dates: App.sel_dates,
              focus_cell: App.focus_cell,
              focus_day: App.focus_day,
              focus_theater: App.focus_theater,
              toggle_modal: App.toggle_modal
            }
          })
    state.query(loadCube)
    state.query(loadDomains)
    state.cube_data(alignFocus)
    state.focus_cell(loadCalendar)

    // this might be bad form... how to send a message to a component?
    state.focus_day( (date) => Register.setDate(state.register, url, date) )

    loadCube()
    loadDomains()
    loadTheaters()

  return state

  function loadCube() {
    state.cube_data.set([])
    var query = state.query()
    var axes = [].concat(query.rows).concat(query.cols)
    api.summarize(axes, query.agg, query.filters, function(err, data) {
      if (err) { throw err}
      state.cube_data.set(data)
    })
  }

  function loadDomains() {
    var query = state.query()
    var active_dims = [].concat(query.rows).concat(query.cols)
    active_dims.forEach( (dim) => {
      if(!state.domains_data()[dim]) {
        api.domain(dim, (vals) => {
          vals.sort()
          // TODO.  not clear that this will trigger observers for new keys
          state.domains_data.put(dim, vals)
        })
      }
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
    api.summarize([DATE_NAME], VALUE_NAME, state.focus_cell(), function(err, data) {
      if (err) { throw err }
      state.calendar_data.set(data)
    })
  }

  function loadTheaters() {
    api.summarize([ 'theater_period' ], 'min(date)', {}, function(err, data) {
      if (err) { throw err; }
      state.theater_data.set(data)
    })
  }
}

// query manipulation

App.set_query = function(state, new_query) {
  console.log('setting query: ' + JSON.stringify(new_query))
  state.query.set(new_query)
}

App.toggle_filter = function(state, data) {

  var [ dim, d ] = [ data.dimension, data.value ]
  var sv = state.query.filter.get(dim)

  console.log('toggling filter: ' + dim + '.' + d + ' from ' + JSON.stringify(sv))

  var j = sv.indexOf(d)

  if (j > -1) { sv.splice(j, 1) }
  else { sv.push(d) }
  sv.sort()

  console.log('new values: ' + JSON.stringify(sv))

  state.query.filter.put(dim, sv)
}

// focus changes

App.sel_dates = function(state, range) {
  console.log("Setting new date selection: " + range.join(' - '))
  state.sel_dates.set(range)
}

App.focus_cell = function(state, new_focus) {
  console.log("Setting new focus: " + JSON.stringify(new_focus))
  state.focus_cell.set(new_focus)
  Carousel.setSlide(state.carousel, 1)
}

App.focus_day = function(state, new_day) {
  console.log("Setting new day: " + new_day)
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
             h('div.modal', [ String("Current modal: " + (state.modal || "none")) ]),
             Carousel.render(state.carousel, panes, [
               h('div.crosstab', [
                 hg.partial(Query.render, state, lang),
                 hg.partial(Crosstab.render, state)
               ]),
               hg.partial(Calendar.render, state),
               hg.partial(Register.render, state.register)
             ])
           ])
  }
}

export default App