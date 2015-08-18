/*
* MDAT Calendar utils
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 07/2015
*
*/

const d3_time = require('d3-time')


function easterForYear(year) {
  var a = year % 19
  var b = Math.floor(year / 100)
  var c = year % 100
  var d = Math.floor(b / 4)
  var e = b % 4
  var f = Math.floor((b + 8) / 25)
  var g = Math.floor((b - f + 1) / 3)
  var h = (19 * a + b - d - g + 15) % 30
  var i = Math.floor(c / 4)
  var k = c % 4
  var l = (32 + 2 * e + 2 * i - h - k) % 7
  var m = Math.floor((a + 11 * h + 22 * l) / 451)
  var n0 = (h + l + 7 * m + 114)
  var n = Math.floor(n0 / 31) - 1
  var p = n0 % 31 + 1
  return new Date(year, n, p)
}

function easter(date) {
  var d0 = easterForYear(date.getFullYear())
  return (date < d0) ? easterForYear(date.getFullYear()-1) : d0
}

function easterCeiling(date) {
  var d1 = easterForYear(date.getFullYear())
  return (d1 < date) ? easterForYear(date.getFullYear()+1) : d1
}


export { easterForYear, easter, easterCeiling }