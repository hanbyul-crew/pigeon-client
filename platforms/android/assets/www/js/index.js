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
        var server = "http://192.168.0.9:8080"
        var slider = new PageSlider($('body'));
        var headTpl = Handlebars.compile($("#head-tpl").html());
        var homeTpl = Handlebars.compile($("#home-tpl").html());
        var authTpl = Handlebars.compile($("#auth-tpl").html());
        var signTpl = Handlebars.compile($("#sign-tpl").html());
        router.addRoute('', function(){
            if (!window.localStorage.getItem("username")) {
                $('body').html(headTpl({title:'Pigeon'}));
                $('div.content').html(authTpl());
            } else {
                var requests = [];
                
                $.post(server+'/get-request', {username:window.localStorage.getItem("username")}, function(res) {
                  if (res.success) {
                    requests = res.requests;
                    $('body').html(headTpl({title:window.localStorage.getItem("username")}));
                    $('div.content').html(homeTpl({requests:requests}));
                    $('div.toggle').on("toggle", function(e) {
                        var el = $(this);
                        if (el.hasClass('active')) {
                            var li = $(this).parent(); 
                            var from = li.data('from');
                            $.post(server + '/accept', {username:window.localStorage.getItem('username'), friend:from},
                            function(res) {
                                if(res.success){
                                    li.fadeOut();
                                }
                                else window.alert("fail to accept");
                            });
                        }
                    });
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
                                        return false;
                                    }
                                );
                                return false
                            } else {
                                window.alert("Cannot Add Yourself!!!!");
                            }
                            
                        }
                    });
                    return true;
                
                    
                  }
                  else return false;
                });
            }
        })
        router.addRoute('signup', function(){
            if (!window.localStorage.getItem("username")){
                $('body').html(headTpl({title:'Sign Up'}));
                $('div.content').html(signTpl());

                var form = $(".sign-group");  
                $('#done', form).on('click', function() {
                    $("#done",form).attr("disabled","disabled");
                    var u = $("#username", form).val();
                    var p = $('#password', form).val();
                    $.post(server + "/signup", {username:u,password:p}, function(res) {
                        if(res.success == true) {
                            window.localStorage["username"] = u;
                            window.location="index.html";
                            //$.mobile.changePage("some.html");
                        } else {
                            window.alert("can not sign up")
                        }
                     $("#done",form).removeAttr("disabled");
                    },"json");
                });
            } else {
                window.location="index.html";
            }
        });
        router.addRoute('signin', function() {
            if (!window.localStorage.getItem("username")){
                $('body').html(headTpl({title:'Sign In'}));
                $('div.content').html(signTpl());
                var form = $(".sign-group");  
                $('#done', form).on('click', function() {
                    $("#done",form).attr("disabled","disabled");
                    var u = $("#username", form).val();
                    var p = $('#password', form).val();
                    $.post(server + "/signin", {username:u,password:p}, function(res) {
                        if(res.success == true) {
                            window.localStorage["username"] = u;
                            window.location="index.html";
                            //$.mobile.changePage("some.html");
                        } else {
                            window.alert("Invalid Username or Password")
                        }
                     $("#done", form).removeAttr("disabled");
                    },"json");
                });
            } else {
                window.location ="index.html"
            }
        });
        router.addRoute('signout', function() {
            window.localStorage.removeItem("username");
            window.location="index.html";
            //$.mobile.changePage("some.html");
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
        StatusBar.overlaysWebView( false );
        StatusBar.backgroundColorByHexString('#ffffff');
        StatusBar.styleDefault();
        FastClick.attach(document.body);
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
