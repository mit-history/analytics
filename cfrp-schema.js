/*
* CFRP categories and formatting
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/

const d3 = require('d3')

import {fr_spec, fr, en_spec, en} from './js/util/i18n'

const subscript = (range, items) => {
  var result = range.map( (i) => items.map( (item) => item + "_" + i ) )
  return result.reduce( (a, b) => a.concat(b) )
}

const playbills = ['n'].concat(d3.range(1,4))


const schema = {

  performance:
    subscript(playbills,
    [ "title"]),

  time:
    [ "decade",
      "season",
      "month",
// TODO.  day yields 40,000 results -- query latency unacceptable
//      "day",
      "weekday" ],
  author:
    subscript(playbills,
    [ "author"]),
  genre:
    subscript(playbills,
    [ "genre"]),
//   seating_area:
//     subscript(playbills,
//     [ "seating_area"]),
  theater:
    [ "theater_period",
      "seating_area" ],
  acts:
    subscript(playbills,
    [ "acts"]),




//   prose_vers:
//     subscript(playbills,
//     [ "prose_vers" ]),


		  /*performance_addl:
		    subscript(playbills,
		    [ "prologue",
		      "musique_danse_machine",
		      "free_entry",
		      "reprise",
		      "firstrun",
		      "newactor",
		      "debut" ,
		      "ex_attendance",
		      "ex_representation",
		      "ex_place"  ]) */
}

const public_aggregates = [
  "sum_receipts",
  // "sum_receipts_weighted",
  "performances_days",
  "mean_receipts_day",
  // "mean_receipts_day_weighted",
  "mean_price" ]

function group() {
  return schema
}

function dimension() {
  return d3.values(schema).reduce( (a,b) => a.concat(b) )
}

function aggregate() {
  return public_aggregates
}

function parse(field) {
  // only necessary for non-text fields received via AJAX/CSV
  switch(true) {
    case /^decade(_.*)?/.test(field):
      return parseInt
    case /^month(_.*)?/.test(field):
      return parseInt
    case /^weekday(_.*)?/.test(field):
      return parseInt
    case /^acts(_.*)?/.test(field):
      return parseInt
    case /^prologue(_.*)?/.test(field):
      return parseBool
    case /^musique_danse_machine(_.*)?/.test(field):
      return parseBool
    case /^free_entry(_.*)?/.test(field):
      return parseBool
    case /^reprise(_.*)?/.test(field):
      return parseBool
    case /^firstrun(_.*)?/.test(field):
      return parseBool

    // aggregates
    case /sum_receipts/.test(field):
      return parseFloat
    case /sum_receipts_weighted/.test(field):
      return parseFloat
    case /performances_days/.test(field):
      return parseInt
    case /mean_receipts_day/.test(field):
      return parseFloat
    case /mean_receipts_day_weighted/.test(field):
      return parseFloat
    case /mean_price/.test(field):
      return parseFloat
    case /count_authors_(\d)/.test(field):
      return parseInt
    case /count_titles_(\d)/.test(field):
      return parseInt
  }
  return (x) => x

  function parseBool(s) {
    switch(s) {
      case 't': return true
      case 'f': return false
      default: return null
    }
  }
}

function format(lang, field, len) {
  // TODO logic could be clearer... some much easier in ruby
  //      lets us use the same logic for both languages

  var spec = (lang === 'en') ? en_spec : fr_spec
  var fmt = (lang === 'en') ? en : fr

  switch(true) {

    // dimensions
		case /^decade(_.*)?/.test(field):
	    return (i) => +i   // [i, +i+9].join(' - ')
    case /^month(_.*)?/.test(field):
    // NB. months and weekdays are kept in 1-indexed format (like postgresql; unlike javascript)
      return (i) => (i === null) ? "" : spec.months[+i-1]
    case /^day(_.*)?/.test(field):
      return fmt.timeFormat("%a %d %b %Y")
    case /^weekday(_.*)?/.test(field):
    // NB. months and weekdays are kept in 1-indexed format (like postgresql; unlike javascript)
      return (i) => (i === null) ? "" : spec.days[+i-1]
    case /^prologue(_.*)?/.test(field):
      return formatBool
    case /^musique_danse_machine(_.*)?/.test(field):
      return formatBool
    case /^free_entry(_.*)?/.test(field):
      return formatBool
    case /^reprise(_.*)?/.test(field):
      return formatBool
    case /^firstrun(_.*)?/.test(field):
      return formatBool

    // aggregates
    case /sum_receipts/.test(field):
      return fmt.numberFormat(",f")
    case /sum_receipts_weighted/.test(field):
      return fmt.numberFormat(",f")
    case /performances_days/.test(field):
      return fmt.numberFormat(",f")
    case /mean_receipts_day/.test(field):
      return fmt.numberFormat(",f")
    case /mean_receipts_day_weighted/.test(field):
      return fmt.numberFormat(",f")
    case /mean_price/.test(field):
      return fmt.numberFormat(",f")
    case /count_authors_(\d)/.test(field):
      return fmt.numberFormat(",f")
    case /count_titles_(\d)/.test(field):
      return fmt.numberFormat(",f")
  }

  /* When len is set, returns the earlier of
     (1) a 'hard' delimiter: parens, semicolon, comma
     (2) the first 'soft' (space) delimiter after the len characters
     TODO move into an editable short value in the database ? */
  return (x) => {
    if(!x) return ""
    x = "" + x
    if(!len) return x

    let hard = x.search(/\s*[(,;]/)
    hard = (hard > -1) ? hard : Infinity
    let soft = x.indexOf(' ', len)
    soft = (soft > -1) ? soft : Infinity

    return x.slice(0, Math.min(hard, soft))
  }

  function formatBool(b) {
    if (b === true) { return lang === 'en' ? 'yes' : 'oui' }
    if (b === false) { return lang === 'en' ? 'no' : 'non' }
    if (b === "undefined") { return ""; }
    return b;
  }
}

function sort(vals) {
  if(vals && vals.hasOwnProperty("sort") && vals.length > 0) {
    if(typeof vals[0] === "number") {
      vals.sort(function(a, b) { return a - b; });
    } else {
      vals.sort();
    }
  }
}

export { group, dimension, aggregate, parse, format, sort };
