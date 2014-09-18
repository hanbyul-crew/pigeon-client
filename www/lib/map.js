//map box map layer call

//vector object
  function Vector(x ,y){

      this.x = parseFloat(x);
      this.y = parseFloat(y);

      this.sub = function(v){
          return new Vector(this.x-v.x,this.y-v.y);
      };

      this.add = function(v){
         return new Vector(this.x+v.x,this.y+v.y);  
      }

      this.mult = function(s){
         return new Vector(this.x*s, this.y*s);  
      }
  }; 


var cpNum = 3;
var nyGeocode;
var seoulGeocode;
var geocodes = [];

var curStep = 0.0;

var points = [];

var dist;
var distDiv = 40;
var defaultNum = 5;

var intervalTimes;

var dTotal;
var totalStep;

var stepNum;

var zoomLevel;
var map;


  /** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRadians) === "undefined") {
   Number.prototype.toRadians = function() {
     return this * Math.PI / 180;
   }
}

function resetMap(){

  points = [];
  geocodes = [];
  curStep = 0;

}


function setZoomLevel(distNum){

  if(distNum <50){
    return 11;
  }else if( distNum <100){
    return 10;

  }else if( distNum <200){
    return 9;
  }else if( distNum <300){
    return 7;

  }else if( distNum <400){
    return 6;

  }else if( distNum <500){
    return 5;

  }else if( distNum <700){
    return 4;

  }else if( distNum <800){
    return 3;

  }else{
    return 1;
  }

}

function getPoint(sLat, sLon, rLat, rLon){

  resetMap();

  nyGeocode = new Vector(sLat,sLon);
  seoulGeocode = new Vector(rLat,rLon);

  //this should be improved
 
  var tempGapX = nyGeocode.x - seoulGeocode.x;
  var tempGapY = nyGeocode.y - seoulGeocode.y;

  geocodes = [nyGeocode,new Vector(nyGeocode.x - tempGapY/8,nyGeocode.y-tempGapY/4) ,seoulGeocode];

  dist = getDistanceBtw(nyGeocode.x,nyGeocode.y,seoulGeocode.x,seoulGeocode.y);
  dTotal = defaultNum + dist/distDiv;
  totalStep = Math.floor(dTotal);

  zoomLevel = setZoomLevel(dist);

  stepNum = 1/totalStep;

  for (var i =0; i < 1; i+=stepNum) {

      handlePoints(geocodes, cpNum);
      curStep+=stepNum;
  }
  
}



function handlePoints(pnt,c){

  for (var i = 0; i < cpNum; i++) { 
    if (c == 1) { 
        //at some point,t here is unnecessary recursion
       if(pnt[i] != undefined) {       
        points.push(new Vector(pnt[i].x, pnt[i].y));
  
      }
     }
  }
  
  if (c > 1) { //not the last recursion -- set up the subordinate control points for next recursion
     var cp = [];

     for (var i = 1; i < c; i++) {
        
          cp[i - 1] = pnt[i].sub(pnt[i - 1]);
          cp[i - 1] = cp[i - 1].mult(curStep);
          cp[i - 1] = cp[i - 1].add(pnt[i - 1]);
        }
     handlePoints(cp, c - 1);

    }

    pnt = [];
}


  // get distance btw 
  //source : http://www.movable-type.co.uk/scripts/latlong.html

  function getDistanceBtw(lat1,lon1,lat2,lon2){

    var R = 6371; // km, radius
    var a1 = lat1.toRadians();
    var a2 = lat2.toRadians();
    var bb = (lat2-lat1).toRadians();
    var cc = (lon2-lon1).toRadians();

    var a = Math.sin(bb/2) * Math.sin(bb/2) +
          Math.cos(a1) * Math.cos(a2) *
          Math.sin(cc/2) * Math.sin(cc/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
  }


//these are vars passing from server.
function drawMap(sLat, sLon, rLat, rLon, durationTime, elapssedTime) {
// what kind of info is gonna come to this part? 
  var lerp = function (a, b, t) {
      var len = a.length;
      if(b.length != len) return;

      var x = [];
      for(var i = 0; i < len; i++)
          x.push(a[i] + t * (b[i] - a[i]));
      return x;
  }
  var curRate = Math.min(Math.max(elapssedTime / durationTime, 0), 1.0);
  var currPos = lerp([sLat, sLon], [rLat, rLon], curRate);
  var currPosLat = currPos[0];
  var currPosLon = currPos[1];

  //zoom part

  var zoomLat = (nyGeocode.x+ seoulGeocode.x)/2;//points[Math.floor(points.length/2)].x;
  var zoomLon = (nyGeocode.y + seoulGeocode.y)/2;//points[Math.floor(points.length/2)].y;
  var currGeocode = new Vector(currPosLat,currPosLon);
  map = L.map('map',{
            center:[zoomLat, zoomLon],
            zoom:zoomLevel
          });

  L.tileLayer('http://{s}.tiles.mapbox.com/v3/hanbyulhere.j8f7eihh/{z}/{x}/{y}.png', {
      maxZoom: 13,
      minZoom: 1
  }).addTo(map);


  //geocode mapping data from user goes to here


  var nyMarker = L.marker([nyGeocode.x,nyGeocode.y]).addTo(map);
  var seoulMarker = L.marker([seoulGeocode.x,seoulGeocode.y]).addTo(map);

  
  //figure out current Index
  var currDist = getDistanceBtw(currGeocode.x,currGeocode.y,seoulGeocode.x,seoulGeocode.y);
  var dCurr = currDist/distDiv;

  var currIndex = Math.floor(dTotal-dCurr)-defaultNum;

  //put caculated circles on the map

  var leftPoints = (points.length+1) - currIndex;
  intervalTimes = (durationTime-elapssedTime)/leftPoints;
  
  drawPath(currIndex);
  
  //this part doesn't work
  setInterval(drawPath(currIndex),500);

}


function drawPath(currIndex){

console.log("hello!");
  for(var i=0; i<points.length; i++){

      if(i<currIndex){

      var circle = L.circle([points[i].x , points[i].y], 100, {
          color: '#de0000',
          fillColor: '#de0000',
          stroke:true,
          fill:true,
          clickable:false,
          fillOpacity: 0.9
      }).addTo(map);
    }

    else if( i>currIndex){
         var circle = L.circle([points[i].x , points[i].y], 100, {
          color: '#0000de',
          fillColor: '#0000de',
          stroke:true,
          fill:true,
          clickable:false,
          fillOpacity: 0.9
      }).addTo(map);
    } else{
        var circle = L.circle([points[i].x , points[i].y], 205, {
          color: '#ffff00',
          fillColor: '#ffff00',
          stroke:true,
          fill:true,
          fillOpacity: 1
      }).addTo(map);
      }
  };
  currIndex++;

}
