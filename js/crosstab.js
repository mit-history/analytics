/*
* Main CFRP application component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/


require('../css/crosstab.css')

var hg = require('mercury')
var h = require('mercury').h

var svg = require('virtual-hyperscript/svg')

var assign = require('object-assign')

var schema = require('../cfrp-schema')

function Crosstab() {
  return null
}

Crosstab.generateTable = function (query_state, cube_data, lang) {
	var lResult  = [];
	
	console.log(cube_data);
	
	for (var i in cube_data['1x0']) {
		var lData = cube_data['1x0'][i];
		lResult.push(h('div', lData['decade'] + ''));
		console.log(lData['decade']);
	}
	
	console.log(lResult);
	
	return lResult;
};

Crosstab.render = function(state, lang) {

  var sendFocus = hg.BaseEvent(function(ev, broadcast) {

    // ... not if clear if this is a hack or not
    //     c.f. https://github.com/Raynos/mercury/issues/36
    var data = ev.target.__data__

    var cell = Object.create({})
    for(var k in data) {
      if(k !== state.query.agg) { cell[k] = data[k] }
    }

    broadcast(assign(this.data, { focus: cell }))
  })

  return (
    h('div.crosstab-container.columns', {
      'ev-click' : sendFocus(state.channels.focus_cell),
    }, [
      Crosstab.generateTable(state.query, state.cube_data, lang)
    ])
		
		
		//new GraphWidget(state.query, state.cube_data, state.focus_cell, 'fr')
  )

}

export default Crosstab