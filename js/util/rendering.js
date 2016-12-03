const d3 = require('d3')

const vector_palette = ['#2379b4', '#f7941e', '#2ba048', '#d62930',
                        '#f8b6c0', '#006838', '#662d91', '#d7df23', '#ec008c', '#0c0c54',
                        '#a8e0f9', '#da1c5c', '#726658', '#603913', '#231f20', '#2b3990',
                        '#9fc59a', '#819cd1', '#92278f', '#00a79d', '#27aae1', '#f04b44']


function colors(domain) {
  return d3.scale.ordinal()
    .range(vector_palette)
    .domain(domain)
}

function lighten(color, amount) {
  let r = "0x" + color.substring(1,3);
  let g = "0x" + color.substring(3,5);
  let b = "0x" + color.substring(5);
  return "rgba(" +
    parseInt(r) + ", " +
    parseInt(g) + ", " +
    parseInt(b) + ", " +
    amount + ")";
}

export {vector_palette, colors, lighten};
