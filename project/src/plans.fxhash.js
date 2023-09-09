/*
   By Christopher Eugene Mills

   bw2: Added offscreen buffer so that canvas doesn't reset on resize
	 bw3: Added imageset of pregenerated backgrounds
	 fxhash: trim filelist and add deterministic random
 */

import p5 from 'p5'
import * as CEM from 'cemjs'


// FXHASH ////////////////////////////////////////////////////

console.log( 'hash', $fx.hash ); // the 64 chars hex number fed to your algorithm

CEM.setRandomFunction( $fx.rand );
const p5RandomSeed = ~~ ( $fx.rand() * 999999999 );
const p5NoiseSeed  = ~~ ( $fx.rand() * 999999999 );
let fxPreviewCalled = false;


// FUNCTIONALITY SETTINGS //////////////////////////////////////////////////


const titleText =
`Earthquake Preparedness (
   Lift Yr. Skinny Fists
      Like Antennas to Heaven )`
const authorText = "Chris Eugene Mills"

const imagePath = "./assets/plans-iso-tiny/"
const imageFilenamesPath = "./assets/plans-iso-tiny/filenames.json"

const canvasSize = { width: 1920, height: 1080 };
var pixelDens = 1;

var headstartBuild = true;
var headstartNumBuildings = $fx.context === "capture" ? 200 : 100;
const loadingFloors = 20;

var speedrun = false; //No delays
var autoContinue = true; //Leave true, false disables continu() function
var newSet = true; //Divide into sets or procedurally add
var reloadURL = false; //Reload page every set
var fade = false; //Continually fades to black // BROKEN, too low bit depth
var setClean = false; //Erases between sets
var setFade = false; //Fades between sets
var setSwitch = true; //Switch between black and white

CEM.setVerbose(false)
var debugPositions = false; //Displays source points and imag flip/rotate settings 

// STYLE SETTINGS /////////////////////////////////////////////////////////////

var drawBasements = false; //Add reversed floors below
var blendingMethod = 0; //0 = Lightest/Darkest, 1 = Screen/Multiply
var blueprintMode = false; //Cyanotype //UNFINISHED

var stepDelay = 70; //Delay between floors
var buildingDelay = 350; //Delay between buildings
var newSetDelay = 800; //Delay between sets 

var bg = [ 6 ]; //Background color
var floorSpacingRange = [ 20, 30 ]; //Y spacing between floors
var floorNumRange = [ 8, 40 ]; //# of floors 																	20% min, 100% max, 20-60 max
var basementsToFloorsRatio = 0.33; //Random 0-0.33 * floors = # of basements 
var buildingsInSetRange = [ 5, 10 ]; //# of buildings in set
var scaleValRange = [ 0.3, 0.5 ]; //Building XY Scale
var breadth = 1.1; //Distribution of buildings from center
var darkTonePreference = 1.25; //Multiplier on num buildings for darker colors

$fx.features({
	"Zoning": CEM.randomWeighted(["Mixed-Use", "Strata", "Highrise", "Undeveloped"], [2,3,1,0.25]), //# of floors
	"Construction": CEM.randomWeighted(["Lazy", "On-Schedule", "Ahead", "Rushed"], [1,3,2,1]), //delays
	"Basement Permits": ["Denied", "Approved"].at(CEM.coin(0.25)), //Build down before going up
	"Paint": CEM.randomWeighted(["Standard", "Noir"], [12,2]), //Lightest/Darkest vs Screen/Multiply vs BLUEPRINT
	"Tenancy": ["Short", "Long"].at(CEM.coin()), //# of buildings in set
	"Commute": ["Sprawl", "Island"].at(CEM.coin(0.25)), //Distribution of buildings from center
})

function getNamedFeatureValue(featureName, values = {}) {
	let key = $fx.getFeature(featureName);
	if (!key) CEM.error(`No feature called '${featureName}'`);
	if (!values.hasOwnProperty(key)) CEM.error(`No keyvalue pair for '${key}', from '${featureName}'`);
	return values[key];
}

drawBasements = $fx.getFeature("Basement Permits") === "Approved"; //Add reversed floors below

blendingMethod = getNamedFeatureValue("Paint", {
	"Standard": 0,
	"Noir": 1,
}); //0 = Lightest/Darkest, 1 = Screen/Multiply

buildingsInSetRange[1] = getNamedFeatureValue("Tenancy", {
	"Short": 6,
	"Long": 18
});
buildingsInSetRange[0] = buildingsInSetRange[1] * 0.4;

breadth = getNamedFeatureValue("Commute", {
	"Sprawl": 1.1,
	"Island": 0.6
});
scaleValRange[0] *= 0.5 + 0.5 * (breadth/1.1);
scaleValRange[1] *= 0.5 + 0.5 * (breadth/1.1);

switch ($fx.getFeature("Construction")) {
	case "Lazy":
		stepDelay = 120;
		buildingDelay = 500;
		newSetDelay = 1000;
		break;
	case "On-Schedule":
		stepDelay = 70;
		buildingDelay = 350;
		newSetDelay = 800;
		break;
	case "Ahead":
		stepDelay = 40;
		buildingDelay = 150;
		newSetDelay = 600;
		break;
	case "Rushed":
		stepDelay = 10;
		buildingDelay = 100;
		newSetDelay = 500;
		break;

	default:
		stepDelay = 70; //Delay between floors
		buildingDelay = 1; //Delay between buildings
		newSetDelay = 1; //Delay between sets
		break;
}

floorNumRange[1] = getNamedFeatureValue("Zoning", {
	"Mixed-Use": 20,
	"Strata": 40,
	"Highrise": 60,
	"Undeveloped": 1,
});
floorNumRange[0] = floorNumRange[1] * 0.2;
if ($fx.getFeature("Zoning") === "Highrise") {
	scaleValRange[0] *= 0.7;
	scaleValRange[1] *= 0.9;
	floorSpacingRange[0] *= 1.4
	floorSpacingRange[1] *= 2
}
if ($fx.getFeature("Zoning") === "Undeveloped") {
	stepDelay = 1;
	buildingDelay = 1;
	newSetDelay = 1;
	floorNumRange = [1,1];
	drawBasements = false;
}

// UNCHANGED
// var bg = 6; //Background color
// var basementsToFloorsRatio = 0.33; //Random 0-0.33 * floors = # of basements 
// var scaleValRange = [ 0.3, 0.5 ]; //Building XY Scale
// var breadth = 1.1; 
// var darkTonePreference = 1.25; //Multiplier on num buildings for darker colors


// Variables ////////////////////////////////////////////////////

var canvas, drawLayer, loadLayer; //Drawing surfaces
var screenScale;
var blendSetting, lighterOrDarker; //Which Set of images to pull from
var buildingsInSet, building, floorsInBuilding, floor, basementsInBuilding, basement, floorSpacing, centerShift;
var img, loadingimg; 
var imageFilenames;
var buildingsCount, setsCount, headstartProgress, timeLoaded;
var loc, rot, scal, flip;
var downloadPic = false, downloadGIF = false;
var loadingShade, progressSpan;

// CORE /////////////////////////////////////////////////////////

const sketch = p5 => {


	p5.preload = () => {

		// FXHASH // Lock all random calls to fxhash seed
		p5.randomSeed(p5RandomSeed);
		p5.noiseSeed(p5NoiseSeed);

		// Get URLparams
		const params = new URLSearchParams(window.location.search)
		function getParamValue(URLSearchParamsObject, paramKey, cb) {
			if (URLSearchParamsObject.has(paramKey)) {
				let val = parseFloat(URLSearchParamsObject.get(paramKey));
				if (!isNaN(val)) cb(val);
			}
		}
		getParamValue(params, 'scale', v => pixelDens = v)
		getParamValue(params, 'preload', v => headstartBuild = !!v)
		getParamValue(params, 'build', v => { 
			headstartBuild = true
			headstartNumBuildings = v
		})
		getParamValue(params, 'debug', v => {
			CEM.setVerbose(!!v);
			debugPositions = !!v;
		})

		// Get HTML Refs
		loadingShade = p5.select('#loading_shade');
		progressSpan = p5.select('#loading_progress');

		// Preload plan image reference
		p5.loadJSON(imageFilenamesPath, function(data) {
			imageFilenames = data.filenames

			// Preload 1 floorplan for loading animation
			if (headstartBuild) {
				let num = p5.floor( p5.random( imageFilenames.length ) );
				let path = imagePath + "white/" + imageFilenames[num];
				loadingimg = p5.loadImage( path, null, function() {
					CEM.error( "FAILED: " + path );
					this._decrementPreload(); //hack to say everything is fine
				} )
			}
		})

	}

	p5.setup = () => {
		
		//Resettable
		restart(); 
	}

	function restart( resetRandom = true ) {
		CEM.newl();
		CEM.print( ">>>>>>> RESET <<<<<<<<" );

		// Reset Random Seeds
		if (resetRandom) {
			$fx.rand.reset();
			p5.randomSeed(p5RandomSeed);
			p5.noiseSeed(p5NoiseSeed);
		}

		//Create Main Canvas
		p5.pixelDensity(pixelDens);
		if (!canvas) canvas = p5.createCanvas( p5.windowWidth, p5.windowHeight );
		canvas.parent( 'sketch' );
		p5.noSmooth();
		p5.background( ...bg );

		//Reset Canvas Buffer
		if (!drawLayer) drawLayer = p5.createGraphics( canvasSize.width, canvasSize.height );
		drawLayer.pixelDensity(pixelDens);
		drawLayer.background( ...bg );
		//off.noSmooth();
		drawLayer.fill( ...bg );
		drawLayer.noStroke();
		screenScale = CEM.calcScale( canvas, drawLayer, "fill" );

		//Reset Loading Animation Buffer
		loadingShade.removeClass('hidden');
		let graphicDiv = p5.select('#loading_graphic');
		if (!loadLayer) loadLayer = p5.createGraphics( graphicDiv.width, graphicDiv.height );
		loadLayer.parent( graphicDiv );
		loadLayer.show();
		loadLayer.smooth();
		loadLayer.clear();
		loadLayer.noStroke();
		loadLayer.fill(255);

		//Reset Values
		lighterOrDarker = true;
		blendSetting = p5.ADD;
		buildingsInSet = building = 0;
		floorsInBuilding = floor = 0;
		basementsInBuilding = basement = 0;
		setsCount = buildingsCount = headstartProgress = 0;
		timeLoaded = null;
	
		startSet();
	}

	p5.windowResized = () => {
		p5.resizeCanvas( p5.windowWidth, p5.windowHeight );
		screenScale = CEM.calcScale( canvas, drawLayer, "fill" );
	}
	
	p5.draw = () => {
		p5.background( ...bg );
		
		//Draw Offscreen Canvas Buffer
		p5.translate( p5.width / 2, p5.height / 2 );
		p5.scale( screenScale ); //Scale from Center
		p5.translate( drawLayer.width / -2, drawLayer.height / -2 );

		p5.image( drawLayer, 0, 0 );

		//Draw Loading "Icon"
		if (headstartBuild && loadLayer && loadingimg) {
			headstartProgress = buildingsCount / headstartNumBuildings;

			if ( headstartProgress <= 1.0 ) {
			  drawLoading( headstartProgress );
			} 
			if ( headstartProgress >= 1.0 && !fxPreviewCalled ) { 
				$fx.preview()
				fxPreviewCalled = true
			}
			if ( headstartProgress >= 1.0 && !loadingShade.hasClass('hidden') ) { 
				loadingShade.addClass('hidden');
			}
		}

		//Preview Logic for no-load Scenario
		if (
			!headstartBuild && 
			!fxPreviewCalled &&
			p5.millis() > 30000
		) {
			$fx.preview();
			fxPreviewCalled = true;
		}

		//Download
		if (downloadPic && !(headstartBuild && headstartProgress < 1.0)) { 
			p5.save(drawLayer, `understructures_${fxhash}_${(p5.millis().toFixed(0))}.png`);
			downloadPic = false;
		}
		if (downloadGIF && !(headstartBuild && headstartProgress < 1.0)) {
			p5.saveGif(`understructures_${fxhash}_${(p5.millis().toFixed(0))}`, 5);
			downloadGIF = false;
		}
	}

	
	function drawLoading(progress_) {
		let progress = p5.constrain(progress_, 0, 1);

		let loadingimgScale = CEM.calcScale( loadLayer, loadingimg, "fit" );
		let moveDistance = loadLayer.height - loadingimg.height*loadingimgScale;
		let floors = loadingFloors;

		loadLayer.clear();
		
		// Draw plans progress stack
		for (let f = 0; f < Math.floor(floors * progress); f++) {
			let dist = moveDistance * (1 - f/(floors-1));
			loadLayer.push();
			loadLayer.translate( 0, dist ); 
			loadLayer.scale( loadingimgScale );
			loadLayer.blend( loadingimg, 0, 0, loadingimg.width, loadingimg.height, 0, 0, loadingimg.width, loadingimg.height, p5.SCREEN );
			loadLayer.pop();
		}

		// Draw progress text
		progressSpan.html(`Laying Foundations: ${buildingsCount}/${headstartNumBuildings}<br>Architectural Plans: ${imageFilenames.length}`)
	}

	function startSet() {
		CEM.newl();
		CEM.print( ">>>>>>> NEW SET <<<<<<<<" );
		setsCount++;
	
		//Clear Timers
		CEM.clearTimers();
	
		if ( setClean ) drawLayer.background( ...bg );
		
		switch (blendingMethod) {
			case 0:
			default:
				if ( lighterOrDarker ) blendSetting = p5.LIGHTEST;
				else blendSetting = p5.DARKEST;
				break;
		
			case 1:
				if ( lighterOrDarker ) blendSetting = p5.SCREEN;
				else blendSetting = p5.MULTIPLY;
				break;
		}

		// Floor Spacing
		floorSpacing = p5.floor( p5.random( floorSpacingRange[ 0 ], floorSpacingRange[ 1 ] ) );
		CEM.print( "FloorDiff: " + floorSpacing );
	
		//Calculate x shift, honestly can't remember how this works but it does
		centerShift = ( ( floorSpacingRange[ 1 ] - floorSpacingRange[ 0 ] ) / 2 + floorSpacingRange[ 0 ] ) * ( ( floorNumRange[ 1 ] - floorNumRange[ 0 ] ) / 2 + floorNumRange[ 0 ] ) / 2;
	
		//Number of buildings
		buildingsInSet = p5.ceil( p5.random( buildingsInSetRange[ 0 ], buildingsInSetRange[ 1 ] ) );
		if ( !lighterOrDarker ) buildingsInSet *= darkTonePreference; //More Black
		CEM.print( "Buildings: " + buildingsInSet );
		building = 0;
	
		//Next Step
		startBuilding();
	}
	
	
	function startBuilding() {
		CEM.newl();
	
		//Fetch new image
		var path = newFilePath(lighterOrDarker)
		img = p5.loadImage( path, 
			function () {
				CEM.print( "Loaded: " + path )
				building++;
				buildingsCount++;
	
				//How many floors?
				floorsInBuilding = p5.floor( p5.random( floorNumRange[ 0 ], floorNumRange[ 1 ] ) );
				CEM.print( "Floors: " + floorsInBuilding );
				floor = 0;
				basementsInBuilding = p5.floor( p5.random( 0, floorsInBuilding * basementsToFloorsRatio ) );
				basementsInBuilding *= drawBasements;
				CEM.print( " Below: " + basementsInBuilding );
				basement = 0;
	
				//Generate locations, etc
				generateLocations();
	
				//Next step
				if ( drawBasements ) {
					CEM.newTimer( addBase, skipCheck(stepDelay) );
				} else {
					CEM.newTimer( addFloor, skipCheck(stepDelay) );
				}
			},
			function () {
				CEM.error( "FAILED: " + path );
				CEM.newTimer( startBuilding, skipCheck(stepDelay) );
			}
		);
	
		function newFilePath(lighterOrDarker_) { 
			var folder = lighterOrDarker_ ? "white/" : "black/";
			var num = p5.floor( p5.random( imageFilenames.length ) );
			var p = imagePath + folder + imageFilenames[num];
			return p;
		}
	
		function generateLocations() {
			rot = p5.random() > 0.5;
			scal = p5.random( scaleValRange[ 0 ], scaleValRange[ 1 ] );
			flip = p5.random() > 0.5;
			var br = ( breadth / scal ); //account for scaling
			loc = p5.createVector(  p5.random( drawLayer.width  / 2 - drawLayer.width  * br / 2, drawLayer.width  / 2 + drawLayer.width  * br / 2 ),
															p5.random( drawLayer.height / 2 - drawLayer.height * br / 2, drawLayer.height / 2 + drawLayer.height * br / 2 ) );
			// loc = createVector( width/2, height/2 );
	
			// CEM.print("location:");
			CEM.print( "     x: " + p5.nf( loc.x, 1, 1 ) );
			CEM.print( "     y: " + p5.nf( loc.y, 1, 1 ) );
	
			CEM.print( "     r: " + p5.nf( p5.int(rot)*Math.PI, 1, 2 ) + " rads");
			CEM.print( "     s: " + p5.nf( scal, 1, 2 ) + " %");
		}
	}
	
	function addBase() {
	
		drawLayer.push();
		drawLayer.translate( drawLayer.width / 2, drawLayer.height / 2 );
		drawLayer.scale( scal ); //Scale from Center
		drawLayer.translate( drawLayer.width / -2, drawLayer.height / -2 );
	
		drawLayer.translate( 0, centerShift ); //Center
		drawLayer.translate( loc.x, loc.y ); //Position
		drawLayer.translate( 0, floorSpacing * basement ); //Floors
	
		if (rot) drawLayer.rotate( Math.PI );
		drawLayer.rotate( Math.PI ); //basements are backwards
		if (flip) drawLayer.scale(-1, 1);
		drawLayer.translate( -img.width / 2, -img.height / 2 );
	
		drawLayer.blend( img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendSetting );
		drawLayer.pop();
	
		basement++;
	
		if ( basement < basementsInBuilding ) {
			//next basement
			CEM.newTimer( addBase, skipCheck(stepDelay) );
		} else {
			//start floors
			CEM.newTimer( addFloor, skipCheck(stepDelay) );
		}
	}
	
	function addFloor() {
	
		drawLayer.push();
		if ( fade ) drawLayer.rect( 0, 0, drawLayer.width, drawLayer.height );
	
		drawLayer.translate( drawLayer.width / 2, drawLayer.height / 2 );
		drawLayer.scale( scal ); //Scale from Center
		drawLayer.translate( drawLayer.width / -2, drawLayer.height / -2 );
	
		drawLayer.translate( 0, centerShift ); //Center
		drawLayer.translate( loc.x, loc.y ); //Position
		drawLayer.translate( 0, -floorSpacing * floor ); //Floors
	
		//Debug
		if (debugPositions) {
			drawLayer.stroke(255, 0, 0);
			if (flip) drawLayer.stroke(0, 255, 0);
			if (rot) drawLayer.stroke(0, 0, 255);
			if (rot && flip) drawLayer.stroke(0, 255, 255);
			drawLayer.strokeWeight(30);
			drawLayer.point(0,0);
		}
	
		if (rot) drawLayer.rotate( Math.PI );
		if (flip) drawLayer.scale(-1, 1);
		drawLayer.translate( -img.width / 2, -img.height / 2 );
		
		drawLayer.blend( img, 0, 0, img.width, img.height, 0, 0, img.width, img.height, blendSetting );
		drawLayer.pop();
	
		floor++;
	
		if ( floor < floorsInBuilding ) {
			//next floor
			CEM.newTimer( addFloor, skipCheck(stepDelay) );
		} else if ( building < buildingsInSet ) {
			//new building
			CEM.newTimer( startBuilding, skipCheck(buildingDelay) );
		} else {
			//kill/reset
			continu();
		}
	}
	
	function continu() {
		if ( autoContinue ) {
			if ( newSet ) {
	
				CEM.newTimer( function () {
	
					if ( setSwitch ) lighterOrDarker = !lighterOrDarker;
	
					if ( setFade ) {
						var it = 60;
						for ( var i = 0; i < it; i++ ) {
							CEM.newTimer( function () {
								drawLayer.fill( ...bg, 20 );
								drawLayer.rect( 0, 0, width, height );
							}, skipCheck( 1000 / 24 * i ) );
						}
						CEM.newTimer( function () {
							if ( reloadURL ) location.reload();
							else startSet();
						}, skipCheck( 1000 / 24 * it ) );
	
					} else {
	
						if ( reloadURL ) location.reload();
	
						else startSet(); //just keep going...
	
					}
				}, skipCheck(newSetDelay) );
	
			}
			else CEM.newTimer( startBuilding, skipCheck(buildingDelay) );
	
		}
	}

	function skipCheck(delay_) {
		//For headstart, shortcut timers with 0ms
		//For speedrun, don't shortcut timers but move quick at 1ms
		return (headstartBuild && buildingsCount < headstartNumBuildings) ? 0 : ((speedrun) ? 1 : delay_);
	}

	// INTERACTION /////////////////////////////////////////////////////////////////////////

	p5.mousePressed = () => {
		switch (p5.mouseButton) {
			case p5.LEFT:
				
				break;
		
			case p5.RIGHT:

				break;
		
			default:
				break;
		}

		// prevent default
		//return false;
	}

	p5.touchStarted = () => {
		// prevent default
		//return false;
	}

	p5.keyPressed = () => {
		if (headstartBuild && headstartProgress < 1) return;
		switch ( p5.keyCode ) {
			case 82: // r
				restart( true );
				break;
			case 78: // n
				restart( false );
				break;
			case 49: // 1
			case 50: // 2
			case 51: // 3
			case 52: // 4
			case 53: // 5
			case 54: // 6
				pixelDens = p5.keyCode - 49 + 1
				restart( true );
				break;
			case 83: // s
				downloadPic = true;
				break;
			case 71: // g
				downloadGIF = true;
				break;
			case 84: // t
				speedrun = true;
				break;
		}
	}

	p5.keyReleased = () => {
		switch ( p5.keyCode ) {
			case 84: // t
				speedrun = false;
				break;
		}
	}

}

const instance = new p5(sketch, document.body)