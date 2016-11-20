function Tooltip() {

}

Tooltip.prototype.hook = function(element) {
  setImmediate(function() {
    let tooltip = $(element);
    tooltip.attr("data-tooltip", "");
    if(tooltip.attr("data-toggle")) {
      if(tooltip.attr("title")) {
        $("#" + tooltip.attr("data-toggle")).text(tooltip.attr("title"));
        tooltip.attr("title", "");
      }
    } else {
      tooltip.foundation();
    }
  });
}

export {Tooltip};
