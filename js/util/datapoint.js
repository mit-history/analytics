/*
* Data analytics client ("store" in flux)
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/

const schema = require('../../cfrp-schema')

const d3 = require('d3');  // solely for ajax

const qs = require('querystring')

const dateIndexFormat = d3.time.format('%Y-%m-%d')

function datapoint(datapoint_url) {

  datapoint_url = datapoint_url || "/api/cfrp"

  // TODO.  change these calls to Javascript promises

  return {
    domain: (dim, fn) => {
      d3.csv(datapoint_url + "/aggregate/default.csv?" + qs.stringify({'axis[]': dim}), (error, data) => {
        if (error) { return console.error(error); }
        else {
          data = data.map( (d) => schema.parse(dim)(d[dim]) )
          fn(data)
        }
      })
    },

    url: aggregate_url,

    summarize: (dims, agg, filter, windows, fn) => {
      var url = aggregate_url(dims, agg, filter, windows)

      d3.csv(url, (error, data) => {
        if(data) {
          data = data.map( (d) => {
            for(var key in d) {
              d[key] = schema.parse(key)(d[key])
            }
            return d
          })
        }
        fn(error, data)
      })
    }
  }

  function aggregate_url(dims, agg, filter, windows) {
    var params = Object.create({})
    params['axis[]'] = dims
    for(var dim in filter) {
        params['filter.' + dim + '[]'] = filter[dim];
    }

    for(var dim in windows) {
      if(windows[dim][0]) { params['filter.' + dim + '.gt'] = dateIndexFormat(windows[dim][0]) }
      if(windows[dim][1]) { params['filter.' + dim + '.lt'] = dateIndexFormat(windows[dim][1]) }
    }

    return datapoint_url + "/aggregate/" + encodeURIComponent(agg) + ".csv?" + qs.stringify(params)
  }

}

export default datapoint;