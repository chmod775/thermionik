let cellSize = 98;
let wireSize = 24;
let pinHeight = cellSize / 2;

let labelPadding = 5;

class Block_Render {
  constructor(block) {
    this.block = block;

    this.size = { w: 0, h: 0 };

    this.svg = null;
    this.svgBody = null;
    this.svgLabel = null;
    this.svgSeparator = null;
    this.svgPins = [];

    this.Render();
  }

  SetSize(w, h) {
    this.size.h = h;
    this.size.w = w;
    this.svgBody.size(this.size.w, this.size.h);

    let labelHeight = this.svgLabel.bbox().h;

    this.svgLabel.cx(this.size.w / 2).y(labelPadding);

    let separatorY = Math.floor(labelHeight + (labelPadding * 2));
    this.svgSeparator.plot(0, separatorY, this.size.w, separatorY);
  }

  Render() {
    this.svg = new SVG.G();

    // Create body
    this.svgBody = this.svg.rect(0, 0).radius(10).fill('#e5e7e6ff').stroke({ color: '#5e3843ff', width: 2 });

    // Create label
    this.svgLabel = this.svg.text(this.block.name).fill('#5e3843ff');//.font({ size: 10, anchor: 'middle' });

    // Create separator
    this.svgSeparator = this.svg.line().stroke({ color: '#5e3843ff', width: 2 });

    // Resize
    let maxHeight = Math.max(this.block.pin.plates.length, this.block.pin.grids.length) * pinHeight;
    let modHeight = Math.ceil(maxHeight / cellSize) * cellSize;

    let maxWidth = this.svgLabel.bbox().w - (labelPadding * 2);
    let modWidth = Math.ceil(maxWidth / cellSize) * cellSize;

    this.SetSize(modWidth, modHeight);

    return this.svg;
  }
}

Block.Render = Block_Render;

class WLBlock_Workspace {
  constructor(svg, block) {
    this.block = block;
    this.svg = svg;

    // Render wiring

    // Render blocks
    this.firstBlockPos = { x: 0, y: 0 };
    this.svgTubes = new SVG.G();
    this.svg.add(this.svgTubes);
    this.RenderTubes();

    // Create grid and add to root svg
    this.svgGrid = new SVG.G();
    this.svg.add(this.svgGrid);
    this.grid = {
      blocks: { w: 5, h: 5 },
      wiresCount: { cols: {}, rows: {} }
    };
    this.RenderGrid();
  }

  RenderPlugs() {

  }

  RenderBlocks() {

  }

  RenderTubes() {
    this.svgTubes.clear();


    var bx = 0;
    var by = 0;

    let startx = 172;
    let starty = 172;

    for (var b of this.block.blocks) {
      let renderedBlock = new Block.Render(b);
      let renderedBlockSVG = renderedBlock.Render();

      renderedBlockSVG.move(startx + (bx * cellSize), starty);

      this.svgTubes.add(renderedBlockSVG);
      bx++;
    }


    console.log(this.block.blocks);
    console.log(this.block.plugs);
  }

  RenderGrid() {
    this.svgGrid.clear();

    let startx = 100;
    let starty = 100;

    var topWiresCount, leftWiresCount;

    var by = starty;
    for (var y = 0; y < this.grid.blocks.h; y++) {
      topWiresCount = Math.max(3, this.grid.wiresCount.rows[y] || 0);
      let padTop = topWiresCount * wireSize;

      for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
        let wy = (wIdx * wireSize) + (wireSize / 2) + by;
        this.svgGrid.line(0, wy, '100%', wy).stroke({ color: '#50464964', width: 1 });
      }

      by += padTop;

      var bx = startx;
      for (var x = 0; x < this.grid.blocks.w; x++) {
        leftWiresCount = Math.max(3, this.grid.wiresCount.cols[x] || 0);
        let padLeft = leftWiresCount * wireSize;

        if (y == 0) {
          for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
            let wx = (wIdx * wireSize) + (wireSize / 2) + bx;
            this.svgGrid.line(wx, 0, wx, '100%').stroke({ color: '#50464964', width: 1 });
          }
        }

        bx += padLeft;
        let gridSvg = this.svgGrid.rect(cellSize, cellSize).move(bx, by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
        bx += cellSize;
      }

      by += cellSize;
    }

    for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
      let wy = (wIdx * wireSize) + (wireSize / 2) + by;
      this.svgGrid.line(0, wy, '100%', wy).stroke({ color: '#50464964', width: 1 });
    }

    for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
      let wx = (wIdx * wireSize) + (wireSize / 2) + bx;
      this.svgGrid.line(wx, 0, wx, '100%').stroke({ color: '#50464964', width: 1 });
    }
  }

  

}

WLBlock.Workspace = WLBlock_Workspace;





/* ##### Wiring brain ##### */
class WireSegment {
  constructor(start, end, orientation) {
    this.start = start;
    this.end = end;
    this.orientation = orientation;
  }
}

class WireStrip { // Contains multiple wire segments
  constructor() {
    this.segments = [];
  }
}

class ColConduit { // Contains multiple wire strips
  constructor() {
    this.strips = [
      new WireStrip(),
      new WireStrip(),
      new WireStrip()
    ]
  }
}

class RowConduit {
  constructor() {
    this.strips = [
      new WireStrip(),
      new WireStrip(),
      new WireStrip()
    ]
  }
}

let colConduits = [
  new ColConduit(),
  new ColConduit(),
  new ColConduit(),
  new ColConduit(),
  new ColConduit(),
  new ColConduit()
];

let rowConduits = [
  new RowConduit(),
  new RowConduit(),
  new RowConduit(),
  new RowConduit(),
  new RowConduit(),
  new RowConduit()
];

class myBlockWire {
  constructor() {
    this.segments = [];
  }
}

class myBlock {
  constructor(leftConduit, rightConduit, topConduit, bottomConduit) {
    this.leftConduit = leftConduit;
    this.rightConduit = rightConduit;
    this.topConduit = topConduit;
    this.bottomConduit = bottomConduit;
  }
}

let gridBlocks = [];
let gridBlock_size = 5;

for (var ty = 0; ty < gridBlock_size; ty++) {
  let rowBlocks = [];
  for (var tx = 0; tx < gridBlock_size; tx++) {
    let mb = new myBlock(colConduits[tx], colConduits[tx+1], rowConduits[ty], rowConduits[ty+1]);
    rowBlocks.push(mb);
  }
  gridBlocks.push(rowBlocks);
}

let fBlock = gridBlocks[0][0];
let tBlock = gridBlocks[2][3];

function ConnectBlock(fromBlock, toBlock) {
  let leftConduit = fromBlock.rightConduit;
  let rightConduit = toBlock.leftConduit;
  let transitConduit = toBlock.topConduit;


}