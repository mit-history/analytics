/*
* MDAT Modal Component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
* David Talbot, Laval University, 07/2016
*
*/

var hg = require('mercury')
var h = require('mercury').h

function Modal(initial_query) {
  return hg.state({
    modal: hg.value(null),

    // Query ui elements states
		queryPanelOpen: hg.value(true),
		aggregateDropdownOpen: hg.value(false),
		xAxisDropdownOpen: hg.value(false),
		yAxisDropdownOpen: hg.value(false),    
		axisDimensionDropdown: hg.value(null),
		selectAll: hg.varhash({}),
    filter_selection: hg.varhash(initial_query.filter),

    channels: {
      setModal: Modal.setModal,

      // Queri ui elements channels
      setPanelOpen: Modal.setPanelOpen,
      setAggregateDropdownOpen: Modal.setAggregateDropdownOpen,
      setXAxisDropdownOpen: Modal.setXAxisDropdownOpen,
      setYAxisDropdownOpen: Modal.setYAxisDropdownOpen,
			setAxisDimensionDropdown: Modal.setAxisDimensionDropdown,
			toggleAllFilterValues: Modal.toggleAllFilterValues,
      toggleFilterValue: Modal.toggleFilterValue,
      resetSelectedFilterValue: Modal.resetSelectedFilterValue,
    }
  })
}

Modal.setModal = function(state, new_modal) {
  if(new_modal === state.modal()) {
    new_modal = null
  }
  state.modal.set(new_modal)
}

Modal.setPanelOpen = function(state) {
  state.queryPanelOpen.set(!state.queryPanelOpen());
}

Modal.setAggregateDropdownOpen = function(state) {
  state.aggregateDropdownOpen.set(!state.aggregateDropdownOpen())
}

Modal.setXAxisDropdownOpen = function(state, axis) {
  state.xAxisDropdownOpen.set(!state.xAxisDropdownOpen())
  state.yAxisDropdownOpen.set(false)
}

Modal.setYAxisDropdownOpen = function(state, axis) {
  state.yAxisDropdownOpen.set(!state.yAxisDropdownOpen())
  state.xAxisDropdownOpen.set(false)
}

Modal.setAxisDimensionDropdown = function (state, dimension_name) {
	if (state.axisDimensionDropdown() == dimension_name) {
		state.axisDimensionDropdown.set(null)
	} else {
		state.axisDimensionDropdown.set(dimension_name)
	}
}

Modal.toggleAllFilterValues = function(modal, dim) {
  if (!modal.selectAll[dim]) {
    modal.selectAll.put(dim, true);
    modal.filter_selection.put(dim, []);
  } else {
    modal.selectAll.put(dim, false);
    modal.filter_selection.put(dim, null);
  }
}

Modal.toggleFilterValue = function(modal, data) {
  var { dim, value } = data
  var sv = modal.filter_selection()[dim] || []
  var start_count = sv.length

  var j = sv.indexOf(value)

  if (j > -1) { sv.splice(j, 1) }
  else { sv.push(value) }
  sv.sort()

  modal.filter_selection.put(dim, sv)
  modal.selectAll.put(dim, false);
}

Modal.resetSelectedFilterValue = function (modal, data) {
  modal.filter_selection.put(data.dim, null)
}

Modal.render = function(state, modal_key, label, children) {
  return (
    h('div.dropdown', [
      h('button', { 'ev-click': hg.send(state.channels.setModal, modal_key) }, [ label ]),
      (state.modal === modal_key) ? children : null
    ])
  )
}

export default Modal
