import { Intersection, Point2D, ShapeInfo } from '../node_modules/kld-intersections/dist/index-esm.js';

function testIntersectIssue()
{
    console.log("hello");

    var lineSI = ShapeInfo.line( {x: 1049, y: 32.50000000000012}, {x: -951, y: 32.49999999999988} );

    var arcSI = ShapeInfo.cubicBezier( {x: 40.171483208713205, y: 47.54956546983231},
                                       {x: 40.020715782503956, y: 41.551460003671},
                                       {x: 34.6039069140418, y: 32.34372661098807},
                                       {x: 28.85955047607422, y: 19.576488494873047} );

   var intersections = Intersection.intersect( arcSI, lineSI );

   console.log("Exact Intersection count:" + intersections.points.length );

   var lineSI2 = ShapeInfo.line( {x: 1040, y: 32.50000000000012}, {x: -151, y: 32.49999999999988} );

   var arcSI2 = ShapeInfo.cubicBezier( {x: 40.171483208713205, y: 47.54956546983231 },
                                       {x: 40.020715782503956, y: 41.55 },
                                       {x: 34.6039069140418, y: 32.34 },
                                       {x: 28.85955047607422, y: 19.576488494873047 } );
                                       
  var intersections2 = Intersection.intersect( arcSI2, lineSI2 );
  console.log("Rough Intersection count:" + intersections2.points.length );

}

export{ testIntersectIssue };
