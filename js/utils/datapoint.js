/*
* Data analytics client ("store" in flux)
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/

const d3 = require('d3');  // solely for ajax

const qs = require('querystring');

function datapoint(datapoint_url) {

  datapoint_url = datapoint_url || "/api/cfrp";

  return {
    domain: (dim, fn) => {
      d3.csv(datapoint_url + "/aggregate/default.csv?" + qs.stringify({'axis[]': dim}), (error, data) => {
        if (error) { return console.error(error); }
        else { fn(data.map( (d) => d[dim] )); }
      });
    },

    summarize: (dims, agg, filters, fn) => {
      var params = Object.create({});
      params['axis[]'] = dims;
      for(var dim in filters) {
          params['filter.' + dim + '[]'] = filters[dim];
      }

      d3.csv(datapoint_url + "/aggregate/" + encodeURIComponent(agg) + ".csv?" + qs.stringify(params), fn);
    }
  }
}

export default datapoint;