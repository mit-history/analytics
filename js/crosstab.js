/*
* Main CFRP application component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
*
*/


require('../css/crosstab.css')

const msgs = require("json!../i18n/query.json")

var i18n = require('./util/i18n')

var hg = require('mercury')
var h = require('mercury').h

var svg = require('virtual-hyperscript/svg')

var assign = require('object-assign')

var schema = require('../cfrp-schema')

function Crosstab() {
  return null
}

Crosstab.generateRowHeadersColumn = function (query_state, cube_data, lang) {
	var lResult  = [];

	var lAggKey = query_state.agg;
	var lRowKey = query_state.rows[0];

	// Generate header row
	var lDataSet = cube_data['1x0'];
	var lRows = [h('tr', h('th.cross-cell', { 'ev-click': hg.send(query_state.channels.interchangeAxis) }, 'X'))];
	for (var i in lDataSet) {
		if (lDataSet[i][lRowKey]) {
			var lData = lDataSet[i][lRowKey].toString();
			lRows.push(h('tr', h('th', {title: lData}, lData)));
		}
	}
	// Add sum row
	lRows.push(h('tr', h('th.sum-row', {title: msgs[lang][lAggKey]}, msgs[lang][lAggKey])));

	lResult.push(lRows);

	return lResult;
};


Crosstab.generateTableData = function (app_state, query_state, cube_data, lang) {
	var lResult  = [];

	var lAggKey = query_state.agg;
	var lRowKey = query_state.rows[0];
	var lColKey = query_state.cols[0];

	// Generate header row
	var lDataSet 		= cube_data['0x1'];
	var lTableCols 	= [];
	var lHeaderRow 	= [];
	var lColCount 	= 0;
	for (var i in lDataSet) {
		if (lDataSet[i][lColKey]) {
			lTableCols.push(h('col', {width: '100px'}));
			var lData = lDataSet[i][lColKey].toString();
			lHeaderRow.push(h('th',{title: lData}, lData));
			lColCount ++;
		}
	}
	if (lHeaderRow.length <= 0) {
		// Sometimes, no header is present because no X axis dimension was set
		lTableCols.push(h('col', {width: '100px'}));
		lHeaderRow.push(h('th', {title: msgs[lang][lAggKey]}, msgs[lang][lAggKey]));
	}
	lResult.push(lTableCols);
	lResult.push(h('tr.heading-row', {id: 'data-heading-row'}, lHeaderRow));

	// Calculate row count as the .lenght attribute seems to cause obscur error
	var lRowCount = 0;
	for (var i in cube_data['1x0']) {
		lRowCount++;
	}

	// Generate result rows
	var lColDataSet 	= cube_data['0x1'];
	var lRowDataSet 	= cube_data['1x0'];
	var lFullDataSet 	= cube_data['1x1'];

	for (var i in cube_data['1x0']) {
		var lRowCubeData = cube_data['1x0'][i];
		var lDataRow = [];

		for (var j in cube_data['0x1']) {
			var lColCubeData = cube_data['0x1'][j];

			if (lRowCubeData[lRowKey] && lColCubeData[lColKey]) {

				var lFullCubeData = lFullDataSet.filter(function(fullCubeData) {
					return fullCubeData[lRowKey] == lRowCubeData[lRowKey] && fullCubeData[lColKey] == lColCubeData[lColKey]
				});

				var lCellData = lFullCubeData.length > 0 ? lFullCubeData[0][lAggKey].toFixed(0).toString() : '';
				var lCellDataTitle = lRowCubeData[lRowKey].toString() + ', ' + lColCubeData[lColKey] + ' : ' + lCellData;

				var lClickEvntObject = {focus: {}};
				lClickEvntObject.focus[lRowKey] = lRowCubeData[lRowKey];
				lClickEvntObject.focus[lColKey] = lColCubeData[lColKey];

				var lClass= '';
				if (app_state.focus_cell[lRowKey] == lRowCubeData[lRowKey]
						&& app_state.focus_cell[lColKey] == lColCubeData[lColKey]) {
					lClass = ".selected";
				}

				lDataRow.push(h('td' + lClass, {
					title: lCellDataTitle,
					'ev-click': hg.send(app_state.channels.focus_cell, lClickEvntObject)
				}, lCellData));

			}
		}

		lResult.push(h('tr', lDataRow));
	}

	// Add row with all sums
	var lSumRow = [];
	for (var i in lColDataSet) {
		var lCellData = lColDataSet[i][lAggKey].toFixed(0).toString();
		var lCellDataTitle = lColDataSet[lColKey] + ' : ' + lCellData;

		lSumRow.push(h('td.sum-row', { title: lCellDataTitle, }, lCellData));
	}
	lResult.push(h('tr', lSumRow));

	return lResult;
};


Crosstab.generateSumColumn = function (query_state, cube_data, lang) {
	var lResult  = [];

	var lAggKey = query_state.agg;
	var lRowKey = query_state.rows[0];

	// Generate header row
	var lDataSet = cube_data['1x0'];
	var lRows = [h('tr', h('th', {title: msgs[lang][lAggKey]}, msgs[lang][lAggKey]))];
	for (var i in lDataSet) {
		if (lDataSet[i][lRowKey]) {
			var lData = lDataSet[i][lAggKey].toFixed(0).toString();
			lRows.push(h('tr', h('td', {title: lData}, lData)));
		}
	}

	// Add sum
	for (var i in cube_data['0x0']) {
		var lData = cube_data['0x0'][i][lAggKey].toFixed(0).toString();
		lRows.push(h('tr', h('td.sum-table', {title: lData}, lData)));
	}
	lResult.push(lRows);

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

	console.log(state.cube_data);

	var renderDimentionList = function (axis) {
		var lResult = [];

		for (var i in state.query[axis]) {
			var lAxisName = i18n.htmlize(msgs, state.query[axis][i], lang);
			var lPrefix = (axis == 'cols' ? 'y' : 'x') + (parseInt(i) + 1) + '. ';

			lResult.push(h('li', h('span.selected-dimension-bullet' + (i == 0 ? '.first-axis' : ''), [lPrefix, lAxisName])));
		}
		return lResult;
	}

	// Check if user selected anything yet

	if (state.query.agg.length > 0 || (state.query.rows.length > 0 || state.query.cols.length > 0)) {
		// Count data items to be displayed in center column
		var lColItems = 0;
		for (var i in state.cube_data['0x1']) {
			lColItems ++;
		}
		var lSizingClass = lColItems <= 1 ? '.half-column' : '';

		// Construct Table display
		var lTableDisplay = [];
		// Add Y Axis headers column
		lTableDisplay.push(h('div.row-headers-col' + lSizingClass, h('table', Crosstab.generateRowHeadersColumn(state.query, state.cube_data, lang))));
		// Add X axis and data columns
		if (lColItems > 1) {
			lTableDisplay.push(h('div.data-content', h('table', Crosstab.generateTableData(state, state.query, state.cube_data, lang))));
		}
		// Add results column
		lTableDisplay.push(h('div.sum-col' + lSizingClass, h('table', Crosstab.generateSumColumn(state.query, state.cube_data, lang))));

	  return h('div.content-container', [
	  	h('div.y-axis-dimensions-container', h('ul.axis-selected-dimensions', renderDimentionList('rows'))),

	  	h('div.x-axis-data-container', [
				h('div.x-axis-dimensions-container', h('ul.axis-selected-dimensions', renderDimentionList('cols'))),
				h('div.data-table-container', lTableDisplay),
	  	]),
	  ]);
	} else {
		return h('div.content-container');
	}


}

export default Crosstab