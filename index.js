var document = require('global/document');
var window = require("global/window");

var hg = require('mercury')
var h = require('mercury').h


require('./css/third-party/foundation6/foundation-flex.css')

require("font-awesome-webpack");

var App = require('./js/app')


// application defaults

const DEFAULT_QUERY = {
  rows: [],
  cols: [],
  agg: "",
  order: { },
  filter: { }
}

// const DEFAULT_QUERY = {
//   rows: [ "decade" ],
//   cols: [ "author_1" ],
//   agg: "sum_receipts_weighted",
//   order: { "author_1": "desc",
//            "decade": "nat" },
//   filter: { "author_1":
//             ["Corneille (Pierre)",
//              "Molière (Jean-Baptiste Poquelin dit)",
//              "Racine (Jean)",
//              "Voltaire (François-Marie Arouet dit)",
//             ] }
// }

const elem = document.getElementById("app") || document.body
const datapoint_url = elem.getAttribute("data-analytics")

var window_size = hg.value([window.innerWidth, window.innerHeight])

// install in web page

hg.app(elem, App(datapoint_url, window_size, DEFAULT_QUERY), App.render)

// utility functions

throttle("resize", "throttledResize")
window.addEventListener("throttledResize", function() { window_size.set([window.innerWidth, window.innerHeight]) }, false)

function throttle(type, name, obj) {
  obj = obj || window
  var running = false
  var func = function() {
    if (running) { return }
    running = true
    requestAnimationFrame(function() {
      obj.dispatchEvent(new CustomEvent(name))
      running = false
    })
  }
  obj.addEventListener(type, func)
}