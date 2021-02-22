let cellSize = 100;
let pinHeight = cellSize / 2;

class Block_Render {
  constructor(block) {
    this.block = block;

    this.size = { w: 0, h: 0 };

    this.svg = null;
    this.svgBody = null;
    this.svgLabel = null;
    this.svgPins = [];

    this.Update();
  }

  SetSize(w, h) {
    this.size.h = h;
    this.size.w = w;
    this.svgBody.size(this.size.w, this.size.h);
  }

  Update() {
    this.svg = new SVG.G();

    this.svgBody = this.svg.radius(10).fill('#e5e7e6ff').stroke({ color: '#5e3843ff', width: 2 });

    let maxHeight = Math.max(this.block.pin.plates.length, this.block.pin.grids.length);
    this.SetSize(cellSize, maxHeight * pinHeight);

    return this.svg;
  }
}

Block.Render = Block_Render;

class WLBlock_Workspace {
  constructor(svg, block) {
    this.block = block;
    this.svg = svg;
  }



}

WLBlock.Workspace = WLBlock_Workspace;