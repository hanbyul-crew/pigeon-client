//map box map layer call

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

  var zoomLat = (sLat + rLat)/2;
  var zoomLon = (sLon + rLon)/2;
  var nyGeocode = new Vector(sLat,sLon);
  var seoulGeocode = new Vector(rLat,rLon);
  var currGeocode = new Vector(currPosLat,currPosLon);
  var map = L.map('map').setView([zoomLat, zoomLon], 2);

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

  /** Converts numeric degrees to radians */
  if (typeof(Number.prototype.toRadians) === "undefined") {
    Number.prototype.toRadians = function() {
      return this * Math.PI / 180;
    }
  }

  L.tileLayer('http://{s}.tiles.mapbox.com/v3/hanbyulhere.j8f7eihh/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 8,
      minZoom: 3
  }).addTo(map);


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

  //geocode mapping data from user goes to here
  var dist = getDistanceBtw(nyGeocode.x,nyGeocode.y,seoulGeocode.x,seoulGeocode.y);

  var distDiv = 20;
  var dTotal = dist/distDiv;
  var totalStep = Math.floor(dTotal);



  var nyMarker = L.marker([nyGeocode.x,nyGeocode.y]).addTo(map);
  var seoulMarker = L.marker([seoulGeocode.x,seoulGeocode.y]).addTo(map);

  var cpNum = 3;
  var curStep = 0.0;
  var stepNum = 1/totalStep;
  var points = [];
  var tempGapX = nyGeocode.x - seoulGeocode.x;
  var tempGapY = nyGeocode.y - seoulGeocode.y;

  //this should be improved
  var geocodes = [nyGeocode,new Vector(nyGeocode.x -tempGapY/2,nyGeocode.y - tempGapY/2) ,seoulGeocode];



  //figure out current Index
  var currDist = getDistanceBtw(currGeocode.x,currGeocode.y,seoulGeocode.x,seoulGeocode.y);
  var dCurr = currDist/distDiv;

  var currIndex = Math.floor(dTotal-dCurr);


  //bezier curve function (saving points)

  var handlePoints = function(pnt,c){

      for (var i = 0; i < cpNum; i++) { 
        if (c == 1) { 
          //at some point,t here is unnecessary recursion
          if(pnt[i] != undefined) points.push(new Vector(pnt[i].x+pnt[i].x*0.0001, pnt[i].y+pnt[i].y*(0.0001)));
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
  }

  for (var i =0; i < 1.01; i+=stepNum) {

      handlePoints(geocodes, cpNum);
      curStep+=stepNum;
  }

  //put caculated circles on the map

  for(var i=0; i<points.length; i++){

      if(i<currIndex){

      var circle = L.circle([points[i].x , points[i].y], 35, {
          fillColor: '#de0000',
          stroke:false,
          fill:true,
          clickable:false,
          fillOpacity: 0.7
      }).addTo(map);
    }
      else if(i === 62){

        var circle = L.circle([points[i].x , points[i].y], 15, {
          fillColor: '#ffff00',
          stroke:true,
          fill:true,
          fillOpacity: 0.7
      }).addTo(map);
      }
    else{
         var circle = L.circle([points[i].x , points[i].y], 35, {
          fillColor: '#0000de',
          stroke:false,
          fill:true,
          clickable:false,
          fillOpacity: 0.7
      }).addTo(map);
    }
  };

  //calculate distance between spots

}
