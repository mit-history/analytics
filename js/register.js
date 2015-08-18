var hg = require('mercury')
var h = require('mercury').h

var d3 = require('d3')

const format = d3.time.format("%Y-%m-%d");

function Register() {
  return hg.state({
    url: hg.value(null),
    channels: {
      setDate: Register.setDate
    }
  })
}

Register.setDate = (state, url, date) => {
  d3.text(url + "/image?date=" + date, (err, data) => {
    if (err) throw err
    state.url.set(data)
  })
}

Register.render = function(state) {
  return h('div.register', [ String(state.url) ])
}

export default Register