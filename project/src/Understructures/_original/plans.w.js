
/*
   By Christopher Eugene Mills

   White Accumulation and
 */
var canvas;
var bg = 0;

var pics = 573;

var verbose = true;
var auto = true;
var newSet = true;
var reloadURL = false;
var fade = false;
var setFade = true;
var control = false;

var basement = false;
var bVal = [10, 28];
var fVal = [8, 40];
var diffVal = [20, 30]; //10,30
var scaleVal = [0.3, 0.5];
var breadth = 0.9;
var stepDelay = 90; //300
var buildingDelay = 500;
var newSetDelay = 4000;

var blendMode; //in setup
var bTotal = b = 0;
var fTotal = f = 0;
var fbTotal = fb = 0;
var timeouts = [];
var loc, rot, scal, screenScal, diff, img;



function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0,0);
  canvas.parent('sketch');
  noSmooth();
  blendMode = ADD;
  fill(bg, 255/40);
  noStroke();
  background(bg);


  // document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

  //Resettable
  init2();
}

function init2() {
  newl(); printcm(">>>>>>> RESET <<<<<<<<");

  if (!fade) background(bg);

  if (typeof timeouts !== 'undefined' || timeouts.length > 0) {
    for (var i = 0; i < timeouts.length; i++) {
      clearTimeout(timeouts[i]);
    }
    timeouts = [];
    printcm("Kill Timers");
  }

  screenScal;
  diff = floor(random(diffVal[0], diffVal[1])); printcm("FloorDiff: " + diff);
  bTotal = ceil(random(bVal[0], bVal[1])); printcm("Buildings: " + bTotal);
  b = 0;

  startBuilding()
}

function draw() {

}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(bg);
  init2();
}

function startBuilding() {
  newl();
  var num = floor(random(pics));
  var path = "/assets/images/Plans-Iso/white/"+num+".png";
  img = loadImage(path,
    function() {
      printcm("Loaded: " + path)
      b++;

      fTotal = floor(random(fVal[0], fVal[1])); printcm("Floors: " + fTotal);
      f = 0;
      fbTotal = floor(random(0, fTotal/3)); printcm(" Below: " + fbTotal);
      fb = 0;

      generateLocations();

      if (basement) {
        timeouts[timeouts.length] = setTimeout(addBase, stepDelay);
      } else {
        timeouts[timeouts.length] = setTimeout(addFloor, stepDelay);
      }
    },
    function() {
      printcm("FAILED: " + path);
      timeouts[timeouts.length] = setTimeout(startBuilding, stepDelay);
    });
}

function addBase() {

  push();
    centerScale( scal );

    translate(0, diff*fTotal/2); //Center
    translate(loc.x, loc.y); //Position
    translate(0, diff*fb); //Floors

    rotate(rot+3.14);
    translate(-img.width/2, -img.height/2);

    blend(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendMode);
  pop();

  fb++;

  if (fb < fbTotal) {
    //next basement
    timeouts[timeouts.length] = setTimeout(addBase, stepDelay);
  } else {
    //start floors
    timeouts[timeouts.length] = setTimeout(addFloor, stepDelay);
  }
}

function addFloor() {

  push();
    if (fade) rect(0, 0, width, height);

    centerScale( scal );

    translate(0, diff*fTotal/2); //Center
    translate(loc.x, loc.y); //Position
    translate(0, -diff*f); //Floors

    rotate(rot);
    translate(-img.width/2, -img.height/2);

    blend(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendMode);
  pop();

  f++;

  if (f < fTotal) {
    //next floor
    timeouts[timeouts.length] = setTimeout(addFloor, stepDelay);
  } else if (b < bTotal) {
    //new building
    timeouts[timeouts.length] = setTimeout(startBuilding, buildingDelay);
  } else {
    //kill/reset
    continu();
  }
}

function centerScale( s ) {
  translate(width/2, height/2);
  scale(s); //Scale from Center
  // scale(); //Scale 1080p
  translate(-width/2, -height/2);
}

function continu() {
  if (auto) {
    if (newSet) {
      timeouts[timeouts.length] = setTimeout(function() {
        if (setFade) {
          var it = 60;
          for (var i = 0; i < it; i++) {
            timeouts[timeouts.length] = setTimeout(function () {
              fill(bg, 20);
              rect(0, 0, width, height);
            }, 1000/24*i);
          }
          timeouts[timeouts.length] = setTimeout(function () {
            if (reloadURL) {
              location.reload();
            } else {
              init2();
            }
          }, 1000/24*it);
        } else {
          if (reloadURL) {
            location.reload();
          } else {
            init2();
          }
        }
      }, newSetDelay);
    } else {
      timeouts[timeouts.length] = setTimeout(startBuilding, buildingDelay);
    }
  }
}

function generateLocations( ) {

  rot = PI * floor( random(0, 2) );
  scal = random(scaleVal[0], scaleVal[1]);
  var br = breadth/scal;
  loc = createVector( random(width/2 - width*br/2, width/2 + width*br/2),
                      random(height/2 - height*br/2, height/2 + height*br/2) );
  // loc = createVector( width/2, height/2 );


  // printcm("location:");
  printcm("     x: " + nf(loc.x, 1, 1));
  printcm("     y: " + nf(loc.y, 1, 1));

  printcm("     r: " + nf(rot, 1, 2));
  printcm("     s: " + nf(scal, 1, 2));

}

function mousePressed() {
  if (mouseButton == LEFT) {
    if (control) {
      background(bg);
      init2();
    }
  }
  // prevent default
  //return false;
}

function touchStarted() {
  if (control) {
    background(bg);
    init2();
  }
  // prevent default
  //return false;
}


function coin() {
  if (random(1)>0.5) return true;
  else return false;
}

function newl() {
  printcm("");
}

function printcm( str ) {
  if(typeof verbose !== 'undefined'){
    if (verbose) {
      print(str);
    }
  }
}

function onKeyUp( event ) {
	switch( event.keyCode ) {
		case 82: // r
      background(bg);
      init2();
			break;
		case 68: // d
			// console.log(scene);
			break;
	}
};
