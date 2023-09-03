/*
   By Christopher Eugene Mills

   bw2: Added offscreen buffer so that canvas doesn't reset on resize
	 bw3: Added imageset of pregenerated backgrounds
	 fxhash: trim filelist and add deterministic random
 */

import p5 from 'p5'
import * as CEM from 'cemjs'


// FXHASH ////////////////////////////////////////////////////

// these are the variables you can use as inputs to your algorithms
const seed = ~~ (fxrand() * 999999999)
console.log('hash', fxhash)   // the 64 chars hex number fed to your algorithm
console.log('rand', fxrand()) // deterministic PRNG function, use it instead of Math.random()

// SETTINGS //////////////////////////////////////////////////

CEM.setVerbose(true) //REMEMBER TO FLIP
var speedrun = false; //No delays
var control = false;

const imagePath = "./assets/plans-iso-tiny/"
const imageFilenamesPath = "./assets/plans-iso-tiny/filenames.json"
const headstartPath = "./assets/headstart/"

var headstart = true;
var headstartPics = 10;

var auto = true; //Leave true, false disables continu() function
var newSet = true; //Divide into sets or procedurally add
var reloadURL = false; //Reload page every set
var fade = false; //Continually fades to black
var setClean = false; //Erases between sets
var setFade = false; //Fades between sets
var setSwitch = true; //Switch between black and white
var basement = false; //Add reversed floors below

var stepDelay = 90; //Delay between floors
var buildingDelay = 500; //Delay between buildings
var newSetDelay = 1000; //Delay between sets
if ( speedrun ) {
	stepDelay = 0;
	buildingDelay = 0;
	newSetDelay = 0;
}

var bg = 0; //Background color
var diffVal = [ 20, 30 ]; //X spacing between floors
var fVal = [ 8, 40 ]; //# of floors
var bVal = [ 5, 10 ]; //# of basement floors
var scaleVal = [ 0.3, 0.5 ]; //Building XY Scale
var breadth = 1.1; //Distribution of buildings from center

// Variables ////////////////////////////////////////////////////

var canvas, off; //Drawing surfaces
var blendSetting;
var white; //Which Set of images to pull from
var bTotal, b, fTotal, f, fbTotal, fb, diff, centerShift;
var img, hsimg, loc, rot, scal, flip;
var screenscal;
var imageFilenames;
var download = false;

// CORE /////////////////////////////////////////////////////////

const sketch = p5 => {


	p5.preload = () => {
		p5.randomSeed(seed);

		//Preload plan image reference
		p5.loadJSON(imageFilenamesPath, function(data) {
			imageFilenames = data.filenames
			console.log("imageFilenames", imageFilenames); 
		})
		

		//Preload 1 headstart image
		if (headstart) {
			var num = p5.floor( p5.random( headstartPics ) ); 
			var path = headstartPath + num + ".png";
			hsimg = p5.loadImage( path, null, function() {
				CEM.print( "FAILED: " + path );
				headstart = false;
				this._decrementPreload(); //hack to say everything is fine
			} );
		}
	}

	p5.setup = () => {
		// pixelDensity(1);
		canvas = p5.createCanvas( p5.windowWidth, p5.windowHeight );
		//canvas.position( 0, 0 );
		//canvas.parent( 'sketch' );
		p5.noSmooth();
		p5.background( 0 );

		//Resettable
		init2();
	}
	
	p5.draw = () => {
		p5.background( 0 );

		p5.translate( p5.width / 2, p5.height / 2 );
		p5.scale( screenscal ); //Scale from Center
		p5.translate( off.width / -2, off.height / -2 );

		p5.image( off, 0, 0 );

		if (download) {
			p5.save(off, "understructures.png");
			off.background( bg );
			download = false;
		}
	}

	function init2() {
		CEM.newl();
		CEM.print( ">>>>>>> RESET <<<<<<<<" );
	
		//Reset Canvas Buffer
		off = p5.createGraphics( 1920, 1080 );
		// off.pixelDensity(1);
		off.background( bg );
		//off.noSmooth();
		off.fill( bg, 255 / 40 );
		off.noStroke();
		screenscal = CEM.calcScale( canvas, off, "fill" );
	
		//Draw headstart image
		if (headstart) off.image(hsimg, 0, 0);
	
		//Reset Values
		white = true;
		blendSetting = p5.ADD;
		bTotal = b = 0;
		fTotal = f = 0;
		fbTotal = fb = 0;
	
		startSet();
	}

	p5.windowResized = () => {
		p5.resizeCanvas( p5.windowWidth, p5.windowHeight );
		screenscal = CEM.calcScale( canvas, off, "fill" );
	}

	function startSet() {
		CEM.newl();
		CEM.print( ">>>>>>> NEW SET <<<<<<<<" );
	
		//Clear Timers
		CEM.clearTimers();
	
		if ( setClean ) off.background( bg );
	
		// if (white) blendSetting = SCREEN;
		// else blendSetting = MULTIPLY;
		if ( white ) blendSetting = p5.LIGHTEST;
		else blendSetting = p5.DARKEST;
	
		// Floor Spacing
		diff = p5.floor( p5.random( diffVal[ 0 ], diffVal[ 1 ] ) );
		CEM.print( "FloorDiff: " + diff );
	
		//Calculate x shift, honestly can't remember how this works but it does
		centerShift = ( ( diffVal[ 1 ] - diffVal[ 0 ] ) / 2 + diffVal[ 0 ] ) * ( ( fVal[ 1 ] - fVal[ 0 ] ) / 2 + fVal[ 0 ] ) / 2;
	
		//Number of buildings
		if ( white ) bTotal = p5.ceil( p5.random( bVal[ 0 ], bVal[ 1 ] ) );
		else bTotal = p5.ceil( p5.random( bVal[ 0 ], bVal[ 1 ] ) * 1.25 ); //More Black
		CEM.print( "Buildings: " + bTotal );
		b = 0;
	
		//Next Step
		startBuilding();
	}
	
	
	function startBuilding() {
		CEM.newl();
	
		//Fetch new image
		var path = newFile()
		img = p5.loadImage( path,
			function () {
				CEM.print( "Loaded: " + path )
				b++;
	
				//How many floors?
				fTotal = p5.floor( p5.random( fVal[ 0 ], fVal[ 1 ] ) );
				CEM.print( "Floors: " + fTotal );
				f = 0;
				fbTotal = p5.floor( p5.random( 0, fTotal / 3 ) );
				CEM.print( " Below: " + fbTotal );
				fb = 0;
	
				//Generate locations, etc
				generateLocations();
	
				//Next step
				if ( basement ) {
					CEM.newTimer( addBase, stepDelay );
				} else {
					CEM.newTimer( addFloor, stepDelay );
				}
			},
			function () {
				CEM.print( "FAILED: " + path );
				CEM.newTimer( startBuilding, stepDelay );
			}
		);
	
		function newFile() { 
			var folder;
			if ( white ) folder = "white/";
			else folder = "black/";
			var num = p5.floor( p5.random( imageFilenames.length ) );
			var p = imagePath + folder + imageFilenames[num];
			return p;
		}
	
		function generateLocations() {
			rot = CEM.coin();
			scal = p5.random( scaleVal[ 0 ], scaleVal[ 1 ] );
			flip = CEM.coin();
			var br = ( breadth / scal ); //account for scaling
			loc = p5.createVector(  p5.random( off.width  / 2 - off.width  * br / 2, off.width  / 2 + off.width  * br / 2 ),
															p5.random( off.height / 2 - off.height * br / 2, off.height / 2 + off.height * br / 2 ) );
			// loc = createVector( width/2, height/2 );
	
			// CEM.print("location:");
			CEM.print( "     x: " + p5.nf( loc.x, 1, 1 ) );
			CEM.print( "     y: " + p5.nf( loc.y, 1, 1 ) );
	
			CEM.print( "     r: " + p5.nf( p5.int(rot)*Math.PI, 1, 2 ) + " rads");
			CEM.print( "     s: " + p5.nf( scal, 1, 2 ) + " %");
		}
	}
	
	function addBase() {
	
		off.push();
		off.translate( off.width / 2, off.height / 2 );
		off.scale( scal ); //Scale from Center
		off.translate( off.width / -2, off.height / -2 );
	
		off.translate( 0, centerShift ); //Center
		off.translate( loc.x, loc.y ); //Position
		off.translate( 0, diff * fb ); //Floors
	
		if (rot) off.rotate( Math.PI );
		off.rotate( Math.PI ); //basements are backwards
		if (flip) off.scale(-1, 1);
		off.translate( -img.width / 2, -img.height / 2 );
	
		off.blend( img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendSetting );
		off.pop();
	
		fb++;
	
		if ( fb < fbTotal ) {
			//next basement
			CEM.newTimer( addBase, stepDelay );
		} else {
			//start floors
			CEM.newTimer( addFloor, stepDelay );
		}
	}
	
	function addFloor() {
	
		off.push();
		if ( fade ) off.rect( 0, 0, off.width, off.height );
	
		off.translate( off.width / 2, off.height / 2 );
		off.scale( scal ); //Scale from Center
		off.translate( off.width / -2, off.height / -2 );
	
		off.translate( 0, centerShift ); //Center
		off.translate( loc.x, loc.y ); //Position
		off.translate( 0, -diff * f ); //Floors
	
		//Debug
		// off.stroke(255, 0, 0);
		// if (flip) off.stroke(0, 255, 0);
		// if (rot) off.stroke(0, 0, 255);
		// if (rot && flip) off.stroke(0, 255, 255);
		// off.strokeWeight(30);
		// off.point(0,0);
	
		if (rot) off.rotate( Math.PI );
		if (flip) off.scale(-1, 1);
		off.translate( -img.width / 2, -img.height / 2 );
	
		off.blend( img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendSetting );
		off.pop();
	
		f++;
	
		if ( f < fTotal ) {
			//next floor
			CEM.newTimer( addFloor, stepDelay );
		} else if ( b < bTotal ) {
			//new building
			CEM.newTimer( startBuilding, buildingDelay );
		} else {
			//kill/reset
			continu();
		}
	}
	
	function continu() {
		if ( auto ) {
			if ( newSet ) {
	
				CEM.newTimer( function () {
	
					if ( setSwitch ) white = !white;
	
					if ( setFade ) {
						var it = 60;
						for ( var i = 0; i < it; i++ ) {
							CEM.newTimer( function () {
								off.fill( bg, 20 );
								off.rect( 0, 0, width, height );
							}, 1000 / 24 * i );
						}
						CEM.newTimer( function () {
							if ( reloadURL ) location.reload();
							else startSet();
						}, 1000 / 24 * it );
	
					} else {
	
						if ( reloadURL ) location.reload();
	
						else startSet(); //just keep going...
	
					}
				}, newSetDelay );
	
			}
			else CEM.newTimer( startBuilding, buildingDelay );
	
		}
	}

	// INTERACTION /////////////////////////////////////////////////////////////////////////

	p5.mousePressed = () => {
		if ( control ) {
			if ( mouseButton == LEFT ) {
				download = true;
			}
		}
		// prevent default
		//return false;
	}

	p5.touchStarted = () => {
		if ( control ) {
			// background(bg);
			// init2();
		}
		// prevent default
		//return false;
	}

	p5.keyPressed = () => {
		//if (control) {
		switch ( keyCode ) {
			case 82: // r
				init2();
				break;
			case 83: // s
				download = true;
				break;
		}
		//}
	}

}

const instance = new p5(sketch, document.body)