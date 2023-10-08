//(c) Copyright 2019 Jason Dore
//
//This library collates the various geometric calclulation requirements
//of the drawing objects into a small number of primitives. 
//
//This library then generally uses other libraries to perform those 
//geometric calculations where they are non trivial
//(e.g. intersection of lines with splines).
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';

class GeoEllipticalArc {

    constructor( center, radius1, radius2, angle1, angle2, rotationAngle ) {
        this.center = center;
        this.radius1 = radius1;
        this.radius2 = radius2;
        this.angle1 = angle1;
        this.angle2 = angle2;
        this.rotationAngle = rotationAngle;
    }


    clone() {
        return new GeoEllipticalArc( this.center, 
                                     this.radius1, 
                                     this.radius2, 
                                     this.angle1,  
                                     this.angle2,
                                     this.rotationAngle );
    }

    //https://observablehq.com/@toja/ellipse-and-elliptical-arc-conversion
    //http://xahlee.info/js/svg_path_ellipse_arc.html
    //https://observablehq.com/@toja/ellipse-and-elliptical-arc-conversion
    getEllipsePointForAngle(cx, cy, rx, ry, phi, theta) {
        const { abs, sin, cos } = Math;
        
        //https://en.wikipedia.org/wiki/Ellipse#Polar_form_relative_to_focus
        const radius=   ( rx * ry )
                      / Math.sqrt( Math.pow( rx * Math.sin( theta ),2 ) + Math.pow( ry * Math.cos( theta ), 2 ) ); 

        const M = radius * cos(theta),
              N = radius * sin(theta);  

        return { x: cx + cos(phi) * M - sin(phi) * N,
                 y: cy + sin(phi) * M + cos(phi) * N };
     }


    //TODO based on SVG book, but corrected
    centeredToSVG( cx, cy, rx, ry, thetaDeg/*arcStart*/, deltaDeg/*arcExtent*/, phiDeg/*x axis rotation*/ ) {
        var theta, endTheta, phiRad;
        var largeArc, sweep;
        theta = thetaDeg * Math.PI / 180;
        endTheta = ( thetaDeg + deltaDeg ) * Math.PI / 180;
        phiRad = phiDeg * Math.PI / 180;

        //console.log( "centeredToSVG thetaDeg: " + thetaDeg );
        //console.log( "centeredToSVG deltaDeg: " + deltaDeg );
        //console.log( "centeredToSVG endThetaDeg: " + ( thetaDeg + deltaDeg ) );
        //console.log( "centeredToSVG endTheta: " + endTheta );

        var start = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, theta);
        var end = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, endTheta);

        //console.log( "3. centeredToSVG x0,y0: " + x0 + "," + y0 );
        //console.log( "3. centeredToSVG x1,y1: " + x1 + "," + y1 );

        largeArc = ( deltaDeg > 180 ) || ( deltaDeg < -180 ) ? 1 : 0;
        sweep = ( deltaDeg > 0 ) ? 0 : 1;
         
        return { x: start.x,
                 y: start.y,
                rx: rx,
                ry: ry,
                xAxisAngle: phiDeg,
                largeArc: largeArc,
                sweep: sweep,
                x1: end.x,
                y1: end.y };
    }    


    useSvgEllipse() {
        //we can use <ellipse> if it is a full ellipse, otherwise we need to use an elliptical arc path
        if (    ( this.angle1 === 0 ) 
             && ( this.angle2 === 360 ) )
            return true;

        return false;
    }


    svgPath() {
        // 90->180   -90 -> -180     -90,-90
        // 0->90   -0 +-90



        const d2 = this.centeredToSVG( this.center.x, this.center.y, this.radius1, this.radius2, 360-(this.angle1), -(this.angle2 - this.angle1), -this.rotationAngle );
        let path = "M" + d2.x + "," + d2.y;
        path += " A" + d2.rx + " " + d2.ry;
        path += " " + d2.xAxisAngle;
        path += " " + d2.largeArc + ",0";// + d2.sweep;
        path += " " + d2.x1 + "," + ( d2.y1 + (((d2.y===d2.y1)&&(d2.x===d2.x1))?0.001:0)  ) + " "; //we need to start/stop on a slightly different point
        //The fudge above that allows the path to work even for a full ellipse should never be needed as if it is a full ellipse useSvgEllipse() should return true.

        //console.log( "GeoEllipticalArc: " + path );

        return path;
    }


    asShapeInfo() {
        //TEMPORARY ON TRIAL - THIS WORKS, SO ROTATE TRANSLATE 
        //              cx, cy, rx, ry. start, end   
        if ( this.rotationAngle === 0 )
            return ShapeInfo.arc( this.center.x, this.center.y, this.radius1, this.radius2, this.angle1/180*Math.PI, this.angle2/180*Math.PI)

        var svgPath = this.svgPath();
        //console.log( "EllipticalArc.asShapeInfo() this might not work for intersections... " + svgPath );
        return ShapeInfo.path( svgPath );
    }
    

    asGeoSpline() {

        //Un-rotate this if it is rotated
        if ( this.rotationAngle !== 0 )
        {
            const center = this.center;
            const rotationAngle = this.rotationAngle;
            const unrotator = function( p ) {
                return p.rotate( center, -rotationAngle );
            };
            const unrotatedArc = this.applyOperation( unrotator );

            const unrotatedSplines = unrotatedArc.asGeoSpline();

            const rerotator = function( p ) {
                return p.rotate( center, rotationAngle );
            };

            return unrotatedSplines.applyOperation( rerotator );
        }

        //We won't be a rotated elipse. 

        var angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        var angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        var angleExtentRad = angleEndRad - angleStartRad;
        var numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        var angleIncrement = angleExtentRad / numSegments;

        var controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        var nodeData = [];

        var node = {};
        nodeData.push( node );

        for (var i=0; i<numSegments; i++)
        {
            var angle = angleStartRad + i * angleIncrement;

            var dxr1 = Math.cos(angle) * this.radius1;
            var dxr2 = Math.cos(angle) * this.radius2;
            var dyr1 = Math.sin(angle) * this.radius1;
            var dyr2 = Math.sin(angle) * this.radius2;

            if ( ! node.point )
                node.point = new GeoPoint( this.center.x + dxr1 , this.center.y - dyr2 );

            node.outControlPoint = new GeoPoint( this.center.x + dxr1 - controlLength * dyr1, this.center.y - dyr2 - controlLength * dxr2 );

            angle += angleIncrement;
            dxr1 = Math.cos(angle) * this.radius1;
            dxr2 = Math.cos(angle) * this.radius2;
            dyr1 = Math.sin(angle) * this.radius1;
            dyr2 = Math.sin(angle) * this.radius2;

            node = {};
            nodeData.push( node );
            node.inControlPoint = new GeoPoint( this.center.x + dxr1 + controlLength * dyr1, this.center.y - dyr2 + controlLength * dxr2 );
            node.point = new GeoPoint( this.center.x + dxr1, this.center.y - dyr2 );
        }

        return new GeoSpline( nodeData );        
    }


    pointAlongPathFraction( fraction ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        //console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pointAlongPath( length ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var p = path.getPointAtLength( length );
        //console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    applyOperation( pointTransformer ) { //apply a operationFlip or operationRotate to this GeoEllipticalArc

        var center2 = pointTransformer( this.center );

        //Converted start and finishing angles are calculated identically to a circle
        //It doesn't matter from this perspective whether we use radius1 or radius2

        //s = the point on the arc that we start drawing
        var s = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle1 + this.rotationAngle );
        var s2 = pointTransformer( s );
        var s2line = new GeoLine( center2, s2 );
        var startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        var f = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle2 + this.rotationAngle );
        var f2 = pointTransformer( f );
        var f2line = new GeoLine( center2, f2 );
        var finishAngle2 = f2line.angleDeg();

        //don't abritrarily convert 360 to 0. 
        if (( finishAngle2 === 0 ) && ( this.angle2 === 360 ))
            finishAngle2 = 360;

        if (( startAngle2 === 0 ) && ( this.angle1 === 360 ))
            startAngle2 = 360;

        //Is this a good enough test?
        var isFlip = ( this.angle1 < this.angle2 ) != ( startAngle2 < finishAngle2 );

        //This is an ellipse, so we also need to adjust the ellipse rotation. 
        var r = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.rotationAngle );
        var r2 = pointTransformer( r );
        var r2line = new GeoLine( center2, r2 );
        var rotationAngle2 = r2line.angleDeg() + ( isFlip ? 180 : 0 );

        // + 180;
        if ( rotationAngle2 >= 360 )
            rotationAngle2 -= 360;

        //finally, start and finish point angles are defined with respect to the rotation angle
        startAngle2 -= rotationAngle2;
        finishAngle2 -= rotationAngle2;

        //If we've flipped the start angle becomes the finish angle and vice versa.
        return new GeoEllipticalArc( center2, this.radius1, this.radius2, isFlip ? finishAngle2 : startAngle2/*deg*/, isFlip ? startAngle2 : finishAngle2/*deg*/, rotationAngle2 /*deg*/ )
    }


    adjustBounds( bounds ) {
        //TODO determine the bounds for a similar non-rotated ellipse
        //and rotate

        bounds.adjust( this.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.pointAlongPathFraction( 1 ) );
    }
}

