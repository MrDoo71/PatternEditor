//This needs to loaded so that it can then 
//1.set the config for require.js
//2.load dependencies
//3.and only then, draw the graph

//NOTE as of pre holiday (September 13) this requires (though these need to be checked):
//spin.js to be incapacitated
//boostrapcolorpicker to be disabled formhelp:1547 Browser:99
//AND only works on a full page.
//AND THEN works for angleOfLine!!! :-) in chrome
//AND WORKS for 'point and line' :-)
//AND, in any case then fails other tests because the json uses some binding names not yet synchronised.
//Current state is that using patternmaster, in firefox, with a full page reload, all the correct .js 
//is loaded we then just fail on the json stuff. 

console.log( "kinodbglue.js loaded, configuring require.js ");

require.config({
    skipDataMain: true.value,
    baseUrl: 'patternEditor',
    //deps: "scripts/PatternEditor",
    paths: {
        scripts: 'scripts',
       // "kld-affine": '../node_modules/kld-affine/dist/index-umd', //why don't I need this!!!
        "kld-intersections" : 'node_modules/kld-intersections/dist/index-umd' //should be ../node
    }
});

console.log( "kinodbglue.js loaded, require.js configured, defining dependencies");

//define(function (require) {
//    require('scripts/PatternEditor');
//});

function patternEditorKinodbGlue( dataAndConfig, ptarget, options )
{

    console.log( "kinodbglue/patternEditorKinodbGlue() loading modules & invoking graph...");
    requirejs(["scripts/PatternEditor"], function() { drawPattern( dataAndConfig, ptarget, options ) } );

}
