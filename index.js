var document = require('global/document');
var hg = require('mercury')
var h = require('mercury').h

var App = require('./js/app')


// application defaults

const DEFAULT_QUERY = {
  rows: [ "decade" ],
  cols: [ "author_1" ],
  agg: "sum_receipts",
  order: { "author_1": "asc",
           "decade": "nat" },
  filter: { "author_1":
            ["Beaumarchais (Pierre-Augustin Caron de)",
            "Voltaire (François-Marie Arouet dit)",
            "Marivaux (Pierre de)"] }
}

const elem = document.getElementById("app") || document.body
const datapoint_url = elem.getAttribute("data-analytics")

// install in web page

hg.app(elem, App(datapoint_url, DEFAULT_QUERY), App.render)
