/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


var app = {
  // Application Constructor
  initialize: function() {
    var server = 'http://messanger-pigeon.herokuapp.com' //"http://192.168.0.104:8080"
    var slider = new PageSlider($('body'));
    var geocoder = new google.maps.Geocoder();

    var headTpl = Handlebars.compile($("#head-tpl").html());
    var settingTpl = Handlebars.compile($("#setting-tpl").html());
    var authTpl = Handlebars.compile($("#auth-tpl").html());
    var signTpl = Handlebars.compile($("#sign-tpl").html());
    var friendsTpl = Handlebars.compile($("#friends-tpl").html());
    var friendTpl = Handlebars.compile($("#friend-tpl").html());
    var newMessageTpl = Handlebars.compile($("#new-message-tpl").html());
    var messagesTpl = Handlebars.compile($("#messages-tpl").html());
    var incomingMessageTpl = Handlebars.compile($("#incoming-message-tpl").html());
    var deliveringMessageTpl = Handlebars.compile($("#delivering-message-tpl").html());
    var deliveringMessagesTpl = Handlebars.compile($("#delivering-messages-tpl").html());
    var chooseFriendTpl = Handlebars.compile($("#choose-friend-tpl").html());
    /*
    // Check if HTML5 location support exists
    app.geolocation = false;
    if(navigator.geolocation) {
      app.geolocation = navigator.geolocation;
    } 
    */

    function loadIncomingMessages(username, callback) {
      $.post(server+'/get-incoming-messages', {username:username}, function(res) {
        if(res.success) {
           callback(null, res.messages);
        }
        else  callback(err);
      });
    }

    function loadDeliveringMessages(username, callback) {
      $.post(server+'/get-delivering-messages', {username:username}, function(res) {
        if(res.success) {
           callback(null, res.messages);
        }
        else  callback(err);
      });
    }

    function getLocation(callback) {
      //event.preventDefault();
      var options = options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 3000
      };
      navigator.geolocation.getCurrentPosition(
          function(position) {
            callback(null, position)
            //  alert(position.coords.latitude + ',' + position.coords.longitude);
          },
          function(error) {
            callback(error);
          },
          options
        );
    }

    function getAddress(lat, lng, callback) {

      var latlng = new google.maps.LatLng(lat, lng);
      geocoder.geocode({'latLng': latlng}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          callback(null, results[1].formatted_address);
        } else {
          callback(new Error("Geocoder failed due to: " + status));
        }
      });
    }

    function msToTime(s) {

      var ms = s % 1000;
      s = (s - ms) / 1000;
      var secs = s % 60;
      s = (s - secs) / 60;
      var mins = s % 60;
      var hrs = (s - mins) / 60;

      return hrs + ':' + mins + ':' + secs
    }

    
    //home
    router.addRoute('', function(){
      if (!window.localStorage.getItem("username")) {
        $('body').html(headTpl({title:'Pigeon'}));
        $('div.content').html(authTpl());
        return;
      } else {
        window.location = "index.html#friends"

      }
    })// end of router

    router.addRoute("setting", function() {
      if (!window.localStorage.getItem("username")) {
        $('body').html(headTpl({title:'Pigeon'}));
        $('div.content').html(authTpl());
        return;
      } else {
        $('body').html(headTpl({title:window.localStorage.getItem("username")}));
        $('div.content').html(settingTpl());
      }
    })
  
    router.addRoute('messages', function() {
      loadIncomingMessages(window.localStorage.getItem("username"), function(err, messages) {
        if(err) {
          window.alert("Cannot get messages");
          window.location ="";
        }
        else {
          messages.forEach(function(m) {
            console.log(new Date(m.created_at))
            m.created_at_pretty = humaneDate(m.created_at)
            if(m.state === "arrived") m.isArrived = true; 
            else m.isArrived = false;
          })
          $('body').html(headTpl({title:'Incoming Messages'}));
          $('div.content').html(messagesTpl({messages:messages}));
          $('header').append('<a class="icon icon-compose pull-right" href="#choosefriend/messages"></a>');
        }
      });
    })

    router.addRoute('friend/:friendname', function(friendname) {
      async.waterfall([
        function(callback) {
          $.post(server+'/friend', {username:window.localStorage.getItem("username"), friendname:friendname}, function(res) {
            if(!res.success) callback(res.err);
            else {
              res.friend.sending = res.sending;
              callback(null, res.friend);
            }
            });
          }
        ], function(err, friend) {
          if(err) {
            window.alert(err.message);
          } else {
            $('body').html(headTpl({title:friend.username}));
            friend.width = window.screen.availWidth-30;
            $('div.content').html((friendTpl({friend:friend})));
            $('header').append('<a class="icon icon-left-nav pull-left" href="#friends"></a>');
          }
        });
    })

    router.addRoute('message/:id', function(id) {
      async.waterfall([
        function(callback) {
          $.post(server+'/get-message', {username:window.localStorage.getItem("username"), id:id, state:'read', type:'incoming'}, function(res) {
            if(!res.success) callback(res.err);
            else callback(null, res.message, res.sending);
            });
          }
        ], function(err, msg, sending) {
          if(err) {
            window.alert(err.message);
          } else {
            msg.created_at_pretty = humaneDate(msg.created_at);
            msg.elapsed_time = msToTime(msg.elapsed_mills);
            msg.duration_time = msToTime(msg.duration_mills);

            msg.width = window.screen.availWidth-30;
            $('body').html(headTpl({title:"From: " + msg.from.username}));
            $('div.content').html((incomingMessageTpl({message:msg, sending:sending})));
            $('header').append('<a class="icon icon-left-nav pull-left" href="#messages"></a>');
          }
        });
    });

    router.addRoute('deliverings', function(id) {
      loadDeliveringMessages(window.localStorage.getItem("username"), function(err, messages) {
        if(err) {
          window.alert("Cannot get messages");
          window.location ="";
        }
        else {
          messages.forEach(function(m) {
            m.created_at_pretty = humaneDate(m.created_at)
          })
          $('body').html(headTpl({title:'Delivering Messages'}));
          $('div.content').html(deliveringMessagesTpl({messages:messages}));
          $('header').append('<a class="icon icon-compose pull-right" href="#choosefriend/deliverings"></a>');
        }
      });
    });

    router.addRoute('delivering/:id', function(id) {
      async.waterfall([
        function(callback) {
          $.post(server+'/get-message', 
            {username:window.localStorage.getItem("username"), id:id}, function(res) {
            if(!res.success) callback(res.err);
            else callback(null, res.message);
            });
          }
        ], function(err, msg) {
          if(err) {
            window.alert(err.message);
          } else {
            msg.created_at_pretty = humaneDate(msg.created_at);
            msg.elapsed_time = msToTime(msg.elapsed_mills);
            msg.duration_time = msToTime(msg.duration_mills);
            msg.width = window.screen.availWidth-30;

            $('body').html(headTpl({title:"To:" + msg.to.username}));
            $('div.content').html((deliveringMessageTpl({message:msg})));
            $('header').append('<a class="icon icon-left-nav pull-left" href="#deliverings"></a>');
          }
        });
    });

    router.addRoute('choosefriend/:lastPage', function(lastPage) {
      $.post(server+'/friends', {username:window.localStorage.getItem("username")}, function(res) {
          if(!res.success) window.alert(res.err);
          else if(!res.friends) res.friends = [];
          else {
            $('body').html(headTpl({title:'Choose a friend'}));
            $('header').append('<a class="icon icon-left-nav pull-left" href="#' + lastPage + '"></a><div class="bar bar-standard bar-header-secondary"><input id="searchfriend" type="search" placeholder="Search"></div>');
            $('div.content').html(chooseFriendTpl({friends:res.friends}));
          }
        });
    });



  router.addRoute('friends', function() {
    if(!window.localStorage.getItem("username")) return window.location = "index.html";
    var username = window.localStorage.getItem("username");
    async.parallel({
      requests:function(callback) {
        $.post(server+'/get-request', {username:username}, function(res) {
          if(!res.success) callback(res.message);
          else if(!res.requests) callback(null, []);
          else callback(null, res.requests);
        });
      },
      friends:function(callback) {
        $.post(server+'/friends', {username:username}, function(res) {
          if(!res.success) callback(res.err);
          else if(!res.friends) callback(null, []);
          else callback(null, res.friends);
        });
      }
    }, 
    function(err, result) {
      if(err) window.alert(err.message);
      else {
        $('body').html(headTpl({title:'Friends'}));
        $('header').append('<a class="icon icon-compose pull-right" href="#choosefriend/friends"></a>');
        $('header').append('<div class="bar bar-standard bar-header-secondary"><input id="addfriend" type="search" placeholder="Add a Friend"></div>');
        result.requests.forEach(function(f) {f.created_at_pretty = humaneDate(f.created_at)})
        $('div.content').html(friendsTpl({requests:result.requests, friends:result.friends}));

        $('#addfriend').keypress(function(e) {
          if (e.which == 13) { // enter key
            var username = window.localStorage.getItem('username'), friend = $('#addfriend').val();
            if (username != friend) {
              $.post(
                server + '/send-request', 
                {username:window.localStorage.getItem('username'), friend:$('#addfriend').val()}, 
                function(res) {
                    if(res.success) {
                        $('#addfriend').val('');
                        window.alert("Sent a Request to " + friend);
                        return true;
                    }
                    window.alert("Cannot Add!!!!");
                    return false;
                }
              );
            } else {
                window.alert("Cannot Add Yourself!!!!");
            }
          } // when entered
          }); // end of add friend

        $('div.toggle').on("toggle", function(e) {
          var el = $(this);
          if (el.hasClass('active')) {
              var li = $(this).parent(); 
              var from = li.data('from');
              $.post(server + '/accept', 
                  {username:window.localStorage.getItem('username'), friend:from},
              function(res) {
                  if(res.success){
                      li.fadeOut("slow");
                      location.reload(true);
                  }
                  else window.alert("Failed to accept");
              });
          }
        });
      }
    });
  });

    
    router.addRoute('signup', function(){
      if (window.localStorage.getItem("username")){
        window.location = "index.html";
        return;
      }
      getLocation(function(err, position) {
        var loc;
        if(err){
          loc = null;
        } 
        else {
          loc = {latitude:position.coords.latitude, longitude:position.coords.longitude};
        }
        $('body').html(headTpl({title:'Sign Up'}));
        $('div.content').html(signTpl());
        var form = $(".sign-group"); 
        $('#done', form).on('click', function(event) {
          event.preventDefault();
          async.waterfall([
            function(callback){
              $("#done",form).attr("disabled","disabled");
              var u = $("#username", form).val();
              var p = $('#password', form).val();
              callback(null, u, p);
            },function(u,p, callback){
              if(loc) {
                getAddress(loc.latitude, loc.longitude, function(err, address) {
                  if(err) loc = null;
                  else loc.address = address;
                  callback(null, u,p)
                });
              } else {
                callback(null, u,p)
              }
            },function(u, p, callback){
              $.post(server + "/signup", {username:u,password:p,location:loc}, function(res) {
                if(res.success) {
                  callback(null, res.user);
                } else {
                  callback(res.error);
                }
              });
            }
          ], function (err, result) {
             // result now equals 'done'
            $("#done", form).removeAttr("disabled");
            if(err) {
              window.alert("Failed to signup");
            }
            else {
              window.localStorage["username"] = result.username;
              window.location="index.html";
              window.alert("Welcome to Carrier Pigeon, " + result.username + " !!!!");
            }  
          });
        }); // end of click
      });

    });

    router.addRoute('signin', function() {
      if (window.localStorage.getItem("username")){
        window.location="";
        return;
      }
      getLocation(function(err, position) {
        var loc;
        if(err){
          loc = null;
          //callback(null, u, p, null);
          //callback(null, u, p, null);
        } 
        else {
          loc = {latitude:position.coords.latitude, longitude:position.coords.longitude};
          //callback(null, u, p, loc)
        }

        $('body').html(headTpl({title:'Sign In'}));
        $('div.content').html(signTpl());
        var form = $(".sign-group");
        $('#done', form).on('click', function(event) {
          event.preventDefault();
          async.waterfall([
            function(callback){
              $("#done",form).attr("disabled","disabled");
              var u = $("#username", form).val();
              var p = $('#password', form).val();
              callback(null, u, p);
            },
            function(u,p, callback){
              if(loc) {
                getAddress(loc.latitude, loc.longitude, function(err, address) {
                  if(err) loc = null;
                  else loc.address = address;
                  callback(null, u,p)
                });
              } else {
                callback(null, u,p)
              }
            },function(u, p, callback){
              $.post(server + "/signin", {username:u,password:p, location:loc}, function(res) {
                  if(res.success == true) {
                    callback(null, res);
                      //$.mobile.changePage("some.html");
                  } else {
                    callback(res.err);
                  }
               $("#done", form).removeAttr("disabled");
              },"json");
            }
          ], function (err, result) {
             // result now equals 'done'
            $("#done", form).removeAttr("disabled");
            if(err) {
              window.alert("Invalid Username or Password");
            }
            else {
              window.localStorage["username"] = result.user.username;
              window.location="index.html";
            }  
          });
        }); // end click
      });//end get location
    });

    router.addRoute('signout', function() {
        window.localStorage.removeItem("username");
        window.location="index.html";
        //$.mobile.changePage("some.html");
    });

    /*
      Message
    */

    //new message
    router.addRoute('newmessage/:friendname', function(friendname) {
      if(!window.localStorage.getItem("username")) return;

      $('body').html(headTpl({title:"To: " + friendname}));
      $('header').append('<a class="icon icon-left-nav pull-left" href="#messages">');
      $('div.content').html(newMessageTpl({friendname:friendname}));
      $('#text').keypress(function() {
        $('#text-length').html($('#text').val().length);
      });

      // when enter send message;
      $('#send').on('click' ,function() {
        var to = friendname;
        var text = $('#text').val();
        var username = window.localStorage.getItem('username');
        $.post(server + "/send-message", {to:to, text:text, username:username}, function(res) {
          if (res.success) {
            window.location = "index.html#delivering/" + res.message._id;
          }else {
            window.alert("failed to send this message");
          }
        });
      });
      
    });

    router.addRoute('updatelocation', function() {
      async.waterfall([
        function(callback) {
          getLocation(function(err, result) {
            if(err) callback(err);
            var loc = {latitude:result.coords.latitude, longitude:result.coords.longitude};
            callback(null, loc);
          });
        }, 
        function(loc, callback) {
          getAddress(loc.latitude, loc.longitude, function(err, address) {
            if(err) callback(err)              
            else {
              loc.address = address;
              callback(null, loc); 
            }
          });
        },
        function(loc, callback) {
          $.post(server + "/update-location", {username:window.localStorage['username'], location:loc}, function(res) {
            if(res.success) callback(null, res.user);
            else callback(new Error("can't update the location"));
          })
        }], 
        function(err, result) {
          if(err) window.alert("Failed to Update Your Location")
          else window.alert("Your Location is Updated")
        });
    });

    router.start();
    this.bindEvents();
  },
  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
      document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicitly call 'app.receivedEvent(...);'
  onDeviceReady: function() {
      app.receivedEvent('deviceready');
      
      StatusBar.overlaysWebView( true );
      StatusBar.backgroundColorByHexString('#ffffff');
      StatusBar.styleDefault();

      FastClick.attach(document.body);
      /*
      if(app.geolocation) {
        var locationService = app.geolocation; // native HTML5 geolocation
      }
      else {
        var locationService = navigator.geolocation; // cordova geolocation plugin
      }

      locationService.getCurrentPosition(
          function(pos) {
            navigator.notification.alert(pos);
          },
          function(error) {
            navigator.notification.alert(error);
          }, 
          {enableHighAccuracy: true, timeout: 15000}
      );
      */
      if(navigator.notification) {
          window.alert = function (message) {
              navigator.notification.alert(
                  message,
                  null,
                  "Pigeon", 
                  'OK')
          }
      }
  },
  // Update DOM on a Received Event
  receivedEvent: function(id) {
      var parentElement = document.getElementById(id);
      var listeningElement = parentElement.querySelector('.listening');
      var receivedElement = parentElement.querySelector('.received');

      listeningElement.setAttribute('style', 'display:none;');
      receivedElement.setAttribute('style', 'display:block;');

      console.log('Received Event: ' + id);
  }
};
