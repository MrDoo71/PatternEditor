
import  { PatternPiece, doDrawing, doTable } from '../dist/patterneditor.js';

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
                                  "length": { "expression": { "operation": "/", 
                                                              "parameter": [{ "keyword": "CurrentLength" }, 
                                                                            { "integerValue": 2 } ]
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

    //patternPiece1.analyseDependencies();
    
    doDrawing( targetdiv, patternPiece1, null );
    
    doTable( targetdiv, patternPiece1, null );

}


v343110_graph1_init();

