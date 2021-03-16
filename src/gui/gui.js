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
    if ((this.size.h == h) && (this.size.w == w)) return this.size; // Avoid useless svg resizing

    this.size.h = h;
    this.size.w = w;

    let labelHeight = this.svgLabel.bbox().h;

    this.svgLabel.move(this.size.w / 2, labelPadding);

    let separatorY = Math.floor(labelHeight + (labelPadding * 2));
    this.svgSeparator.plot(0, separatorY, this.size.w, separatorY);

    this.svgBody.size(this.size.w, this.size.h);

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
      blocks: [] // Matrix
    };

    this.map = {
      wiresCount: { cols: { 3: 7 }, rows: { 1: 5 } }
    };

    this.Generate();

    this.UpdateTableStructure();

    this.RenderGrid();
  }

  Generate() {
    // Create grid container and add to root svg
    this.svgGrid = new SVG.G();
    this.svg.add(this.svgGrid);
        
    // Create tube container and add to root svg
    this.svgTubes = new SVG.G();
    this.svg.add(this.svgTubes);
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

  RenderGrid() {
    let ts = this.tableStructure;
    console.log(ts);

    this.svgGrid.clear();

    // Calculate

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
    }

    // Draw blocks
    var bCol = 0;
    var bRow = 0;

    for (var b of this.block.blocks) {
      bCol = b.properties.col = Math.max(1, (b.properties.col ?? (bCol + 1)));
      bRow = b.properties.row = Math.max(1, (b.properties.row ?? (bRow + 1)));

      let render = new Block.Render(b);
      let box = this.CalculateBlockBox(
        { c: bCol - 1, r: bRow - 1},
        render.span
      );
      render.Resize(box.w, box.h);
      render.svg.move(box.x + startx, box.y + starty);
      this.svgGrid.add(render.svg);
    }

    return;
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
        this.svgGrid.add(foundCellGridPlug.svg.move(gridx - bWidth - (cellSize / 2), by));
      } else {
        let bWidth = cellSize * 2;
        this.svgGrid.rect(bWidth, cellSize).move(gridx - bWidth - (cellSize / 2), by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
      }

      // Plate
      let lastCol = ts.cols[ts.cols.length - 1];
      let platex = startx + lastCol.offset + lastCol.wiringCell + lastCol.blockCell;
      let foundCellPlatePlug = this.map.plates[r] ?? null;
      if (foundCellPlatePlug) {
        let bWidth = foundCellPlatePlug.span.cols * cellSize;
        foundCellPlatePlug.Resize(bWidth, foundCellPlatePlug.span.rows * cellSize);
        this.svgGrid.add(foundCellPlatePlug.svg.move(platex + (cellSize / 2), by));
      } else {
        let bWidth = cellSize * 2;
        this.svgGrid.rect(bWidth, cellSize).move(platex + (cellSize / 2), by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
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
          foundCellBlock.svg.move(box.x + startx, box.y + starty);
          console.log(box.x + startx, box.y + starty, box.w, box.h);
          this.svgGrid.add(foundCellBlock.svg);
        } else {
          let bx = tsc.offset + tsc.wiringCell + startx;
          let by = tsr.offset + tsr.wiringCell + starty;
          this.svgGrid.rect(cellSize, cellSize).move(bx, by).radius(10).fill('none').stroke({ color: '#50464964', width: 2 });
        }
      }
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