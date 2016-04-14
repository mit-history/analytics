var document = require('global/document');
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

// install in web page

hg.app(elem, App(datapoint_url, DEFAULT_QUERY), App.render)
