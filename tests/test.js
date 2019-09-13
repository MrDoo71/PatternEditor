//This sets up require for any of our test*.html files.

console.log( "test.js loaded, configuring require.js ");

require.config({
    baseUrl: '../lib',
    paths: {
        scripts: '../scripts', 
       // "kld-affine": '../node_modules/kld-affine/dist/index-umd', //why don't I need this!!!
        "kld-intersections" : '../node_modules/kld-intersections/dist/index-umd' //should be ../node
    }
});

define(function (require) {
    require('../scripts/PatternEditor');
});