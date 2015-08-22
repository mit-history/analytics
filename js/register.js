/*
* MDAT Register image component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/


require('../css/register.css')

var hg = require('mercury')
var h = require('mercury').h

var svg = require('virtual-hyperscript/svg');

var d3 = require('d3')

const format = d3.time.format('%Y-%m-%d');

/*
* SVG based image viewer, with zoom and pan transforms.
*
* Pipes events through d3's zoom behavior for cross-browser consistency.
*
* I decided to break with unidirectional flow of data and store image scale
* and translation in a small widget because
*
* (1) this gives better user experience during zoom (no jerkiness)
* (2) from the application's point of view, zoom state is transient
* (3) scale & translate persist even when user chooses a new register page
* (4) feeding d3's zoom event back through mercury's dom-delegator is doable,
*     but complex; dom-delegator is really intended for DOM events
*/

function ImageWidget(url) {
  if (!(this instanceof ImageWidget)) {
    return new ImageWidget(url)
  }
  this.url = url
}

ImageWidget.prototype.type = 'Widget'

ImageWidget.prototype.init = function() {
  var start_scale = 0.33
  var xmlns = 'http://www.w3.org/2000/svg';
  var elem = document.createElementNS(xmlns, 'svg')

  var svg = d3.select(elem)
      .attr('width', '100%')
      .attr('height', '100%')

  var image = svg.append('image')
      .attr('width', 1655)
      .attr('height', 2255)
      .attr('transform', 'scale(' + start_scale + ')')

  var overlay = svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', 'none')

  svg.call(d3.behavior.zoom()
      .scaleExtent([0.15, 10.0])
      .scale(start_scale)
      .on('zoom', () => {
        image.attr('transform', 'translate(' + d3.event.translate + ') ' + 'scale(' + d3.event.scale + ')')
      }))

  return elem
}

ImageWidget.prototype.update = function(prev, elem) {
  d3.select(elem)
    .select('image')
      .attr('xlink:href', this.url)
}

// Register component proper

function Register() {
  return hg.state({
    url: hg.value(null),
    channels: {
      setDate: Register.setDate
    }
  })
}

Register.setDate = function(state, url, date) {
  d3.text(url + '/image?date=' + date, (err, data) => {
    if (err) throw err
    state.url.set(data)
  })
}

Register.render = function(state) {
//  return ImageWidget(state.url)
  return ImageWidget(state.url)
}


export default Register