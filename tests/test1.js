/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


//import {Point2D, Vector2D, Matrix2D} = require("kld-affine");
//https://github.com/signavio/svg-intersections 





//var requirejs = require(['requirejs'], function (requirejs) {
    //requirejs is now loaded.
//});

//define(function (require) {
//    var requirejs = require('requirejs');
//});

//var requirejs = require('../lib/r.js');
/*
require.config({
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.

    baseUrl: '../lib', //or 'lib'?

   // nodeRequire: require,

    paths: {
        scripts: '../scripts',
        "kld-affine": '../node_modules/kld-affine/dist/index-umd',
        "kld-intersections" : '../node_modules/kld-intersections/dist/index-umd'
    }
});
*/
//var r = requirejs(['r']);

//var rjs = require( 'require' );   ...'require' has not been loaded yet for context.
//rjs.config( {
//    nodeRequire: require,
//} );

requirejs(["../scripts/PatternEditor"], function() {  v343110_graph1_init(); } );
//requirejs(["scripts/PatternPiece"]);


function v343110_graph1_init()
{
    let patternPiece1 = new PatternPiece();

    patternPiece1.setDefaults( { "mx": 0.132292, 
                                 "my": 0.264583,
                                 "lineStyle": "hair",
                                 "color": "black" } );
    
    let a = patternPiece1.pointSingle( { "name": "A", 
                                         "x": 0.79375, 
                                         "y": 1.05833, 
                                        } );
                                     
    let a1 = a.pointEndLine( { "name": "A1",
                               //"lineStyle": "hair",
                               //"color": "black",
                               //"mx": 0.132292,
                               //"my": 0.264583,
                               "angle": { "formulaText": "0", "constant": 0 },        //TODO TIDY THIS UP 'formulaText' and 'constant' is overkill
                               "length": { "formulaText": "10", "constant": 10 } } ); //TODO re-order so that these are earlier!
                                     
    let a2 = a.pointEndLine( { "name": "A2",
                               "angle": { "constant": 270 },
                               "length": { "constant": 10 } } );
                           
                           
    let a3 = a1.pointEndLine( { "name": "A3",
                                "angle": { "constant": 270 },      //TODO allow angle:270 
                                "length": { "constant": 10 } } );
                           
    let a4 = a.pointAlongLine( {  "name": "A4",
                                  "secondPoint": a2, 
                                  "length": { "constant": 5 } } );
                           
    let a5 = a1.pointAlongLine( { "name": "A5",
                                  "secondPoint": a3,
                                  "length": { "expression": { "operationType": "divide", //divide (lets standardise on lower case?  operationType->operandType
                                                              "parameter": [{ "operationType": "Variable", "variableType": "Keyword", "keyword": "CurrentLength" }, 
                                                                            { "operationType": "Integer value", "integerValue": 2 } ]
                                                            }
                                    }
                                } );        

    let line_a4_a5 = a4.lineTo( { "derivedName": "Line_A4_A5", 
                                  "secondPoint": a5 } );

    let a6 = a2.pointLineIntersect( { "name": "A6", 
                                      "p2Line1": a5, 
                                      "p1Line2": a4, 
                                      "p2Line2": a3 } );
                    

    var targetdiv = d3.select( "#v343110_graph1" );

    patternPiece1.analyseDependencies();
    
    doDrawing( targetdiv, patternPiece1, null );
    
    doTable( targetdiv, patternPiece1, null );


    //var kldIntersections = require('kld-intersections');

    const {ShapeInfo, Intersection} = require("kld-intersections");

    const path = ShapeInfo.path("M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100");
    const line = ShapeInfo.line(15, 75, 355, 140);
    const intersections = Intersection.intersect(path, line);
    
    intersections.points.forEach(console.log);    

}

