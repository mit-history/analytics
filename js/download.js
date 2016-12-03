/*
* MDAT Download Component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
*
*/

require('../css/download.css')

const msgs = require("json!../i18n/app.json")

var hg = require('mercury')
var h = require('mercury').h
const saveAs = require("./third-party/save-svg-as-png/saveSvgAsPng");
const Chart = require('./chart')
const jsPDF = require("./third-party/jsPDF/jspdf.debug");
const datapoint = require('./util/datapoint')

const vdom = require('virtual-dom')

const svg_size = [1250, 515]

function Download(url) {
  return hg.state({
    open: hg.value(false),
    svg: hg.value(""),
    jpeg: hg.value(""),
    pdf: hg.value(""),
    url: url,
    channels: {
      toggleOpen: Download.toggleOpen
    }
  })
}

Download.toggleOpen = function(state, data) {
  let isOpen = state.open()
  state.open.set(!isOpen)
  if(!isOpen) {
    let svg_elem = vdom.create(data)
    let svg_xml = '<?xml version="1.0" standalone="no"?>\n' +
          '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="' + svg_size[0] +'" height="' + svg_size[1] + '">\n' +
          svg_elem.innerHTML +
          '</svg>'
    state.svg.set("data:image/svg+xml;base64," + encodeURIComponent(window.btoa(svg_xml)))
    saveAs.svgAsPngUri(svg_elem, {
        encoderType: "image/jpeg",
        backgroundColor: "white",
        width: svg_size[0],
        height: svg_size[1]
      }, function(uri) {
        state.jpeg.set(uri);
        let document = new jsPDF("landscape");
        document.addImage(uri, "JPEG", 10, 40, 280, 160);
        state.pdf.set(document.output("datauristring"))
    });
  }
}

Download.render = function(state, lang) {
  var api = datapoint(state.download.url)
  var all_dims = ([]).concat(state.query.rows).concat(state.query.cols)
  var download_url = api.url(all_dims, state.query.agg, state.query.filter)

  return h('div.download-container' + (state.download.open ? '.open' : '.closed'), [
    h('button.openClose', { 'ev-click': hg.send(state.download.channels.toggleOpen,
      Chart.render(state.chart, state, state.query, state.cube_data, svg_size, true, lang)) }),
    h('div.message', msgs[lang]['download']),
    h('div.formats', [
      h('a.format', { download: 'cfrp-table.csv', href: download_url }, 'CSV'),
      h('a.format', { download: 'cfrp-chart.svg', href: state.download.svg }, 'SVG'),
      h('a.format', { download: 'cfrp-chart.jpg', href: state.download.jpeg }, 'JPG'),
      h('a.format', { download: 'cfrp-chart.pdf', href: state.download.pdf }, 'PDF')
    ])
  ])
}

export default Download
