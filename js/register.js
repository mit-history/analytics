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

var d3 = require('d3')

const format = d3.time.format("%Y-%m-%d");

/*
* Canvas-backed image viewer, with internal zoom and pan via d3
*
*/

function ImageWidget(url) {
  if (!(this instanceof ImageWidget)) {
    return new ImageWidget(url)
  }
  this.url = url
}

ImageWidget.prototype.type = 'Widget'

ImageWidget.prototype.draw = function(canvas) {
  var context = canvas.getContext('2d')
  var scale = this.zoom.scale()
  var [ trans_x, trans_y ] = this.zoom.translate()

  context.save()
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.translate(trans_x, trans_y)
  context.scale(scale, scale)
  context.drawImage(this.image, 0, 0, this.image.width, this.image.height,
                                0, 0, this.image.width, this.image.height)
  context.translate(-trans_x, -trans_y)
  context.restore()
}

ImageWidget.prototype.loadIndicator = function(canvas) {
  var context = canvas.getContext('2d')
  context.save()
  context.fillStyle = 'rgba(255,255,255,0.2)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.restore()
}

ImageWidget.prototype.init = function() {
  var canvas = document.createElement('canvas')

  canvas.style.width = "100%"
  canvas.style.width = "100%"
  console.log("created widget, with url " + JSON.stringify(this.url))

  this.image = new Image()

  if (this.url) {
    this.image.onload = () => { this.draw(canvas) }
    this.image.src = this.url
  }

  return canvas
}

ImageWidget.prototype.update = function(prev, canvas) {
  this.image = this.image || prev.image
  this.zoom = this.zoom || prev.zoom ||
    d3.behavior.zoom()
      .on('zoom', () => this.draw(canvas) )

  if(this.url !== prev.url) {
    if (prev.url) { this.loadIndicator(canvas) }
    // must redeclare onload to capture new value of "this"
    this.image.onload = () => { this.draw(canvas) }
    this.image.src = this.url

    d3.select(canvas).call(this.zoom)
  }
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
  d3.text(url + "/image?date=" + date, (err, data) => {
    if (err) throw err
    state.url.set(data)
  })
}

Register.render = function(state) {
  return (
    h('div.register', [ ImageWidget(state.url) ])
  )
}


export default Register