/*
* MDAT Modal component
*
* Copyright (c) 2015 MIT Hyperstudio
* Christopher York, 08/2015
*
*/

var hg = require('mercury')
var h = require('mercury').h

function Modal() {
  return hg.state({
    modal: hg.value(null),
    channels: {
      setModal: Modal.setModal
    }
  })
}

Modal.setModal = function(state, new_modal) {
  if(new_modal === state.modal()) {
    new_modal = null
  }
  state.modal.set(new_modal)
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