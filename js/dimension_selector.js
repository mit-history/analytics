/*
* MDAT Query manipulation component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 04/2015
*
*/


require('../css/query.css')

const msgs = require('json!../i18n/query.json')

var hg = require('mercury')
var h = require('mercury').h

var assign = require('object-assign')

var schema = require('../cfrp-schema')

var i18n = require('./i18n')


function DimensionSelector() {
  return null
}

DimensionSelector.render = function(lang) {

    var stem_lis = (dims) => {
      var lis = dims.map( (dim) => {
        return (
          h('li.dimension', { 'ev-click' : () => alert('add dimension ' + dim) }, [
            i18n.htmlize(msgs, dim, lang)
          ])
        )
      })
      return lis
    }

    var dim_lis = (dims) => {
      var bins = Object.create({})
      dims.forEach( (dim) => {
        var match = /^([^_]+)/.exec(dim),
            stem = match ? match[1] : dim
        bins[stem] = bins[stem] || []
        bins[stem].push(dim)
      })

      var stems = Object.keys(bins)
      var all_lis = stems.map( (stem) => {
        return h('ul.subscripts', stem_lis(bins[stem]))
      })
      return all_lis
    }

    var group_lis = (groups) => {
      var names = Object.keys(groups)
      return names.map( (name) => {
        return (
          h('li.group', [
            h('div.dimensionGroupLabel', i18n.htmlize(msgs, name, lang)),
            h('ul.dimensionGroup.' + name, dim_lis(groups[name]) )
          ])
        )
      })
    }

  return (
    h('ul.dimensionSelector.panel', group_lis(schema.group()))
  )
}

export default DimensionSelector