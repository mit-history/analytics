var hg = require('mercury')
var h = require('mercury').h

function Query() {
  return null
}

Query.render = function(state) {
  return h('div.query', [ String("Current query: " + JSON.stringify(state)) ])
}

export default Query