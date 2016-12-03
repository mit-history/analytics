/*
* MDAT Crosstab Component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 06/2015
* David Talbot, Laval University, 04/2016
*
*/


require('../css/crosstab.css')

const hints = require("json!../i18n/app.json");
const msgs = require("json!../i18n/query.json")
const i18n = require('./util/i18n')
const rendering = require('./util/rendering')
const foundation = require('./util/foundation-utils');
const schema = require('../cfrp-schema')
const hint_suffix = "_hint";

var hg = require('mercury')
var h = require('mercury').h
var svg = require('virtual-hyperscript/svg')
var assign = require('object-assign')

function Crosstab() {
  return null
}

function getSelectionHint(app_state, query_state, cube_data, lang) {
  let rowKey = query_state.rows[0];
	let colKey = query_state.cols[0];
  let aggKey = query_state.agg;
  let hint = "";

  if (cube_data
    && cube_data['0x1']
    && cube_data['1x0']
    && cube_data['1x1']
    && app_state.focus_cell[rowKey]
    &&	app_state.focus_cell[colKey]) {
    let aggData = cube_data['1x1'].find((entry) =>
      entry[colKey] === app_state.focus_cell[colKey] &&
      entry[rowKey] === app_state.focus_cell[rowKey]);
    hint = hints[lang][aggKey];
    hint = hint.replace(/\{agg}/, schema.format(lang, aggKey)(aggData[aggKey]));
    let cols = [], rows = [];
    query_state.cols.forEach(function(key) {
      let colData = cube_data['0x1']
        .find((column) => column[colKey] === app_state.focus_cell[colKey]);
      if(colData) {
        cols.push(msgs[lang][key + hint_suffix].replace(new RegExp("\\{" + key + "}"),
          schema.format(lang, colKey)(colData[colKey])))
      }
    });
    query_state.rows.forEach(function(key) {
      let rowData = cube_data['1x0']
        .find((row) => row[rowKey] === app_state.focus_cell[rowKey])
      if(rowData) {
        console.log("Hint for: " + key);
        rows.push(msgs[lang][key + hint_suffix]
          .replace(new RegExp("\\{" + key + "}"),
            schema.format(lang, rowKey)(rowData[rowKey])));
      }
    });
    // TODO, better phrasing when more than one filter on an axis
    // hint = hint.replace(/\{cols}/, (cols.length > 1 ? cols.join(", ") : cols[0]));
    //hint = hint.replace(/\{rows}/, (rows.length > 1 ? rows.join(", ") : rows[0]));
    hint = hint.replace(/\{cols}/, cols[0]);
    hint = hint.replace(/\{rows}/, rows[0]);
  }

  return hint;
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
			var lData = schema.format(lang, lRowKey)(lDataSet[i][lRowKey]);
			lRows.push(h('tr', h('th', h('span.has-tip', {
        "ev-tooltip-create": new foundation.Tooltip(),
        title: lData
      }, lData))));
		}
	}
	// Add sum row
	lRows.push(h('tr', h('th.sum-row', h('span.has-tip', {
    "ev-tooltip-create": new foundation.Tooltip(),
    title: msgs[lang][lAggKey]
  }, msgs[lang][lAggKey]))));

	lResult.push(lRows);

	return lResult;
};


Crosstab.generateTableData = function (app_state, query_state, cube_data, lang) {
	var lResult  = [];

	var lAggKey = query_state.agg;
	var lRowKey = query_state.rows[0];
	var lColKey = query_state.cols[0];
  var formatter = schema.format(lang, lColKey);

	// Generate header row
	var lDataSet 		= cube_data['0x1'];
	var lTableCols 	= [];
	var lHeaderRow 	= [];
  let columns     = [];
  for (var i in lDataSet) {
		if (lDataSet[i][lColKey]) {
      columns.push(formatter(lDataSet[i][lColKey]));
		}
	}
  let color = rendering.colors(columns);
  columns.forEach(function(lData) {
    let cellColor;
    if (app_state.focus_cell[lColKey] == lData) {
      cellColor = rendering.lighten(color(lData), 0.2);
    }
    lTableCols.push(h('col', {width: '100px'}));
    lHeaderRow.push(h('th', {
        style: {'background-color': cellColor}
      }, h('span.has-tip', {
          "ev-tooltip-create": new foundation.Tooltip(),
          title: lData
        }, lData)
      ));
  });

	if (lHeaderRow.length <= 0) {
		// Sometimes, no header is present because no X axis dimension was set
		lTableCols.push(h('col', {width: '100px'}));
		lHeaderRow.push(h('th', h('span.has-tip', {
      "ev-tooltip-create": new foundation.Tooltip(),
      title: msgs[lang][lAggKey]
    }, msgs[lang][lAggKey])));
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

				var lCellData = lFullCubeData.length > 0 ? schema.format(lang, lAggKey)(lFullCubeData[0][lAggKey]) : '';
				var lCellDataTitle = lRowCubeData[lRowKey].toString() + ' / '+ lColCubeData[lColKey] + ' : ' + (lCellData ? lCellData : '-');

				var lClickEvntObject = {focus: {}};
				lClickEvntObject.focus[lRowKey] = lRowCubeData[lRowKey];
				lClickEvntObject.focus[lColKey] = lColCubeData[lColKey];
        lClickEvntObject.focus.agg = lCellData;

				let cellColor;

				if (app_state.focus_cell[lRowKey] == lRowCubeData[lRowKey]
					&&	app_state.focus_cell[lColKey] == lColCubeData[lColKey]) {
					cellColor = rendering.lighten(color(lColCubeData[lColKey]), 0.6);
				} else if (app_state.focus_cell[lColKey] == lColCubeData[lColKey]) {
					cellColor = rendering.lighten(color(lColCubeData[lColKey]), 0.2);
				}

        lDataRow.push(h('td', {
          style: {'background-color': cellColor},
					'ev-click': hg.send(app_state.channels.focus_cell, lClickEvntObject)
				}, h('span.has-tip', {
          "ev-tooltip-create": new foundation.Tooltip(),
          title: lCellDataTitle
        }, lCellData)));

			}
		}

		lResult.push(h('tr', lDataRow));
	}

	// Add row with all sums
	var lSumRow = [];
	for (var i in lColDataSet) {
    let lCellData = "";
    let lCellDataTitle = "";
    if(!isNaN(lColDataSet[i][lAggKey].toFixed(0))) {
      lCellData = schema.format(lang, lAggKey)(lColDataSet[i][lAggKey]);
      lCellDataTitle = lColDataSet[i][lColKey] + ' : ' + lCellData;
    }

		lSumRow.push(h('td.sum-row', h('span.has-tip', {
      "ev-tooltip-create": new foundation.Tooltip(),
      title: lCellDataTitle
    }, lCellData)));
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
	var lRows = [h('tr', h('th', h('span.has-tip', {
    "ev-tooltip-create": new foundation.Tooltip(),
    title: msgs[lang][lAggKey]
  }, msgs[lang][lAggKey])))];
	for (var i in lDataSet) {
		if (lDataSet[i][lRowKey]) {
      let lData = "";
      let lDataTitle = lDataSet[i][lRowKey] + " : ";
      if(!isNaN(lDataSet[i][lAggKey])) {
        lData = schema.format(lang, lAggKey)(lDataSet[i][lAggKey]);
        lDataTitle = lDataTitle + lData;
      } else {
        lDataTitle = lDataTitle + " -";
      }
      lRows.push(h('tr', h('td', h('span.has-tip', {
        "ev-tooltip-create": new foundation.Tooltip(),
        title: lDataTitle
      }, lData))));
		}
	}

	// Add sum
	for (var i in cube_data['0x0']) {
    let lData = "0";
    let lDataTitle = msgs[lang][lAggKey] + " : ";
    if(!isNaN(cube_data['0x0'][i][lAggKey].toFixed(0))) {
      lData = schema.format(lang, lAggKey)(cube_data['0x0'][i][lAggKey]);
    }
    lDataTitle = lDataTitle + lData;
		lRows.push(h('tr', h('td.sum-table', h('span.has-tip', {
      "ev-tooltip-create": new foundation.Tooltip(),
      title: lDataTitle
    }, lData))));
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
	  	// h('div.y-axis-dimensions-container', h('ul.axis-selected-dimensions', renderDimentionList('rows'))),

	  	h('div.x-axis-data-container', [
				// h('div.x-axis-dimensions-container', h('ul.axis-selected-dimensions', renderDimentionList('cols'))),
				h('div.data-table-container', lTableDisplay),
        h('div.hint', h('p', getSelectionHint(state, state.query, state.cube_data, lang)))
	  	]),
	  ]);
	} else {
		return h('div.content-container');
	}


}

export default Crosstab
