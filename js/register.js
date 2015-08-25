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
* DOM based image viewer, with zoom and pan transforms vis CSS3
*
* Pipes events through d3's zoom behavior for cross-browser consistency.
*
* I decided to break with flex+react style unidirectional flow of data
* and store image scale & translation in a small widget because:
*
* (1) this gives better user experience during zoom (no jerkiness)
* (2) from the application's point of view, zoom state is transient
* (3) BUT scale & translate persist even when user chooses a new register page
* (4) AND feeding d3's zoom event back through mercury's dom-delegator is doable,
*         but complex; dom-delegator is really intended for DOM events
*/

function ImageWidget(url, start_scale) {
  this.url = url
  this.start_scale = start_scale || 1.0
}

ImageWidget.prototype.type = 'Widget'

ImageWidget.prototype.init = function() {
  // create container and image
  var register = document.createElement('div')
  register.className = 'register'

  var img = document.createElement('img')
  img.style['transform-origin'] = '0 0'
  register.appendChild(img)

  // prepare d3 zoom behavior
  var zoom = d3.behavior.zoom()
    .scale(this.start_scale)
    .on('zoom', zoomed)

  d3.select(register)
    .call(zoom)

  rescale([0,0], this.start_scale)

  return register

  function zoomed() {
    // only now are register dimensions set correctly
    var parentWidth = register.offsetWidth
    var parentHeight = register.offsetHeight
    var min_scale = Math.min(parentWidth / img.width, parentHeight / img.height)

    // get current position
    var s = Math.max(d3.event.scale, min_scale)
    var [tx, ty] = d3.event.translate

    // no dragging beyond bounds
    tx = Math.max(Math.min(tx, 0), parentWidth - img.width * s)
    ty = Math.max(Math.min(ty, 0), parentHeight - img.height * s)

    // center when possible
    tx = Math.min(tx, Math.max(0, (parentWidth - img.width * s) / 2.0))
    ty = Math.min(ty, Math.max(0, (parentHeight - img.height * s) / 2.0))

    // update zoom behavior and dom element
    zoom.scaleExtent([min_scale, 1.2])
      .scale(s)
      .translate([tx, ty])

    rescale([tx, ty], s)
  }

  function rescale(translate, scale) {
    img.style.transform = 'translate(' + translate.map( (r) => r + 'px').join(', ') + ') ' +
                          'scale(' + scale + ')'
  }
}

ImageWidget.prototype.update = function(prev, register) {
  var img = register.querySelector('img')
  img.src = this.url
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
  date = format(date)
  d3.text(url + '/image?date=' + date, (err, data) => {
    if (err) {
      data = null
      console.log(error)
    }
    state.url.set(data)
  })
}

Register.render = function(state) {
  return new ImageWidget(state.url, 0.4)
}


export default Register