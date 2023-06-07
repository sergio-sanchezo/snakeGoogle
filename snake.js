// https://www.google.com/fbx?fbx=snake_arcade
const ROUND_4 = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

// define key codes for arrow keys
const leftArrowKey = 37;
const upArrowKey = 38;
const rightArrowKey = 39;
const downArrowKey = 40;

const canvas = document.querySelector('canvas[jsname="UzWXSb"]');
const context = canvas.getContext("2d", { willReadFrequently: true });
const playDiv = document.querySelector('div[jsname="NSjDf"]');

let drawCanvas = null;
let drawContext = null;

const CORNER_LOCATION = [28, 25];
const CELL_SIZE = 32;
const NUM_ROWS = 15;
const NUM_COLS = 17;

const HEAD = 0;
const BODY = 1;
const SPACE = 2;
const APPLE = 3;

const HEAD_COLOR = { r: 0, g: 255, b: 255 };
const BODY_COLOR = { r: 0, g: 0, b: 255 };
const SPACE_COLOR = { r: 0, g: 255, b: 0 };
const APPLE_COLOR = { r: 255, g: 0, b: 0 };

let HEAD_LOCATION = [5, 7];
let LAST_HEAD_LOCATION = [2, 7];

let APPLE_LOCATION = [12, 7];

const GREEN_1 = { r: 170, g: 215, b: 81 };
const GREEN_2 = { r: 162, g: 209, b: 73 };
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };
const APPLE_RED = { r: 194, g: 134, b: 50 };
const BLUE_NOSE = { r: 28, g: 70, b: 157 };
const BLUE_HEAD = { r: 78, g: 124, b: 246 };
const BLUE_MOUTH = { r: 21, g: 68, b: 158 };

// #################### UTILS ##########################

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function moveSnake(keyCode) {
  window.focus();
  document.dispatchEvent(new KeyboardEvent("keydown", { keyCode }));
}

function setDrawCanvas() {
  drawCanvas = document.createElement("canvas");
  drawCanvas.style.margin = "25px";
  drawCanvas.height = CELL_SIZE * NUM_ROWS;
  drawCanvas.width = CELL_SIZE * NUM_COLS;
  canvas.parentElement.appendChild(drawCanvas);
  drawContext = drawCanvas.getContext("2d", { willReadFrequently: true });
}

function getColorInImageData(imageData, x, y) {
  return {
    r: imageData.data[4 * (imageData.width * y + x)],
    g: imageData.data[4 * (imageData.width * y + x) + 1],
    b: imageData.data[4 * (imageData.width * y + x) + 2],
  };
}

// Used to filter a color inside a cell
function reduceCell(imageData, x, y, reducer, initial) {
  for (let i = 0; i < CELL_SIZE; i++)
    for (let j = 0; j < CELL_SIZE; j++) {
      initial = reducer(
        initial,
        getColorInImageData(imageData, x * CELL_SIZE + i, y * CELL_SIZE + j)
      );
    }
  return initial;
}

// Taken from https://stackoverflow.com/a/8023734
function rgb2hsv(color) {
  const r = color.r;
  const g = color.g;
  const b = color.b;
  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  (v = Math.max(rabs, gabs, babs)), (diff = v - Math.min(rabs, gabs, babs));
  diffc = (c) => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = (num) => Math.round(num * 100) / 100;
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = 1 / 3 + rr - bb;
    } else if (babs === v) {
      h = 2 / 3 + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: parseInt(Math.round(h * 360)),
    s: parseInt(percentRoundFn(s * 100)),
    v: parseInt(percentRoundFn(v * 100)),
  };
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  );
}

function colorEqual(c1, c2) {
  return c1.r == c2.r && c1.g == c2.g && c1.b == c2.b;
}

// #################### TYPE MATRIX ##########################

function isProbableBody(imageData, x, y) {
  const maxBlue = reduceCell(
    imageData,
    x,
    y,
    (currentColor, newColor) =>
      newColor.b > currentColor.b ? newColor : currentColor,
    BLACK
  );
  const medBlue = reduceCell(
    imageData,
    x,
    y,
    (currentColor, newColor) => ({ ...BLACK, b: currentColor.b + newColor.b }),
    BLACK
  );

  medBlue.b = medBlue.b / (CELL_SIZE * CELL_SIZE);

  return maxBlue.b > 150 && medBlue.b > 150;
}

function isProbableApple(imageData, x, y) {
  const medRed = reduceCell(
    imageData,
    x,
    y,
    (currentColor, newColor) => ({ ...BLACK, r: currentColor.r + newColor.r }),
    BLACK
  );
  return medRed.r / (CELL_SIZE * CELL_SIZE) > 180;
}

function getProbableHeadLocation(imageData) {
  let maxLoc = [0, 0];
  let maxCount = 0;
  for (let y = 0; y < NUM_ROWS; y++)
    for (let x = 0; x < NUM_COLS; x++) {
      const count = reduceCell(
        imageData,
        x,
        y,
        (cCount, cColor) => {
          if (
            cColor.r == BLUE_NOSE.r &&
            (cColor.g == BLUE_NOSE.g) & (cColor.b == BLUE_NOSE.b)
          )
            return cCount + 1;
          return cCount;
        },
        0
      );

      if (count > maxCount) {
        maxCount = count;
        maxLoc = [x, y];
      }
    }

  return maxLoc;
}

function getHeadLocationByNose(imageData) {
  const noseLocations = new Set([4, 5, 6, 25, 26, 27]);

  for (let y = 0; y < NUM_ROWS; y++)
    for (let x = 0; x < NUM_COLS; x++) {
      // Verify vertically
      for (let i = 0; i < CELL_SIZE; i++) {
        let found = true;
        for (let j = 0; j < CELL_SIZE && found; j++) {
          if (
            noseLocations.has(j) &&
            !colorEqual(
              getColorInImageData(
                imageData,
                x * CELL_SIZE + i,
                y * CELL_SIZE + j
              ),
              BLUE_NOSE
            )
          )
            found = false;
          if (
            !noseLocations.has(j) &&
            !colorEqual(
              getColorInImageData(
                imageData,
                x * CELL_SIZE + i,
                y * CELL_SIZE + j
              ),
              BLUE_HEAD
            )
          )
            found = false;
        }

        if (found) return [x, y];
      }

      // Verify hortizontally
      for (let i = 0; i < CELL_SIZE; i++) {
        let found = true;
        for (let j = 0; j < CELL_SIZE && found; j++) {
          if (
            noseLocations.has(j) &&
            !colorEqual(
              getColorInImageData(
                imageData,
                x * CELL_SIZE + j,
                y * CELL_SIZE + i
              ),
              BLUE_NOSE
            )
          )
            found = false;
          if (
            !noseLocations.has(j) &&
            !colorEqual(
              getColorInImageData(
                imageData,
                x * CELL_SIZE + j,
                y * CELL_SIZE + i
              ),
              BLUE_HEAD
            )
          )
            found = false;
        }

        if (found) return [x, y];
      }
    }

  return null;
}

function getHeadLocationByMouth(imageData) {
  let maxLoc = null;
  let maxCount = 0;
  for (let y = 0; y < NUM_ROWS; y++)
    for (let x = 0; x < NUM_COLS; x++) {
      const count = reduceCell(
        imageData,
        x,
        y,
        (cCount, color) =>
          colorEqual(color, BLUE_MOUTH) ? cCount + 1 : cCount,
        0
      );
      if (count > maxCount) {
        maxCount = count;
        maxLoc = [x, y];
      }
    }

  return maxLoc;
}

function getProbableHeadLocation2(imageData) {
  const noiseLocation = getHeadLocationByNose(imageData);
  if (noiseLocation != null) return noiseLocation;
  return getHeadLocationByMouth(imageData);
}

function getTypeMatrix(imageData) {
  const matrix = [];

  for (let y = 0; y < NUM_ROWS; y++) {
    const row = [];
    for (let x = 0; x < NUM_COLS; x++) {
      if (isProbableBody(imageData, x, y)) row.push(BODY);
      else if (isProbableApple(imageData, x, y)) row.push(APPLE);
      else row.push(SPACE);
    }
    matrix.push(row);
  }

  const headLocation = getProbableHeadLocation2(imageData);
  if (headLocation != null) {
    matrix[headLocation[1]][headLocation[0]] = HEAD;
  }

  return matrix;
}

function getTypeDrawColor(type) {
  switch (type) {
    case HEAD:
      return HEAD_COLOR;
    case BODY:
      return BODY_COLOR;
    case APPLE:
      return APPLE_COLOR;
    case SPACE:
      return SPACE_COLOR;
    default:
      return WHITE;
  }
}

function drawTypeMatrix(typeMatrix) {
  const newImageData = new ImageData(
    NUM_COLS * CELL_SIZE,
    NUM_ROWS * CELL_SIZE
  );
  for (let y = 0; y < NUM_ROWS; y++)
    for (let x = 0; x < NUM_COLS; x++) {
      for (let i = 0; i < CELL_SIZE; i++)
        for (let j = 0; j < CELL_SIZE; j++) {
          const arrBase =
            4 *
            (NUM_COLS * CELL_SIZE * (y * CELL_SIZE + i) + x * CELL_SIZE + j);
          const drawColor = getTypeDrawColor(typeMatrix[y][x]);
          newImageData.data[arrBase] = drawColor.r;
          newImageData.data[arrBase + 1] = drawColor.g;
          newImageData.data[arrBase + 2] = drawColor.b;
          newImageData.data[arrBase + 3] = 255;
        }
    }

  drawContext.putImageData(newImageData, 0, 0);
}

// #################### A STAR ##########################

//heuristic we will be using - Manhattan distance
function heuristic(position0, position1) {
  let d1 = Math.abs(position1.x - position0.x);
  let d2 = Math.abs(position1.y - position0.y);

  return d1 + d2;
}

// constructor for a grid point
function GridPoint(x, y, value) {
  this.x = x; //x location of the grid point
  this.y = y; //y location of the grid point
  this.value = value; //value of the grid point
  this.f = 0; //total cost function
  this.g = 0; //cost function from start to the current grid point
  this.h = 0; //heuristic estimated cost function from current grid point to the goal
  this.neighbors = []; // neighbors of the current grid point
  this.parent = undefined; // immediate source of the current grid point

  // update neighbors array for a given grid point
  this.updateNeighbors = function (grid) {
    let i = this.x;
    let j = this.y;

    if (value === BODY) return;

    if (i < NUM_ROWS - 1) {
      this.neighbors.push(grid[i + 1][j]);
    }
    if (i > 0) {
      this.neighbors.push(grid[i - 1][j]);
    }
    if (j < NUM_COLS - 1) {
      this.neighbors.push(grid[i][j + 1]);
    }
    if (j > 0) {
      this.neighbors.push(grid[i][j - 1]);
    }
  };
}

function init(actualMatrix) {
  let grid = new Array(NUM_ROWS);

  //making a 2D array
  for (let i = 0; i < NUM_ROWS; i++) {
    grid[i] = new Array(NUM_ROWS);
  }

  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      grid[i][j] = new GridPoint(i, j, actualMatrix[i][j]);
    }
  }

  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      grid[i][j].updateNeighbors(grid);
    }
  }
  return grid;
}

function getHeadInGrid(actualMatrix) {
  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      if (actualMatrix[i][j] === HEAD) {
        return [j, i];
      }
    }
  }
  return false;
}

function getAppleInGrid(actualMatrix) {
  for (let i = 0; i < NUM_ROWS; i++) {
    for (let j = 0; j < NUM_COLS; j++) {
      if (actualMatrix[i][j] === APPLE) {
        return [j, i];
      }
    }
  }
  return false;
}

function search(actualMatrix, actualHead, actualApple) {
  try {
    let openSet = []; //array containing unevaluated grid points
    let closedSet = []; //array containing completely evaluated grid points
    let path = [];
    let grid = init(actualMatrix);

    if (!actualHead || !actualApple) {
      return [];
    }

    start = grid[actualHead[1]][actualHead[0]];
    end = grid[actualApple[1]][actualApple[0]];

    openSet.push(start);

    let iterations = 0;
    while (openSet.length > 0) {
      iterations++;

      if (iterations > 1000) {
        console.log(current);
        console.log(openSet);
        console.log(path);
        console.log(closedSet);
        console.log();
        throw new Error("Too many iterations");
      }
      //assumption lowest index is the first one to begin with
      let lowestIndex = 0;
      for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      let current = openSet[lowestIndex];

      if (current === end) {
        let temp = current;
        path.push(temp);
        while (temp.parent) {
          path.push(temp.parent);
          temp = temp.parent;
        }
        // return the traced path
        return path.reverse();
      }

      //remove current from openSet
      openSet.splice(lowestIndex, 1);
      //add current to closedSet
      closedSet.push(current);

      let neighbors = current.neighbors;

      for (let i = 0; i < neighbors.length; i++) {
        let neighbor = neighbors[i];

        if (!closedSet.includes(neighbor)) {
          let possibleG = current.g + 1;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          } else if (possibleG >= neighbor.g) {
            continue;
          }

          neighbor.g = possibleG;
          neighbor.h = heuristic(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }
  } catch (error) {
    return [];
  }
  //no solution by default
}

// #################### MAIN ##########################

async function moveSnakeBasedOnPath(path) {
  // move just one
  const actual = path[0];
  const next = path[1];

  let nextMove = "";

  if (actual.x < next.x) {
    nextMove = 40;
  } else if (actual.x > next.x) {
    nextMove = 38;
  } else if (actual.y < next.y) {
    nextMove = 39;
  } else if (actual.y > next.y) {
    nextMove = 37;
  }

  moveSnake(nextMove);
}

async function main() {
  try {
    setDrawCanvas();
    while (true) {
      const imageData = context.getImageData(
        CORNER_LOCATION[0],
        CORNER_LOCATION[1],
        NUM_COLS * CELL_SIZE,
        NUM_ROWS * CELL_SIZE
      );
      const typeMatrix = getTypeMatrix(imageData);
      drawTypeMatrix(typeMatrix);
      const actualHead = getHeadInGrid(typeMatrix);
      const actualApple = getAppleInGrid(typeMatrix);
      const path = search(typeMatrix, actualHead, actualApple);
      if (path && path.length > 1) {
        moveSnakeBasedOnPath(path);
      }
      await timeout(36);
    }
  } catch (error) {
    console.log(error);
  }
}

main();

// #################### TESTS ##########################

// setDrawCanvas();
// const imageData = context.getImageData(
//   CORNER_LOCATION[0],
//   CORNER_LOCATION[1],
//   NUM_COLS * CELL_SIZE,
//   NUM_ROWS * CELL_SIZE
// );
// const typeMatrix = getTypeMatrix(imageData);
// drawTypeMatrix(typeMatrix);
// console.log(typeMatrix);

// let grid = new Array(NUM_ROWS); //array of all the grid points

// let openSet = []; //array containing unevaluated grid points
// let closedSet = []; //array containing completely evaluated grid points

// let start; //starting grid point
// let end; // ending grid point (goal)
// let path = []; //array containing the path from start to end

// //heuristic we will be using - Manhattan distance
// function heuristic(position0, position1) {
//   let d1 = Math.abs(position1.x - position0.x);
//   let d2 = Math.abs(position1.y - position0.y);

//   return d1 + d2;
// }

// //constructor function to create all the grid points as objects containing the data for the points
// function GridPoint(x, y, value) {
//   this.x = x; //x location of the grid point
//   this.y = y; //y location of the grid point
//   this.value = value; //value of the grid point
//   this.f = 0; //total cost function
//   this.g = 0; //cost function from start to the current grid point
//   this.h = 0; //heuristic estimated cost function from current grid point to the goal
//   this.neighbors = []; // neighbors of the current grid point
//   this.parent = undefined; // immediate source of the current grid point

//   // update neighbors array for a given grid point
//   this.updateNeighbors = function (grid) {
//     let i = this.x;
//     let j = this.y;

//     if (value === BODY) return;

//     if (i < NUM_ROWS - 1) {
//       this.neighbors.push(grid[i + 1][j]);
//     }
//     if (i > 0) {
//       this.neighbors.push(grid[i - 1][j]);
//     }
//     if (j < NUM_COLS - 1) {
//       this.neighbors.push(grid[i][j + 1]);
//     }
//     if (j > 0) {
//       this.neighbors.push(grid[i][j - 1]);
//     }
//   };
// }

// //initializing the grid
// function init(actualMatrix) {
//   //making a 2D array
//   for (let i = 0; i < NUM_ROWS; i++) {
//     grid[i] = new Array(NUM_ROWS);
//   }

//   for (let i = 0; i < NUM_ROWS; i++) {
//     for (let j = 0; j < NUM_COLS; j++) {
//       grid[i][j] = new GridPoint(i, j, actualMatrix[i][j]);
//     }
//   }

//   for (let i = 0; i < NUM_ROWS; i++) {
//     for (let j = 0; j < NUM_COLS; j++) {
//       grid[i][j].updateNeighbors(grid);
//     }
//   }
// }

// //A star search implementation

// function search() {
//   init();

//   start = grid[HEAD_LOCATION[1]][HEAD_LOCATION[0]];
//   end = grid[APPLE_LOCATION[1]][APPLE_LOCATION[0]];

//   console.log(start);
//   console.log(end);

//   openSet.push(start);
//   while (openSet.length > 0) {
//     //assumption lowest index is the first one to begin with
//     let lowestIndex = 0;
//     for (let i = 0; i < openSet.length; i++) {
//       if (openSet[i].f < openSet[lowestIndex].f) {
//         lowestIndex = i;
//       }
//     }
//     let current = openSet[lowestIndex];

//     if (current === end) {
//       let temp = current;
//       path.push(temp);
//       while (temp.parent) {
//         path.push(temp.parent);
//         temp = temp.parent;
//       }
//       console.log("DONE!");
//       // return the traced path
//       return path.reverse();
//     }

//     //remove current from openSet
//     openSet.splice(lowestIndex, 1);
//     //add current to closedSet
//     closedSet.push(current);

//     let neighbors = current.neighbors;

//     for (let i = 0; i < neighbors.length; i++) {
//       let neighbor = neighbors[i];

//       if (!closedSet.includes(neighbor)) {
//         let possibleG = current.g + 1;

//         if (!openSet.includes(neighbor)) {
//           openSet.push(neighbor);
//         } else if (possibleG >= neighbor.g) {
//           continue;
//         }

//         neighbor.g = possibleG;
//         neighbor.h = heuristic(neighbor, end);
//         neighbor.f = neighbor.g + neighbor.h;
//         neighbor.parent = current;
//       }
//     }
//   }

//   //no solution by default
//   return [];
// }

// console.log(search());
