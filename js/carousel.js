require('../css/carousel.css')

var hg = require('mercury')
var h = require('mercury').h

function Carousel() {
  return hg.state({
    active: hg.value(0),
    channels: {
      setSlide: Carousel.setSlide
    }
  })
}

Carousel.setSlide = function(state, value) {
  state.active.set(value)
}

Carousel.render = function(state, panes, children) {
  var cur_pane = panes[state.active]

  var parent_styles = {
    width: (100 * children.length) + '%',
    left: (100 * -cur_pane.start) + '%',
    transition: 'left 1s'
  }

  return h('div.carousel', [
           h('ul.navigation.dots', panes.map(dot)),
           h('div', arrows()),
           h('ul.panes', { style: parent_styles }, styled_children())
         ])

  function dot(pane, i) {
    return h('li.dot' + (i === state.active ? ".active" : ""), {
             'ev-click': hg.send(state.channels.setSlide, i)
           }, [
             h('a', { href: '#' }, [ pane.title || String(i) ])
           ])
  }

  function arrows() {
    var result = []
    if(state.active > 0) {
      result.push(h('div.step.previous', { 'ev-click': hg.send(state.channels.setSlide, state.active-1) }))
    }
    if(state.active < panes.length - 1) {
      result.push(h('div.step.next', { 'ev-click': hg.send(state.channels.setSlide, state.active+1) }))
    }
    return result
  }

  function styled_children() {
    return children.map( (c, i) => {
      var visible = cur_pane.start <= i && i < cur_pane.start + cur_pane.run
      var child_styles = {
        width: 100 / children.length / (visible ? cur_pane.run : 1) + '%',
        transition: 'width 1s'
      }
      return h('li.pane', { style: child_styles }, [ c ])
    })
  }
}

export default Carousel