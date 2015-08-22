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

var extend = require('xtend');

var d3 = require('d3')

const format = d3.time.format("%Y-%m-%d");

// Register component proper

function Register() {
  return hg.state({
    url: hg.value(null),
    scale: hg.value(1.0),
    translate: hg.value([0,0]),
    channels: {
      setDate: Register.setDate,
      setScale: setScale,
      setTranslate: setTranslate
    }
  })
}

Register.setDate = function(state, url, date) {
  d3.text(url + "/image?date=" + date, (err, data) => {
    if (err) throw err
    state.url.set(data)
  })
}

function setScale(state, new_scale) {
  state.scale.set(new_scale)
}

function setTranslate(state, new_translate) {
  state.translate.set(new_translate)
}

// Pipe DOM-side event handling through D3 to a custom event

function ZoomHook(scale, translate) {
  this.scale = scale
  this.translate = translate
}

// pity to have to use a global... but mercury proxies the event, stripping all info
var zoom_stats = {}

ZoomHook.prototype.hook = function (elem, prop) {
  elem.setAttribute(prop, 'transform: scale(' + this.scale + '); transform-origin: 0px 0px')
  var zoom = d3.behavior.zoom()
    .scaleExtent([0, 1.0])
    .scale(this.scale)
    .translate(this.translate)
    .on('zoom', () => {
      // create a custom event wrapper to dispatch to the DOM element
      zoom_stats = { scale: zoom.scale(), translate: zoom.translate() }
      elem.dispatchEvent(new Event('zoom'))
    })
  d3.select(elem).call(zoom)
}

hg.Delegator().listenTo('zoom')


// Rendering for Register

Register.render = function(state) {

  var scaleEvent = hg.BaseEvent(handleScale)
  function handleScale(ev, broadcast) {
    broadcast(zoom_stats.scale)
  }

  return (
    h('img', { src: state.url,
               style: new ZoomHook(state.scale, state.translate),
               'ev-zoom': scaleEvent(state.channels.setScale)
             }, [])
  )
}


export default Register