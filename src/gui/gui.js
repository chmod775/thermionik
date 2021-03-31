let cellSize = 98;
let wireSize = 24;
let pinHeight = cellSize / 2;

let labelPadding = 5;

// Pixel: { x, y, w, h }
// Cell:  { c, r, cols, rows }

class Pin_Render {
  constructor(pin) {
    this.pin = pin;

    this.svg = null;
    this.svgPin = null;
    this.svgLabel = null;

    this.Create();
  }

  Create() {
    this.svg = new SVG.G();

    if (this.pin.isPlate) {
      // Create pin
      this.svgPin = this.svg.circle(12).fill('white').stroke({ color: '#5e3843ff', width: 2 }).move(-12, 0);
      // Create label
      this.svgLabel = this.svg.text(this.pin.name).fill('#5e3843ff').font({ size: 14, anchor: 'right' });
      this.svgLabel.move(-this.svgLabel.bbox().w - 15, 0);
    } else {
      // Create pin
      this.svgPin = this.svg.circle(12).fill('white').stroke({ color: '#5e3843ff', width: 2 });
      // Create label
      this.svgLabel = this.svg.text(this.pin.name).fill('#5e3843ff').font({ size: 14, anchor: 'left' }).move(15, 0);
    }

    return this.svg;
  }
}

class Block_Render {
  constructor(block) {
    this.block = block;

    this.span = { cols: 1, rows: 1 }; // Span dimensions (in cells)
    this.size = { w: 0, h: 0 }; // Pixel dimensions

    this.svg = null;
    this.svgBody = null;
    this.svgLabel = null;
    this.svgSeparator = null;

    this.pinRenders = {
      all: [],
      grids: [],
      plates: []
    };

    this.Create();
  }

  Resize(w, h) {
    if ((this.size.h == h) && (this.size.w == w)) return this.size; // Avoid useless svg resizing

    this.size.h = h;
    this.size.w = w;

    let labelHeight = this.svgLabel.bbox().h;

    this.svgLabel.move(this.size.w / 2, labelPadding);

    let separatorY = Math.floor(labelHeight + (labelPadding * 2));
    this.svgSeparator.plot(0, separatorY, this.size.w, separatorY);

    this.svgBody.size(this.size.w, this.size.h);

    for (var pIdx in this.pinRenders.grids) {
      let p = this.pinRenders.grids[pIdx];
      p.svg.move(-6, (pIdx * (pinHeight / 2)) + separatorY + (pinHeight / 4));
    }

    for (var pIdx in this.pinRenders.plates) {
      let p = this.pinRenders.plates[pIdx];
      p.svg.move(this.size.w + 6, (pIdx * (pinHeight / 2)) + separatorY + (pinHeight / 4));
    }

    return this.size;
  }

  Create() {
    this.svg = new SVG.G();

    // Create body
    this.svgBody = this.svg.rect(cellSize, cellSize).radius(10).fill('#e5e7e6ff').stroke({ color: '#5e3843ff', width: 2 });

    // Create label
    this.svgLabel = this.svg.text(this.block.name).fill('#5e3843ff').font({ size: 14, anchor: 'middle' });

    // Create separator
    this.svgSeparator = this.svg.line().stroke({ color: '#5e3843ff', width: 2 });

    // Create pins
    this.pinRenders = {
      all: [],
      grids: [],
      plates: []
    };
    for (var p of this.block.pin.grids) {
      let newPinRender = new Pin_Render(p);
      this.svg.add(newPinRender.svg);
      this.pinRenders.all.push(newPinRender);
      this.pinRenders.grids.push(newPinRender);
    }
    for (var p of this.block.pin.plates) {
      let newPinRender = new Pin_Render(p);
      this.svg.add(newPinRender.svg);
      this.pinRenders.all.push(newPinRender);
      this.pinRenders.plates.push(newPinRender);
    }

    // Calculate span dimensions
    this.CalculateSpan();

    return this.svg;
  }

  CalculateSpan() {
    let maxHeight = Math.max(this.block.pin.plates.length, this.block.pin.grids.length) * pinHeight;
    let modHeight = Math.ceil(maxHeight / cellSize);
    let maxWidth = this.svgLabel.bbox().w - (labelPadding * 2);
    let modWidth = Math.ceil(maxWidth / cellSize);

    this.span = {
      cols: modWidth,
      rows: modHeight
    };

    return this.span;
  }
}

Block.Render = Block_Render;

class WLBlock_Workspace {
  constructor(svg, block) {
    this.block = block;
    this.svg = svg;

    this.size = { w: 6, h: 10 };

    this.tableStructure = {
      cols: [], // { offset: 0, wireCells: [ { svg: null, offset: 0, size: 0 } ], wiringCell: 30, blockCell: 100 }
      rows: [],  // { offset: 0, wireCells: [ { svg: null, offset: 0, size: 0 } ], wiringCell: 30, blockCell: 100 }
      plugs: {
        grids: [],
        plates: []
      },
      blocks: [] // Matrix
    };

    this.map = {
      wiresCount: { cols: { 3: 7 }, rows: { 1: 5 } }
    };

    this.Generate();

    this.Render();
  }

  Generate() {
    // Create grid container and add to root svg
    this.svgGrid = new SVG.G();
    this.svg.add(this.svgGrid);

    // Create tube container and add to root svg
    this.svgTubes = new SVG.G();
    this.svg.add(this.svgTubes);

    // Create wires container and add to root svg
    this.svgWiring = new SVG.G();
    this.svg.add(this.svgWiring);
  }

  UpdateTableStructure() {
    let ts = this.tableStructure;

    // Generate rows
    var topWiresCount;
    var by = 0;
    for (var y = 0; y <= this.size.h; y++) {
      topWiresCount = Math.max(3, this.map.wiresCount.rows[y] || 0);
      let padTop = topWiresCount * wireSize;

      let rowInfo = {
        offset: by,
        wireCells: ts.rows[y] ? ts.rows[y].wireCells : [],
        wiringCell: padTop,
        blockCell: (y < this.size.h) ? cellSize : 0
      };

      for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
        let wy = (wIdx * wireSize) + (wireSize / 2);
        let wireCellInfo = rowInfo.wireCells[wIdx] ?? {
          offset: wy,
          size: wireSize
        };
        rowInfo.wireCells[wIdx] = wireCellInfo;
      }
      rowInfo.wireCells.length = topWiresCount; // Remove unused extra wire cells

      ts.rows[y] = rowInfo;

      by += rowInfo.wiringCell + rowInfo.blockCell;
    }

    // Generate cols
    var leftWiresCount;
    var bx = 0;
    for (var x = 0; x <= this.size.w; x++) {
      leftWiresCount = Math.max(3, this.map.wiresCount.cols[x] || 0);
      let padLeft = leftWiresCount * wireSize;

      let colInfo = {
        offset: bx,
        wireCells: ts.cols[x] ? ts.cols[x].wireCells : [],
        wiringCell: padLeft,
        blockCell: (x < this.size.w) ? cellSize : 0
      };

      for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
        let wx = (wIdx * wireSize) + (wireSize / 2);
        let wireCellInfo = colInfo.wireCells[wIdx] ?? {
          offset: wx,
          size: wireSize
        };
        colInfo.wireCells[wIdx] = wireCellInfo;
      }
      colInfo.wireCells.length = leftWiresCount; // Remove unused extra wire cells

      ts.cols[x] = colInfo;

      bx += colInfo.wiringCell + colInfo.blockCell;
    }

    return ts;
  }

  CalculateBlockBox(pos, blockSpan) {
    let ret = { x: 0, y: 0, w: 0, h: 0 };
    let ts = this.tableStructure;

    // X - Width
    ret.x = ts.cols[pos.c].offset + ts.cols[pos.c].wiringCell;
    let fx = ts.cols[pos.c + blockSpan.cols].offset;
    ret.w = fx - ret.x;

    // Y - Height
    ret.y = ts.rows[pos.r].offset + ts.rows[pos.r].wiringCell;
    let fy = ts.rows[pos.r + blockSpan.rows].offset;
    ret.h = fy - ret.y;

    return ret;
  }

  CalculatePinPos(pin) {
    let ret = { x: 0, y: 0 };

    let parentBlock = pin.block;
    var parentRender = null;
    if (parentBlock.IsValidPlug()) {
      if (parentBlock.IsPlatePlug()) {
        parentRender = this.tableStructure.plugs.plates[parentBlock.properties.row - 1];
      } else {
        parentRender = this.tableStructure.plugs.grids[parentBlock.properties.row - 1];
      }
    } else {
      parentRender = this.tableStructure.blocks[parentBlock.properties.col - 1][parentBlock.properties.row - 1];
    }

    if (!parentRender) { console.error("Parent render not found."); }

    let pinRender = parentRender.pinRenders.all.find(p => p.pin.name.toLowerCase() == pin.name.toLowerCase());

    ret.x = pinRender.svgPin.cx() + pinRender.svg.x() + parentRender.svg.x();
    ret.y = pinRender.svgPin.cy() + pinRender.svg.y() + parentRender.svg.y();

    return ret;
  }

  RenderWiring() {
    let ts = this.tableStructure;
    this.svgWiring.clear();

    let startx = 500;
    let starty = 500;
    
    for (var w of this.block.wires) {
      let platePin = w.platePin;

      if (platePin) { // Wire does have a plate, all wire must start from plate and end to grid
        let platePinPos = this.CalculatePinPos(platePin);

        for (var gridPin of w.gridPins) {
          let gridPinPos = this.CalculatePinPos(gridPin);  
          this.svgWiring.line(platePinPos.x, platePinPos.y, gridPinPos.x, gridPinPos.y).stroke({ color: 'black', width: 3, linecap: 'round'  });
        }
      } else { // Wire does not have a plate, connect grids together
        let firstGridPos = this.CalculatePinPos(w.gridPins[0]);
        for (var gIdx = 1; gIdx < w.gridPins.length; gIdx++) {
          let gridPin = w.gridPins[gIdx];
          let gridPinPos = this.CalculatePinPos(gridPin);  
          this.svgWiring.line(firstGridPos.x, firstGridPos.y, gridPinPos.x, gridPinPos.y).stroke({ color: 'black', width: 3, linecap: 'round'  });
        }
      }
    }

  }

  RenderGrid() {
    let ts = this.tableStructure;

    this.svgGrid.clear();

    let startx = 500;
    let starty = 500;

    // Draw grid
    for (var r = 0; r <= this.size.h; r++) {
      let tsr = ts.rows[r];
      for (var wCell of tsr.wireCells) {
        let wy = tsr.offset + wCell.offset + starty;
        let svg = wCell.svg ?? this.svgGrid.line().stroke({ color: '#50464964', width: 1 });
        svg.plot(0, wy, '100%', wy);
      }
    }

    for (var c = 0; c <= this.size.w; c++) {
      let tsc = ts.cols[c];
      for (var wCell of tsc.wireCells) {
        let wx = tsc.offset + wCell.offset + startx;
        let svg = wCell.svg ?? this.svgGrid.line().stroke({ color: '#50464964', width: 1 });
        svg.plot(wx, 0, wx, '100%');
      }
    }

    // Draw plugs
    // Grids
    var pGridRow = 0;
    let gridx = startx + ts.cols[0].offset;
    for (var p of this.block.plug.grids) {
      pGridRow = p.properties.row = Math.max(1, (p.properties.row ?? (pGridRow + 1)));

      let tsr = ts.rows[pGridRow - 1];
      let by = tsr.offset + tsr.wiringCell + starty;
      
      let render = new Block.Render(p);
      let bWidth = render.span.cols * cellSize;
      render.Resize(bWidth, render.span.rows * cellSize);
      this.svgGrid.add(render.svg.move(gridx - bWidth - (cellSize / 2), by));
      this.tableStructure.plugs.grids[pGridRow - 1] = render;
    }
    // Plate
    var pPlateRow = 0;
    let lastCol = ts.cols[ts.cols.length - 1];
    let platex = startx + lastCol.offset + lastCol.wiringCell + lastCol.blockCell;
    for (var p of this.block.plug.plates) {
      pPlateRow = p.properties.row = Math.max(1, (p.properties.row ?? (pPlateRow + 1)));

      let tsr = ts.rows[pPlateRow - 1];
      let by = tsr.offset + tsr.wiringCell + starty;
      
      let render = new Block.Render(p);
      let bWidth = render.span.cols * cellSize;
      render.Resize(bWidth, render.span.rows * cellSize);
      this.svgGrid.add(render.svg.move(platex + (cellSize / 2), by));
      this.tableStructure.plugs.plates[pPlateRow - 1] = render;
    }

    // Draw blocks
    var bCol = 0;
    var bRow = 0;
    this.tableStructure.blocks = [];
    for (var b of this.block.blocks) {
      bCol = b.properties.col = Math.max(1, b.properties.col ?? (bCol + 1));
      bRow = b.properties.row = Math.max(1, b.properties.row ?? (bRow + 1));

      let render = new Block.Render(b);
      let box = this.CalculateBlockBox(
        { c: bCol - 1, r: bRow - 1},
        render.span
      );
      render.Resize(box.w, box.h);
      render.svg.move(box.x + startx, Math.floor(box.y + starty));
      this.svgGrid.add(render.svg);

      this.tableStructure.blocks[bCol - 1] = this.tableStructure.blocks[bCol - 1] ?? [];
      this.tableStructure.blocks[bCol - 1][bRow - 1] = render;
    }

    return;
  }

  Render() {
    this.UpdateTableStructure();
    this.RenderGrid();
    this.RenderWiring();
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