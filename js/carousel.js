var hg = require('mercury')
var h = require('mercury').h

function Carousel() {
  return hg.state({
    slide: hg.value(0),
    channels: {
      slide: Carousel.setCarousel
    }
  })
}

Carousel.setCarousel = function(state, value) {
  state.slide.set(value)
}

Carousel.render = function(state) {
   return h('div.carousel', [
            h('div.current', [ String("Current carousel slide: " + state.slide) ]),
            page(state.slide > 0 ? state.slide - 1 : 2, '<'),
            page(0),
            page(1),
            page(2),
            page((state.slide + 1) % 3, '>')
          ])
  function page(num, label) {
    return h('input.button', {
      type: 'button',
      value: label || num,
      'ev-click': hg.send(state.channels.slide, num)
    })
  }
}

export default Carousel