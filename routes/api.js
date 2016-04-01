var express = require('express');
var router  = express.Router();
var app     = require('../app')
var path    = require('path')
var request = require('request')
var webdriverio = require('webdriverio');


var shuffle = function(array) {
    var counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        var index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        var temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

var options = {
    desiredCapabilities: {
        browserName: 'firefox', 
        // firefox_binary:'/usr/lib/firefox/firefox.sh',
        logLevel : 'verbose'
    }
};

var finish = function(results, req, res){
    // console.log('results? ', results)
    var allIpsum = []
    for ( var key in results ) {
        if ( key !== 'ready' ) {
            results[key] = shuffle(results[key].split(' '))
        }
    }
    while ( allIpsum.length < 100 ) {
        for ( var key in results ) {
            if ( key !== 'ready' ) {
                allIpsum.push(results[key].pop())
            }
        }
    }

    allIpsum[0] = allIpsum[0].split('')
    allIpsum[0][0] = allIpsum[0][0].toUpperCase()
    allIpsum[0] = allIpsum[0].join('')
    allIpsum = allIpsum.join(' ')
    if ( allIpsum[allIpsum.length-1] !== '.' ) {
        allIpsum += '.'
    }
    res.send(allIpsum)
    

}
var areWeDoneYet = function(results, req, res){
    if ( --results.ready === 0 ){
            finish(results, req, res)
    }
}
var catchErrors = function(e) {
    console.log('api.js error: ', e.body.value.class);  
    console.log('api.js error: ', e.body.value.message); 
    console.log('api.js error: ', e)
}
var scrapers = {

    cupcakeIpsum : function(results, req, res){
        try {

        webdriverio
            .remote(options)
            .init()
            .on('error', catchErrors)
            .url('http://cupcakeipsum.com')
            .click('#generate_button').waitForExist('#cupcake_ipsum p', 1000)
            .getText('#cupcake_ipsum p').then(function(value){
                results.cupcakeIpsum = value[0]
            })

            .end().then(function(){
                areWeDoneYet(results, req, res)
            });
        }
        catch(e){
            console.log('cupcakeError', e)
        }
    },
    cheeseIpsum : function(results, req, res){
        webdriverio
            .remote(options)
            .init()
            .on('error', catchErrors)
            .url('http://www.cheeseipsum.co.uk/')
            .click('#generate')
            .pause(250)
            .getText('#output').then(function(value){
                results.cheeseIpsum = value
            })
            .end().then(function(){
                areWeDoneYet(results, req, res)
            })
    },
    hipsterIpsum : function(results, req, res){
        webdriverio
            .remote(options)
            .init()
            .on('error', catchErrors)
            .url('http://hipsum.co/?paras=4&type=hipster-centric')
            .getText('.hipsum').then(function(value){
                results.hipsterIpsum = value
            })
            .end().then(function(){
                areWeDoneYet(results, req, res)
            })

    },
    baconIpsum : function(results, req, res){
        request.get('https://baconipsum.com/api/?type=meat-and-filler&format=text', function(err,data){
            results.baconIpsum = data.body
            areWeDoneYet(results, req, res)
        })
    }

}


router.post('/api/mixsomeipsum', function(req, res){
    var results = { ready : null }
    var jobs = []
    for ( var key in req.body ) {
        if ( !!+req.body[key] ) { // is req.body.key > 0?
            jobs.push(scrapers[key])
        }
    }
    results.ready = jobs.length
    for ( var job = 0; job < jobs.length; job++ ){
        jobs[job](results, req, res)
    }
})

app.use('/', router)