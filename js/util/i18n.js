/*
* Barebones i18n
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 07/2015
*
*/

const d3 = require('d3')

const h = require('mercury').h

var fr_spec = {
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["", " €"],
  dateTime: "%A, le %e %B %Y, %X",
  date: "%d/%m/%Y",
  time: "%H:%M:%S",
  periods: ["AM", "PM"], // unused
  days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  shortDays: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
  months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  shortMonths: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
}
var fr = d3.locale(fr_spec)

var en_spec = {
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""],
  dateTime: "%a %b %e %X %Y",
  date: "%m/%d/%Y",
  time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
}
var en = d3.locale(en_spec)

function format_stem_sub(msgs, s, lang, callback) {
  if (!msgs[lang]) { throw "Unknown language (" + lang + ")" }

  var m = /(.*?)_?(\d+)?$/.exec(s)
  var stem = m[1]
  var sub = m[2]

  if (stem == 'author' || stem == 'genre' || stem == 'title') {
    stem = msgs[lang][s];
    sub = null;
  } else {
    stem = msgs[lang][stem] || stem
  }

  return callback(stem, sub)
}

function htmlize(msgs, s, lang) {
  return format_stem_sub(msgs, s, lang, function(stem, sub) {
    return h('span', [ stem, sub ? h('sub', [ sub ]) : null ])
  })
}

export {fr, fr_spec, en, en_spec, htmlize, format_stem_sub}
