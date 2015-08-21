/*
* CFRP categories and formatting
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/

const d3 = require('d3')

import {fr_spec} from './js/i18n'

const subscript = (range, items) => {
  var result = range.map( (i) => items.map( (item) => item + "_" + i ) )
  return result.reduce( (a, b) => a.concat(b) )
}

const playbills = d3.range(1,4)

const schema = {
  time:
    [ "decade",
      "season",
      "month",
      "day",
      "weekday" ],
  performance:
    subscript(playbills,
    [ "author",
      "title",
      "genre",
      "acts",
      "pros_vers" ]),
  performance_addl:
    subscript(playbills,
    [ "prologue",
      "musique_danse_machine",
      "free_entry",
      "reprise",
      "firstrun",
      "newactor",
      "debut",
      "ex_attendance",
      "ex_representation",
      "ex_place" ]),
  theater:
    [ "theater_period",
      "seating_area" ]
}

const public_aggregates = [
  "sum_receipts",
  "performances_days",
  "mean_receipts_day",
  "mean_price" ]

const formats = {
  fr: {
    weekday: (i) => (i === null) ? "" : fr_spec.days[i-1]
  },
  en: {
    weekday: (i) => (i === null) ? "" : fr_spec.days[i-1]
  }
}

function boolfmt(b, t, f) {
  if (b === true) { return t; }
  if (b === false) { return f; }
  if (b === "undefined") { return ""; }
  return b;
}

function group() {
  return schema
}

function dimension() {
  return d3.values(schema).reduce( (a,b) => a.concat(b) )
}

function aggregate() {
  return public_aggregates
}

function format(field) {
  return (x) => "" + x
}

export { group, dimension, aggregate, format };