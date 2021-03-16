let cellSize = 98;
let wireSize = 24;
let pinHeight = cellSize / 2;

let labelPadding = 5;

// Pixel: { x, y, w, h }
// Cell:  { c, r, cols, rows }

class Block_Render {
  constructor(block) {
    this.block = block;

    this.span = { cols: 1, rows: 1 }; // Span dimensions (in cells)
    this.size = { w: 0, h: 0 }; // Pixel dimensions

    this.svg = null;
    this.svgBody = null;
    this.svgLabel = null;
    this.svgSeparator = null;
    this.svgPins = [];

    this.Create();
  }

  Resize(w, h) {
    this.size.h = h;
    this.size.w = w;
    this.svgBody.size(this.size.w, this.size.h);

    let labelHeight = this.svgLabel.bbox().h;

    this.svgLabel.cx(this.size.w / 2).y(labelPadding);

    let separatorY = Math.floor(labelHeight + (labelPadding * 2));
    this.svgSeparator.plot(0, separatorY, this.size.w, separatorY);

    return this.size;
  }

  Create() {
    this.svg = new SVG.G();

    // Create body
    this.svgBody = this.svg.rect(0, 0).radius(10).fill('#e5e7e6ff').stroke({ color: '#5e3843ff', width: 2 });

    // Create label
    this.svgLabel = this.svg.text(this.block.name).fill('#5e3843ff');//.font({ size: 10, anchor: 'middle' });

    // Create separator
    this.svgSeparator = this.svg.line().stroke({ color: '#5e3843ff', width: 2 });

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
      cols: [],
      rows: []
    };

    this.map = {
      grids: [],
      blocks: [], // Matrix
      plates: [],

      wiresCount: { cols: { 3: 7 }, rows: { 1: 5 } }
    };

    this.Generate();
    this.GenerateTableStructure();

    // Create grid and add to root svg
    this.svgGrid = new SVG.G();
    this.svg.add(this.svgGrid);
        
    // Render blocks
    this.svgTubes = new SVG.G();
    this.svg.add(this.svgTubes);

    // Render wiring

    this.RenderGrid();
  }

  Generate() {
    // Grids
    for (var p of this.block.plug.grids) {
      let arr = this.map.grids;
      p.properties.row = Math.max(1, p.properties.row ?? arr.length);
      arr[p.properties.row - 1] = new Block.Render(p);
    }

    // Blocks
    var bCol = 0;
    var bRow = 0;

    for (var b of this.block.blocks) {
      bCol = b.properties.col = Math.max(1, (b.properties.col ?? (bCol + 1)));
      bRow = b.properties.row = Math.max(1, (b.properties.row ?? (bRow + 1)));

      this.map.blocks[bCol - 1] = this.map.blocks[bCol - 1] ?? [];
      this.map.blocks[bCol - 1][bRow - 1] = new Block.Render(b);
    }

    // Plates
    for (var p of this.block.plug.plates) {
      let arr = this.map.plates;
      p.properties.row = Math.max(1, p.properties.row ?? arr.length);
      arr[p.properties.row - 1] = new Block.Render(p);
    }
  }

  GenerateTableStructure() {
    this.tableStructure = {
      cols: [], // { offset: 0, wireCells: [ { offset: 0, size: 0 } ], wiringCell: 30, blockCell: 100 }
      rows: []  // { offset: 0, wireCells: [ { offset: 0, size: 0 } ], wiringCell: 30, blockCell: 100 }
    };

    // Generate rows
    var topWiresCount;
    var by = 0;
    for (var y = 0; y <= this.size.h; y++) {
      topWiresCount = Math.max(3, this.map.wiresCount.rows[y] || 0);
      let padTop = topWiresCount * wireSize;

      let rowInfo = {
        offset: by,
        wireCells: [],
        wiringCell: padTop,
        blockCell: (y < this.size.h) ? cellSize : 0
      };

      for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
        let wy = (wIdx * wireSize) + (wireSize / 2);
        let wireCellInfo = {
          offset: wy,
          size: wireSize
        };
        rowInfo.wireCells[wIdx] = wireCellInfo;
      }

      this.tableStructure.rows[y] = rowInfo;

      by += rowInfo.wiringCell + rowInfo.blockCell;
    }

    // Generate cols
    var leftWiresCount;
    var bx = 0;

    // Block cols
    for (var x = 0; x <= this.size.w; x++) {
      leftWiresCount = Math.max(3, this.map.wiresCount.cols[x] || 0);
      let padLeft = leftWiresCount * wireSize;

      let colInfo = {
        offset: bx,
        wireCells: [],
        wiringCell: padLeft,
        blockCell: (x < this.size.w) ? cellSize : 0
      };

      for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
        let wx = (wIdx * wireSize) + (wireSize / 2);
        let wireCellInfo = {
          offset: wx,
          size: wireSize
        };
        colInfo.wireCells[wIdx] = wireCellInfo;
      }

      this.tableStructure.cols[x] = colInfo;

      bx += colInfo.wiringCell + colInfo.blockCell;
    }

    console.log(this.tableStructure);
    return this.tableStructure;
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

  RenderGrid() {
    let ts = this.tableStructure;

    this.svgGrid.clear();

    // Calculate

    let startx = 500;
    let starty = 500;

    // Draw grid
    for (var r = 0; r < this.size.h; r++) {
      let tsr = ts.rows[r];
      for (var wCell of tsr.wireCells) {
        let wy = tsr.offset + wCell.offset + starty;
        this.svgGrid.line(0, wy, '100%', wy).stroke({ color: '#50464964', width: 1 });
      }
    }

    for (var c = 0; c < this.size.w; c++) {
      let tsc = ts.cols[c];
      for (var wCell of tsc.wireCells) {
        let wx = tsc.offset + wCell.offset + startx;
        this.svgGrid.line(wx, 0, wx, '100%').stroke({ color: '#50464964', width: 1 });
      }
    }

    // Draw plugs
    for (var r = 0; r < this.size.h; r++) {
      let tsr = ts.rows[r];

      let by = tsr.offset + tsr.wiringCell + starty;

      // Grid
      let gridx = startx + ts.cols[0].offset;
      let foundCellGridPlug = this.map.grids[r] ?? null;
      if (foundCellGridPlug) {
        let bWidth = foundCellGridPlug.span.cols * cellSize;
        foundCellGridPlug.Resize(bWidth, foundCellGridPlug.span.rows * cellSize);
        this.svgGrid.add(foundCellGridPlug.svg.move(gridx - bWidth, by));
      } else {
        let bWidth = cellSize * 2;
        this.svgGrid.rect(bWidth, cellSize).move(gridx - bWidth, by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
      }

      // Plate
      let lastCol = ts.cols[ts.cols.length - 1];
      let platex = startx + lastCol.offset + lastCol.wiringCell + lastCol.blockCell;
      let foundCellPlatePlug = this.map.plates[r] ?? null;
      if (foundCellPlatePlug) {
        let bWidth = foundCellPlatePlug.span.cols * cellSize;
        foundCellPlatePlug.Resize(bWidth, foundCellPlatePlug.span.rows * cellSize);
        this.svgGrid.add(foundCellPlatePlug.svg.move(platex, by));
      } else {
        let bWidth = cellSize * 2;
        this.svgGrid.rect(bWidth, cellSize).move(platex, by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
      }
    }

    // Draw blocks
    for (var r = 0; r < this.size.h; r++) {
      let tsr = ts.rows[r];
      for (var c = 0; c < this.size.w; c++) {
        let tsc = ts.cols[c];

        let foundCellBlock = (this.map.blocks[c] ?? [])[r] ?? null;
        if (foundCellBlock) {
          let box = this.CalculateBlockBox(
            { c: c, r: r},
            foundCellBlock.span
          );
          foundCellBlock.Resize(box.w, box.h);
          this.svgGrid.add(foundCellBlock.svg.move(box.x + startx, box.y + starty));
        } else {
          let bx = tsc.offset + tsc.wiringCell + startx;
          let by = tsr.offset + tsr.wiringCell + starty;
          this.svgGrid.rect(cellSize, cellSize).move(bx, by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
        }
      }
    }


    return;
    var topWiresCount, leftWiresCount;

    var y = starty;
    for (var r = 0; r < this.size.h; r++) {
      topWiresCount = Math.max(3, this.map.wiresCount.rows[r] || 0);
      let padTop = topWiresCount * wireSize;

      for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
        let wy = (wIdx * wireSize) + (wireSize / 2) + y;
        this.svgGrid.line(0, wy, '100%', wy).stroke({ color: '#50464964', width: 1 });
      }

      y += padTop;

      var x = startx;

      // Grid
      let foundCellGridPlug = this.map.grids[r] ?? null;
      if (foundCellGridPlug) {
        this.svgGrid.add(foundCellGridPlug.svg.move(x, y));
      } else {
        this.svgGrid.rect(cellSize, cellSize).move(x, y).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
      }

      x += cellSize;

      for (var c = 0; c < this.size.w; c++) {
        leftWiresCount = Math.max(3, this.map.wiresCount.cols[c] || 0);
        let padLeft = leftWiresCount * wireSize;

        if (r == 0) {
          for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
            let wx = (wIdx * wireSize) + (wireSize / 2) + x;
            this.svgGrid.line(wx, 0, wx, '100%').stroke({ color: '#50464964', width: 1 });
          }
        }

        x += padLeft;
        
        let foundCellBlock = (this.map.blocks[c] ?? [])[r] ?? null;
        if (foundCellBlock) {
          let box = this.CalculateBlockBox(
            { c: c, r: r},
            foundCellBlock.span
          );
          foundCellBlock.Resize(box.w, box.h);
          this.svgGrid.add(foundCellBlock.svg.move(box.x + startx, box.y + starty));
        } else {
          let tx = this.tableStructure.cols[c].offset + this.tableStructure.cols[c].wiringCell + startx;
          let ty = this.tableStructure.rows[r].offset + this.tableStructure.rows[r].wiringCell + starty;
          this.svgGrid.rect(cellSize, cellSize).move(tx, ty).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
        }        
        
        x += cellSize;
      }

      // Plate
      let foundCellPlatePlug = this.map.plates[r] ?? null;
      if (foundCellPlatePlug) {
        this.svgGrid.add(foundCellPlatePlug.svg.move(x, y));
      } else {
        this.svgGrid.rect(cellSize, cellSize).move(x, y).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
      }

      y += cellSize;
    }

    for (var wIdx = 0; wIdx < topWiresCount; wIdx++) {
      let wy = (wIdx * wireSize) + (wireSize / 2) + y;
      this.svgGrid.line(0, wy, '100%', wy).stroke({ color: '#50464964', width: 1 });
    }

    for (var wIdx = 0; wIdx < leftWiresCount; wIdx++) {
      let wx = (wIdx * wireSize) + (wireSize / 2) + x;
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